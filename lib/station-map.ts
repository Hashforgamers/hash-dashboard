// Station floor map: pure helpers (no imports) shared by the Gaming Stations map
// and the New session station picker. Times are IST like the rest of the desk.

export type StationState = "free" | "busy" | "ending" | "booked" | "offline"

export const STATION_STATE_LABEL: Record<StationState, string> = {
  free: "Free",
  busy: "In session",
  ending: "Ending soon",
  booked: "Booked soon",
  offline: "Offline",
}

export const ENDING_SOON_MINUTES = 10
export const BOOKED_SOON_MINUTES = 30

export type StationBooking = {
  bookingId: number | null
  name: string
  phone: string
  start: number // epoch ms
  end: number
  gameId: number | null
}

export type Station = {
  id: number
  number: number | null
  code: string // short label on the tile, unique within the cafe
  fullName: string // model / station name for tooltips
  type: string // console slug
  typeName: string
  icon: string
  gameId: number | null
  state: StationState
  // Live session
  bookingId: number | null
  userId: number | null
  player: string | null
  phone: string
  start: number | null
  end: number | null
  progress: number // 0..1 of booked time used
  remainingMs: number | null // negative = overtime
  amountDue: number
  slotPrice: number | null
  liveSlot: any | null // landing currentSlots row for the End session flow
  upcoming: StationBooking[]
  mapX: number | null
  mapY: number | null
}

export type Cell = { x: number; y: number }
export type Zone = { label: string; x: number; y: number; w: number }

const IST_OFFSET_MS = 330 * 60 * 1000

/** "yyyy-mm-dd" from ISO dates or Flask's "Fri, 27 Nov 2026 00:00:00 GMT". */
export function dateKey(value: unknown): string | null {
  const text = String(value ?? "").trim()
  if (!text) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const parsed = Date.parse(text)
  if (!Number.isFinite(parsed)) return null
  return new Date(parsed).toISOString().slice(0, 10)
}

/** Minutes since midnight from "03:10 PM", "15:10" or "15:10:00". */
export function clockMinutes(value: unknown): number | null {
  const text = String(value ?? "").trim().toUpperCase()
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/.exec(text)
  if (!match) return null
  let hours = Number(match[1]) % (match[3] ? 12 : 24)
  if (match[3] === "PM") hours += 12
  return hours * 60 + Number(match[2])
}

/** Epoch ms for an IST wall-clock time on a date. */
export function istTime(date: unknown, clock: unknown): number | null {
  const day = dateKey(date)
  const minutes = clockMinutes(clock)
  if (!day || minutes === null) return null
  const [y, m, d] = day.split("-").map(Number)
  return Date.UTC(y, m - 1, d, 0, minutes) - IST_OFFSET_MS
}

/** Start/end of a window on a date; an end at or before the start is the next day. */
export function istWindow(date: unknown, startClock: unknown, endClock: unknown): { start: number; end: number } | null {
  const start = istTime(date, startClock)
  let end = istTime(date, endClock)
  if (start === null || end === null) return null
  if (end <= start) end += 24 * 3600 * 1000
  return { start, end }
}

export function istClockOf(ms: number): string {
  const d = new Date(ms + IST_OFFSET_MS)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

export function phoneTail(phone: unknown, digits = 4): string {
  const only = String(phone ?? "").replace(/\D/g, "")
  return only.length >= digits ? only.slice(-digits) : ""
}

export function remainingLabel(ms: number | null): string {
  if (ms === null) return ""
  const over = ms < 0
  const total = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  // Overtime reads in whole minutes ("17m over"); a countdown under an hour keeps seconds.
  if (over) return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m over` : `${Math.max(1, m)}m over`
  const body = h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}:${String(s).padStart(2, "0")}`
  return `${body} left`
}

const TYPE_PREFIX: Record<string, string> = {
  pc: "PC",
  playstation: "PS",
  ps5: "PS",
  xbox: "XB",
  vr_headset: "VR",
  vr: "VR",
  private_room: "RM",
  vip_room: "VIP",
  bootcamp_room: "BC",
}

function typePrefix(slug: string, name: string): string {
  if (TYPE_PREFIX[slug]) return TYPE_PREFIX[slug]
  const letters = (name || slug).replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean)
  if (letters.length > 1) return letters.slice(0, 2).map(w => w[0]).join("").toUpperCase()
  return (letters[0] || "ST").slice(0, 2).toUpperCase()
}

