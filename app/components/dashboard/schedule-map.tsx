"use client"
import { useEffect, useMemo, useState } from "react"
import { Ban, CalendarDays, Clock, Copy, Eye, Info, LogIn, Phone, Play, Power, UserX, UtensilsCrossed, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useDashboardData } from "@/app/context/DashboardDataContext"
import { useTimeFormat } from "@/app/hooks/useTimeFormat"
import { useSocket } from "@/app/context/SocketContext"
import { buildStations, istClockOf, phoneTail, type Station } from "@/lib/station-map"
import { applyLocalPositions, zoomKey } from "@/lib/station-map-storage"
import {
  bookingWindowOf, gapStartAt, liveActions, paymentLabel, upcomingActions, hourlyDensity, istAt, istDayOf, istMinutesOf, slotCapacityFor, stationDayBlocks, windowAvailability,
  type StationWindow, type WindowBooking, type WindowState,
} from "@/lib/schedule-map"
import { CUSTOM_STEP_MINUTES, DURATION_CHIPS, chipDurationLabel, durationLabel, formatRupees } from "@/lib/desk-bill"
import ExtraBookingOverlay from "../extraBookingOverlay"
import MealDetailsModal from "../mealsDetailmodal"
import UpcomingSlotManager from "../upcoming-slot-manager"
import { calculateExtraAmount, calculateExtraTime, formatTime, normalizeLiveSlot, releaseSlot } from "../current-slot"
import { ActionButton, CancelBookingDialog, NoShowDialog, useCheckIn } from "./booking-actions"
import { useFlexQuote, useFlexSettings } from "../booking/flex-start-picker"
import { BookingQuickView } from "../booking-quick-view"
import { FloorCanvas, SELECTED_TILE, SelectedBadge, useStationLayout } from "../station-map/station-picker"
import { StateDot, StationTile } from "../station-map/station-tile"
import type { ConsoleType } from "../types"
import type { BookConsoleEventDetail } from "@/app/lib/cafe-shortcuts"

const DAY = 24 * 60
const STATE_LABEL: Record<WindowState, string> = { free: "Free", booked: "Booked", busy: "In session", offline: "Offline", past: "Past" }
const TILE_STATE = { free: "free", booked: "booked", busy: "busy", offline: "offline", past: "offline" } as const
const ceilTo = (minutes: number, step: number) => Math.ceil(minutes / step) * step
const clockOf = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
const dayLabel = (day: string, today: string) => {
  const date = new Date(`${day}T12:00:00+05:30`)
  const diff = Math.round((date.getTime() - new Date(`${today}T12:00:00+05:30`).getTime()) / 86400000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "Asia/Kolkata" })
}
/** Overview → Schedule: open the map on one booking (its day, start and station). */
export const SCHEDULE_FOCUS_KEY = "hash.schedule.focus"
export function queueScheduleFocus(booking: { start: number; stationId: number | null }) {
  try { sessionStorage.setItem(SCHEDULE_FOCUS_KEY, JSON.stringify({ day: istDayOf(booking.start), startMin: istMinutesOf(booking.start), stationId: booking.stationId })) } catch { /* ignore */ }
}
const addDays = (day: string, n: number) => new Date(new Date(`${day}T12:00:00+05:30`).getTime() + n * 86400000).toISOString().slice(0, 10)

/**
 * Schedule tab: book on the cafe's own floor map. Pick a day, a start on the
 * timeline and a duration; each station of the chosen console type shows
 * whether it is free for exactly that window. A free tile opens New session
 * prefilled with station, day, start and duration.
 */
