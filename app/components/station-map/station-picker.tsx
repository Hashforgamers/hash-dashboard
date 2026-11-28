"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Check, LayoutGrid, Maximize2, Minus, Plus, Sparkles, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env"
import { creditAuthHeaders } from "@/lib/credit-auth"
import { STATION_STATE_LABEL, layoutStations, mergeZones, normaliseLayout, type Station, type StationState, type Zone } from "@/lib/station-map"
import { clearLocalLayout, readLocalLayout, readZoom, writeZoom, zoomKey, type LocalLayout } from "@/lib/station-map-storage"
import { MAP_CELL_H, MAP_CELL_W, MAP_COLUMNS, MAP_GAP, StateDot, StationTile, mapCellPos } from "./station-tile"

export type PickerStation = {
  id: number
  code: string
  fullName: string
  icon: string
  type: string
  typeName: string
  number: number | null
  mapX: number | null
  mapY: number | null
  available: boolean
  state: StationState // shown when not available
  reason: string // why it cannot be picked (tooltip)
  caption?: string
}

const ZOOM_MIN = 0.4
const ZOOM_MAX = 1.6
const LEGEND: StationState[] = ["free", "busy", "ending", "booked", "offline"]

export type StationMapBody = Omit<LocalLayout, "savedAt">

/** PUT the arranged floor; status null = network/CORS failure. */
export async function putStationMap(vendorId: number, body: StationMapBody): Promise<{ ok: boolean; status: number | null; data: any }> {
  try {
    const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/station-map`, {
      method: "PUT", headers: creditAuthHeaders(), body: JSON.stringify(normaliseLayout(body.positions, body.zones)),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: null, data: null }
  }
}

/**
 * Zone labels from Gaming Stations > Map, plus a layout kept on this device when
 * the server could not save it. A kept layout is pushed to the server as soon as
 * the endpoint answers, then dropped.
 */
export function useStationLayout(vendorId: number | null, enabled: boolean, onSynced?: () => void) {
  const [serverZones, setServerZones] = useState<Zone[] | null>(null)
  const [local, setLocal] = useState<LocalLayout | null>(null)
  const [serverReady, setServerReady] = useState<boolean | null>(null)
  const synced = useRef(onSynced)
  synced.current = onSynced
  const reload = useCallback(async () => {
    if (!vendorId) return
    const pending = readLocalLayout(vendorId)
    setLocal(pending)
    try {
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/station-map`, { headers: creditAuthHeaders() })
      if (!res.ok) { setServerReady(false); setServerZones([]); return }
      const data = await res.json().catch(() => null)
      setServerReady(true)
      setServerZones(Array.isArray(data?.zones) ? data.zones : [])
      if (pending) {
        const saved = await putStationMap(vendorId, { positions: pending.positions, zones: pending.zones })
        if (saved.ok) {
          clearLocalLayout(vendorId)
          setLocal(null)
          setServerZones(Array.isArray(saved.data?.zones) ? saved.data.zones : pending.zones)
          synced.current?.()
        }
      }
    } catch {
      setServerReady(false) // map still works with auto-placed stations
      setServerZones([])
    }
  }, [vendorId])
  useEffect(() => { if (enabled) void reload() }, [enabled, reload])
  return {
    zones: local ? local.zones : serverZones ?? [],
    loaded: serverZones !== null,
    local, serverReady, reload, setLocal, setServerZones,
  }
}

/** Saved zone labels that sit on (or just above) a block of cells; other blocks' labels are dropped. */
export function zonesForCells(zones: Zone[], cells: Iterable<{ x: number; y: number }>): Zone[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const c of cells) { minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); maxX = Math.max(maxX, c.x); maxY = Math.max(maxY, c.y) }
  if (!Number.isFinite(minX)) return []
  return zones.filter(z => z.y >= minY - 1 && z.y <= maxY && z.x <= maxX && z.x + z.w - 1 >= minX)
}

/**
 * New session floor picker: only the chosen console type's stations, at the
 * cells arranged in Gaming Stations > Map (empty space of other types trimmed
 * away), with their zone label. Free stations for the chosen time can be picked.
 */
