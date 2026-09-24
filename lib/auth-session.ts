"use client"

import { jwtDecode } from "jwt-decode"
import { DASHBOARD_URL, LOGIN_URL } from "@/src/config/env"

const LOGIN_TOKEN_KEY = "jwtToken"
const RBAC_TOKEN_KEY = "rbac_access_token_v1"
const TOKEN_EXPIRY_KEY = "tokenExpiration"
const REFRESH_LEAD_SECONDS = 5 * 60

let refreshPromise: Promise<string | null> | null = null
let refreshTimerId: number | null = null
let accessRefreshPromise: Promise<string | null> | null = null
const retryAfter = new Map<string, number>()
let removeWakeListeners: (() => void) | null = null

type TokenClaims = {
  exp?: number
  jti?: string
  scope?: string
  vendor_id?: number
  sub?: { id?: number; type?: string }
}

function getLoginToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem(LOGIN_TOKEN_KEY)
}

export function getPreferredAuthToken(): string | null {
  if (typeof window === "undefined") return null
  const loginToken = localStorage.getItem(LOGIN_TOKEN_KEY)
  if (loginToken) return loginToken
  return localStorage.getItem(RBAC_TOKEN_KEY)
}

function getTokenExpMs(token: string | null): number {
  if (!token) return 0
  try {
    const decoded = jwtDecode<TokenClaims>(token)
    return decoded?.exp ? decoded.exp * 1000 : 0
  } catch {
    return 0
  }
}

function storeLoginToken(token: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(LOGIN_TOKEN_KEY, token)
  const expMs = getTokenExpMs(token)
  if (expMs > 0) {
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(expMs))
  }
  const maxAgeSec = expMs > 0 ? Math.max(0, Math.floor((expMs - Date.now()) / 1000)) : 24 * 60 * 60
  document.cookie = `jwt=${token}; max-age=${maxAgeSec}; path=/; SameSite=Lax; Secure`
}

