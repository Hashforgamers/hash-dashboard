import {
  Crown,
  DoorOpen,
  Gamepad,
  Gamepad2,
  Headset,
  Joystick,
  Monitor,
  Rocket,
  Tv,
  Users,
  type LucideIcon,
} from "lucide-react"

export interface ConsoleCatalogItem {
  id?: number | null
  slug: string
  display_name?: string
  family?: string
  icon?: string
  input_mode?: string
  supports_multiplayer?: boolean
  default_capacity?: number
  controller_policy?: string
  is_active?: boolean
  source?: string
}

const LEGACY_SLUG_ALIAS: Record<string, string> = {
  pc: "pc",
  computer: "pc",
  gaming_pc: "pc",
  ps: "playstation",
  ps4: "playstation",
  ps5: "playstation",
  playstation: "playstation",
  play_station: "playstation",
  sony: "playstation",
  xbox: "xbox",
  x_box: "xbox",
  vr: "vr_headset",
  virtual_reality: "vr_headset",
  virtual: "vr_headset",
  reality: "vr_headset",
  private_room: "private_room",
  privatezone: "private_room",
  private_zone: "private_room",
  vip_room: "vip_room",
  vipzone: "vip_room",
  vip_zone: "vip_room",
  bootcamp_room: "bootcamp_room",
  bootcamp: "bootcamp_room",
  room: "private_room",
}

const ICON_BY_KEY: Record<string, LucideIcon> = {
  monitor: Monitor,
  tv: Tv,
  gamepad: Gamepad,
  gamepad2: Gamepad2,
  headset: Headset,
  joystick: Joystick,
  rocket: Rocket,
  dooropen: DoorOpen,
  crown: Crown,
  users: Users,
}

export const normalizeConsoleSlug = (rawValue?: string | null): string => {
  const slug = String(rawValue || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
  if (!slug) return ""
  return LEGACY_SLUG_ALIAS[slug] || slug
}

export const resolveConsoleIcon = (iconKey?: string, slugHint?: string): LucideIcon => {
  const iconNormalized = String(iconKey || "").trim().toLowerCase()
  if (iconNormalized && ICON_BY_KEY[iconNormalized]) return ICON_BY_KEY[iconNormalized]

  const slug = normalizeConsoleSlug(slugHint)
  if (slug === "playstation") return Tv
  if (slug === "xbox") return Gamepad2
  if (slug === "vr_headset") return Headset
  if (slug === "private_room") return DoorOpen
  if (slug === "vip_room") return Crown
  if (slug === "bootcamp_room") return Users
  if (slug.includes("arcade") || slug.includes("switch") || slug.includes("steam")) return Gamepad2
  if (slug.includes("rig") || slug.includes("sim")) return Joystick
  if (slug.includes("room") || slug.includes("zone")) return DoorOpen
  if (slug === "pc" || slug.includes("computer")) return Monitor
  return Monitor
}

export const resolveConsoleColor = (slugHint?: string): string => {
  const slug = normalizeConsoleSlug(slugHint)
  if (slug === "playstation") return "#2563eb"
  if (slug === "xbox") return "#059669"
  if (slug === "vr_headset") return "#ea580c"
  if (slug === "private_room") return "#f43f5e"
  if (slug === "vip_room") return "#f59e0b"
  if (slug === "bootcamp_room") return "#14b8a6"
  if (slug.includes("switch")) return "#ef4444"
  if (slug.includes("steam")) return "#0ea5e9"
  if (slug.includes("arcade")) return "#a855f7"
  if (slug.includes("rig") || slug.includes("sim")) return "#f59e0b"
  return "#7c3aed"
}
