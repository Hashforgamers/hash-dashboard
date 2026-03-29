import type { FormData } from "../interfaces";
import {
  GraphiCoptions,
  ProcessorOption,
  PS5playstation,
  RamSizeOptions,
  StorageOptions,
  VRPlaystation,
  XboxPlaystation,
} from "../constant";
import type { ConsoleDynamicAttributes, ConsoleFormProfile } from "./types";

const pickRandom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomDateInPast = (daysBack: number) => {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(10, daysBack));
  return date.toISOString().split("T")[0];
};

const randomDateInFuture = (daysAhead: number) => {
  const date = new Date();
  date.setDate(date.getDate() + randomInt(10, daysAhead));
  return date.toISOString().split("T")[0];
};

const generateRandomSerial = (prefix: string) =>
  `${prefix}-${randomInt(100000, 999999)}-${String.fromCharCode(65 + randomInt(0, 25))}${String.fromCharCode(65 + randomInt(0, 25))}`;

const fallbackBrandByType: Record<string, string[]> = {
  pc: ["MSI", "ASUS", "Acer Predator", "Alienware", "Lenovo Legion"],
  playstation: ["Sony"],
  xbox: ["Microsoft"],
  vr_headset: ["Meta", "HTC", "Sony VR"],
};

const fallbackConnectivity = ["Wi-Fi 6 + Ethernet + Bluetooth 5.2", "Wi-Fi + LAN + USB-C", "Wi-Fi + Bluetooth + HDMI"];
const fallbackWarranty = ["12 months", "18 months", "24 months"];
const fallbackMaintenanceNotes = [
  "Routine diagnostics completed.",
  "Thermal and fan checks verified.",
  "Controller and port checks completed.",
];
const fallbackSupportedGames = [
  "FC 25, GTA V, Valorant, Forza Horizon",
  "Call of Duty, Minecraft, Fortnite",
  "Racing, Sports, Shooter, Co-op titles",
];
const fallbackAccessories = [
  "2 Controllers, Headset, Charging Dock",
  "Controller, Keyboard-Mouse, Cooling Stand",
  "VR Controllers, Face Cover, Charging Cable",
];

const CONSOLE_VARIANT_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  playstation: PS5playstation,
  xbox: XboxPlaystation,
  vr_headset: VRPlaystation,
};

const variantOptionsForSlug = (slug: string) => {
  const normalized = String(slug || "").toLowerCase();
  if (normalized.includes("playstation")) return CONSOLE_VARIANT_OPTIONS.playstation;
  if (normalized.includes("xbox")) return CONSOLE_VARIANT_OPTIONS.xbox;
  if (normalized.includes("vr")) return CONSOLE_VARIANT_OPTIONS.vr_headset;
  return [];
};

