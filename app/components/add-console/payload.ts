import type { FormData } from "../interfaces";
import type { ConsoleDynamicAttributes, ConsoleFormProfile } from "./types";

const humanize = (value: string) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const buildConsoleAttributesSummary = (
  profile: ConsoleFormProfile,
  attributes: ConsoleDynamicAttributes
) => {
  const parts = [
    `Type: ${profile.displayName}`,
    `Input: ${humanize(attributes.inputMode)}`,
    `Capacity: ${attributes.capacity}`,
    `Multiplayer: ${attributes.supportsMultiplayer ? "Yes" : "No"}`,
    `Controller: ${humanize(attributes.controllerPolicy)}`,
  ];
  if (profile.showPlayArea) {
    parts.push(`Play area: ${attributes.playAreaSqft} sq ft`);
  }
  return parts.join(" | ");
};

export const applyAttributesToAdditionalDetails = (
  formData: FormData,
  profile: ConsoleFormProfile,
  attributes: ConsoleDynamicAttributes
): FormData["additionalDetails"] => {
  const summary = buildConsoleAttributesSummary(profile, attributes);
  const currentAccessories = String(formData.additionalDetails.AccessoriesDetails || "").trim();
  const mergedAccessories = currentAccessories
    ? `${currentAccessories}\n${summary}`
    : summary;

  return {
    ...formData.additionalDetails,
    AccessoriesDetails: mergedAccessories,
  };
};
