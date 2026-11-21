import { normalizeConsoleSlug } from "@/app/components/console-catalog"

/**
 * Café booking shortcuts.
 *
 * Every console type the café has gets an Alt+Shift+<key> shortcut (⌥⇧ on Mac)
 * that opens the booking form with that console preselected. Alt+Shift is used
 * because Ctrl/⌘+letter combos are almost all taken by the browser, and some
 * (Ctrl+W, Ctrl+T, Ctrl+N, Ctrl+Q) can't be intercepted by a page at all.
 *
 * Bindings are stored per café in this browser's localStorage (there is no
 * backend setting for them yet).
 */

export type ConsoleTypeOption = { type: string; name: string }

/** A key from a-z or 0-9, or null when the shortcut is turned off. */
export type CafeShortcutMap = Record<string, string | null>

export const SHORTCUT_MODIFIER_LABEL = "Alt+Shift"
export const SHORTCUT_MODIFIER_LABEL_MAC = "⌥⇧"

/** Alt+Shift combos that browsers or the OS already use. */
export const RESERVED_SHORTCUT_KEYS: Record<string, string> = {
  a: "Chrome/Edge use Alt+Shift+A to focus pop-ups",
  b: "Chrome/Edge use Alt+Shift+B to focus the bookmarks bar",
  i: "Chrome/Edge use Alt+Shift+I to send feedback",
  t: "Chrome/Edge use Alt+Shift+T to focus the toolbar",
}

export const BOOK_CONSOLE_EVENT = "hash:book-console"
export type BookConsoleEventDetail = { type: string }
const PENDING_BOOKING_KEY = "hash:pending-book-console"

const STORAGE_PREFIX = "hash-cafe-shortcuts-v2:"

export function cafeShortcutStorageKey(cafeId: string) {
  return `${STORAGE_PREFIX}${cafeId}`
}

export function isValidShortcutKey(key: string) {
  return /^[a-z0-9]$/.test(key) && !(key in RESERVED_SHORTCUT_KEYS)
}

export function formatShortcut(key: string, isMac = isMacPlatform()) {
  return isMac ? `${SHORTCUT_MODIFIER_LABEL_MAC}${key.toUpperCase()}` : `${SHORTCUT_MODIFIER_LABEL}+${key.toUpperCase()}`
}

export function isMacPlatform() {
  if (typeof navigator === "undefined") return false
  return /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)
}

const PREFERRED_ORDER = ["pc", "playstation", "xbox", "vr_headset", "private_room", "vip_room", "bootcamp_room"]

/** Groups the café's consoles (from the dashboard consoles API) into console types. */
export function consoleTypesFromConsoles(consoles: unknown): ConsoleTypeOption[] {
  const names = new Map<string, string>()
  ;(Array.isArray(consoles) ? consoles : []).forEach((item: any) => {
    const slug = normalizeConsoleSlug(item?.type || item?.console_type || item?.console_slug || item?.game_name)
    if (!slug) return
    if (!names.has(slug) || !names.get(slug)) {
      names.set(slug, String(item?.console_display_name || item?.consoleTypeName || item?.console_name || item?.type || ""))
    }
  })
  const slugs = Array.from(names.keys())
  const sorted = [
    ...PREFERRED_ORDER.filter((slug) => names.has(slug)),
    ...slugs.filter((slug) => !PREFERRED_ORDER.includes(slug)).sort((a, b) => a.localeCompare(b)),
  ]
  return sorted.map((slug) => ({
    type: slug,
    name: names.get(slug) || slug.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
  }))
}

/** Picks a memorable free key per console: the first unused letter or digit of its name, then 1-9. */
export function defaultCafeShortcuts(types: ConsoleTypeOption[], taken: Set<string> = new Set()): CafeShortcutMap {
  const used = new Set(taken)
  const result: CafeShortcutMap = {}
  types.forEach(({ type, name }) => {
    const candidates = `${name}${type}`.toLowerCase().replace(/[^a-z0-9]/g, "").split("")
    const key = [...candidates, ..."123456789"].find((char) => isValidShortcutKey(char) && !used.has(char))
    result[type] = key || null
    if (key) used.add(key)
  })
  return result
}

function readStoredShortcuts(cafeId: string): CafeShortcutMap {
  try {
    const raw = localStorage.getItem(cafeShortcutStorageKey(cafeId))
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== "object") return {}
    const result: CafeShortcutMap = {}
    Object.entries(parsed).forEach(([type, key]) => {
      if (key === null) result[type] = null
      else if (typeof key === "string" && isValidShortcutKey(key.toLowerCase())) result[type] = key.toLowerCase()
    })
    return result
  } catch {
    return {}
  }
}

/** Saved bindings for the café's current console types, with defaults for any type not saved yet. */
export function readCafeShortcuts(cafeId: string | null | undefined, types: ConsoleTypeOption[]): CafeShortcutMap {
  const stored = cafeId ? readStoredShortcuts(cafeId) : {}
  const known = types.filter(({ type }) => type in stored)
  const taken = new Set(known.map(({ type }) => stored[type]).filter((key): key is string => Boolean(key)))
  const defaults = defaultCafeShortcuts(types.filter(({ type }) => !(type in stored)), taken)
  const result: CafeShortcutMap = {}
  types.forEach(({ type }) => { result[type] = type in stored ? stored[type] : defaults[type] })
  return result
}

export function saveCafeShortcuts(cafeId: string, shortcuts: CafeShortcutMap) {
  try {
    // Keep bindings for console types not currently listed, so they come back if the type returns.
    const merged = { ...readStoredShortcuts(cafeId), ...shortcuts }
    localStorage.setItem(cafeShortcutStorageKey(cafeId), JSON.stringify(merged))
    window.dispatchEvent(new Event("hash:shortcuts-changed"))
    return true
  } catch {
    return false
  }
}

export function resetCafeShortcuts(cafeId: string) {
  try {
    localStorage.removeItem(cafeShortcutStorageKey(cafeId))
    window.dispatchEvent(new Event("hash:shortcuts-changed"))
  } catch {
    // Storage unavailable; defaults apply anyway.
  }
}

/** Returns the a-z/0-9 key when the event is Alt+Shift+key, using the physical key so ⌥ on Mac works. */
export function shortcutKeyFromEvent(event: KeyboardEvent): string | null {
  if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return null
  const letter = /^Key([A-Z])$/.exec(event.code)
  if (letter) return letter[1].toLowerCase()
  const digit = /^(?:Digit|Numpad)([0-9])$/.exec(event.code)
  return digit ? digit[1] : null
}

export function setPendingConsoleBooking(type: string) {
  try { sessionStorage.setItem(PENDING_BOOKING_KEY, type) } catch { /* ignore */ }
}

export function takePendingConsoleBooking(): string | null {
  try {
    const type = sessionStorage.getItem(PENDING_BOOKING_KEY)
    if (type) sessionStorage.removeItem(PENDING_BOOKING_KEY)
    return type
  } catch {
    return null
  }
}
