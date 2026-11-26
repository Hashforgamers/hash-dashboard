/**
 * Dashboard-only clock display. Bookings are still stored and sent in the
 * formats the APIs already use; this only changes what staff see and type.
 */
export type TimeFormat = "12h" | "24h"

export const DEFAULT_TIME_FORMAT: TimeFormat = "12h"
const STORAGE_PREFIX = "hash-time-format-v1:"
export const TIME_FORMAT_EVENT = "hash:time-format-changed"

export function timeFormatStorageKey(cafeId: string) {
  return `${STORAGE_PREFIX}${cafeId}`
}

export function readTimeFormat(cafeId: string | null | undefined): TimeFormat {
  if (!cafeId || typeof window === "undefined") return DEFAULT_TIME_FORMAT
  try {
    const stored = localStorage.getItem(timeFormatStorageKey(cafeId))
    return stored === "24h" || stored === "12h" ? stored : DEFAULT_TIME_FORMAT
  } catch {
    return DEFAULT_TIME_FORMAT
  }
}

export function writeTimeFormat(cafeId: string, format: TimeFormat) {
  localStorage.setItem(timeFormatStorageKey(cafeId), format)
  window.dispatchEvent(new CustomEvent(TIME_FORMAT_EVENT, { detail: { cafeId, format } }))
}

/**
 * Minutes since midnight for "14:05", "14:05:00", "2:05 PM", "02:05pm" or "24:00".
 * Returns null for anything else (including full dates; use formatClock for those).
 */
export function parseClockMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*([AaPp])?\.?\s*[Mm]?\.?$/)
  if (!match) return null
  let hours = Number(match[1])
  const minutes = Number(match[2])
  if (minutes > 59) return null
  const meridiem = match[3]?.toUpperCase()
  if (meridiem) {
    if (hours < 1 || hours > 12) return null
    hours = (hours % 12) + (meridiem === "P" ? 12 : 0)
  } else if (hours > 24 || (hours === 24 && minutes !== 0)) {
    return null
  }
  return hours * 60 + minutes
}

export function formatMinutes(totalMinutes: number, format: TimeFormat): string {
  const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440
  const hours = Math.floor(wrapped / 60)
  const minutes = String(wrapped % 60).padStart(2, "0")
  if (format === "24h") return `${String(hours).padStart(2, "0")}:${minutes}`
  return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? "PM" : "AM"}`
}

const IST = "Asia/Kolkata"

/** Wall-clock minutes of an instant in a time zone (IST by default). */
export function zonedMinutes(date: Date, timeZone = IST): number | null {
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date)
  const hour = Number(parts.find((part) => part.type === "hour")?.value)
  const minute = Number(parts.find((part) => part.type === "minute")?.value)
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null
}

/**
 * Format a clock string, a Date, an ISO timestamp or epoch milliseconds/seconds
 * as "2:05 PM" or "14:05". Dates are shown in IST unless timeZone is given.
 * Unparseable values are returned unchanged so nothing disappears from the UI.
 */
export function formatClock(value: unknown, format: TimeFormat, options: { timeZone?: string; fallback?: string } = {}): string {
  if (value === null || value === undefined || value === "") return options.fallback ?? ""
  const clock = parseClockMinutes(value)
  if (clock !== null) return formatMinutes(clock, format)
  let date: Date | null = null
  if (value instanceof Date) date = value
  else if (typeof value === "number") date = new Date(value < 1e12 ? value * 1000 : value)
  else if (typeof value === "string" && /\d{4}-\d{2}-\d{2}[T ]\d{1,2}:\d{2}/.test(value)) date = new Date(value)
  if (date) {
    const minutes = zonedMinutes(date, options.timeZone ?? IST)
    if (minutes !== null) return formatMinutes(minutes, format)
  }
  return typeof value === "string" ? value : options.fallback ?? String(value)
}

/** "10:00 AM - 11:00 AM", "10:00-11:00", "10:00:00 to 11:00:00" style ranges. */
export function formatClockRange(value: unknown, format: TimeFormat): string {
  if (typeof value !== "string") return formatClock(value, format)
  const parts = value.split(/\s*(?:-|–|—|\bto\b)\s*/i)
  if (parts.length !== 2) return formatClock(value, format)
  const [start, end] = parts.map((part) => parseClockMinutes(part))
  if (start === null || end === null) return value
  return `${formatMinutes(start, format)} – ${formatMinutes(end, format)}`
}
