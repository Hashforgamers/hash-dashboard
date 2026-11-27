import { Gamepad2, Glasses, Monitor, type LucideIcon } from "lucide-react"

const ICONS: Record<string, LucideIcon> = { pc: Monitor, vr_headset: Glasses }

/** Lucide icon for a platform key from library.platformKey (consoles share the gamepad). */
export function platformIcon(key: string): LucideIcon {
  return ICONS[key] || Gamepad2
}
