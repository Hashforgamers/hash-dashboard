// Pure aggregation for the dashboard Insights tab (unit-tested in tests/insights.test.cjs).

export type TxRow = { id?: number | string; bookingId?: number | string | null; amount?: number | string; slotDate?: string; slotTime?: string }
export type DayPoint = { date: string; label: string; earnings: number; bookings: number }
export type GamerRow = { id: number | string; name: string; contact?: string; membershipTier?: string; lastVisit?: string | null; totalAmount?: number }

const pad = (n: number) => String(n).padStart(2, "0")
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** One point per calendar day for the last `days` days (today included), earnings summed and bookings de-duplicated. */
export function dailyTrend(rows: TxRow[], days: number, today = new Date()): DayPoint[] {
  const points: DayPoint[] = []
  const index = new Map<string, { point: DayPoint; seen: Set<string> }>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const point = { date: isoDay(d), label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, earnings: 0, bookings: 0 }
    points.push(point)
    index.set(point.date, { point, seen: new Set() })
  }
  for (const row of rows) {
    const slot = index.get(String(row.slotDate || "").slice(0, 10))
    if (!slot) continue
    slot.point.earnings += Number(row.amount) || 0
    const key = String(row.bookingId ?? row.id ?? "")
    if (key && !slot.seen.has(key)) { slot.seen.add(key); slot.point.bookings += 1 }
  }
  for (const { point } of Array.from(index.values())) point.earnings = Math.round(point.earnings * 100) / 100
  return points
}

/** Hour of day (0-23) from "23:00", "23:00:00" or "11:00 PM". */
export function hourOf(slotTime?: string): number | null {
  const m = String(slotTime || "").trim().match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([AaPp][Mm])?/)
  if (!m) return null
  let h = Number(m[1])
  const meridiem = m[3]?.toLowerCase()
  if (meridiem === "pm" && h < 12) h += 12
  if (meridiem === "am" && h === 12) h = 0
  return h >= 0 && h < 24 ? h : null
}

/** The `top` hours with the most bookings, busiest first. */
export function busiestHours(rows: TxRow[], top = 3): { hour: number; bookings: number }[] {
  const perHour = new Map<number, Set<string>>()
  for (const row of rows) {
    const h = hourOf(row.slotTime)
    if (h === null) continue
    const key = String(row.bookingId ?? row.id ?? "")
    if (!perHour.has(h)) perHour.set(h, new Set())
    if (key) perHour.get(h)!.add(key)
  }
  return Array.from(perHour.entries())
    .map(([hour, set]) => ({ hour, bookings: set.size }))
    .filter((h) => h.bookings > 0)
    .sort((a, b) => b.bookings - a.bookings || a.hour - b.hour)
    .slice(0, top)
}

export const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`

/** Gold/Platinum gamers who haven't visited for `days` days, highest spenders first. */
export function lapsedRegulars(gamers: GamerRow[], days = 14, now = new Date(), limit = 5): (GamerRow & { daysAway: number })[] {
  const out: (GamerRow & { daysAway: number })[] = []
  for (const g of gamers) {
    const tier = String(g.membershipTier || "").toLowerCase()
    if (tier !== "gold" && tier !== "platinum") continue
    const last = g.lastVisit ? new Date(g.lastVisit) : null
    if (!last || Number.isNaN(last.getTime())) continue
    const daysAway = Math.floor((now.getTime() - last.getTime()) / 86_400_000)
    if (daysAway >= days) out.push({ ...g, daysAway })
  }
  return out.sort((a, b) => (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0)).slice(0, limit)
}