export const fillMissingFormData = (
  data: FormData,
  profile: ConsoleFormProfile,
  dynamic: ConsoleDynamicAttributes
): FormData => {
  const safeSlug = profile.slug || "pc";
  const variantOptions = variantOptionsForSlug(safeSlug);
  const hardwareDefaults = profile.requiresPcHardware
    ? {
        processorType: pickRandom(ProcessorOption.map((item) => item.value)),
        graphicsCard: pickRandom(GraphiCoptions.map((item) => item.value)),
        ramSize: pickRandom(RamSizeOptions.map((item) => item.value)),
        storageCapacity: pickRandom(StorageOptions.map((item) => item.value)),
        connectivity: pickRandom(fallbackConnectivity),
        consoleModelType: "Custom Build",
      }
    : {
        processorType: "",
        graphicsCard: "",
        ramSize: "",
        storageCapacity: pickRandom(StorageOptions.map((item) => item.value)),
        connectivity: profile.showConnectivity ? pickRandom(fallbackConnectivity) : "",
        consoleModelType: variantOptions.length ? pickRandom(variantOptions.map((item) => item.value)) : profile.displayName,
      };

  const fallbackPrice = String(randomInt(25000, 95000));
  const fallbackRentalPrice = String(randomInt(80, 250));

  const capabilitySummary = [
    `Input Mode: ${dynamic.inputMode}`,
    `Capacity: ${dynamic.capacity}`,
    `Multiplayer: ${dynamic.supportsMultiplayer ? "Yes" : "No"}`,
    `Controller Policy: ${dynamic.controllerPolicy}`,
    profile.showPlayArea ? `Play Area: ${dynamic.playAreaSqft} sq ft` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    ...data,
    consoleDetails: {
      ...data.consoleDetails,
      ModelNumber: data.consoleDetails.ModelNumber?.trim() || `${safeSlug.toUpperCase()}-${randomInt(1000, 9999)}`,
      SerialNumber: data.consoleDetails.SerialNumber?.trim() || generateRandomSerial(safeSlug.toUpperCase()),
      Brand:
        data.consoleDetails.Brand?.trim() ||
        pickRandom(fallbackBrandByType[safeSlug] || fallbackBrandByType.pc),
      ReleaseDate: data.consoleDetails.ReleaseDate || randomDateInPast(1200),
      Description:
        data.consoleDetails.Description?.trim() ||
        `${profile.displayName} console prepared for cafe sessions`,
      consoleType: data.consoleDetails.consoleType || safeSlug,
    },
    hardwareSpecifications: {
      ...data.hardwareSpecifications,
      processorType: data.hardwareSpecifications.processorType || hardwareDefaults.processorType,
      graphicsCard: data.hardwareSpecifications.graphicsCard || hardwareDefaults.graphicsCard,
      ramSize: data.hardwareSpecifications.ramSize || hardwareDefaults.ramSize,
      storageCapacity: data.hardwareSpecifications.storageCapacity || hardwareDefaults.storageCapacity,
      connectivity: data.hardwareSpecifications.connectivity || hardwareDefaults.connectivity,
      consoleModelType: data.hardwareSpecifications.consoleModelType || hardwareDefaults.consoleModelType,
    },
    maintenanceStatus: {
      ...data.maintenanceStatus,
      AvailableStatus: data.maintenanceStatus.AvailableStatus || "available",
      Condition: data.maintenanceStatus.Condition || "good",
      LastMaintenance: data.maintenanceStatus.LastMaintenance || randomDateInPast(180),
      NextScheduledMaintenance: data.maintenanceStatus.NextScheduledMaintenance || randomDateInFuture(120),
      MaintenanceNotes: data.maintenanceStatus.MaintenanceNotes?.trim() || pickRandom(fallbackMaintenanceNotes),
    },
    priceAndCost: {
      ...data.priceAndCost,
      price: data.priceAndCost.price || fallbackPrice,
      Rentalprice: data.priceAndCost.Rentalprice || fallbackRentalPrice,
      Warrantyperiod: data.priceAndCost.Warrantyperiod || pickRandom(fallbackWarranty),
      InsuranceStatus: data.priceAndCost.InsuranceStatus || "insured",
    },
    additionalDetails: {
      ...data.additionalDetails,
      ListOfSupportedGames:
        data.additionalDetails.ListOfSupportedGames?.trim() || pickRandom(fallbackSupportedGames),
      AccessoriesDetails:
        data.additionalDetails.AccessoriesDetails?.trim() ||
        `${pickRandom(fallbackAccessories)} | ${capabilitySummary}`,
    },
  };
};

export const buildHardwarePayloadByProfile = (
  profile: ConsoleFormProfile,
  hardware: FormData["hardwareSpecifications"]
) => {
  if (profile.requiresPcHardware) {
    return {
      processorType: hardware.processorType || null,
      graphicsCard: hardware.graphicsCard || null,
      ramSize: hardware.ramSize || null,
      storageCapacity: hardware.storageCapacity || null,
      connectivity: hardware.connectivity || null,
      consoleModelType: hardware.consoleModelType || "Custom Build",
    };
  }
  return {
    processorType: null,
    graphicsCard: null,
    ramSize: null,
    storageCapacity: hardware.storageCapacity || null,
    connectivity: profile.showConnectivity ? hardware.connectivity || null : null,
    consoleModelType: hardware.consoleModelType || null,
  };
};
