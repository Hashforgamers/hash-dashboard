export function creditAuthHeaders(): Record<string, string> {
  const token = typeof window === "undefined" ? null :
    localStorage.getItem("rbac_access_token_v1") || localStorage.getItem("jwtToken")
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}
