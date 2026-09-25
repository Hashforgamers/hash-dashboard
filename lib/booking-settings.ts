import { httpJson } from "@/lib/http-client"

/** Short-lived, credential-scoped setup data; never used to authorize a booking. */
export function getBookingSettings<T>(url: string, version = 0): Promise<T> {
  const token = localStorage.getItem("rbac_access_token_v1") || localStorage.getItem("jwtToken")
  return httpJson<T>(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeoutMs: 10_000,
    retries: 1,
    dedupe: true,
    dedupeKey: `booking-settings:${version}:${url}`,
    cacheTtlMs: 60_000,
  })
}
