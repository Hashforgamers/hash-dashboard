// Game Library: pure helpers (filter, sort, paginate, station labels) shared by
// the grid, the detail sheet and the Add game dialog. No React here so the
// node tests can load it directly.
import { normalizeConsoleSlug } from "../../components/console-catalog"
import { stationCodes } from "../../../lib/station-map"
import { getConsoleInfo } from "./platforms"

export interface Game {
  id: number
  name: string
  description?: string
  genre?: string
  platform?: string
  supported_platforms?: string[]
  image_url?: string
  rawg_rating?: number
  metacritic?: number
  multiplayer?: boolean
}

/** One console row of GET /vendor/{id}/vendor-games (`id` is the console id). */
export interface LibraryConsole {
  id: number
  console_number: number
  console_type: string
  brand: string
  model_number: string
  vendor_game_id: number
  price_per_hour: number
  is_offer: boolean
  default_price: number
  offer_name?: string | null
  discount_percentage?: number | null
  valid_until?: string | null
}

export interface VendorGame {
  game: Game
  total_consoles: number
  consoles: LibraryConsole[]
  avg_price: number
}

export type SortKey = "name" | "rating" | "stations" | "price" | "recent"

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name A–Z" },
  { value: "rating", label: "Top rated" },
  { value: "stations", label: "Most stations" },
  { value: "price", label: "Price: low to high" },
  { value: "recent", label: "Recently added" },
]

export type Density = "comfortable" | "compact"
export const PAGE_SIZE: Record<Density, number> = { comfortable: 24, compact: 36 }

// Chip order; anything else follows alphabetically.
const PLATFORM_ORDER = ["pc", "playstation", "xbox", "vr_headset", "nintendo_switch"]
const SHORT_LABEL: Record<string, string> = { nintendo_switch: "Switch" }

export function platformKey(consoleType: string): string {
  return normalizeConsoleSlug(consoleType) || "other"
}

export function platformLabel(key: string, short = true): string {
  return (short && SHORT_LABEL[key]) || getConsoleInfo(key).label
}

function platformRank(key: string): number {
  const i = PLATFORM_ORDER.indexOf(key)
  return i === -1 ? PLATFORM_ORDER.length : i
}

export function sortPlatformKeys(keys: Iterable<string>): string[] {
  return Array.from(new Set(keys)).sort((a, b) => platformRank(a) - platformRank(b) || a.localeCompare(b))
}

/** Platforms a game is installed on in this cafe, in chip order. */
export function gamePlatforms(vg: VendorGame): string[] {
  return sortPlatformKeys(vg.consoles.map(c => platformKey(c.console_type)))
}

/** RAWG stores the first genre only, but older rows may carry "Action, Shooter". */
export function gameGenres(game: Pick<Game, "genre">): string[] {
  return String(game.genre || "")
    .split(/[,/|]/)
    .map(g => g.trim())
    .filter(Boolean)
}

export type Facet = { key: string; label: string; count: number }

export function platformFacets(games: VendorGame[]): Facet[] {
  const counts = new Map<string, number>()
  for (const vg of games) for (const key of gamePlatforms(vg)) counts.set(key, (counts.get(key) || 0) + 1)
  return sortPlatformKeys(counts.keys()).map(key => ({ key, label: platformLabel(key), count: counts.get(key) || 0 }))
}