export function ScheduleMap({ availableConsoles, selectedConsole, onConsoleChange, allSlots, onBook }: {
  availableConsoles: ConsoleType[]
  selectedConsole: string
  onConsoleChange: (type: string) => void
  allSlots: Record<string, any[]>
  onBook: (detail: BookConsoleEventDetail) => void
}) {
  const { vendorId, consoles, landingData, refreshConsoles, refreshLanding } = useDashboardData()
  const { socket, isConnected } = useSocket()
  const { time: showClock } = useTimeFormat()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t) }, [])
  useEffect(() => { if (vendorId) { void refreshConsoles(); void refreshLanding() } }, [vendorId, refreshConsoles, refreshLanding])
  useEffect(() => {
    if (!socket || !isConnected) return
    const refresh = () => { void refreshLanding(true); void refreshConsoles(true) }
    const events = ["booking", "upcoming_booking", "console_availability", "current_slot"]
    events.forEach(e => socket.on(e, refresh))
    return () => events.forEach(e => socket.off(e, refresh))
  }, [socket, isConnected, refreshLanding, refreshConsoles])

  const today = istDayOf(now)
  const flex = useFlexSettings(vendorId)
  const loadedDays = Object.keys(allSlots || {}).filter(d => d >= today).sort()
  // Custom-start cafes can book any day (the quote checks it); slot cafes only the days the inventory loaded.
  const days = flex.flex_enabled ? Array.from({ length: 7 }, (_, i) => addDays(today, i)) : (loadedDays.length ? loadedDays : [today])
  const [day, setDay] = useState(today)
  const [startMin, setStartMin] = useState(() => ceilTo(istMinutesOf(Date.now()), CUSTOM_STEP_MINUTES))
  const [duration, setDuration] = useState(60)
  const [selected, setSelected] = useState<number | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const [details, setDetails] = useState<{ booking: WindowBooking; code: string; name: string } | null>(null)
  const nowMin = istMinutesOf(now)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SCHEDULE_FOCUS_KEY)
      if (!raw) return
      sessionStorage.removeItem(SCHEDULE_FOCUS_KEY)
      const focus = JSON.parse(raw)
      if (typeof focus?.day === "string") setDay(focus.day)
      if (Number.isFinite(focus?.startMin)) setStartMin(Math.max(0, Math.floor(focus.startMin / 5) * 5))
      if (Number(focus?.stationId) > 0) { setSelected(Number(focus.stationId)); window.setTimeout(() => setOpenId(Number(focus.stationId)), 600) }
    } catch { /* ignore */ }
  }, [])
  // Never offer a start in the past.
  useEffect(() => {
    if (!days.includes(day)) setDay(days[0])
    if (day === today && startMin < nowMin - 5) setStartMin(ceilTo(nowMin, CUSTOM_STEP_MINUTES))
  }, [day, today, nowMin, startMin, days])

  const consoleItem = availableConsoles.find(c => c.type === selectedConsole) || availableConsoles[0]
  const gameId = Number(consoleItem?.id) || null
  const layout = useStationLayout(vendorId, true)
  const floor = useMemo(() => applyLocalPositions(buildStations(consoles, landingData, now), layout.local), [consoles, landingData, now, layout.local])
  const stations = useMemo(() => floor.filter(s => (gameId && s.gameId === gameId) || (!!consoleItem?.type && s.type === consoleItem.type)), [floor, gameId, consoleItem])
  const bookings = useMemo<WindowBooking[]>(() => {
    const rows: any[] = [...(Array.isArray(landingData?.upcomingBookings) ? landingData.upcomingBookings : []), ...(Array.isArray(landingData?.currentSlots) ? landingData.currentSlots.filter((r: any) => !r?.awaitingPayment) : [])]
    const seen = new Set<string>()
    return rows.map(bookingWindowOf).filter((b): b is WindowBooking => {
      if (!b) return false
      const key = `${b.bookingId}:${b.stationId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [landingData])

  const window_ = useMemo(() => ({ start: istAt(day, startMin), end: istAt(day, startMin + duration) }), [day, startMin, duration])
  const derived = useMemo(() => windowAvailability(stations, bookings, window_, now, gameId), [stations, bookings, window_, now, gameId])
  // Custom-start cafes: the booking service's quote is the authority on which stations are free.
  const quote = useFlexQuote({
    enabled: flex.flex_enabled && !!gameId && window_.end > now, vendor: vendorId, gameId: gameId || 0, date: day,
    clock: clockOf(startMin), minutes: duration, players: 1, squad: false,
  })
  const quoteStations = quote.quote?.stations || quote.problem?.stations || null
  const availability = useMemo(() => {
    if (!quoteStations) return derived.stations
    const byId = new Map(quoteStations.map(q => [q.console_id, q]))
    const next = new Map<number, StationWindow>()
    derived.stations.forEach((w, id) => {
      const q = byId.get(id)
      if (q && !q.available && w.state === "free") next.set(id, { ...w, state: "booked", freeFrom: q.next_busy_at ? Date.parse(q.next_busy_at) : null })
      else if (q && q.available && w.state === "booked") next.set(id, { ...w, state: "free", booking: null })
      else next.set(id, w)
    })
    return next
  }, [derived.stations, quoteStations])
  let freeTiles = 0
  availability.forEach(w => { if (w.state === "free") freeTiles += 1 })
  const capacity = slotCapacityFor(allSlots?.[day] || [], gameId || 0, day, window_)
  const unassigned = quoteStations ? [] : derived.unassigned
  const freeCount = quoteStations ? freeTiles : Math.max(0, Math.min(freeTiles - unassigned.length, capacity ?? Infinity))

  // Timeline span: the day's slot inventory for this console, else the whole day.
  const daySlots = (allSlots?.[day] || []).filter((s: any) => Number(s?.console_id) === gameId)
  const firstHour = daySlots.length ? Math.min(...daySlots.map((s: any) => Number(String(s.start_time).slice(0, 2)))) : 0
  const lastHour = daySlots.length ? Math.max(...daySlots.map((s: any) => Math.ceil((Number(String(s.end_time).slice(0, 2)) * 60 + Number(String(s.end_time).slice(3, 5))) / 60) || 24)) : 24
  const hours = Array.from({ length: Math.max(1, lastHour - firstHour) }, (_, i) => firstHour + i)
  const density = hourlyDensity(daySlots, gameId || 0, stations.length)

  const station = selected ? stations.find(s => s.id === selected) || null : null
  const blocks = useMemo(() => {
    if (!station) return []
    const list = stationDayBlocks(bookings, station.id, day)
    if ((station.state === "busy" || station.state === "ending") && station.end && istDayOf(station.end) >= day && day === today && !list.some(b => b.booking.bookingId === station.bookingId)) {
      list.push({ start: Math.max(station.start ?? now, istAt(day, 0)), end: Math.min(station.end, istAt(day, DAY)), booking: { bookingId: station.bookingId, name: station.player || "Guest", phone: station.phone, start: station.start ?? now, end: station.end, stationId: station.id, gameId: station.gameId, status: "current" } })
    }
    return list.sort((a, b) => a.start - b.start)
  }, [station, bookings, day, today, now])

  // ---- Booking actions (same flows as the Upcoming list / Gaming Stations map) ----
  const [cancelling, setCancelling] = useState<{ row: any; paid: boolean } | null>(null)
  const [noShow, setNoShow] = useState<any | null>(null)
  const [endSlot, setEndSlot] = useState<any | null>(null)
  const [meals, setMeals] = useState<{ bookingId: string; name: string } | null>(null)
  const [manage, setManage] = useState<{ booking: WindowBooking; code: string; name: string } | null>(null)
  const afterAction = () => { setOpenId(null); void refreshLanding(true); void refreshConsoles(true) }
  const checkIn = useCheckIn(vendorId, afterAction)
  const clockMs = (ms: number) => showClock(istClockOf(ms))
  const copyPhone = (phone: string) => {
    void navigator.clipboard?.writeText(phone).then(() => toast.success("Phone number copied"), () => toast.error("Could not copy"))
  }
  const extend = (st: Station, minutes: number) => {
    if (st.end === null || !consoleItem) return
    setOpenId(null)
    onBook({
      type: st.type, gameId: st.gameId ?? undefined, stationId: st.id,
      startClock: istClockOf(Math.max(st.end, now)), durationMin: minutes,
      customer: st.player ? { name: st.player, phone: st.phone } : undefined,
      extendsBookingId: st.end > now && st.end % 60000 === 0 ? st.bookingId ?? undefined : undefined,
    })
  }

  function UpcomingActions({ booking, code, name, compact }: { booking: WindowBooking; code: string; name: string; compact?: boolean }) {
    const rules = upcomingActions(booking, now, clockMs)
    const row = booking.raw || {}
    return (
      <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-2")}>
        <ActionButton rule={rules.checkIn} tone="primary" className={compact ? "" : "col-span-2"} onClick={() => { setOpenId(null); checkIn.open(row, booking.stationId) }}>
          <LogIn className="h-3.5 w-3.5" />Check in{booking.stationId && !compact ? ` on ${code}` : ""}
        </ActionButton>
        <ActionButton rule={rules.noShow} tone="warning" onClick={() => { setOpenId(null); setNoShow(row) }}><UserX className="h-3.5 w-3.5" />No-show</ActionButton>
        <ActionButton rule={rules.cancel} tone="danger" onClick={() => { setOpenId(null); setCancelling({ row, paid: rules.paid }) }}><Ban className="h-3.5 w-3.5" />Cancel</ActionButton>
        {!compact && <>
          <ActionButton rule={{ enabled: !!booking.phone, reason: "No phone on this booking" }} onClick={() => copyPhone(booking.phone)}><Copy className="h-3.5 w-3.5" />Copy phone</ActionButton>
          <ActionButton rule={{ enabled: true, reason: "" }} onClick={() => { setOpenId(null); setManage({ booking, code, name }) }}><Eye className="h-3.5 w-3.5" />Details & times</ActionButton>
        </>}
      </div>
    )
  }

  function TilePopover({ station: st, window: w, onClose }: { station: Station; window: StationWindow; onClose: () => void }) {
    const live = w.state === "busy"
    const b = w.booking
    const rules = live ? liveActions(st, true) : null
    const pay = b?.raw ? paymentLabel(b.raw) : null
    return (
      <div className="text-sm">
        <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-base font-semibold text-foreground">{st.code}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"><StateDot state={TILE_STATE[w.state]} className="h-1.5 w-1.5" />{live ? "In session" : "Upcoming"}</span>
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{st.typeName} · {st.fullName}</p>
          </div>
          <button type="button" aria-label="Close" className="text-muted-foreground hover:text-foreground" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 px-4 py-3">
          {b ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{b.name}</p>
                {b.phone && <a href={`tel:${b.phone}`} className="mt-0.5 inline-flex items-center gap-1 text-xs tabular-nums text-primary hover:underline"><Phone className="h-3 w-3" />{b.phone}</a>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs tabular-nums text-foreground">{clockMs(b.start)} – {clockMs(b.end)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{b.bookingId ? `#${b.bookingId}` : ""}{pay ? ` · ${pay}` : ""}{live && st.amountDue > 0 ? ` · ${formatRupees(st.amountDue)} due` : ""}</p>
              </div>
            </div>
          ) : <p className="text-xs text-muted-foreground">Taken for part of this time{w.freeFrom ? ` (free from ${clockMs(w.freeFrom)})` : ""}.</p>}

          {live && rules ? <>
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Extend</p>
              <div className="grid grid-cols-3 gap-2">
                {[15, 30, 60].map(m => <ActionButton key={m} rule={rules.extend} onClick={() => extend(st, m)}>+{m === 60 ? "1h" : `${m}m`}</ActionButton>)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ActionButton rule={rules.meals} onClick={() => { onClose(); setMeals({ bookingId: String(st.bookingId), name: st.player || "Guest" }) }}><UtensilsCrossed className="h-3.5 w-3.5" />Add meals</ActionButton>
              <ActionButton rule={rules.end} tone="danger" onClick={() => { onClose(); setEndSlot(normalizeLiveSlot(st.liveSlot)) }}><Power className="h-3.5 w-3.5" />{rules.due ? "End & collect" : "End session"}</ActionButton>
              {b && <ActionButton rule={{ enabled: true, reason: "" }} className="col-span-2" onClick={() => { onClose(); setDetails({ booking: b, code: st.code, name: st.fullName }) }}><Eye className="h-3.5 w-3.5" />Details</ActionButton>}
            </div>
          </> : b ? <UpcomingActions booking={b} code={st.code} name={st.fullName} /> : null}

          {w.freeFrom && istDayOf(w.freeFrom) === day && (
            <button type="button" className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground"
              onClick={() => { onClose(); const at = ceilTo(istMinutesOf(w.freeFrom as number), 5); setStartMin(at); book(st.id, at) }}>
              <Play className="h-3 w-3" />Book {st.code} from {clockMs(w.freeFrom)}
            </button>
          )}
        </div>
      </div>
    )
  }

  const book = (stationId?: number, at = startMin) => {
    if (!consoleItem) return
    onBook({ type: consoleItem.type, gameId: gameId ?? undefined, stationId, date: day, startClock: clockOf(at), durationMin: duration })
  }
  const pickTile = (id: number, state: WindowState) => {
    setSelected(id)
    if (state === "free") { setOpenId(null); book(id) }
    else if (state === "booked" || state === "busy") setOpenId(id)
  }
  const pct = (minutes: number) => `${((minutes - firstHour * 60) / (hours.length * 60)) * 100}%`
  const hourLabel = (h: number) => showClock(clockOf(h * 60)).replace(":00", "").replace(/\s?AM$/i, "a").replace(/\s?PM$/i, "p")
  const windowLabel = `${showClock(clockOf(startMin))} – ${showClock(clockOf((startMin + duration) % DAY))}`

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {/* Controls */}
      <section className="gaming-panel shrink-0 space-y-3 rounded-xl border border-border p-4" aria-label="When">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {availableConsoles.length > 1 && (
            <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1" role="radiogroup" aria-label="Console type">
              {availableConsoles.map(item => {
                const Icon = item.icon
                const active = item.type === consoleItem?.type
                return (
                  <button key={item.type} type="button" role="radio" aria-checked={active} onClick={() => { onConsoleChange(item.type); setSelected(null); setOpenId(null) }}
                    className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                      active ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/40" : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground")}>
                    {Icon && <Icon className="h-4 w-4" />}{item.name}
                  </button>
                )
              })}
            </div>
          )}
          <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1" role="radiogroup" aria-label="Day">
            {days.slice(0, 4).concat(days.slice(4).includes(day) ? [day] : []).map(d => (
              <button key={d} type="button" role="radio" aria-checked={day === d} onClick={() => { setDay(d); setOpenId(null) }}
                className={cn("inline-flex h-8 items-center rounded-md px-3 text-sm font-medium tabular-nums transition-colors",
                  day === d ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/40" : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground")}>
                {dayLabel(d, today)}
              </button>
            ))}
            <label className="relative inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground" title="Pick a date">
              <CalendarDays className="h-4 w-4" />
              <input type="date" aria-label="Date" value={day} min={days[0]} max={days[days.length - 1]}
                onChange={e => { if (days.includes(e.target.value)) { setDay(e.target.value); setOpenId(null) } }}
                className="h-8 w-[8.5rem] bg-transparent text-sm text-foreground [color-scheme:dark] focus:outline-none" />
            </label>
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1" role="radiogroup" aria-label="Duration">
            {DURATION_CHIPS.map(minutes => (
              <button key={minutes} type="button" role="radio" aria-checked={duration === minutes} onClick={() => setDuration(minutes)}
                className={cn("inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors",
                  duration === minutes ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/40" : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground")}>
                {chipDurationLabel(minutes)}
              </button>
            ))}
          </div>
        </div>

        {/* Day timeline / scrubber */}
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground tabular-nums">{windowLabel}</span>
            <span>· {durationLabel(duration)}</span>
            <span className="inline-flex items-center overflow-hidden rounded-md border border-border">
              <button type="button" aria-label="15 minutes earlier" className="grid h-6 w-7 place-items-center hover:bg-muted disabled:opacity-40" disabled={day === today && startMin - CUSTOM_STEP_MINUTES < nowMin - 5} onClick={() => setStartMin(m => Math.max(0, m - CUSTOM_STEP_MINUTES))}>−</button>
              <button type="button" aria-label="15 minutes later" className="grid h-6 w-7 place-items-center border-l border-border hover:bg-muted disabled:opacity-40" disabled={startMin + CUSTOM_STEP_MINUTES >= DAY} onClick={() => setStartMin(m => Math.min(DAY - CUSTOM_STEP_MINUTES, m + CUSTOM_STEP_MINUTES))}>+</button>
            </span>
            <span className="ml-auto hidden items-center gap-3 sm:inline-flex">
              <span className="inline-flex items-center gap-1"><i className="h-2 w-3 rounded-sm bg-emerald-400/70" />Plenty free</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-3 rounded-sm bg-amber-400/70" />Filling</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-3 rounded-sm bg-red-400/70" />Full</span>
            </span>
          </div>
          <div className="relative grid gap-px overflow-hidden rounded-lg border border-border bg-border" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label="Start hour">
            {hours.map(h => {
              const past = day === today && (h + 1) * 60 <= nowMin
              const ratio = density[h]
              const active = startMin >= h * 60 && startMin < (h + 1) * 60
              return (
                <button key={h} type="button" role="radio" aria-checked={active} disabled={past}
                  title={ratio === null ? `${showClock(clockOf(h * 60))}` : `${showClock(clockOf(h * 60))} · ${Math.round(ratio * 100)}% free`}
                  onClick={() => setStartMin(day === today && h * 60 < nowMin ? ceilTo(nowMin, CUSTOM_STEP_MINUTES) : h * 60)}
                  className={cn("flex h-14 flex-col justify-between bg-card px-1 pb-1 pt-1.5 text-left transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:bg-muted/30 disabled:opacity-50",
                    active && "bg-primary/10")}>
                  <span className={cn("whitespace-nowrap text-[10px] tabular-nums leading-none", active ? "text-primary" : "text-muted-foreground")}>{hourLabel(h)}</span>
                  <span className="block h-1.5 w-full rounded-full bg-muted">
                    {ratio !== null && !past && <span className={cn("block h-full rounded-full", ratio > 0.5 ? "bg-emerald-400/70" : ratio > 0 ? "bg-amber-400/70" : "bg-red-400/70")} style={{ width: `${Math.max(8, ratio * 100)}%` }} />}
                  </span>
                </button>
              )
            })}
            {/* Selected window */}
            <span aria-hidden className="pointer-events-none absolute inset-y-0 rounded-md border-2 border-primary/80 bg-primary/10"
              style={{ left: pct(startMin), width: `calc(${pct(Math.min(startMin + duration, lastHour * 60))} - ${pct(startMin)})` }} />
            {day === today && nowMin >= firstHour * 60 && nowMin <= lastHour * 60 && (
              <span aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-red-400" style={{ left: pct(nowMin) }} title="Now" />
            )}
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="gaming-panel flex h-[min(64vh,720px)] min-h-[440px] shrink-0 flex-col rounded-xl border border-border p-4" aria-label="Stations for this time">
        <FloorCanvas
          entries={stations}
          zones={layout.zones}
          zoomStorageKey={zoomKey(vendorId, `schedule.${consoleItem?.type || "all"}`)}
          loading={quote.loading}
          minHeight={320}
          emptyText={`No ${consoleItem?.name || "stations"} on the floor map yet.`}
          toolbar={<div className="min-w-0">
            <p className="text-sm text-foreground"><span className="text-lg font-semibold tabular-nums">{freeCount}</span> <span className="text-muted-foreground">of {stations.length} {consoleItem?.name} free · {dayLabel(day, today)} {windowLabel}</span></p>
            {unassigned.length > 0 && (
              <Popover open={openId === -1} onOpenChange={open => setOpenId(open ? -1 : null)}>
                <PopoverTrigger asChild>
                  <button type="button" className="mt-0.5 flex items-center gap-1 text-left text-xs text-amber-300 hover:underline">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    {unassigned.length} booking{unassigned.length > 1 ? "s" : ""} in this window {unassigned.length > 1 ? "have" : "has"} no station yet, so fewer stations are really free than tiles show. Manage
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={6} className="w-[380px] bg-popover p-0">
                  <p className="border-b border-border px-4 py-2.5 text-sm font-semibold text-foreground">No station yet · {dayLabel(day, today)}</p>
                  <div className="max-h-[360px] divide-y divide-border overflow-y-auto">
                    {unassigned.map(b => (
                      <div key={`${b.bookingId}-${b.start}`} className="space-y-2 px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate font-medium text-foreground">{b.name}</span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{clockMs(b.start)} – {clockMs(b.end)}{b.bookingId ? ` · #${b.bookingId}` : ""}</span>
                        </div>
                        <UpcomingActions booking={b} code="" name={consoleItem?.name || ""} compact />
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {window_.end <= now && <p className="mt-0.5 text-xs text-muted-foreground">This time has passed. Pick a later start.</p>}
          </div>}
          legend={<div className="flex flex-wrap items-center gap-1.5" aria-label="Legend">
            {(["free", "booked", "busy", "offline"] as WindowState[]).map(state => (
              <span key={state} className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[11px] text-muted-foreground">
                <StateDot state={TILE_STATE[state]} />{STATE_LABEL[state]}
              </span>
            ))}
            <span className="ml-auto text-[11px] text-muted-foreground">Click a free station to book it for this time.</span>
          </div>}
          renderTile={s => {
            const w = availability.get(s.id) || { id: s.id, state: "free" as WindowState, booking: null, freeFrom: null }
            const chosen = selected === s.id
            const caption = w.state === "free" ? (chosen ? "Selected" : "Free")
              : w.state === "booked" ? (w.booking?.name || "Booked")
              : w.state === "busy" ? `Till ${showClock(istClockOf(w.freeFrom ?? now))}`
              : STATE_LABEL[w.state]
            const note = w.state === "booked" && w.booking ? `${showClock(istClockOf(w.booking.start))}–${showClock(istClockOf(w.booking.end))}`
              : w.state === "booked" && w.freeFrom ? `Busy till ${showClock(istClockOf(w.freeFrom))}`
              : w.state === "busy" && w.booking ? `${w.booking.name}` : null
            const tile = (
              <StationTile code={s.code} icon={s.icon} consoleType={s.type} state={TILE_STATE[w.state]} progress={w.state === "busy" ? s.progress : 0}
                caption={caption} title={`${s.code} · ${s.fullName} · ${STATE_LABEL[w.state]}${note ? ` · ${note}` : ""}`}
                selected={chosen} disabled={w.state === "offline" || w.state === "past"}
                onClick={() => pickTile(s.id, w.state)} className={cn(chosen && SELECTED_TILE)} />
            )
            return <>
              {(w.state === "booked" || w.state === "busy") ? (
                <Popover open={openId === s.id} onOpenChange={open => setOpenId(open ? s.id : null)}>
                  <PopoverTrigger asChild>{tile}</PopoverTrigger>
                  <PopoverContent side="right" align="start" sideOffset={8} collisionPadding={12} className="w-[300px] bg-popover p-0">
                    <TilePopover station={s} window={w} onClose={() => setOpenId(null)} />
                  </PopoverContent>
                </Popover>
              ) : tile}
              {chosen && <SelectedBadge />}
              {note && <p className="absolute inset-x-0.5 bottom-0 truncate text-[11px] leading-4 tabular-nums text-muted-foreground">{note}</p>}
            </>
          }}
        />
      </section>

      {/* Selected station's day */}
      {station && (
        <section className="gaming-panel shrink-0 rounded-xl border border-border px-4 py-3" aria-label={`${station.code} on ${dayLabel(day, today)}`}>
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="font-semibold text-foreground">{station.code}</span>
            <span className="text-muted-foreground">· {dayLabel(day, today)} · {blocks.length ? `${blocks.length} booking${blocks.length > 1 ? "s" : ""}` : "No bookings"}</span>
            <span className="ml-auto text-xs text-muted-foreground">Click a gap to start there</span>
            <button type="button" aria-label="Close timeline" className="text-muted-foreground hover:text-foreground" onClick={() => setSelected(null)}><X className="h-4 w-4" /></button>
          </div>
          <div className="relative h-10 cursor-pointer overflow-hidden rounded-lg border border-border bg-emerald-500/[0.06]"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const minutes = firstHour * 60 + ((e.clientX - rect.left) / rect.width) * hours.length * 60
              const at = gapStartAt(blocks, day, Math.round(minutes), now)
              if (at !== null) setStartMin(at)
            }}>
            {hours.map((h, i) => i > 0 && <span key={h} aria-hidden className="absolute inset-y-0 w-px bg-border/70" style={{ left: pct(h * 60) }} />)}
            {day === today && <span aria-hidden className="absolute inset-y-0 left-0 bg-muted/60" style={{ width: pct(Math.max(firstHour * 60, nowMin)) }} />}
            {blocks.map(b => {
              const from = Math.max(firstHour * 60, (b.start - istAt(day, 0)) / 60000)
              const to = Math.min(lastHour * 60, (b.end - istAt(day, 0)) / 60000)
              return (
                <span key={`${b.booking.bookingId}-${b.start}`} title={`${b.booking.name} · ${showClock(istClockOf(b.start))}–${showClock(istClockOf(b.end))}`}
                  className={cn("absolute inset-y-1 flex items-center overflow-hidden rounded-md px-1.5 text-[11px] font-medium",
                    b.booking.status === "current" ? "bg-primary/35 text-foreground" : "station-booked-tile border text-foreground")}
                  style={{ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})` }}>
                  <span className="truncate">{b.booking.name}</span>
                </span>
              )
            })}
            <span aria-hidden className="pointer-events-none absolute inset-y-0 rounded-md border-2 border-primary/80"
              style={{ left: pct(startMin), width: `calc(${pct(Math.min(startMin + duration, lastHour * 60))} - ${pct(startMin)})` }} />
          </div>
          <div className="relative mt-1 h-4 text-[10px] tabular-nums text-muted-foreground">
            {hours.filter((_, i) => i % Math.max(1, Math.ceil(hours.length / 8)) === 0).map(h => (
              <span key={h} className="absolute -translate-x-1/2 first:translate-x-0" style={{ left: pct(h * 60) }}>{showClock(clockOf(h * 60)).replace(":00", "")}</span>
            ))}
          </div>
          {availability.get(station.id)?.state === "free" && (
            <div className="mt-2 flex justify-end">
              <Button type="button" size="sm" className="ui-action-primary h-8 gap-1.5" onClick={() => book(station.id)}><Play className="h-3.5 w-3.5" />Book {station.code} · {windowLabel}</Button>
            </div>
          )}
        </section>
      )}

      {checkIn.dialog}
      {cancelling && <CancelBookingDialog booking={cancelling.row} paid={cancelling.paid} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); afterAction() }} />}
      {noShow && <NoShowDialog booking={noShow} onClose={() => setNoShow(null)} onDone={() => { setNoShow(null); afterAction() }} />}
      {meals && <MealDetailsModal isOpen onClose={() => setMeals(null)} bookingId={meals.bookingId} customerName={meals.name} initialMode="add" vendorId={vendorId ? String(vendorId) : undefined} />}
      {endSlot && (
        <ExtraBookingOverlay showOverlay setShowOverlay={open => { if (!open) setEndSlot(null) }} selectedSlot={endSlot} vendorId={vendorId}
          setRefreshSlots={() => afterAction()} setSelectedSlot={setEndSlot}
          calculateExtraTime={calculateExtraTime} calculateExtraAmount={calculateExtraAmount} formatTime={formatTime} releaseSlot={releaseSlot} />
      )}
      {manage && (
        <BookingQuickView open onClose={() => setManage(null)} userId={manage.booking.raw?.userId} booking={{
          bookingId: manage.booking.bookingId, name: manage.booking.name, phone: manage.booking.phone || null, email: manage.booking.raw?.customer_email || null,
          console: `${manage.code} · ${manage.name}`,
          when: `${dayLabel(istDayOf(manage.booking.start), today)} · ${showClock(istClockOf(manage.booking.start))} – ${showClock(istClockOf(manage.booking.end))}`,
          status: manage.booking.status || "Confirmed",
        }}>
          <UpcomingSlotManager booking={manage.booking.raw || {}} vendorId={String(vendorId || "")} onChanged={afterAction}
            onRemove={row => { setManage(null); setCancelling({ row, paid: paymentLabel(row) === "Paid" }) }} />
        </BookingQuickView>
      )}
      {details && (
        <BookingQuickView open onClose={() => setDetails(null)} booking={{
          bookingId: details.booking.bookingId, name: details.booking.name, phone: details.booking.phone || null, email: null,
          console: `${details.code} · ${details.name}`,
          when: `${dayLabel(istDayOf(details.booking.start), today)} · ${showClock(istClockOf(details.booking.start))} – ${showClock(istClockOf(details.booking.end))}`,
          status: details.booking.status || "Confirmed",
        }} />
      )}
    </div>
  )
}
