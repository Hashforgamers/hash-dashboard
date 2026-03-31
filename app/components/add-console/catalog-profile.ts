import { normalizeConsoleSlug, type ConsoleCatalogItem } from "../console-catalog";
import type { ConsoleDynamicAttributes, ConsoleFormProfile, ControllerPolicy } from "./types";

const DEFAULT_INPUT_MODE = "controller";
const DEFAULT_FAMILY = "console";

const normalizeControllerPolicy = (value?: string | null): ControllerPolicy => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase() as ControllerPolicy;
  if (normalized === "optional" || normalized === "required" || normalized === "included") {
    return normalized;
  }
  return "none";
};

const inferFamily = (slug: string, family?: string | null): string => {
  const provided = String(family || "").trim().toLowerCase();
  if (provided) return provided;
  if (slug.includes("vr")) return "vr";
  if (slug.includes("room") || slug.includes("zone")) return "room";
  if (slug.includes("rig") || slug.includes("sim")) return "simulator";
  if (slug.includes("arcade")) return "arcade";
  if (slug.includes("pc")) return "pc";
  return DEFAULT_FAMILY;
};

export const findCatalogItemForConsole = (
  consoleType: string,
  catalog: ConsoleCatalogItem[]
): ConsoleCatalogItem | null => {
  const target = normalizeConsoleSlug(consoleType);
  if (!target) return null;
  const item = catalog.find((entry) => normalizeConsoleSlug(entry.slug) === target);
  return item || null;
};

export const buildConsoleFormProfile = (
  consoleType: string,
  catalogItem: ConsoleCatalogItem | null
): ConsoleFormProfile => {
  const slug = normalizeConsoleSlug(consoleType);
  const inputMode = String(catalogItem?.input_mode || "").trim().toLowerCase() || DEFAULT_INPUT_MODE;
  const family = inferFamily(slug, catalogItem?.family);
  const displayName = String(catalogItem?.display_name || slug || "Console").trim();
  const requiresPcHardware = inputMode === "keyboard_mouse";
  const showPlayArea = family === "vr" || family === "simulator" || slug.includes("vr") || slug.includes("rig");
  const defaultControllerPolicy = normalizeControllerPolicy(
    catalogItem?.controller_policy || (requiresPcHardware ? "none" : "optional")
  );
  const defaultSupportsMultiplayer =
    typeof catalogItem?.supports_multiplayer === "boolean"
      ? Boolean(catalogItem.supports_multiplayer)
      : requiresPcHardware || slug.includes("playstation") || slug.includes("xbox");

  return {
    slug,
    displayName,
    family,
    inputMode,
    requiresPcHardware,
    showModelVariant: !requiresPcHardware,
    showConnectivity: requiresPcHardware || inputMode === "mixed",
    showPlayArea,
    allowMultiplayerToggle: family !== "room",
    defaultCapacity: Math.max(1, Number(catalogItem?.default_capacity || 1)),
    defaultControllerPolicy,
    defaultSupportsMultiplayer,
    catalogItem,
  };
};

export const buildInitialDynamicAttributes = (profile: ConsoleFormProfile): ConsoleDynamicAttributes => ({
  capacity: profile.defaultCapacity,
  supportsMultiplayer: profile.defaultSupportsMultiplayer,
  inputMode: profile.inputMode || DEFAULT_INPUT_MODE,
  controllerPolicy: profile.defaultControllerPolicy,
  playAreaSqft: profile.showPlayArea ? 64 : 0,
});
