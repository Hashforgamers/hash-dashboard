// Map-based Dashboard: pure helpers (no imports at runtime) for the Overview KPIs and
// the Schedule map's per-station availability for a chosen window. Times are
// epoch ms; wall-clock times are IST like the rest of the desk.

import type { Station } from "./station-map"

const IST_OFFSET_MS = 330 * 60 * 1000
const MINUTE = 60_000

export type WindowState = "free" | "booked" | "busy" | "offline" | "past"

export type WindowBooking = {
  bookingId: number | null
  name: string
  phone: string
  start: number
  end: number
  stationId: number | null
  gameId: number | null
  status: string
}

export type StationWindow = {
  id: number
  state: WindowState
  booking: WindowBooking | null // the overlapping booking (or live session) that blocks it
  freeFrom: number | null // when a busy/booked station frees up
}

function idOf(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function dateKey(value: unknown): string | null {
  const text = String(value ?? "").trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const parsed = Date.parse(text)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : null
}

function clockMinutes(value: unknown): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i.exec(String(value ?? "").trim())
  if (!match) return null
  const meridiem = match[3]?.toUpperCase()
  let hours = Number(match[1]) % (meridiem ? 12 : 24)
  if (meridiem === "PM") hours += 12
  return hours * 60 + Number(match[2])
}

/** Epoch ms for an IST wall-clock time ("HH:MM", 0..1440 minutes) on a yyyy-mm-dd date. */
export function istAt(day: string, minutes: number): number {
  const [y, m, d] = day.split("-").map(Number)
  return Date.UTC(y, m - 1, d, 0, minutes) - IST_OFFSET_MS
}

export function istDayOf(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10)
}

export function istMinutesOf(ms: number): number {
  const d = new Date(ms + IST_OFFSET_MS)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

/** A landing-page booking row (upcomingBookings / currentSlots) as a time window. */
export function bookingWindowOf(row: any): WindowBooking | null {
  let start = Date.parse(row?.startAt || row?.start_at || "")
  let end = Date.parse(row?.endAt || row?.end_at || "")
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    const [startClock, endClock] = String(row?.time || "").split(" - ")
    const day = dateKey(row?.date)
    const s = clockMinutes(row?.startTime ?? startClock)
    const e = clockMinutes(row?.endTime ?? endClock)
    if (!day || s === null || e === null) return null
    start = istAt(day, s)
    end = istAt(day, e)
    if (end <= start) end += 24 * 60 * MINUTE
  }
  return {
    bookingId: idOf(row?.bookingId ?? row?.bookId),
    name: String(row?.username || "Guest"),
    phone: String(row?.customer_phone || ""),
    start, end,
    stationId: idOf(row?.consoleId ?? row?.console_id),
    gameId: idOf(row?.game_id ?? row?.gameId),
    status: String(row?.status || ""),
  }
}

export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end
}

/**
 * Availability of each station for one window (date + start + duration).
 * - past: the window has already ended.
 * - offline: station under maintenance.
 * - busy: a live session runs into the window.
 * - booked: a booking assigned to this station overlaps the window.
 * - free: nothing known blocks it.
 * Bookings without a station still take capacity: they are returned as
 * `unassigned` so the header can lower the "free" count instead of misleading.
 */
export function windowAvailability(
  stations: Pick<Station, "id" | "state" | "end" | "bookingId" | "player" | "phone" | "start" | "gameId">[],
  bookings: WindowBooking[],
  window: { start: number; end: number },
  now: number,
  gameId: number | null,
): { stations: Map<number, StationWindow>; unassigned: WindowBooking[]; freeCount: number } {
  const result = new Map<number, StationWindow>()
  const ids = new Set(stations.map(s => s.id))
  const relevant = bookings.filter(b => overlaps(b, window) && !/cancel|reject|no_show|discard/i.test(b.status))
  const past = window.end <= now
  for (const s of stations) {
    if (past) { result.set(s.id, { id: s.id, state: "past", booking: null, freeFrom: null }); continue }
    if (s.state === "offline") { result.set(s.id, { id: s.id, state: "offline", booking: null, freeFrom: null }); continue }
    const live = (s.state === "busy" || s.state === "ending") && s.end !== null && s.end > window.start
    if (live) {
      result.set(s.id, {
        id: s.id, state: "busy", freeFrom: s.end,
        booking: { bookingId: s.bookingId, name: s.player || "Guest", phone: s.phone, start: s.start ?? now, end: s.end as number, stationId: s.id, gameId: s.gameId, status: "current" },
      })
      continue
    }
    const hit = relevant.filter(b => b.stationId === s.id && b.bookingId !== s.bookingId).sort((a, b) => a.start - b.start)[0]
    if (hit) { result.set(s.id, { id: s.id, state: "booked", booking: hit, freeFrom: hit.end }); continue }
    result.set(s.id, { id: s.id, state: "free", booking: null, freeFrom: null })
  }
  const unassigned = relevant.filter(b => (b.stationId === null || !ids.has(b.stationId)) && (gameId === null || b.gameId === null || b.gameId === gameId))
  let free = 0
  result.forEach(w => { if (w.state === "free") free += 1 })
  return { stations: result, unassigned, freeCount: Math.max(0, free - unassigned.length) }
}

