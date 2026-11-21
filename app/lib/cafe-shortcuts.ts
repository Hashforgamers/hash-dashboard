export type CafeShortcutPlatform = "All" | "PC" | "PS5" | "Xbox" | "VR"

export type CafeShortcutMap = Record<CafeShortcutPlatform, string>

export const DEFAULT_CAFE_SHORTCUTS: CafeShortcutMap = {
  All: "t",
  PC: "q",
  PS5: "w",
  Xbox: "e",
  VR: "r",
}

const STORAGE_PREFIX = "hash-cafe-shortcuts-v1:"

export function cafeShortcutStorageKey(cafeId: string) {
  return `${STORAGE_PREFIX}${cafeId}`
}

export function normalizeShortcutKey(key: string) {
  return key.trim().toLowerCase()
}

export function readCafeShortcuts(cafeId: string): CafeShortcutMap {
  try {
    const stored = localStorage.getItem(cafeShortcutStorageKey(cafeId))
    if (!stored) return DEFAULT_CAFE_SHORTCUTS
    const parsed = JSON.parse(stored) as Partial<CafeShortcutMap>
    return {
      PC: normalizeShortcutKey(parsed.PC || DEFAULT_CAFE_SHORTCUTS.PC),
      PS5: normalizeShortcutKey(parsed.PS5 || DEFAULT_CAFE_SHORTCUTS.PS5),
      Xbox: normalizeShortcutKey(parsed.Xbox || DEFAULT_CAFE_SHORTCUTS.Xbox),
      VR: normalizeShortcutKey(parsed.VR || DEFAULT_CAFE_SHORTCUTS.VR),
      All: normalizeShortcutKey(parsed.All || DEFAULT_CAFE_SHORTCUTS.All),
    }
  } catch {
    return DEFAULT_CAFE_SHORTCUTS
  }
}