export function genreFacets(games: VendorGame[]): Facet[] {
  const counts = new Map<string, { label: string; count: number }>()
  for (const vg of games) {
    for (const genre of new Set(gameGenres(vg.game))) {
      const key = genre.toLowerCase()
      const entry = counts.get(key) || { label: genre, count: 0 }
      entry.count += 1
      counts.set(key, entry)
    }
  }
  return Array.from(counts, ([key, v]) => ({ key, ...v })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export type LibraryFilters = { query: string; platforms: string[]; genres: string[] }
export const NO_FILTERS: LibraryFilters = { query: "", platforms: [], genres: [] }

export function hasFilters(f: LibraryFilters): boolean {
  return !!f.query.trim() || f.platforms.length > 0 || f.genres.length > 0
}

/** Title search, then OR within platforms / genres and AND between the two groups. */
export function filterGames(games: VendorGame[], f: LibraryFilters): VendorGame[] {
  const words = f.query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return games.filter(vg => {
    const name = String(vg.game.name || "").toLowerCase()
    if (words.some(w => !name.includes(w))) return false
    if (f.platforms.length && !gamePlatforms(vg).some(p => f.platforms.includes(p))) return false
    if (f.genres.length && !gameGenres(vg.game).some(g => f.genres.includes(g.toLowerCase()))) return false
    return true
  })
}

export type PriceSummary = { from: number | null; hasOffer: boolean; bestDiscount: number | null }

export function priceSummary(vg: VendorGame): PriceSummary {
  const prices = vg.consoles.map(c => Number(c.price_per_hour)).filter(p => Number.isFinite(p) && p > 0)
  const offers = vg.consoles.filter(c => c.is_offer)
  const discounts = offers.map(c => Number(c.discount_percentage)).filter(d => Number.isFinite(d) && d > 0)
  return {
    from: prices.length ? Math.min(...prices) : null,
    hasOffer: offers.length > 0,
    bestDiscount: discounts.length ? Math.max(...discounts) : null,
  }
}

/** vendor_games ids are serial, so the newest row tells when a game was last added. */
export function addedOrder(vg: VendorGame): number {
  return vg.consoles.reduce((max, c) => Math.max(max, Number(c.vendor_game_id) || 0), 0)
}

const byName = (a: VendorGame, b: VendorGame) => String(a.game.name || "").localeCompare(String(b.game.name || ""), undefined, { sensitivity: "base" })

export function sortGames(games: VendorGame[], key: SortKey): VendorGame[] {
  const list = [...games]
  const num = (v: unknown, missing: number) => (Number.isFinite(Number(v)) && v !== null && v !== undefined ? Number(v) : missing)
  switch (key) {
    case "rating":
      return list.sort((a, b) => num(b.game.rawg_rating, -1) - num(a.game.rawg_rating, -1) || byName(a, b))
    case "stations":
      return list.sort((a, b) => b.consoles.length - a.consoles.length || byName(a, b))
    case "price":
      return list.sort((a, b) => num(priceSummary(a).from, Infinity) - num(priceSummary(b).from, Infinity) || byName(a, b))
    case "recent":
      return list.sort((a, b) => addedOrder(b) - addedOrder(a) || byName(a, b))
    default:
      return list.sort(byName)
  }
}

export function paginate<T>(items: T[], page: number, perPage: number): { items: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(items.length / perPage))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages)
  return { items: items.slice((current - 1) * perPage, current * perPage), page: current, pages }
}

/** Page buttons: first, last and the pages around the current one, with gaps. */
export function pageWindow(page: number, pages: number, around = 1): (number | "gap")[] {
  const out: (number | "gap")[] = []
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= around) out.push(p)
    else if (out[out.length - 1] !== "gap") out.push("gap")
  }
  return out
}

export type StationName = { code: string; name: string }

/**
 * Station labels as Gaming Stations shows them ("PC 01", duplicates
 * disambiguated), keyed by console id, from the getConsoles payload.
 */
export function stationNames(consoles: { id: number; number?: unknown; type?: string; console_display_name?: string; name?: string }[]): Map<number, StationName> {
  const list = (Array.isArray(consoles) ? consoles : []).filter(c => Number(c?.id) > 0)
  const codes = stationCodes(list.map(c => ({ ...c, id: Number(c.id) })))
  const out = new Map<number, StationName>()
  for (const c of list) {
    const id = Number(c.id)
    out.set(id, { code: codes.get(id) || `#${id}`, name: String(c.name || c.console_display_name || "") })
  }
  return out
}

/** Station label for a console row; "PlayStation #3" only when the cafe's station list lacks it. */
export function stationLabel(console: { id: number; console_number?: number; console_type?: string }, names: Map<number, StationName>): StationName {
  const known = names.get(Number(console.id))
  if (known) return known
  const label = getConsoleInfo(console.console_type || "").label
  const n = Number(console.console_number)
  return { code: Number.isFinite(n) && n > 0 ? `${label} #${n}` : `${label} #${console.id}`, name: "" }
}

export function initials(name: string): string {
  const words = String(name || "").replace(/[^A-Za-z0-9À-ɏ ]/g, " ").trim().split(/\s+/).filter(Boolean)
  if (!words.length) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** Stable hue (0-359) from a name, for cover fallbacks. */
export function seedHue(name: string): number {
  let h = 0
  for (const ch of String(name || "")) h = (h * 31 + ch.codePointAt(0)!) % 360
  return h
}

export function formatRupees(value: number | null | undefined): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return `₹${Number.isInteger(n) ? n : n.toFixed(2).replace(/\.?0+$/, "")}`
}