export function StationFloorPicker({
  floor, stations, zones: savedZones, selected, auto, need, onAuto, onToggle, disabled, loading, note, canPick, zoomStorageKey,
}: {
  floor: Station[] // every station with its live state and map cell
  stations: PickerStation[] // the chosen console type, with availability for the chosen time
  zones: Zone[]
  selected: number[]
  auto: boolean
  need: number
  onAuto: () => void
  onToggle: (id: number) => void
  disabled?: boolean
  loading?: boolean
  note?: string
  canPick: boolean // false: the server assigns the station (view only)
  zoomStorageKey: string // zoom is remembered per vendor and console type
}) {
  const floorById = useMemo(() => new Map(floor.map(f => [f.id, f])), [floor])
  // Cells come from the floor (saved map, or this device's pending layout).
  const entries = useMemo(() => stations.map(s => {
    const f = floorById.get(s.id)
    return { ...s, mapX: f ? f.mapX : s.mapX, mapY: f ? f.mapY : s.mapY }
  }), [stations, floorById])
  const layout = useMemo(() => layoutStations(entries, MAP_COLUMNS), [entries])
  const zones = useMemo(() => {
    const savedCells = entries.filter(e => e.mapX !== null && e.mapY !== null).map(e => layout.cells.get(e.id)!).filter(Boolean)
    return mergeZones(zonesForCells(savedZones, savedCells), layout.autoZones)
  }, [entries, layout, savedZones])
  // Bounding box of this type's block, so other consoles' space does not shrink the fit.
  const extent = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0
    layout.cells.forEach(c => { minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); maxX = Math.max(maxX, c.x + 1); maxY = Math.max(maxY, c.y + 1) })
    zones.forEach(z => { minX = Math.min(minX, z.x); minY = Math.min(minY, z.y); maxX = Math.max(maxX, z.x + z.w); maxY = Math.max(maxY, z.y + 1) })
    if (!Number.isFinite(minX)) return { x0: 0, y0: 0, cols: 1, rows: 1 }
    return { x0: minX, y0: minY, cols: maxX - minX, rows: maxY - minY }
  }, [layout.cells, zones])
  const pos = (cell: { x: number; y: number }) => mapCellPos({ x: cell.x - extent.x0, y: cell.y - extent.y0 })
  const canvasW = extent.cols * (MAP_CELL_W + MAP_GAP) - MAP_GAP
  const canvasH = extent.rows * (MAP_CELL_H + MAP_GAP) - MAP_GAP

  const viewportRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoomState] = useState(() => readZoom(zoomStorageKey, ZOOM_MIN, ZOOM_MAX) ?? 1)
  // Saved zoom wins; auto-fit (and refit on resize) only until a zoom is chosen.
  const remembered = useRef(readZoom(zoomStorageKey, ZOOM_MIN, ZOOM_MAX) !== null)
  useEffect(() => {
    const saved = readZoom(zoomStorageKey, ZOOM_MIN, ZOOM_MAX)
    remembered.current = saved !== null
    if (saved !== null) setZoomState(saved)
  }, [zoomStorageKey])
  const setZoom = useCallback((value: number) => {
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(value.toFixed(2))))
    remembered.current = true
    writeZoom(zoomStorageKey, next)
    setZoomState(next)
  }, [zoomStorageKey])
  const fitScale = useCallback(() => {
    const box = viewportRef.current
    if (!box || !box.clientWidth) return null
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(Math.min((box.clientWidth - 40) / canvasW, (box.clientHeight - 40) / canvasH, 1.25).toFixed(2))))
  }, [canvasW, canvasH])
  useEffect(() => {
    const box = viewportRef.current
    if (!box) return
    const autoFit = () => { if (remembered.current) return; const scale = fitScale(); if (scale !== null) setZoomState(scale) }
    autoFit()
    const observer = new ResizeObserver(autoFit)
    observer.observe(box)
    return () => observer.disconnect()
  }, [fitScale])

  const freeCount = stations.filter(s => s.available).length
  const typeName = stations[0]?.typeName || ""

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {canPick && (
          <button type="button" role="radio" aria-checked={auto} disabled={disabled} onClick={onAuto}
            className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-50",
              auto ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-foreground hover:bg-muted")}>
            <Sparkles className="h-3.5 w-3.5" />Auto-assign
          </button>
        )}
        <span className="text-sm text-muted-foreground" role="status">
          {loading ? "Checking stations…"
            : canPick ? <><span className="font-semibold tabular-nums text-foreground">{freeCount}</span> of {stations.length} {typeName} free for this time{need > 1 ? ` · pick ${need}` : ""}</>
            : `${stations.length} ${typeName}`}
        </span>
        {need > 1 && canPick && !auto && <span className="text-sm tabular-nums text-muted-foreground">{selected.length}/{need} picked</span>}
        <div className="ml-auto inline-flex items-center rounded-lg border border-border bg-card" role="group" aria-label="Zoom">
          <button type="button" aria-label="Zoom out" className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom(zoom - 0.1)}><Minus className="h-4 w-4" /></button>
          <span className="w-11 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom(zoom + 0.1)}><Plus className="h-4 w-4" /></button>
          <button type="button" aria-label="Fit to panel" title="Fit" className="grid h-8 w-8 place-items-center border-l border-border text-muted-foreground hover:text-foreground" onClick={() => { const scale = fitScale(); if (scale !== null) setZoom(scale) }}><Maximize2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {note && <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">{note}</p>}

      <div ref={viewportRef} role="group" aria-label="Stations"
        className={cn("relative min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-[radial-gradient(hsl(var(--foreground)/0.06)_1px,transparent_1px)] [background-size:18px_18px]", loading && "opacity-70")}>
        {entries.length === 0 ? (
          <div className="grid h-full place-items-center p-8 text-center">
            <div><LayoutGrid className="mx-auto mb-2 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{loading ? "Loading stations…" : `No ${typeName || "stations"} on the floor map yet.`}</p></div>
          </div>
        ) : (
          <div className="mx-auto p-5" style={{ width: canvasW * zoom + 40, height: canvasH * zoom + 40 }}>
            <div className="relative origin-top-left" style={{ width: canvasW, height: canvasH, transform: `scale(${zoom})` }}>
              {zones.map((zone, index) => (
                <div key={`zone-${index}`} className="pointer-events-none absolute z-0 flex items-end pb-1"
                  style={{ ...pos(zone), width: zone.w * (MAP_CELL_W + MAP_GAP) - MAP_GAP, height: MAP_CELL_H }}>
                  <span className="flex w-full items-center gap-2 border-b border-border pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Tag className="h-3 w-3 opacity-70" />{zone.label}
                  </span>
                </div>
              ))}
              {entries.map(pick => {
                const cell = layout.cells.get(pick.id)
                if (!cell) return null
                const live = floorById.get(pick.id)
                const chosen = canPick && !auto && selected.includes(pick.id)
                const full = !chosen && need > 1 && selected.length >= need
                const clickable = canPick && pick.available && !full
                return (
                  <div key={pick.id} className="absolute z-10" style={{ ...pos(cell), width: MAP_CELL_W, height: MAP_CELL_H }}>
                    <StationTile
                      code={pick.code}
                      icon={pick.icon}
                      consoleType={pick.type}
                      state={canPick && pick.available ? "free" : pick.state}
                      progress={live?.progress}
                      caption={canPick && pick.available ? (chosen ? "Selected" : "Free") : pick.caption}
                      title={`${pick.code} · ${pick.fullName}${canPick && pick.available ? "" : ` · ${pick.reason}`}`}
                      selected={chosen}
                      disabled={disabled || !clickable}
                      onClick={() => onToggle(pick.id)}
                      className={cn(chosen && "border-primary ring-[3px] ring-primary/70 shadow-[0_0_0_6px_hsl(var(--primary)/0.12)]")}
                    />
                    {chosen && (
                      <span aria-hidden className="absolute -right-1.5 -top-1.5 z-20 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                    {canPick && !pick.available && <p className="absolute inset-x-0.5 bottom-0 truncate text-[11px] leading-4 text-muted-foreground">{pick.reason}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5" aria-label="Legend">
        {LEGEND.map(state => (
          <span key={state} className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[11px] text-muted-foreground">
            <StateDot state={state} />{STATION_STATE_LABEL[state]}
          </span>
        ))}
        <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-primary/50 bg-primary/10 px-2 text-[11px] text-primary">
          <Check className="h-3 w-3" />Selected
        </span>
      </div>
    </div>
  )
}

export type DeskStationRow = { id: number; name: string; screen_size_inches: number | null }

/** Stations free for the whole of the held slots (rate-card desks); same endpoint as the old picker. */
export function useDeskStations({ vendor, game, profile, date, slotIds, enabled }: {
  vendor: number | null; game: number; profile?: string; date: string; slotIds: number[]; enabled: boolean
}) {
  const [rows, setRows] = useState<DeskStationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const key = JSON.stringify(slotIds)
  useEffect(() => {
    if (!enabled || !vendor || !game || !profile || !date || slotIds.length === 0) { setRows([]); setLoading(false); setError(""); return }
    const abort = new AbortController()
    setLoading(true); setError("")
    fetch(`${BOOKING_URL}/api/vendor/${vendor}/desk-consoles/${game}/available`, {
      method: "POST", headers: creditAuthHeaders(), signal: abort.signal,
      body: JSON.stringify({ profile, date, slot_ids: JSON.parse(key) }),
    })
      .then(async r => { const d = await r.json(); if (!r.ok) throw Error(d.error || "Unable to load stations"); if (!abort.signal.aborted) setRows(Array.isArray(d) ? d : []) })
      .catch(e => { if (!abort.signal.aborted) { setRows([]); setError(e.message) } })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
    // slotIds is compared by value through key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, vendor, game, profile, date, key])
  return { rows, loading, error }
}
