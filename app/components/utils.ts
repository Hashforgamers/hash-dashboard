import { defaultSpecs } from "./constant";
import type { HardwareSpecifications } from "./interfaces";

export const getHardWareSpecification = (
  consoleType: string
): HardwareSpecifications => {
  const normalized = String(consoleType || "").trim().toLowerCase();
  const validTypes = ["pc", "ps5", "playstation", "ps", "xbox", "vr", "vr_headset"];
  return validTypes.includes(normalized)
    ? { ...defaultSpecs }
    : {
        processorType: "",
        graphicsCard: "",
        ramSize: "",
        storageCapacity: "",
        connectivity: "",
        consoleModelType: "",
      };
};
