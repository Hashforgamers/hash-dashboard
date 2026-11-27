// Desk booking and check out: small pure helpers for the bill and the quick time choices.
// Prices come from the server (rate card, slot price, flex quote). Nothing here reads the
// clock to change a price: the same inputs always give the same bill.

export const DURATION_CHIPS = [30, 60, 90, 120, 180] as const
export const CUSTOM_STEP_MINUTES = 15

export type BillLine = { key: string; label: string; amount: number; tone?: "discount" | "muted" }

export function durationLabel(total: number): string {
  const m = Math.max(0, Math.round(total))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (!h) return `${r}m`
  return r ? `${h}h ${r}m` : `${h}h`
}

export function chipDurationLabel(total: number): string {
  // Chips read "30m, 1h, 1h30, 2h".
  const h = Math.floor(total / 60)
  const r = total % 60
  if (!h) return `${r}m`
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`
}

/** "01:33 – 03:18 · 1h 45m" (no slot list: a flex session is one window). */
export function sessionWindowLabel(start: string, end: string, minutes: number, clock: (value: string) => string = v => v.slice(0, 5)): string {
  return `${clock(start)} – ${clock(end)} · ${durationLabel(minutes)}`
}

const rupee = (value: number) => Math.round((Number(value) || 0) * 100) / 100

/**
 * Line-by-line bill for a new session. Discount appears only when staff typed one.
 * total = gaming - squad discount - staff discount + controllers + add-ons (never below 0).
 */
export function deskBill(input: {
  device: string
  minutes: number
  gaming: number
  rateName?: string | null
  players?: number
  squadDiscount?: number
  squadPercent?: number
  staffDiscount?: number
  controllers?: number
  controllerQty?: number
  addOns?: number
  addOnCount?: number
}): { lines: BillLine[]; total: number } {
  const players = Math.max(1, input.players || 1)
  const lines: BillLine[] = []
  const what = [input.device, durationLabel(input.minutes), players > 1 ? `${players} players` : ""].filter(Boolean).join(" · ")
  lines.push({ key: "gaming", label: input.rateName ? `${what} (rate card ${input.rateName})` : what, amount: rupee(input.gaming) })
  if ((input.squadDiscount || 0) > 0) lines.push({ key: "squad", label: `Squad discount${input.squadPercent ? ` ${input.squadPercent}%` : ""}`, amount: -rupee(input.squadDiscount || 0), tone: "discount" })
  if ((input.staffDiscount || 0) > 0) lines.push({ key: "discount", label: "Discount", amount: -rupee(input.staffDiscount || 0), tone: "discount" })
  if ((input.controllers || 0) > 0) lines.push({ key: "controllers", label: `Extra controller${(input.controllerQty || 0) > 1 ? `s × ${input.controllerQty}` : ""}`, amount: rupee(input.controllers || 0) })
  if ((input.addOns || 0) > 0) lines.push({ key: "addons", label: `Snacks & add-ons${input.addOnCount ? ` (${input.addOnCount})` : ""}`, amount: rupee(input.addOns || 0) })
  const total = Math.max(0, rupee(lines.reduce((sum, line) => sum + line.amount, 0)))
  return { lines, total }
}

export const formatRupees = (value: number) => {
  const rounded = Math.round(Math.abs(value) * 100) / 100
  const text = Number.isInteger(rounded) ? rounded.toLocaleString("en-IN") : rounded.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${value < 0 ? "−" : ""}₹${text}`
}

const toMinutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5))
const toClock = (minutes: number) => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

export type StartChoice = { key: string; label: string; clock: string }

/**
 * Start chips. Custom-start cafes get Now, +15m, +30m, then the next slot times.
 * Slot-only cafes get the slot running now ("Now") and the next slot times.
 */
export function startChoices(nowClock: string, slotStarts: string[], flex: boolean, max = 6): StartChoice[] {
  const now = toMinutes(nowClock)
  const starts = Array.from(new Set(slotStarts.map(s => s.slice(0, 5)))).sort()
  const out: StartChoice[] = []
  if (flex) {
    out.push({ key: "now", label: "Now", clock: toClock(now) }, { key: "+15", label: "+15m", clock: toClock(now + 15) }, { key: "+30", label: "+30m", clock: toClock(now + 30) })
    for (const start of starts) if (toMinutes(start) > now + 30 && out.length < max) out.push({ key: `slot:${start}`, label: start, clock: start })
    return out
  }
  for (const start of starts) {
    if (out.length >= max) break
    out.push({ key: out.length === 0 && toMinutes(start) <= now ? "now" : `slot:${start}`, label: out.length === 0 && toMinutes(start) <= now ? `Now (${start})` : start, clock: start })
  }
  return out
}

/** How many back-to-back slots a duration needs (at least one). */
export function slotsForDuration(minutes: number, slotMinutes: number): number {
  if (!(slotMinutes > 0)) return 1
  return Math.max(1, Math.ceil(minutes / slotMinutes - 1e-9))
}

// ------------------------------------------------------------------ check out

export type EndChoice = { key: string; label: string; at: Date }

/** "When did play end?" quick choices: Now, At booked end, −15m, −30m, −1h (never in the future). */
export function endChoices(now: Date, bookedEnd: Date | null): EndChoice[] {
  const out: EndChoice[] = [{ key: "now", label: "Now", at: now }]
  if (bookedEnd && Math.abs(bookedEnd.getTime() - now.getTime()) >= 60_000 && bookedEnd < now) out.push({ key: "booked_end", label: "At booked end", at: bookedEnd })
  for (const [key, label, minutes] of [["-15", "−15m", 15], ["-30", "−30m", 30], ["-60", "−1h", 60]] as const) {
    out.push({ key, label, at: new Date(now.getTime() - minutes * 60_000) })
  }
  return out
}

/** "2026-11-27T02:33:00" in IST, what the booking service reads as ended_at / played_until. */
export function istIso(date: Date): string {
  return new Date(date.getTime() + 330 * 60_000).toISOString().slice(0, 19)
}

/** Display-only mirror of the server rule (services/early_release.py): server figures win. */
export function unusedValue(paid: number, bookedMinutes: number, unusedMinutes: number, minUnused = 5): number {
  if (!(paid > 0) || !(bookedMinutes > 0) || !(unusedMinutes > 0) || unusedMinutes < minUnused) return 0
  return Math.round(paid * Math.min(unusedMinutes, bookedMinutes) / bookedMinutes)
}

export const UNUSED_POLICIES = ["credit_default", "credit", "refund", "none"] as const
export type UnusedPolicy = typeof UNUSED_POLICIES[number]
export const UNUSED_POLICY_LABELS: Record<UnusedPolicy, string> = {
  credit_default: "Gamer credit (staff can refund cash)",
  credit: "Always gamer credit",
  refund: "Always refund to original payment",
  none: "No return, just free the PC",
}
