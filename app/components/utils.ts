import { defaultSpecs } from "./constant";
import type { HardwareSpecifications } from "./interfaces";

export const getHardWareSpecification = (
  consoleType: string
): HardwareSpecifications => {
  const validTypes = ["pc", "ps5", "xbox", "vr"];
  return validTypes.includes(consoleType)
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
