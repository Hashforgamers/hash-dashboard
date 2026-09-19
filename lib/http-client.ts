type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"

export class ApiError extends Error {
  status: number
  details?: unknown
  url: string

  constructor(message: string, status: number, url: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.url = url
    this.details = details
  }
}

export interface HttpJsonOptions extends RequestInit {
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
  dedupe?: boolean
  dedupeKey?: string
  cacheTtlMs?: number
  parseAs?: "json" | "text" | "void"
}

const inflight = new Map<string, Promise<unknown>>()
const responseCache = new Map<string, { expiresAt: number; value: unknown }>()

const DEFAULT_TIMEOUT_MS = 12_000
const DEFAULT_RETRIES = 1
const DEFAULT_RETRY_DELAY_MS = 250

function cleanupExpiredCache(now = Date.now()) {
  for (const [key, entry] of responseCache.entries()) {
    if (entry.expiresAt <= now) {
      responseCache.delete(key)
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504
}

function isMethodIdempotent(method: HttpMethod) {
  return method === "GET" || method === "HEAD" || method === "OPTIONS"
}

function parseMaybeJson(text: string) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function buildRequestKey(method: string, url: string, options: HttpJsonOptions) {
  // A URL/custom key alone can share another cafe's authenticated response.
  const headers = Array.from(new Headers(options.headers).entries()).sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify([options.dedupeKey || `${method}:${url}`, method, url,
    typeof options.body === "string" ? options.body : null,
    headers, options.credentials || "same-origin", options.parseAs || "json"])
}

function withTimeoutSignal(timeoutMs: number, externalSignal?: AbortSignal | null): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error("Request timeout")), timeoutMs)

  const onAbort = () => controller.abort(externalSignal?.reason || new Error("Request aborted"))
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason || new Error("Request aborted"))
    } else {
      externalSignal.addEventListener("abort", onAbort, { once: true })
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout)
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onAbort)
      }
    },
  }
}

async function parseResponseBody<T>(response: Response, parseAs: "json" | "text" | "void"): Promise<T> {
  if (parseAs === "void") return undefined as T
  if (parseAs === "text") {
    return (await response.text()) as T
  }
  const text = await response.text()
  return parseMaybeJson(text) as T
}

export async function httpJson<T = unknown>(url: string, options: HttpJsonOptions = {}): Promise<T> {
  const method = ((options.method || "GET").toUpperCase() as HttpMethod)
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const retries = options.retries ?? (isMethodIdempotent(method) ? DEFAULT_RETRIES : 0)
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS
  // Independently cancellable callers must not own another caller's request.
  const dedupe = !options.signal && (options.dedupe ?? isMethodIdempotent(method))
  const parseAs = options.parseAs ?? "json"
  const cacheTtlMs = method === "GET" ? Math.max(0, options.cacheTtlMs ?? 0) : 0
  const cacheKey = buildRequestKey(method, url, options)
  if (options.signal?.aborted) throw options.signal.reason || new Error("Request aborted")

  if (cacheTtlMs > 0) {
    cleanupExpiredCache()
    const cached = responseCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T
    }
  }

  if (dedupe && inflight.has(cacheKey)) {
    return inflight.get(cacheKey) as Promise<T>
  }

  const requestPromise = (async () => {
    let lastError: unknown

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const { signal, cleanup } = withTimeoutSignal(timeoutMs, options.signal)
      try {
        const response = await fetch(url, { ...options, method, signal })
        const body = await parseResponseBody<unknown>(response, parseAs)

        if (!response.ok) {
          const message =
            (body as any)?.error ||
            (body as any)?.message ||
            `${response.status} ${response.statusText || "Request failed"}`

          const apiError = new ApiError(String(message), response.status, url, body)

          throw apiError
        }

        if (cacheTtlMs > 0) {
          responseCache.set(cacheKey, { value: body, expiresAt: Date.now() + cacheTtlMs })
        }

        return body as T
      } catch (error) {
        lastError = error
        const canRetry = !options.signal?.aborted && attempt < retries && isMethodIdempotent(method)
          && (!(error instanceof ApiError) || isRetryableStatus(error.status))
        if (!canRetry) break
        cleanup()
        const jitter = Math.floor(Math.random() * 120)
        await sleep(retryDelayMs * (attempt + 1) + jitter)
      } finally {
        cleanup()
      }
      if (options.signal?.aborted) throw options.signal.reason || new Error("Request aborted")
    }

    if (lastError instanceof Error) throw lastError
    throw new Error("Request failed")
  })()

  if (dedupe) {
    inflight.set(cacheKey, requestPromise)
  }

  try {
    return await requestPromise
  } finally {
    if (dedupe) {
      inflight.delete(cacheKey)
    }
  }
}

export function clearHttpClientCache(prefix?: string) {
  if (!prefix) {
    responseCache.clear()
    return
  }
  for (const key of responseCache.keys()) {
    if (key.includes(prefix)) {
      responseCache.delete(key)
    }
  }
}
