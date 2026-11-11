// Single source of truth for keyboard shortcuts: the key handler and the Shortcuts page both read this list.
export type ShortcutAction =
  | { type: "palette" }
  | { type: "search" }
  | { type: "refresh" }
  | { type: "go"; href: string }

export interface Shortcut {
  keys: string[]            // shown to the user; "Mod" renders as ⌘ on Mac and Ctrl elsewhere
  label: string
  group: "General" | "Go to" | "In popups"
  action?: ShortcutAction   // undefined = handled natively (for example Esc)
  sequence?: [string, string] // two-key sequence such as g then d
  key?: string              // single key (lowercase), no modifiers
  either?: boolean          // keys are alternatives, not a combination
}

export const SHORTCUTS: Shortcut[] = [
  { keys: ["Mod", "K"], label: "Open the command palette", group: "General", action: { type: "palette" } },
  { keys: ["/"], key: "/", label: "Search on this page", group: "General", action: { type: "search" } },
  { keys: ["N"], key: "n", label: "New booking", group: "General", action: { type: "go", href: "/booking" } },
  { keys: ["R"], key: "r", label: "Refresh dashboard data", group: "General", action: { type: "refresh" } },
  { keys: ["?"], key: "?", label: "Show keyboard shortcuts", group: "General", action: { type: "go", href: "/shortcuts" } },
  { keys: ["G", "D"], sequence: ["g", "d"], label: "Dashboard", group: "Go to", action: { type: "go", href: "/dashboard" } },
  { keys: ["G", "B"], sequence: ["g", "b"], label: "Bookings & Sessions", group: "Go to", action: { type: "go", href: "/dashboard?tab=booking" } },
  { keys: ["G", "C"], sequence: ["g", "c"], label: "Gaming Stations", group: "Go to", action: { type: "go", href: "/gaming" } },
  { keys: ["G", "T"], sequence: ["g", "t"], label: "Transactions", group: "Go to", action: { type: "go", href: "/transaction" } },
  { keys: ["G", "G"], sequence: ["g", "g"], label: "Gamers", group: "Go to", action: { type: "go", href: "/know-your-gamers" } },
  { keys: ["G", "E"], sequence: ["g", "e"], label: "Food & Extras", group: "Go to", action: { type: "go", href: "/manage-extraservice" } },
  { keys: ["G", "P"], sequence: ["g", "p"], label: "Pricing & Offers", group: "Go to", action: { type: "go", href: "/console-pricing" } },
  { keys: ["G", "S"], sequence: ["g", "s"], label: "Settings", group: "Go to", action: { type: "go", href: "/account" } },
  { keys: ["Esc"], label: "Close a popup, menu or sheet", group: "In popups" },
  { keys: ["Enter"], label: "Run the highlighted command in the palette", group: "In popups" },
  { keys: ["↑", "↓"], either: true, label: "Move through palette results", group: "In popups" },
]

export const isMacPlatform = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** True when the user is typing, so single-key shortcuts must not fire. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable
}