/** Short tile codes like "PC 01"; duplicates get the console id so every tile is distinct. */
export function stationCodes(consoles: { id: number; number?: unknown; type?: string; console_display_name?: string }[]): Map<number, string> {
  const raw = new Map<number, string>()
  for (const c of consoles) {
    const n = Number(c.number)
    const prefix = typePrefix(String(c.type || ""), String(c.console_display_name || ""))
    raw.set(c.id, Number.isFinite(n) && n > 0 ? `${prefix} ${String(n).padStart(2, "0")}` : `${prefix} #${c.id}`)
  }
  const counts = new Map<string, number>()
  raw.forEach(code => counts.set(code, (counts.get(code) || 0) + 1))
  const result = new Map<number, string>()
  raw.forEach((code, id) => result.set(id, (counts.get(code) || 0) > 1 ? `${code}·${id}` : code))
  return result
}

function bookingWindow(row: any): { start: number; end: number } | null {
  const flexStart = Date.parse(row?.startAt || row?.start_at || "")
  const flexEnd = Date.parse(row?.endAt || row?.end_at || "")
  if (Number.isFinite(flexStart) && Number.isFinite(flexEnd)) return { start: flexStart, end: flexEnd }
  const [startClock, endClock] = String(row?.time || "").split(" - ")
  return istWindow(row?.date, row?.startTime ?? startClock, row?.endTime ?? endClock)
}

