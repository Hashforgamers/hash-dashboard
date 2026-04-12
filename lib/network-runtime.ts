"use client"

import axios from "axios"
import { ensureFreshLoginToken, getPreferredAuthToken, refreshLoginToken, shouldAttachAuth } from "@/lib/auth-session"

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

declare global {
  interface Window {
    __hashNetworkRuntimeInstalled?: boolean
    __hashOriginalFetch?: typeof window.fetch
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeoutSignal(timeoutMs: number, originalSignal?: AbortSignal | null) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error("Request timeout")), timeoutMs)

  const onAbort = () => controller.abort(originalSignal?.reason || new Error("Request aborted"))
  if (originalSignal) {
    if (originalSignal.aborted) {
      controller.abort(originalSignal.reason || new Error("Request aborted"))
    } else {
      originalSignal.addEventListener("abort", onAbort, { once: true })
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout)
      if (originalSignal) originalSignal.removeEventListener("abort", onAbort)
    },
  }
}

function shouldRetry(status?: number) {
  if (typeof status !== "number") return false
  return RETRYABLE_STATUS.has(status)
}

export function installNetworkRuntime() {
  if (typeof window === "undefined") return
  if (window.__hashNetworkRuntimeInstalled) return
  window.__hashNetworkRuntimeInstalled = true

  const originalFetch = window.fetch.bind(window)
  window.__hashOriginalFetch = originalFetch
  const defaultTimeoutMs = 12_000
  const getRetries = 1

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url
    const method = ((init?.method || (input instanceof Request ? input.method : "GET")) || "GET").toUpperCase()
    const retries = method === "GET" || method === "HEAD" ? getRetries : 0
    const skipAuthRefresh = (new Headers(init?.headers || undefined)).get("X-Skip-Auth-Refresh") === "1"

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const requestHeaders = new Headers(input instanceof Request ? input.headers : undefined)
      const initHeaders = new Headers(init?.headers || undefined)
      initHeaders.forEach((value, key) => requestHeaders.set(key, value))
      if (!requestHeaders.has("X-Client-Source")) {
        requestHeaders.set("X-Client-Source", "dashboard")
      }
      if (!requestHeaders.has("Authorization") && shouldAttachAuth(rawUrl)) {
        await ensureFreshLoginToken(90)
        const token = getPreferredAuthToken()
        if (token) {
          requestHeaders.set("Authorization", `Bearer ${token}`)
        }
      }

      const { signal, cleanup } = withTimeoutSignal(defaultTimeoutMs, init?.signal || null)
      try {
        const response = await originalFetch(input, {
          ...init,
          method,
          headers: requestHeaders,
          signal,
        })
        if (response.status === 401 && !skipAuthRefresh && shouldAttachAuth(rawUrl)) {
          const refreshed = await refreshLoginToken("401")
          if (refreshed) {
            requestHeaders.set("Authorization", `Bearer ${refreshed}`)
            const retryResponse = await originalFetch(input, {
              ...init,
              method,
              headers: requestHeaders,
              signal,
            })
            return retryResponse
          }
        }
        if (attempt < retries && shouldRetry(response.status)) {
          await sleep(250 + Math.floor(Math.random() * 120))
          continue
        }
        return response
      } catch (error) {
        if (attempt >= retries) throw error
        await sleep(250 + Math.floor(Math.random() * 120))
      } finally {
        cleanup()
      }
    }

    return originalFetch(input, init)
  }

  axios.defaults.timeout = 12_000
  axios.defaults.withCredentials = false
  axios.defaults.headers.common["X-Client-Source"] = "dashboard"
  axios.interceptors.request.use(async (config) => {
    const url = String(config.url || "")
    if (config.headers && !config.headers.Authorization && shouldAttachAuth(url)) {
      await ensureFreshLoginToken(90)
      const token = getPreferredAuthToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  })

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error?.config as any
      if (!config) return Promise.reject(error)

      const method = String(config.method || "get").toUpperCase()
      const retryableMethod = method === "GET" || method === "HEAD"
      const retryCount = Number(config.__retryCount || 0)
      const maxRetries = retryableMethod ? 1 : 0
      const status = error?.response?.status

      if (status === 401 && !config.__authRetried && shouldAttachAuth(String(config.url || ""))) {
        config.__authRetried = true
        const refreshed = await refreshLoginToken("401")
        if (refreshed) {
          config.headers = config.headers || {}
          config.headers.Authorization = `Bearer ${refreshed}`
          return axios(config)
        }
      }

      if (retryCount < maxRetries && (status == null || shouldRetry(status))) {
        config.__retryCount = retryCount + 1
        await sleep(250 + Math.floor(Math.random() * 120))
        return axios(config)
      }

      return Promise.reject(error)
    }
  )
}
