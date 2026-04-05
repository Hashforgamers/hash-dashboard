import { Gamepad, Headset, Monitor, Tv } from "lucide-react";
import { ConsoleType, ControllerPricingState, SquadPricingState } from "./types";

export const DEFAULT_CONSOLE_TYPES: ConsoleType[] = [
  {
    type: "pc",
    name: "PC",
    icon: Monitor,
    color: "bg-purple-500/10",
    iconColor: "#a855f7",
    description: "Gaming PCs and Workstations",
  },
  {
    type: "ps5",
    name: "PS5",
    icon: Tv,
    color: "bg-blue-500/10",
    iconColor: "#3b82f6",
    description: "PlayStation 5 Gaming Consoles",
  },
  {
    type: "xbox",
    name: "Xbox",
    icon: Gamepad,
    color: "bg-emerald-500/10",
    iconColor: "#10b981",
    description: "Xbox Series Gaming Consoles",
  },
  {
    type: "vr",
    name: "VR",
    icon: Headset,
    color: "bg-yellow-500/10",
    iconColor: "#f59e0b",
    description: "Virtual Reality Systems",
  },
];

export const PRETTY_LABEL_OVERRIDES: Record<string, string> = {
  pc: "PC",
  playstation: "PlayStation",
  xbox: "Xbox",
  vr_headset: "VR Headset",
  private_room: "Private Room",
  vip_room: "VIP Room",
  bootcamp_room: "Bootcamp Room",
};

export const defaultControllerPricing: ControllerPricingState = {};
export const controllerPreviewQuantities = [1, 2, 3, 4];

export const squadMaxPlayersByConsole: Record<string, number> = {
  pc: 10,
};

export const squadGroupLabelByConsoleType: Record<string, string> = {
  pc: "pc",
};

export const squadRuleDefaults: SquadPricingState = {
  pc: { "2": 0, "3": 3, "4": 5, "5": 8 },
};
