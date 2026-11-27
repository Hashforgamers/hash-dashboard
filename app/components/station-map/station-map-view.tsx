"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import {
  Check, Clock, Eye, LayoutGrid, Maximize2, Minus, Move, Phone, Play, Plus, Power, RotateCcw, Tag, Trash2, X,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { creditAuthHeaders } from "@/lib/credit-auth"
import { DASHBOARD_URL } from "@/src/config/env"
import { useDashboardData } from "@/app/context/DashboardDataContext"
import { useAccess } from "@/app/context/AccessContext"
import { useSocket } from "@/app/context/SocketContext"
import { useTimeFormat } from "@/app/hooks/useTimeFormat"
import { BOOK_CONSOLE_EVENT, type BookConsoleEventDetail } from "@/app/lib/cafe-shortcuts"
import {
  STATION_STATE_LABEL, buildStations, istClockOf, layoutStations, phoneTail, remainingLabel, stateCounts,
  type Cell, type Station, type StationState, type Zone,
} from "@/lib/station-map"
import { formatRupees } from "@/lib/desk-bill"
import ExtraBookingOverlay from "../extraBookingOverlay"
import { BookingQuickView } from "../booking-quick-view"
import { calculateExtraAmount, calculateExtraTime, formatTime, normalizeLiveSlot, releaseSlot } from "../current-slot"
import { STATE_STYLE, StateDot, StationTile } from "./station-tile"

const CELL_W = 108
const CELL_H = 88
const GAP = 10
const ZOOM_MIN = 0.5
const ZOOM_MAX = 1.6
const DEFAULT_COLUMNS = 10
const LEGEND: StationState[] = ["free", "busy", "ending", "booked", "offline"]
const EXTEND_CHOICES = [15, 30, 60]
const REFRESH_EVENTS = ["console_availability", "booking", "upcoming_booking", "booking_payment_update", "current_slot"]

/** Opens the New session form (mounted on this page) for one station. */
export function requestStationBooking(detail: BookConsoleEventDetail): boolean {
  return !window.dispatchEvent(new CustomEvent<BookConsoleEventDetail>(BOOK_CONSOLE_EVENT, { detail, cancelable: true }))
}

const cellKey = (cell: Cell) => `${cell.x}:${cell.y}`
const at = (cell: Cell) => ({ left: cell.x * (CELL_W + GAP), top: cell.y * (CELL_H + GAP) })

