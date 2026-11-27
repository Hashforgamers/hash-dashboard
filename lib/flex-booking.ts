// Flex-start ("any minute") sessions: settings, quote types and small pure helpers.
// The server (hfg-booking /api/vendor/<id>/flex-booking/*) owns every rule; this only formats.

export type FlexSettings = {
  flex_enabled: boolean
  min_minutes: number
  step_minutes: number
  late_arrival_policy: "keep_end" | "shift_if_free"
  allow_past_closing: boolean
  partial_slot_grace_minutes: number
}

export const DEFAULT_FLEX_SETTINGS: FlexSettings = {
  flex_enabled: false,
  min_minutes: 30,
  step_minutes: 15,
  late_arrival_policy: "keep_end",
  allow_past_closing: false,
  partial_slot_grace_minutes: 0,
}

export type FlexStation = {
  console_id: number
  name: string | null
  available: boolean
  max_minutes_available: number
  next_busy_at: string | null
}

export type FlexBlockedSlot = { slot_id: number; date: string; start_time: string; end_time: string; available_slot: number }

export type FlexQuote = {
  success: true
  game_id: number
  window: { start_at: string; end_at: string; date: string; start: string; end: string; duration_minutes: number; label: string; crosses_midnight: boolean }
  live: boolean
  booked_date: string
  base_slot_id: number
  blocked_slots: FlexBlockedSlot[]
  units: number
  stations: FlexStation[]
  available: boolean
  recommended_console_ids: number[]
  max_minutes_available: number
  closes_at: string | null
  price: { basis: "rate_card" | "slot_prorated"; unit_price: number; base_amount: number; squad_discount_percent: number; squad_discount_amount: number; net_amount: number; billed_minutes: number; players: number; multiplier: number }
  extends_booking_id?: number | null
}

export type FlexQuoteError = { success: false; code: string; message: string; max_minutes?: number; limit_at?: string; stations?: FlexStation[] }

export const MAX_FLEX_MINUTES = 12 * 60

/** Duration choices: minimum, then every step, up to the cap (and any exact offer such as 108). */
export function flexDurations(settings: FlexSettings, extra?: number | null, cap = MAX_FLEX_MINUTES): number[] {
  const step = Math.max(1, Math.round(settings.step_minutes || 15))
  const min = Math.max(1, Math.round(settings.min_minutes || 30))
  const values = new Set<number>()
  for (let m = min; m <= cap; m += step) values.add(m)
  for (let m = Math.ceil(min / 60) * 60; m <= cap; m += 60) values.add(m)
  if (extra && extra >= min && extra <= cap) values.add(Math.round(extra))
  return Array.from(values).sort((a, b) => a - b)
}

export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (!h) return `${r} min`
  return r ? `${h}h ${r}m` : `${h}h`
}

/** Current IST wall-clock time as HH:MM (independent of the device time zone). */
export function istClock(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value || "00"
  return `${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`
}

export function istDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
}

/** "2026-11-26" + "10:12" -> "2026-11-26T10:12:00+05:30" (always IST). */
export function istStartAt(date: string, clock: string): string {
  return `${date}T${clock.slice(0, 5)}:00+05:30`
}

/** "2026-11-26T12:00:00+05:30" -> "12:00" without converting through the device zone. */
export function clockOf(iso: string | null | undefined): string {
  const match = /T(\d{2}:\d{2})/.exec(iso || "")
  return match ? match[1] : ""
}

export function stationLabel(station: FlexStation): string {
  if (station.available) return "Free for the whole session"
  if (station.max_minutes_available <= 0) return "Busy now"
  return `Busy from ${clockOf(station.next_busy_at)} · fits ${formatMinutes(station.max_minutes_available)}`
}

export function isFlexBooking(row: { timingMode?: string; timing_mode?: string } | null | undefined): boolean {
  return (row?.timingMode || row?.timing_mode) === "flex"
}