export function clearAuthSession() {
  if (typeof window === "undefined") return
  localStorage.removeItem(LOGIN_TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
  localStorage.removeItem(RBAC_TOKEN_KEY)
  localStorage.removeItem("active_staff_session_v1")
  retryAfter.clear()
  document.cookie = "jwt=; max-age=0; path=/; SameSite=Lax; Secure"
}

export function shouldRefreshSoon(token: string | null, leadSeconds = REFRESH_LEAD_SECONDS): boolean {
  const expMs = getTokenExpMs(token)
  if (!expMs) return false
  return expMs - Date.now() <= leadSeconds * 1000
}

function isLoginAuthEndpoint(url: string) {
  return (
    url.includes("/api/login") ||
    url.includes("/api/validatePin") ||
    url.includes("/api/forgot-password") ||
    url.includes("/api/reset-password") ||
    url.includes("/api/verify-reset-code") ||
    url.includes("/api/change-password") ||
    url.includes("/api/refresh-token")
  )
}

// Refresh calls bypass auth interceptors to avoid recursive refresh/deadlocks.
async function requestRenewal(url: string, token: string) {
  const send = window.__hashOriginalFetch || window.fetch.bind(window)
  const response = await send(url, {
    method: "POST",
    signal: AbortSignal.timeout(12_000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json",
      "X-Client-Source": "dashboard", "X-Skip-Auth-Refresh": "1" },
  })
  return { response, payload: await response.json().catch(() => null) }
}

export async function refreshLoginToken(_reason = "manual"): Promise<string | null> {
  if (typeof window === "undefined") return null
  const existing = getLoginToken()
  if (!existing) return null
  if (refreshPromise) return refreshPromise
  if (!navigator.onLine || Date.now() < (retryAfter.get(LOGIN_TOKEN_KEY) || 0)) return existing
  refreshPromise = (async () => {
    try {
      const { response, payload } = await requestRenewal(`${LOGIN_URL}/api/refresh-token`, existing)
      // A late response must never restore logout or overwrite a new login.
      if (getLoginToken() !== existing) return getLoginToken()
      if (response.status === 401 || response.status === 403) {
        clearAuthSession()
        window.dispatchEvent(new CustomEvent("auth:expired"))
        return null
      }
      const next = payload?.data?.token || payload?.token
      if (!response.ok || typeof next !== "string" || getTokenExpMs(next) <= Date.now()) {
        throw new Error("Session renewal temporarily unavailable")
      }
      retryAfter.delete(LOGIN_TOKEN_KEY)
      storeLoginToken(next)
      window.dispatchEvent(new CustomEvent("auth:renewed"))
      return next
    } catch {
      retryAfter.set(LOGIN_TOKEN_KEY, Date.now() + 30_000)
      return getLoginToken()
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

export async function ensureFreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null
  const existing = localStorage.getItem(RBAC_TOKEN_KEY)
  if (!existing || !shouldRefreshSoon(existing)) return existing
  if (accessRefreshPromise) return accessRefreshPromise
  if (!navigator.onLine || Date.now() < (retryAfter.get(RBAC_TOKEN_KEY) || 0)) return existing
  let claims: TokenClaims
  try { claims = jwtDecode<TokenClaims>(existing) } catch { return existing }
  if (claims.scope !== "vendor_access" || !claims.vendor_id) return existing
  accessRefreshPromise = (async () => {
    try {
      const { response, payload } = await requestRenewal(
        `${DASHBOARD_URL}/api/vendor/${claims.vendor_id}/access/session/refresh`, existing)
      if (localStorage.getItem(RBAC_TOKEN_KEY) !== existing) return localStorage.getItem(RBAC_TOKEN_KEY)
      if (response.status === 401 || response.status === 403) {
        // Do not let a rejected staff session silently bootstrap as the owner.
        clearAuthSession()
        window.dispatchEvent(new CustomEvent("access:expired"))
        window.dispatchEvent(new CustomEvent("auth:expired"))
        return null
      }
      if (!response.ok || typeof payload?.token !== "string" || getTokenExpMs(payload.token) <= Date.now()) {
        throw new Error("Staff renewal temporarily unavailable")
      }
      retryAfter.delete(RBAC_TOKEN_KEY)
      localStorage.setItem(RBAC_TOKEN_KEY, payload.token)
      window.dispatchEvent(new CustomEvent("access:renewed"))
      return payload.token as string
    } catch {
      retryAfter.set(RBAC_TOKEN_KEY, Date.now() + 30_000)
      return localStorage.getItem(RBAC_TOKEN_KEY)
    } finally { accessRefreshPromise = null }
  })()
  return accessRefreshPromise
}

// Components may retain an older token in state. Replace it only when its
// session identity matches; never substitute an owner token for a staff token.
export async function renewRequestAuthorization(authorization: string): Promise<string> {
  const token = authorization.replace(/^Bearer /, "")
  const current = localStorage.getItem(RBAC_TOKEN_KEY)
  try {
    const sent = jwtDecode<TokenClaims>(token)
    const stored = current ? jwtDecode<TokenClaims>(current) : null
    if (sent.scope === "vendor_access" && sent.jti && sent.jti === stored?.jti) {
      const next = await ensureFreshAccessToken()
      return next ? `Bearer ${next}` : authorization
    }
  } catch { /* Non-JWT credentials are unchanged. */ }
  let sameVendorLogin = false
  try {
    const sent = jwtDecode<TokenClaims>(token)
    const login = getLoginToken()
    const currentLogin = login ? jwtDecode<TokenClaims>(login) : null
    sameVendorLogin = !sent.scope && !currentLogin?.scope && sent.sub?.type === "vendor"
      && currentLogin?.sub?.type === "vendor" && sent.sub.id != null && sent.sub.id === currentLogin.sub.id
  } catch { /* Only known vendor login identities may use a renewed login. */ }
  if (token === getLoginToken() || sameVendorLogin) {
    const next = await ensureFreshLoginToken()
    return next ? `Bearer ${next}` : authorization
  }
  return authorization
}

export async function ensureFreshLoginToken(minValiditySeconds = REFRESH_LEAD_SECONDS): Promise<string | null> {
  const token = getLoginToken()
  if (!token) return null
  if (!shouldRefreshSoon(token, minValiditySeconds)) return token
  return refreshLoginToken("proactive")
}

export function startBackgroundTokenRefresh() {
  if (typeof window === "undefined" || refreshTimerId != null) return
  const check = () => {
    void ensureFreshLoginToken(REFRESH_LEAD_SECONDS)
    void ensureFreshAccessToken()
  }
  const wake = () => {
    if (document.hidden) return
    retryAfter.clear()
    check()
  }
  check()
  refreshTimerId = window.setInterval(check, 60_000)
  window.addEventListener("online", wake)
  window.addEventListener("pageshow", wake)
  document.addEventListener("visibilitychange", wake)
  removeWakeListeners = () => {
    window.removeEventListener("online", wake)
    window.removeEventListener("pageshow", wake)
    document.removeEventListener("visibilitychange", wake)
  }
}

export function stopBackgroundTokenRefresh() {
  if (typeof window === "undefined") return
  if (refreshTimerId != null) window.clearInterval(refreshTimerId)
  refreshTimerId = null
  removeWakeListeners?.()
  removeWakeListeners = null
}

export function shouldAttachAuth(url: string) {
  if (!url || isLoginAuthEndpoint(url)) return false
  if (url.startsWith("/")) return true
  if (typeof window === "undefined") return false
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.origin === window.location.origin || parsed.hostname.includes("hashforgamers")
  } catch {
    return false
  }
}
