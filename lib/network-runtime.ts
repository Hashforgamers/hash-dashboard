"use client"

import axios from "axios"

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

declare global {
  interface Window {
    __hashNetworkRuntimeInstalled?: boolean
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
  const defaultTimeoutMs = 12_000
  const getRetries = 1

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = ((init?.method || (input instanceof Request ? input.method : "GET")) || "GET").toUpperCase()
    const retries = method === "GET" || method === "HEAD" ? getRetries : 0

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const requestHeaders = new Headers(input instanceof Request ? input.headers : undefined)
      const initHeaders = new Headers(init?.headers || undefined)
      initHeaders.forEach((value, key) => requestHeaders.set(key, value))
      if (!requestHeaders.has("X-Client-Source")) {
        requestHeaders.set("X-Client-Source", "dashboard")
      }

      const { signal, cleanup } = withTimeoutSignal(defaultTimeoutMs, init?.signal || null)
      try {
        const response = await originalFetch(input, {
          ...init,
          method,
          headers: requestHeaders,
          signal,
        })
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

      if (retryCount < maxRetries && (status == null || shouldRetry(status))) {
        config.__retryCount = retryCount + 1
        await sleep(250 + Math.floor(Math.random() * 120))
        return axios(config)
      }

      return Promise.reject(error)
    }
  )
}
