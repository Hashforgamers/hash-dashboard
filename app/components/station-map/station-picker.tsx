"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Check, LayoutGrid, Maximize2, Minus, Plus, Sparkles, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env"
import { creditAuthHeaders } from "@/lib/credit-auth"
import { STATION_STATE_LABEL, layoutStations, mergeZones, type Station, type StationState, type Zone } from "@/lib/station-map"
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

/** Saved zone labels from Gaming Stations > Map (empty when none / not reachable). */
export function useStationZones(vendorId: number | null, enabled: boolean) {
  const [zones, setZones] = useState<Zone[]>([])
  useEffect(() => {
    if (!enabled || !vendorId) return
    const abort = new AbortController()
    fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/station-map`, { headers: creditAuthHeaders(), signal: abort.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!abort.signal.aborted) setZones(Array.isArray(data?.zones) ? data.zones : []) })
      .catch(() => { if (!abort.signal.aborted) setZones([]) }) // auto-placed blocks still get labels
    return () => abort.abort()
  }, [vendorId, enabled])
  return zones
}

type FloorEntry = {
  id: number; code: string; fullName: string; icon: string; type: string; typeName: string
  number: number | null; mapX: number | null; mapY: number | null; state: StationState
}

/**
 * New session floor picker: the cafe's own floor map (saved cells and zone
 * labels, same tiles as Gaming Stations > Map). Stations of the chosen console
 * type can be picked when free for the chosen time; other types are dimmed and
 * a click switches the console type to that station's.
 */
export function StationFloorPicker({
  floor, stations, zones: savedZones, selected, auto, need, onAuto, onToggle, switchFor, disabled, loading, note, canPick,
}: {
  floor: Station[] // every station with its live state
  stations: PickerStation[] // the chosen console type, with availability for the chosen time
  zones: Zone[]
  selected: number[]
  auto: boolean
  need: number
  onAuto: () => void
  onToggle: (id: number) => void
  /** Click handler for another console type's station (switches the form to that type), or null when not bookable. */
  switchFor: (station: Station) => (() => void) | null
  disabled?: boolean
  loading?: boolean
  note?: string
  canPick: boolean // false: the server assigns the station (view only)
}) {
  const pickById = useMemo(() => new Map(stations.map(s => [s.id, s])), [stations])
  // Whole floor; quoted stations missing from the console list still get a cell.
  const entries: FloorEntry[] = useMemo(() => [
    ...floor,
    ...stations.filter(s => !floor.some(f => f.id === s.id)).map(s => ({ ...s, state: s.state })),
  ], [floor, stations])
  const layout = useMemo(() => layoutStations(entries, MAP_COLUMNS), [entries])
  const zones = useMemo(() => mergeZones(savedZones, layout.autoZones), [savedZones, layout.autoZones])
  // Bounding box of what is on the floor, so empty leading rows/columns do not shrink the fit.
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
  const [zoom, setZoom] = useState(1)
  const manualZoom = useRef(false)
  const fit = useCallback(() => {
    const box = viewportRef.current
    if (!box || !box.clientWidth) return
    const scale = Math.min((box.clientWidth - 40) / canvasW, (box.clientHeight - 40) / canvasH, 1.25)
    setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(scale.toFixed(2)))))
  }, [canvasW, canvasH])
  // Fit to the panel, and again when the panel resizes, until zoomed by hand.
  useEffect(() => {
    const box = viewportRef.current
    if (!box) return
    if (!manualZoom.current) fit()
    const observer = new ResizeObserver(() => { if (!manualZoom.current) fit() })
    observer.observe(box)
    return () => observer.disconnect()
  }, [fit])
  const zoomBy = (step: number) => { manualZoom.current = true; setZoom(z => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +(z + step).toFixed(2)))) }

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
          <button type="button" aria-label="Zoom out" className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40" disabled={zoom <= ZOOM_MIN} onClick={() => zoomBy(-0.1)}><Minus className="h-4 w-4" /></button>
          <span className="w-11 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40" disabled={zoom >= ZOOM_MAX} onClick={() => zoomBy(0.1)}><Plus className="h-4 w-4" /></button>
          <button type="button" aria-label="Fit to panel" title="Fit" className="grid h-8 w-8 place-items-center border-l border-border text-muted-foreground hover:text-foreground" onClick={() => { manualZoom.current = false; fit() }}><Maximize2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {note && <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">{note}</p>}

      <div ref={viewportRef} role="group" aria-label="Stations"
        className={cn("relative min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-[radial-gradient(hsl(var(--foreground)/0.06)_1px,transparent_1px)] [background-size:18px_18px]", loading && "opacity-70")}>
        {entries.length === 0 ? (
          <div className="grid h-full place-items-center p-8 text-center">
            <div><LayoutGrid className="mx-auto mb-2 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{loading ? "Loading stations…" : "No stations on the floor map yet."}</p></div>
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
              {entries.map(entry => {
                const cell = layout.cells.get(entry.id)
                if (!cell) return null
                const pick = pickById.get(entry.id)
                const station = floor.find(f => f.id === entry.id)
                const chosen = !!pick && !auto && selected.includes(entry.id)
                const full = !chosen && need > 1 && selected.length >= need
                let tileState: StationState = entry.state
                let caption: string | undefined
                let title: string
                let footnote: string | null = null
                let clickable = false
                let onClick: (() => void) | undefined
                let dimmed = false
                if (pick) {
                  if (canPick) {
                    tileState = pick.available ? "free" : pick.state
                    caption = pick.available ? (chosen ? "Selected" : "Free") : pick.caption
                    title = `${pick.code} · ${pick.fullName}${pick.available ? "" : ` · ${pick.reason}`}`
                    footnote = pick.available ? null : pick.reason
                    clickable = pick.available && !full
                    onClick = () => onToggle(entry.id)
                  } else {
                    caption = pick.caption
                    title = `${pick.code} · ${pick.fullName} · ${pick.reason}`
                  }
                } else {
                  dimmed = true
                  const handler = station ? switchFor(station) : null
                  title = `${entry.code} · ${entry.fullName} · ${STATION_STATE_LABEL[entry.state]}${handler ? ` · Click to book ${entry.typeName}` : ""}`
                  caption = entry.typeName
                  clickable = !!handler
                  onClick = handler || undefined
                }
                return (
                  <div key={entry.id}
                    className={cn("group/cell absolute z-10 transition-opacity duration-150", dimmed && "opacity-35 hover:opacity-80")}
                    style={{ ...pos(cell), width: MAP_CELL_W, height: MAP_CELL_H }}>
                    <StationTile
                      code={entry.code}
                      icon={entry.icon}
                      consoleType={entry.type}
                      state={tileState}
                      progress={station?.progress}
                      caption={caption}
                      title={title}
                      selected={chosen}
                      disabled={disabled || !clickable}
                      onClick={onClick}
                      className={cn(chosen && "border-primary ring-[3px] ring-primary/70 shadow-[0_0_0_6px_hsl(var(--primary)/0.12)]",
                        !clickable && dimmed && "cursor-default")}
                    />
                    {chosen && (
                      <span aria-hidden className="absolute -right-1.5 -top-1.5 z-20 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                    {footnote && <p className="absolute inset-x-0.5 bottom-0 truncate text-[11px] leading-4 text-muted-foreground">{footnote}</p>}
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
        {entries.some(e => !pickById.has(e.id)) && <span className="ml-auto text-[11px] text-muted-foreground">Faded tiles are other consoles. Click one to switch.</span>}
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
