"use client"

import { jwtDecode } from "jwt-decode"
import { LOGIN_URL } from "@/src/config/env"

const LOGIN_TOKEN_KEY = "jwtToken"
const RBAC_TOKEN_KEY = "rbac_access_token_v1"
const TOKEN_EXPIRY_KEY = "tokenExpiration"
const REFRESH_LEAD_SECONDS = 5 * 60

let refreshPromise: Promise<string | null> | null = null
let refreshTimerId: number | null = null

type TokenClaims = {
  exp?: number
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

async function callRefreshEndpoint(token: string): Promise<string | null> {
  const refreshUrl = `${LOGIN_URL}/api/refresh-token`
  const response = await fetch(refreshUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Client-Source": "dashboard",
      "X-Skip-Auth-Refresh": "1",
    },
  })

  let payload: any = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) return null
  const nextToken = payload?.data?.token || payload?.token
  if (!nextToken || typeof nextToken !== "string") return null
  storeLoginToken(nextToken)
  return nextToken
}

export async function refreshLoginToken(reason = "manual"): Promise<string | null> {
  if (typeof window === "undefined") return null
  const existing = getLoginToken()
  if (!existing) return null

  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const next = await callRefreshEndpoint(existing)
      if (!next && reason === "startup") {
        const stillUsable = getTokenExpMs(existing) > Date.now()
        if (stillUsable) return existing
      }
      if (!next) {
        clearAuthSession()
        window.dispatchEvent(new CustomEvent("auth:expired"))
      }
      return next
    } catch {
      clearAuthSession()
      window.dispatchEvent(new CustomEvent("auth:expired"))
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function ensureFreshLoginToken(minValiditySeconds = REFRESH_LEAD_SECONDS): Promise<string | null> {
  const token = getLoginToken()
  if (!token) return null
  if (!shouldRefreshSoon(token, minValiditySeconds)) return token
  return refreshLoginToken("proactive")
}

export function startBackgroundTokenRefresh() {
  if (typeof window === "undefined") return
  if (refreshTimerId != null) return
  refreshTimerId = window.setInterval(() => {
    void ensureFreshLoginToken(REFRESH_LEAD_SECONDS)
  }, 60 * 1000)
}

export function stopBackgroundTokenRefresh() {
  if (typeof window === "undefined") return
  if (refreshTimerId == null) return
  window.clearInterval(refreshTimerId)
  refreshTimerId = null
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