function idOf(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Combine the console list (getConsoles) with live and upcoming bookings (getLandingPage). */
export function buildStations(consoles: any[], landing: any, now: number): Station[] {
  const list = Array.isArray(consoles) ? consoles.filter(c => idOf(c?.id)) : []
  const codes = stationCodes(list)
  const current: any[] = Array.isArray(landing?.currentSlots) ? landing.currentSlots : []
  const upcoming: any[] = Array.isArray(landing?.upcomingBookings) ? landing.upcomingBookings : []

  return list.map((c): Station => {
    const id = Number(c.id)
    const live = current.find(row => !row?.awaitingPayment && idOf(row?.consoleId ?? row?.console_id) === id
      && (!c.currentBookingId || idOf(row?.bookId ?? row?.bookingId) === Number(c.currentBookingId)))
      || current.find(row => !row?.awaitingPayment && idOf(row?.consoleId ?? row?.console_id) === id)
      || null
    const occupied = c.occupancyState === "occupied" || (!!live && c.occupancyState !== "maintenance")
    const offline = c.occupancyState === "maintenance"

    let start: number | null = null
    let end: number | null = null
    if (occupied) {
      const reserved = Date.parse(live?.runtime?.reserved_until || "")
      const fromLive = live ? bookingWindow(live) : null
      const fromConsole = istWindow(c.currentDate || live?.date, c.currentStartTime, c.currentEndTime)
      const window = fromLive || fromConsole
      if (window) { start = window.start; end = window.end }
      if (Number.isFinite(reserved)) end = reserved
    }

    const next = upcoming
      .filter(row => idOf(row?.consoleId ?? row?.console_id) === id)
      .map(row => {
        const w = bookingWindow(row)
        return w && w.end > now ? {
          bookingId: idOf(row.bookingId ?? row.bookId), name: String(row.username || "Guest"),
          phone: String(row.customer_phone || ""), start: w.start, end: w.end, gameId: idOf(row.game_id),
        } : null
      })
      .filter((row): row is StationBooking => !!row)
      .sort((a, b) => a.start - b.start)
      .slice(0, 3)

    const remainingMs = end !== null ? end - now : null
    let state: StationState = "free"
    if (offline) state = "offline"
    else if (occupied) state = remainingMs !== null && remainingMs <= ENDING_SOON_MINUTES * 60000 ? "ending" : "busy"
    else if (next[0] && next[0].start - now <= BOOKED_SOON_MINUTES * 60000) state = "booked"

    const span = start !== null && end !== null ? end - start : 0
    const progress = span > 0 && start !== null ? Math.min(1, Math.max(0, (now - start) / span)) : 0

    return {
      id,
      number: idOf(c.number),
      code: codes.get(id) || `#${id}`,
      fullName: String(c.name || c.console_display_name || `Station ${id}`),
      type: String(c.type || c.console_slug || "other"),
      typeName: String(c.console_display_name || c.type || "Station"),
      icon: String(c.icon || "Monitor"),
      gameId: idOf(c.gameId ?? live?.game_id),
      state,
      bookingId: occupied ? idOf(c.currentBookingId ?? live?.bookId) : null,
      userId: occupied ? idOf(c.currentUserId ?? live?.userId) : null,
      player: occupied ? (c.currentUsername || live?.username || null) : null,
      phone: occupied ? String(live?.customer_phone || "") : "",
      start, end, progress,
      remainingMs: occupied ? remainingMs : null,
      amountDue: Number(c.collectibleAmount || 0),
      slotPrice: live?.slot_price != null ? Number(live.slot_price) : null,
      liveSlot: occupied ? live : null,
      upcoming: next,
      mapX: Number.isInteger(c.mapX) ? c.mapX : null,
      mapY: Number.isInteger(c.mapY) ? c.mapY : null,
    }
  })
}

export function stateCounts(stations: Station[]): Record<StationState, number> {
  const counts: Record<StationState, number> = { free: 0, busy: 0, ending: 0, booked: 0, offline: 0 }
  for (const s of stations) counts[s.state] += 1
  return counts
}

/**
 * Cells for every station: saved cells first, the rest flow into rows below,
 * one block per console type (each block starts on a new row and gets a zone
 * label suggestion when nothing was saved yet).
 */
export function layoutStations(
  stations: Pick<Station, "id" | "type" | "typeName" | "number" | "mapX" | "mapY">[],
  columns: number,
): { cells: Map<number, Cell>; autoZones: Zone[]; rows: number; cols: number } {
  const cols = Math.max(4, Math.floor(columns))
  const cells = new Map<number, Cell>()
  const taken = new Set<string>()
  let maxY = -1
  let maxX = cols - 1
  for (const s of stations) {
    if (s.mapX === null || s.mapY === null) continue
    const key = `${s.mapX}:${s.mapY}`
    if (taken.has(key)) continue
    taken.add(key)
    cells.set(s.id, { x: s.mapX, y: s.mapY })
    maxY = Math.max(maxY, s.mapY)
    maxX = Math.max(maxX, s.mapX)
  }
  const pending = stations.filter(s => !cells.has(s.id))
  const groups = new Map<string, typeof pending>()
  for (const s of pending) {
    const list = groups.get(s.type) || []
    list.push(s)
    groups.set(s.type, list)
  }
  const autoZones: Zone[] = []
  const savedAny = cells.size > 0
  // First auto block starts at row 0 (its label row); below saved cells leave one empty row.
  let row = savedAny ? maxY + 2 : 0
  for (const [, list] of groups) {
    list.sort((a, b) => (a.number ?? 1e9) - (b.number ?? 1e9) || a.id - b.id)
    // Leave a row for the zone label above each block.
    autoZones.push({ label: list[0].typeName, x: 0, y: row, w: Math.min(cols, 6) })
    row += 1
    let x = 0
    for (const s of list) {
      while (taken.has(`${x}:${row}`)) {
        x += 1
        if (x >= cols) { x = 0; row += 1 }
      }
      cells.set(s.id, { x, y: row })
      taken.add(`${x}:${row}`)
      maxY = Math.max(maxY, row)
      x += 1
      if (x >= cols) { x = 0; row += 1 }
    }
    if (x !== 0) row += 1
  }
  return { cells, autoZones, rows: Math.max(maxY + 1, 1), cols: maxX + 1 }
}

/** Saved zone labels plus a suggested label for each auto-placed console block the cafe has not labelled yet. */
export function mergeZones(saved: Zone[], autoZones: Zone[]): Zone[] {
  return [...saved, ...autoZones.filter(z => !saved.some(s => s.y === z.y))]
}

export const GRID_MAX = 200 // cells per axis the server accepts (0..199)
const ZONE_MAX_WIDTH = 24

export type SavePosition = { console_id: number; x: number | null; y: number | null }

/**
 * Make a layout safe to save: whole-number cells, nothing above row 0 or left
 * of column 0 (the whole floor shifts down/right together), zone labels inside
 * the grid with a sane width. Stations that cannot fit lose their cell and are
 * auto-placed instead of failing the save.
 */
export function normaliseLayout(positions: SavePosition[], zones: Zone[]): { positions: SavePosition[]; zones: Zone[] } {
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null)
  const placed = positions.map(p => {
    const x = num(p.x), y = num(p.y)
    return { console_id: p.console_id, x: x !== null && y !== null ? x : null, y: x !== null && y !== null ? y : null }
  })
  const cleanZones = zones
    .map(z => ({ label: String(z.label ?? "").trim().slice(0, 40), x: num(z.x) ?? 0, y: num(z.y) ?? 0, w: Math.min(ZONE_MAX_WIDTH, Math.max(1, num(z.w) ?? 1)) }))
    .filter(z => z.label)
  let minX = 0, minY = 0
  for (const p of placed) if (p.x !== null && p.y !== null) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y) }
  for (const z of cleanZones) { minX = Math.min(minX, z.x); minY = Math.min(minY, z.y) }
  const dx = -minX, dy = -minY
  const taken = new Set<string>()
  const outPositions = placed.map(p => {
    if (p.x === null || p.y === null) return p
    const x = p.x + dx, y = p.y + dy
    const key = `${x}:${y}`
    if (x >= GRID_MAX || y >= GRID_MAX || taken.has(key)) return { ...p, x: null, y: null }
    taken.add(key)
    return { ...p, x, y }
  })
  const outZones = cleanZones.map(z => ({
    ...z,
    x: Math.min(GRID_MAX - 1, z.x + dx),
    y: Math.min(GRID_MAX - 1, z.y + dy),
  }))
  return { positions: outPositions, zones: outZones }
}
