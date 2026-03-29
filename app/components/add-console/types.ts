import type { ConsoleCatalogItem } from "../console-catalog";

export type ControllerPolicy = "none" | "optional" | "required" | "included";

export interface ConsoleDynamicAttributes {
  capacity: number;
  supportsMultiplayer: boolean;
  inputMode: string;
  controllerPolicy: ControllerPolicy;
  playAreaSqft: number;
}

export interface ConsoleFormProfile {
  slug: string;
  displayName: string;
  family: string;
  inputMode: string;
  requiresPcHardware: boolean;
  showModelVariant: boolean;
  showConnectivity: boolean;
  showPlayArea: boolean;
  allowMultiplayerToggle: boolean;
  defaultCapacity: number;
  defaultControllerPolicy: ControllerPolicy;
  defaultSupportsMultiplayer: boolean;
  catalogItem: ConsoleCatalogItem | null;
}