export function StationMapView() {
  const { vendorId, consoles, landingData, refreshConsoles, refreshLanding, consolesLoading } = useDashboardData()
  const { can } = useAccess()
  const { socket, isConnected, joinVendor } = useSocket()
  const { time: showClock } = useTimeFormat()
  const canBook = can("booking.manage")
  const canArrange = can("gaming.manage")

  const [now, setNow] = useState(() => Date.now())
  const [savedZones, setSavedZones] = useState<Zone[] | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [zoom, setZoom] = useState(1)
  const [openId, setOpenId] = useState<number | null>(null)
  const [arranging, setArranging] = useState(false)
  const [draftCells, setDraftCells] = useState<Map<number, Cell>>(new Map())
  const [draftZones, setDraftZones] = useState<Zone[]>([])
  const [dragging, setDragging] = useState<{ kind: "station" | "zone"; id: number } | null>(null)
  const [editingZone, setEditingZone] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [endSlot, setEndSlot] = useState<any | null>(null)
  const [details, setDetails] = useState<Station | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const loadZones = useCallback(async () => {
    if (!vendorId) return
    try {
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/station-map`, { headers: creditAuthHeaders() })
      const data = res.ok ? await res.json() : null
      setSavedZones(Array.isArray(data?.zones) ? data.zones : [])
    } catch {
      setSavedZones([]) // map still works with auto-placed stations
    }
  }, [vendorId])

  const refreshAll = useCallback(() => {
    void refreshConsoles(true)
    void refreshLanding(true)
  }, [refreshConsoles, refreshLanding])

  useEffect(() => {
    if (!vendorId) return
    void refreshConsoles()
    void refreshLanding()
    void loadZones()
  }, [vendorId, refreshConsoles, refreshLanding, loadZones])

  // Live status: the same socket events the dashboard already listens to.
  const pending = useRef<number | null>(null)
  useEffect(() => {
    if (!socket || !vendorId || !isConnected) return
    joinVendor(vendorId)
    const handler = (data: any) => {
      const eventVendor = Number(data?.vendorId ?? data?.vendor_id)
      if (eventVendor && eventVendor !== vendorId) return
      if (pending.current) window.clearTimeout(pending.current)
      pending.current = window.setTimeout(refreshAll, 400)
    }
    // Additive event from the station-map save endpoint (another screen rearranged the floor).
    const onMap = (data: any) => {
      if (Number(data?.vendor_id) !== vendorId) return
      void loadZones()
      void refreshConsoles(true)
    }
    REFRESH_EVENTS.forEach(event => socket.on(event, handler))
    socket.on("station_map_updated", onMap)
    return () => {
      REFRESH_EVENTS.forEach(event => socket.off(event, handler))
      socket.off("station_map_updated", onMap)
      if (pending.current) window.clearTimeout(pending.current)
    }
  }, [socket, vendorId, isConnected, joinVendor, refreshAll, loadZones, refreshConsoles])

  useEffect(() => {
    const onRefresh = () => refreshAll()
    window.addEventListener("refresh-dashboard", onRefresh)
    const poll = window.setInterval(refreshAll, 60_000)
    return () => { window.removeEventListener("refresh-dashboard", onRefresh); window.clearInterval(poll) }
  }, [refreshAll])

  const stations = useMemo(() => buildStations(consoles, landingData, now), [consoles, landingData, now])
  const types = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    stations.forEach(s => map.set(s.type, { name: s.typeName, count: (map.get(s.type)?.count || 0) + 1 }))
    return Array.from(map, ([type, v]) => ({ type, ...v }))
  }, [stations])
  const counts = useMemo(() => stateCounts(stations), [stations])
  const occupied = counts.busy + counts.ending

  const layout = useMemo(() => layoutStations(stations, DEFAULT_COLUMNS), [stations])
  const liveZones = useMemo(() => {
    const zones = savedZones ?? []
    // Suggest a label for each auto-placed console block the cafe has not labelled yet.
    return [...zones, ...layout.autoZones.filter(z => !zones.some(s => s.y === z.y))]
  }, [savedZones, layout.autoZones])

  const cells = arranging ? draftCells : layout.cells
  const zones = arranging ? draftZones : liveZones
  const extent = useMemo(() => {
    let cols = DEFAULT_COLUMNS, rows = 1
    cells.forEach(c => { cols = Math.max(cols, c.x + 1); rows = Math.max(rows, c.y + 1) })
    zones.forEach(z => { cols = Math.max(cols, z.x + z.w); rows = Math.max(rows, z.y + 1) })
    if (arranging) { cols += 2; rows += 2 } // room to drag into
    return { cols, rows }
  }, [cells, zones, arranging])
  const canvasW = extent.cols * (CELL_W + GAP) - GAP
  const canvasH = extent.rows * (CELL_H + GAP) - GAP

  const fit = useCallback(() => {
    const box = viewportRef.current
    if (!box) return
    const scale = Math.min((box.clientWidth - 32) / canvasW, (box.clientHeight - 32) / canvasH, 1.25)
    setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(scale.toFixed(2)))))
  }, [canvasW, canvasH])
  const fittedOnce = useRef(false)
  useEffect(() => {
    if (fittedOnce.current || stations.length === 0) return
    fittedOnce.current = true
    fit()
  }, [stations.length, fit])

  // ---- Arrange mode ----
  const startArrange = () => {
    setOpenId(null)
    setDraftCells(new Map(layout.cells))
    setDraftZones(liveZones.map(z => ({ ...z })))
    setArranging(true)
  }
  const cancelArrange = () => { setArranging(false); setEditingZone(null); setDragging(null) }
  const dropOn = (target: Cell) => {
    if (!dragging) return
    if (dragging.kind === "zone") {
      setDraftZones(list => list.map((z, i) => i === dragging.id ? { ...z, x: target.x, y: target.y } : z))
    } else {
      setDraftCells(prev => {
        const next = new Map(prev)
        const from = next.get(dragging.id)
        const occupant = Array.from(next).find(([, c]) => c.x === target.x && c.y === target.y)?.[0]
        if (occupant !== undefined && occupant !== dragging.id && from) next.set(occupant, from) // swap
        next.set(dragging.id, target)
        return next
      })
    }
    setDragging(null)
  }
  const autoArrange = () => {
    const fresh = layoutStations(stations.map(s => ({ ...s, mapX: null, mapY: null })), DEFAULT_COLUMNS)
    setDraftCells(new Map(fresh.cells))
    setDraftZones(fresh.autoZones)
  }
  const addZone = () => {
    const y = extent.rows - (arranging ? 2 : 0)
    setDraftZones(list => [...list, { label: "New zone", x: 0, y: Math.max(0, y), w: 4 }])
    setEditingZone(draftZones.length)
  }
  const saveArrange = async () => {
    if (!vendorId) return
    setSaving(true)
    try {
      const body = {
        positions: stations.map(s => {
          const c = draftCells.get(s.id)
          return { console_id: s.id, x: c ? c.x : null, y: c ? c.y : null }
        }),
        zones: draftZones.filter(z => z.label.trim()).map(z => ({ ...z, label: z.label.trim().slice(0, 40) })),
      }
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/station-map`, {
        method: "PUT", headers: creditAuthHeaders(), body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Could not save the layout")
      setSavedZones(Array.isArray(data?.zones) ? data.zones : body.zones)
      await refreshConsoles(true)
      setArranging(false)
      setEditingZone(null)
      toast.success("Floor map saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the layout")
    } finally {
      setSaving(false)
    }
  }

  // ---- Actions ----
  const startSession = (s: Station) => {
    setOpenId(null)
    const handled = requestStationBooking({ type: s.type, gameId: s.gameId ?? undefined, stationId: s.id })
    if (!handled) toast.info("Booking form is still loading. Try again in a moment.")
  }
  const extend = (s: Station, minutes: number) => {
    if (s.end === null) return
    setOpenId(null)
    const handled = requestStationBooking({
      type: s.type, gameId: s.gameId ?? undefined, stationId: s.id,
      startClock: istClockOf(Math.max(s.end, now)), durationMin: minutes,
      customer: s.player ? { name: s.player, phone: s.phone } : undefined,
      // Custom-start cafes chain the extension to the booking; it must start exactly at its end.
      extendsBookingId: s.end > now && s.end % 60000 === 0 ? s.bookingId ?? undefined : undefined,
    })
    if (!handled) toast.info("Booking form is still loading. Try again in a moment.")
  }
  const endSession = (s: Station) => {
    if (!s.liveSlot) return
    setOpenId(null)
    setEndSlot(normalizeLiveSlot(s.liveSlot))
  }

  const tileCaption = (s: Station) => {
    if (s.state === "busy" || s.state === "ending") return remainingLabel(s.remainingMs)
    if (s.state === "booked" && s.upcoming[0]) return `Booked · ${Math.max(1, Math.round((s.upcoming[0].start - now) / 60000))}m`
    return undefined
  }
  // Small line under the tile: money for live sessions, the next booking otherwise.
  const tileFootnote = (s: Station): { text: string; tone: string } | null => {
    if (s.state === "busy" || s.state === "ending") {
      return s.amountDue > 0 ? { text: `${formatRupees(s.amountDue)} due`, tone: "text-amber-300" } : { text: "Paid", tone: "text-emerald-400/80" }
    }
    const next = s.upcoming[0]
    if (!next) return null
    return { text: s.state === "booked" ? `${showClock(istClockOf(next.start))} · ${next.name}` : `Next ${showClock(istClockOf(next.start))}`, tone: "text-muted-foreground" }
  }

  const loading = consolesLoading && stations.length === 0

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Summary + controls */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{occupied}<span className="text-muted-foreground">/{stations.length}</span></span>
          <span className="text-sm text-muted-foreground">occupied</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Station status">
          {LEGEND.map(state => (
            <span key={state} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs text-muted-foreground">
              <StateDot state={state} />
              {STATION_STATE_LABEL[state]}
              <span className={cn("font-semibold tabular-nums", counts[state] ? STATE_STYLE[state].text : "text-muted-foreground")}>{counts[state]}</span>
            </span>
          ))}
        </div>
        <span className={cn("text-xs", isConnected ? "text-emerald-400" : "text-amber-400")}>{isConnected ? "Live" : "Syncing"}</span>
        <div className="ml-auto flex items-center gap-2">
          {!arranging && (
            <div className="inline-flex items-center rounded-lg border border-border bg-card" role="group" aria-label="Zoom">
              <button type="button" aria-label="Zoom out" className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom(z => Math.max(ZOOM_MIN, +(z - 0.1).toFixed(2)))}><Minus className="h-4 w-4" /></button>
              <span className="w-11 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <button type="button" aria-label="Zoom in" className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom(z => Math.min(ZOOM_MAX, +(z + 0.1).toFixed(2)))}><Plus className="h-4 w-4" /></button>
              <button type="button" aria-label="Fit to screen" title="Fit" className="grid h-8 w-8 place-items-center border-l border-border text-muted-foreground hover:text-foreground" onClick={fit}><Maximize2 className="h-3.5 w-3.5" /></button>
            </div>
          )}
          {canArrange && !arranging && (
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={startArrange}><Move className="h-3.5 w-3.5" />Arrange</Button>
          )}
        </div>
      </div>

      {/* Filters / arrange toolbar */}
      {arranging ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/[0.06] px-3 py-2">
          <Move className="h-4 w-4 text-primary" />
          <p className="text-sm text-foreground">Drag stations and labels onto the grid. Drop on a station to swap.</p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={addZone}><Tag className="h-3.5 w-3.5" />Add zone label</Button>
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={autoArrange}><RotateCcw className="h-3.5 w-3.5" />Auto-arrange</Button>
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={cancelArrange} disabled={saving}>Cancel</Button>
            <Button type="button" size="sm" className="h-8 gap-1.5" onClick={saveArrange} disabled={saving}><Check className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save layout"}</Button>
          </div>
        </div>
      ) : types.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Console type">
          {[{ type: "all", name: "All stations", count: stations.length }, ...types].map(t => (
            <button key={t.type} type="button" role="radio" aria-checked={typeFilter === t.type} onClick={() => setTypeFilter(t.type)}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                typeFilter === t.type ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground")}>
              {t.name}<span className="tabular-nums opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div ref={viewportRef} className="relative min-h-[420px] flex-1 overflow-auto rounded-lg border border-border bg-[radial-gradient(hsl(var(--foreground)/0.06)_1px,transparent_1px)] [background-size:18px_18px]">
        {loading ? (
          <p role="status" className="p-6 text-sm text-muted-foreground">Loading stations…</p>
        ) : stations.length === 0 ? (
          <div className="grid h-full place-items-center p-8 text-center">
            <div><LayoutGrid className="mx-auto mb-2 h-8 w-8 text-muted-foreground" /><p className="text-sm font-medium text-foreground">No stations yet</p><p className="mt-1 text-xs text-muted-foreground">Add a console to see it on the floor map.</p></div>
          </div>
        ) : (
          <div className="p-4" style={{ width: canvasW * zoom + 32, height: canvasH * zoom + 32 }}>
            <div className="relative origin-top-left" style={{ width: canvasW, height: canvasH, transform: `scale(${zoom})` }}>
              {arranging && Array.from({ length: extent.rows * extent.cols }, (_, i) => {
                const cell = { x: i % extent.cols, y: Math.floor(i / extent.cols) }
                return <div key={cellKey(cell)} className="absolute rounded-lg border border-dashed border-foreground/10"
                  style={{ ...at(cell), width: CELL_W, height: CELL_H }}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move" }}
                  onDrop={e => { e.preventDefault(); dropOn(cell) }} />
              })}

              {zones.map((zone, index) => (
                <div key={`zone-${index}`} className={cn("absolute flex items-end pb-1", arranging ? "z-20" : "pointer-events-none z-0")}
                  style={{ ...at(zone), width: zone.w * (CELL_W + GAP) - GAP, height: CELL_H }}
                  onDragOver={arranging ? e => e.preventDefault() : undefined}
                  onDrop={arranging ? e => { e.preventDefault(); dropOn({ x: zone.x, y: zone.y }) } : undefined}>
                  {arranging && editingZone === index ? (
                    <span className="flex w-full items-center gap-1 rounded-md border border-primary/50 bg-card p-1">
                      <input autoFocus value={zone.label} maxLength={40} aria-label="Zone label"
                        onChange={e => setDraftZones(list => list.map((z, i) => i === index ? { ...z, label: e.target.value } : z))}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingZone(null) }}
                        className="h-7 min-w-0 flex-1 rounded bg-transparent px-1.5 text-sm text-foreground outline-none" />
                      <button type="button" aria-label="Narrower" className="grid h-7 w-6 place-items-center text-muted-foreground hover:text-foreground" onClick={() => setDraftZones(list => list.map((z, i) => i === index ? { ...z, w: Math.max(1, z.w - 1) } : z))}><Minus className="h-3 w-3" /></button>
                      <button type="button" aria-label="Wider" className="grid h-7 w-6 place-items-center text-muted-foreground hover:text-foreground" onClick={() => setDraftZones(list => list.map((z, i) => i === index ? { ...z, w: Math.min(24, z.w + 1) } : z))}><Plus className="h-3 w-3" /></button>
                      <button type="button" aria-label="Remove label" className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-red-300" onClick={() => { setDraftZones(list => list.filter((_, i) => i !== index)); setEditingZone(null) }}><Trash2 className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label="Done" className="grid h-7 w-7 place-items-center text-primary" onClick={() => setEditingZone(null)}><Check className="h-3.5 w-3.5" /></button>
                    </span>
                  ) : (
                    <span draggable={arranging}
                      onDragStart={arranging ? e => { e.dataTransfer.effectAllowed = "move"; setDragging({ kind: "zone", id: index }) } : undefined}
                      onDragEnd={() => setDragging(null)}
                      onClick={arranging ? () => setEditingZone(index) : undefined}
                      className={cn("flex w-full items-center gap-2 border-b border-border pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                        arranging && "cursor-grab rounded-md border border-dashed border-foreground/20 bg-card/80 px-2 py-1.5 hover:border-primary/60")}>
                      <Tag className="h-3 w-3 opacity-70" />{zone.label}
                    </span>
                  )}
                </div>
              ))}

              {stations.map(s => {
                const cell = cells.get(s.id)
                if (!cell) return null
                const dimmed = !arranging && typeFilter !== "all" && s.type !== typeFilter
                const tile = (
                  <StationTile
                    code={s.code}
                    consoleType={s.type}
                    icon={s.icon}
                    state={s.state}
                    progress={s.progress}
                    caption={arranging ? s.typeName : tileCaption(s)}
                    title={`${s.code} · ${s.fullName} · ${STATION_STATE_LABEL[s.state]}`}
                    selected={!arranging && openId === s.id}
                    dragging={dragging?.kind === "station" && dragging.id === s.id}
                    draggable={arranging}
                    onDragStart={arranging ? e => { e.dataTransfer.effectAllowed = "move"; setDragging({ kind: "station", id: s.id }) } : undefined}
                    onDragEnd={() => setDragging(null)}
                    onDragOver={arranging ? e => e.preventDefault() : undefined}
                    onDrop={arranging ? e => { e.preventDefault(); dropOn(cell) } : undefined}
                    className={cn(arranging && "cursor-grab active:cursor-grabbing")}
                  />
                )
                const note = arranging ? null : tileFootnote(s)
                return (
                  <div key={s.id} className={cn("absolute z-10 transition-[left,top,opacity] duration-200", dimmed && "pointer-events-none opacity-20")}
                    style={{ ...at(cell), width: CELL_W, height: CELL_H }}>
                    {note && <p className={cn("absolute inset-x-0.5 bottom-0 truncate text-[11px] leading-4 tabular-nums", note.tone)}>{note.text}</p>}
                    {arranging ? tile : (
                      <Popover open={openId === s.id} onOpenChange={open => setOpenId(open ? s.id : null)}>
                        <PopoverTrigger asChild>{tile}</PopoverTrigger>
                        <PopoverContent side="right" align="start" sideOffset={8} collisionPadding={12} className="w-[320px] bg-popover p-0">
                          <StationPopover station={s} now={now} showClock={showClock} canBook={canBook}
                            onStart={() => startSession(s)} onExtend={m => extend(s, m)} onEnd={() => endSession(s)}
                            onDetails={() => { setOpenId(null); setDetails(s) }} onClose={() => setOpenId(null)} />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {mounted && createPortal(
        <ExtraBookingOverlay
          showOverlay={!!endSlot}
          setShowOverlay={open => { if (!open) setEndSlot(null) }}
          selectedSlot={endSlot}
          vendorId={vendorId}
          setRefreshSlots={() => refreshAll()}
          setSelectedSlot={setEndSlot}
          calculateExtraTime={calculateExtraTime}
          calculateExtraAmount={calculateExtraAmount}
          formatTime={formatTime}
          releaseSlot={releaseSlot}
        />,
        document.body,
      )}
      {details && (
        <BookingQuickView open onClose={() => setDetails(null)} userId={details.userId}
          booking={{
            bookingId: details.bookingId, name: details.player || "Guest", phone: details.phone || null, email: null,
            console: `${details.code} · ${details.fullName}`,
            when: details.start !== null && details.end !== null ? `${showClock(istClockOf(details.start))} – ${showClock(istClockOf(details.end))}` : null,
            status: STATION_STATE_LABEL[details.state],
          }} />
      )}
    </div>
  )
}

function StationPopover({ station: s, now, showClock, canBook, onStart, onExtend, onEnd, onDetails, onClose }: {
  station: Station
  now: number
  showClock: (value: string) => string
  canBook: boolean
  onStart: () => void
  onExtend: (minutes: number) => void
  onEnd: () => void
  onDetails: () => void
  onClose: () => void
}) {
  const live = s.state === "busy" || s.state === "ending"
  const tail = phoneTail(s.phone)
  const clock = (ms: number) => showClock(istClockOf(ms))
  const label = "text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
  return (
    <div className="text-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold leading-none text-foreground">{s.code}</span>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", STATE_STYLE[s.state].tile.split(" hover:")[0], STATE_STYLE[s.state].text)}>
              <StateDot state={s.state} className="h-1.5 w-1.5" />{STATION_STATE_LABEL[s.state]}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={s.fullName}>{s.typeName} · {s.fullName}</p>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="-mr-1 grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      {live && (
        <div className="space-y-3 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{s.player || "Guest"}</p>
              {tail && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />•••• {tail}</p>}
            </div>
            <div className="text-right">
              <p className={cn("text-lg font-semibold tabular-nums leading-none", s.state === "ending" ? "text-amber-300" : "text-foreground")}>{remainingLabel(s.remainingMs)}</p>
              {s.start !== null && s.end !== null && <p className="mt-1 text-xs tabular-nums text-muted-foreground">{clock(s.start)} – {clock(s.end)}</p>}
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", STATE_STYLE[s.state].bar)} style={{ width: `${Math.round(s.progress * 100)}%` }} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div><dt className={label}>Rate</dt><dd className="mt-0.5 text-foreground">{s.slotPrice != null ? `${formatRupees(s.slotPrice)} / slot` : s.typeName}</dd></div>
            <div><dt className={label}>Amount</dt><dd className={cn("mt-0.5 tabular-nums", s.amountDue > 0 ? "text-amber-300" : "text-emerald-300")}>{s.amountDue > 0 ? `${formatRupees(s.amountDue)} due` : "Paid"}</dd></div>
          </dl>
          {canBook && s.end !== null && (
            <div>
              <p className={label}>Extend</p>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {EXTEND_CHOICES.map(m => (
                  <button key={m} type="button" onClick={() => onExtend(m)}
                    className="h-8 rounded-md border border-border bg-card text-xs font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-primary/10">
                    +{m < 60 ? `${m}m` : "1h"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-b border-border px-4 py-3">
        <p className={label}>Next bookings</p>
        {s.upcoming.length ? (
          <ul className="mt-1.5 space-y-1.5">
            {s.upcoming.map((b, i) => (
              <li key={`${b.bookingId}-${i}`} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 text-foreground"><Clock className="h-3 w-3 shrink-0 text-muted-foreground" /><span className="truncate">{b.name}</span></span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{clock(b.start)} – {clock(b.end)}{b.start > now && b.start - now < 3600000 ? ` · in ${Math.max(1, Math.round((b.start - now) / 60000))}m` : ""}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-1 text-xs text-muted-foreground">Nothing booked on this station.</p>}
      </div>

      <div className="flex items-center gap-2 px-4 py-3">
        {s.state === "free" || s.state === "booked" ? (
          <Button type="button" size="sm" className="h-9 flex-1 gap-1.5" disabled={!canBook} onClick={onStart}><Play className="h-3.5 w-3.5" />Start session</Button>
        ) : live && s.liveSlot ? (
          <Button type="button" size="sm" variant="soft-danger" className="h-9 flex-1 gap-1.5" disabled={!canBook} onClick={onEnd}><Power className="h-3.5 w-3.5" />End session</Button>
        ) : live ? (
          <a href="/dashboard" className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-border text-xs text-muted-foreground hover:text-foreground">Open in Live sessions</a>
        ) : (
          <p className="flex-1 text-xs text-muted-foreground">Under maintenance. Change it in the List view.</p>
        )}
        {live && <Button type="button" size="sm" variant="ghost" className="h-9 gap-1.5" onClick={onDetails}><Eye className="h-3.5 w-3.5" />Details</Button>}
      </div>
    </div>
  )
}
