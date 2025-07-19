import { defaultSpecs } from "./constant";

export const getHardWareSpecification = (
  consoleType: string
): Record<string, string> => {
  const validTypes = ["pc", "ps5", "xbox", "vr"];
  return validTypes.includes(consoleType) ? { ...defaultSpecs } : {};
};