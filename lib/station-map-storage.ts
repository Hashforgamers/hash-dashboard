// Per-device memory for the station floor map: zoom per view, and a copy of the
// arranged layout kept when the server could not save it (synced later).

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">

export type LocalLayout = {
  positions: { console_id: number; x: number | null; y: number | null }[]
  zones: { label: string; x: number; y: number; w: number }[]
  savedAt: number
}

function store(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage
  try { return typeof window !== "undefined" ? window.localStorage : null } catch { return null }
}

export const zoomKey = (vendorId: number | null, view: string) => `hash.stationMap.zoom.${vendorId || 0}.${view}`
export const layoutKey = (vendorId: number | null) => `hash.stationMap.layout.${vendorId || 0}`

export function readZoom(key: string, min: number, max: number, storage?: StorageLike | null): number | null {
  const raw = store(storage)?.getItem(key)
  if (raw == null || raw === "") return null
  const value = Number(raw)
  return Number.isFinite(value) && value >= min && value <= max ? value : null
}

export function writeZoom(key: string, value: number, storage?: StorageLike | null) {
  try { store(storage)?.setItem(key, String(value)) } catch { /* private mode / quota */ }
}

export function readLocalLayout(vendorId: number | null, storage?: StorageLike | null): LocalLayout | null {
  try {
    const raw = store(storage)?.getItem(layoutKey(vendorId))
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!Array.isArray(data?.positions) || !Array.isArray(data?.zones)) return null
    return { positions: data.positions, zones: data.zones, savedAt: Number(data.savedAt) || 0 }
  } catch {
    return null
  }
}

export function writeLocalLayout(vendorId: number | null, layout: Omit<LocalLayout, "savedAt">, storage?: StorageLike | null) {
  try { store(storage)?.setItem(layoutKey(vendorId), JSON.stringify({ ...layout, savedAt: Date.now() })) } catch { /* ignore */ }
}

export function clearLocalLayout(vendorId: number | null, storage?: StorageLike | null) {
  try { store(storage)?.removeItem(layoutKey(vendorId)) } catch { /* ignore */ }
}

/** Saved cells override the server's mapX/mapY (used only while a local layout is pending sync). */
export function applyLocalPositions<T extends { id: number; mapX: number | null; mapY: number | null }>(stations: T[], layout: LocalLayout | null): T[] {
  if (!layout) return stations
  const byId = new Map(layout.positions.map(p => [Number(p.console_id), p]))
  return stations.map(s => {
    const p = byId.get(s.id)
    if (!p) return s
    const ok = Number.isInteger(p.x) && Number.isInteger(p.y)
    return { ...s, mapX: ok ? p.x : null, mapY: ok ? p.y : null }
  })
}

/**
 * What a failed save means for the person arranging. 404/405 = the dashboard
 * server does not have the station-map endpoint yet (backend not deployed).
 */
export function saveFailureMessage(status: number | null, serverError?: string): { message: string; keepLocally: boolean } {
  if (status === null) return { message: "Can't reach the server. Layout kept on this device and will sync when it's back.", keepLocally: true }
  if (status === 404 || status === 405 || status === 501) {
    return { message: "Server not updated yet for floor maps. Layout kept on this device and will sync once it is.", keepLocally: true }
  }
  if (status === 401) return { message: "Session expired. Sign in again to save the layout.", keepLocally: true }
  if (status === 403) return { message: serverError || "Your role can't arrange stations (needs Gaming stations manage).", keepLocally: false }
  if (status >= 500) return { message: `${serverError || "Server error while saving"}. Layout kept on this device for now.`, keepLocally: true }
  return { message: serverError || "Could not save the layout", keepLocally: false }
}
