"use client"
import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { BOOKING_URL } from "@/src/config/env"
import { creditAuthHeaders } from "@/lib/credit-auth"
import { layoutStations, type StationState } from "@/lib/station-map"
import { StationTile } from "./station-tile"

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

const MAX_MAP_COLUMNS = 8

/**
 * New session station picker: the floor map in miniature with the same tiles.
 * Free stations can be picked; the rest are disabled with the reason on hover.
 */
export function StationPicker({ stations, selected, auto, need, onAuto, onToggle, disabled, loading, note }: {
  stations: PickerStation[]
  selected: number[]
  auto: boolean
  need: number
  onAuto: () => void
  onToggle: (id: number) => void
  disabled?: boolean
  loading?: boolean
  note?: string
}) {
  const layout = layoutStations(stations.map(s => ({ ...s })), MAX_MAP_COLUMNS)
  let minX = Infinity, minY = Infinity, maxX = 0
  layout.cells.forEach(c => { minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); maxX = Math.max(maxX, c.x) })
  const asMap = Number.isFinite(minX) && maxX - minX < MAX_MAP_COLUMNS
  const freeCount = stations.filter(s => s.available).length
  // Keep the grid compact: drop empty rows between blocks.
  const rows = asMap ? Array.from(new Set(Array.from(layout.cells.values()).map(c => c.y))).sort((a, b) => a - b) : []
  const ordered = [...stations].sort((a, b) => {
    const ca = layout.cells.get(a.id), cb = layout.cells.get(b.id)
    return (ca && cb ? ca.y - cb.y || ca.x - cb.x : 0) || (a.number ?? 1e9) - (b.number ?? 1e9) || a.id - b.id
  })

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <button type="button" role="radio" aria-checked={auto} disabled={disabled} onClick={onAuto}
          className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-50",
            auto ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-foreground hover:bg-muted")}>
          <Sparkles className="h-3.5 w-3.5" />Auto-assign
        </button>
        <span className="text-xs text-muted-foreground">
          {loading ? "Checking stations…" : `${freeCount} of ${stations.length} free for this time${need > 1 ? ` · pick ${need}` : ""}`}
        </span>
        {need > 1 && !auto && <span className="ml-auto text-xs tabular-nums text-muted-foreground">{selected.length}/{need}</span>}
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {stations.length > 0 && (
        <div className={cn("rounded-lg border border-border bg-muted/20 p-2", loading && "opacity-60")} role="group" aria-label="Stations">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${asMap ? maxX - minX + 1 : MAX_MAP_COLUMNS}, minmax(0, 1fr))` }}>
            {ordered.map(s => {
              const cell = layout.cells.get(s.id)
              const chosen = !auto && selected.includes(s.id)
              const full = !chosen && need > 1 && selected.length >= need
              return (
                <StationTile
                  key={s.id}
                  size="sm"
                  code={s.code}
                  icon={s.icon}
                  consoleType={s.type}
                  state={s.available ? "free" : s.state}
                  caption={s.available ? (chosen ? "Selected" : "Free") : s.caption}
                  title={`${s.code} · ${s.fullName}${s.available ? "" : ` · ${s.reason}`}`}
                  selected={chosen}
                  disabled={disabled || !s.available || full}
                  onClick={() => onToggle(s.id)}
                  style={asMap && cell ? { gridColumn: cell.x - minX + 1, gridRow: rows.indexOf(cell.y) + 1 } : undefined}
                />
              )
            })}
          </div>
        </div>
      )}
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