/** Bookings for one station on one IST day, clipped to the day, for the station timeline. */
export function stationDayBlocks(bookings: WindowBooking[], stationId: number, day: string): { start: number; end: number; booking: WindowBooking }[] {
  const dayStart = istAt(day, 0)
  const dayEnd = dayStart + 24 * 60 * MINUTE
  return bookings
    .filter(b => b.stationId === stationId && overlaps(b, { start: dayStart, end: dayEnd }) && !/cancel|reject|no_show|discard/i.test(b.status))
    .map(b => ({ start: Math.max(b.start, dayStart), end: Math.min(b.end, dayEnd), booking: b }))
    .sort((a, b) => a.start - b.start)
}

/** Start of the free gap containing `at` (minutes into the day), snapped to `step`, or null if `at` is booked. */
export function gapStartAt(blocks: { start: number; end: number }[], day: string, atMinutes: number, now: number, step = 15): number | null {
  const at = istAt(day, atMinutes)
  if (blocks.some(b => at >= b.start && at < b.end)) return null
  const snapped = Math.floor(atMinutes / step) * step
  let minutes = snapped
  // Don't start inside the previous block or in the past.
  const prevEnd = blocks.filter(b => b.end <= at).reduce((m, b) => Math.max(m, b.end), 0)
  if (prevEnd && istAt(day, minutes) < prevEnd) minutes = istMinutesOf(prevEnd)
  if (istAt(day, minutes) < now && istDayOf(now) === day) minutes = Math.ceil(istMinutesOf(now) / step) * step
  return minutes >= 24 * 60 ? null : minutes
}

/**
 * Hourly availability for the day scrubber, from the slot inventory the
 * Schedule already loads (getSlotsBatch): free units / capacity per hour.
 */
export function hourlyDensity(slots: any[], gameId: number, capacity: number): (number | null)[] {
  const hours: (number | null)[] = Array.from({ length: 24 }, () => null)
  if (!capacity) return hours
  for (const slot of Array.isArray(slots) ? slots : []) {
    if (Number(slot?.console_id) !== gameId) continue
    const start = clockMinutes(String(slot?.start_time || "").slice(0, 5))
    if (start === null) continue
    const hour = Math.floor(start / 60)
    const free = slot?.is_available === false ? 0 : Math.max(0, Number(slot?.available_slot) || 0)
    const ratio = Math.min(1, free / capacity)
    hours[hour] = hours[hour] === null ? ratio : Math.min(hours[hour] as number, ratio)
  }
  return hours
}

/** Smallest free-unit count over the slots a window covers (null when the inventory has no slot there). */
export function slotCapacityFor(slots: any[], gameId: number, day: string, window: { start: number; end: number }): number | null {
  let min: number | null = null
  for (const slot of Array.isArray(slots) ? slots : []) {
    if (Number(slot?.console_id) !== gameId) continue
    const s = clockMinutes(String(slot?.start_time || "").slice(0, 5))
    const e = clockMinutes(String(slot?.end_time || "").slice(0, 5))
    if (s === null || e === null) continue
    const span = { start: istAt(day, s), end: istAt(day, e <= s ? e + 1440 : e) }
    if (!overlaps(span, window)) continue
    const free = slot?.is_available === false ? 0 : Math.max(0, Number(slot?.available_slot) || 0)
    min = min === null ? free : Math.min(min, free)
  }
  return min
}

export type OverviewKpis = {
  total: number
  occupied: number
  live: number
  endingSoon: number
  overtime: number
  upcomingHour: number
  unpaidLive: number
}

export function overviewKpis(stations: Pick<Station, "state" | "remainingMs" | "amountDue">[], upcoming: WindowBooking[], now: number): OverviewKpis {
  const live = stations.filter(s => s.state === "busy" || s.state === "ending")
  return {
    total: stations.length,
    occupied: live.length,
    live: live.length,
    endingSoon: live.filter(s => s.remainingMs !== null && s.remainingMs >= 0 && s.remainingMs <= 10 * MINUTE).length,
    overtime: live.filter(s => s.remainingMs !== null && s.remainingMs < 0).length,
    upcomingHour: upcoming.filter(b => b.start >= now - 5 * MINUTE && b.start <= now + 60 * MINUTE && !/cancel|reject/i.test(b.status)).length,
    unpaidLive: live.filter(s => s.amountDue > 0).length,
  }
}

export type AttentionItem = { stationId: number; kind: "overtime" | "ending" | "unpaid"; code: string; player: string; remainingMs: number | null; amountDue: number }

/** Overtime first, then ending soonest, then unpaid. */
export function needsAttention(stations: Pick<Station, "id" | "code" | "state" | "player" | "remainingMs" | "amountDue">[]): AttentionItem[] {
  const items: AttentionItem[] = []
  for (const s of stations) {
    if (s.state !== "busy" && s.state !== "ending") continue
    const base = { stationId: s.id, code: s.code, player: s.player || "Guest", remainingMs: s.remainingMs, amountDue: s.amountDue }
    if (s.remainingMs !== null && s.remainingMs < 0) items.push({ ...base, kind: "overtime" })
    else if (s.remainingMs !== null && s.remainingMs <= 10 * MINUTE) items.push({ ...base, kind: "ending" })
    else if (s.amountDue > 0 && s.remainingMs !== null && s.remainingMs <= 30 * MINUTE) items.push({ ...base, kind: "unpaid" })
  }
  const rank = { overtime: 0, ending: 1, unpaid: 2 }
  return items.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.remainingMs ?? 0) - (b.remainingMs ?? 0))
}
