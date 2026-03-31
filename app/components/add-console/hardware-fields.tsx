"use client";

import type { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraphiCoptions,
  ProcessorOption,
  RamSizeOptions,
  StorageOptions,
} from "../constant";
import type { FormData } from "../interfaces";
import type { ConsoleDynamicAttributes, ConsoleFormProfile, ControllerPolicy } from "./types";

type Props = {
  profile: ConsoleFormProfile;
  formdata: FormData;
  setformdata: Dispatch<SetStateAction<FormData>>;
  dynamicAttributes: ConsoleDynamicAttributes;
  setDynamicAttributes: Dispatch<SetStateAction<ConsoleDynamicAttributes>>;
};

const CONTROLLER_POLICY_OPTIONS: Array<{ value: ControllerPolicy; label: string }> = [
  { value: "none", label: "Not Applicable" },
  { value: "optional", label: "Optional" },
  { value: "required", label: "Required" },
  { value: "included", label: "Included" },
];

const INPUT_MODE_OPTIONS = [
  { value: "controller", label: "Controller" },
  { value: "keyboard_mouse", label: "Keyboard + Mouse" },
  { value: "motion", label: "Motion" },
  { value: "touch", label: "Touch" },
  { value: "mixed", label: "Mixed" },
  { value: "other", label: "Other" },
];

const updateHardwareField = (
  setformdata: Dispatch<SetStateAction<FormData>>,
  key: keyof FormData["hardwareSpecifications"],
  value: string
) => {
  setformdata((prev) => ({
    ...prev,
    hardwareSpecifications: {
      ...prev.hardwareSpecifications,
      [key]: value,
    },
  }));
};

export function DynamicHardwareFields({
  profile,
  formdata,
  setformdata,
  dynamicAttributes,
  setDynamicAttributes,
}: Props) {
  return (
    <>
      {profile.requiresPcHardware ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="processorType">
              Processor Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formdata.hardwareSpecifications?.processorType || ""}
              onValueChange={(value) => updateHardwareField(setformdata, "processorType", value)}
            >
              <SelectTrigger id="processorType">
                <SelectValue placeholder="Select processor type" />
              </SelectTrigger>
              <SelectContent>
                {ProcessorOption.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="graphicsCard">
              Graphics Card <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formdata.hardwareSpecifications.graphicsCard}
              onValueChange={(value) => updateHardwareField(setformdata, "graphicsCard", value)}
            >
              <SelectTrigger id="graphicsCard">
                <SelectValue placeholder="Select graphics card" />
              </SelectTrigger>
              <SelectContent>
                {GraphiCoptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ramSize">
              RAM Size <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formdata.hardwareSpecifications.ramSize}
              onValueChange={(value) => updateHardwareField(setformdata, "ramSize", value)}
            >
              <SelectTrigger id="ramSize">
                <SelectValue placeholder="Select RAM size" />
              </SelectTrigger>
              <SelectContent>
                {RamSizeOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="storageCapacity">
              Storage Capacity <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formdata.hardwareSpecifications.storageCapacity}
              onValueChange={(value) => updateHardwareField(setformdata, "storageCapacity", value)}
            >
              <SelectTrigger id="storageCapacity">
                <SelectValue placeholder="Select storage capacity" />
              </SelectTrigger>
              <SelectContent>
                {StorageOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="connectivity">
              Connectivity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="connectivity"
              placeholder="Enter connectivity options"
              value={formdata.hardwareSpecifications.connectivity}
              onChange={(e) => updateHardwareField(setformdata, "connectivity", e.target.value)}
              required
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="consoleVariant">
              Console Variant <span className="text-red-500">*</span>
            </Label>
            <Input
              id="consoleVariant"
              placeholder={`Enter ${profile.displayName} model`}
              value={formdata.hardwareSpecifications.consoleModelType}
              onChange={(e) => updateHardwareField(setformdata, "consoleModelType", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storageCapacity">
              Storage Capacity <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formdata.hardwareSpecifications.storageCapacity}
              onValueChange={(value) => updateHardwareField(setformdata, "storageCapacity", value)}
            >
              <SelectTrigger id="storageCapacity">
                <SelectValue placeholder="Select storage capacity" />
              </SelectTrigger>
              <SelectContent>
                {StorageOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {profile.showConnectivity && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="connectivity">Connectivity</Label>
              <Input
                id="connectivity"
                placeholder="e.g. Wi-Fi, Ethernet, Bluetooth"
                value={formdata.hardwareSpecifications.connectivity}
                onChange={(e) => updateHardwareField(setformdata, "connectivity", e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="inputMode">
              Input Mode <span className="text-red-500">*</span>
            </Label>
            <Select
              value={dynamicAttributes.inputMode}
              onValueChange={(value) =>
                setDynamicAttributes((prev) => ({
                  ...prev,
                  inputMode: value,
                }))
              }
            >
              <SelectTrigger id="inputMode">
                <SelectValue placeholder="Select input mode" />
              </SelectTrigger>
              <SelectContent>
                {INPUT_MODE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">
              Capacity / Setup <span className="text-red-500">*</span>
            </Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              max={64}
              value={dynamicAttributes.capacity}
              onChange={(e) =>
                setDynamicAttributes((prev) => ({
                  ...prev,
                  capacity: Math.min(64, Math.max(1, Number(e.target.value || 1))),
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="controllerPolicy">Controller Policy</Label>
            <Select
              value={dynamicAttributes.controllerPolicy}
              onValueChange={(value) =>
                setDynamicAttributes((prev) => ({
                  ...prev,
                  controllerPolicy: value as ControllerPolicy,
                }))
              }
            >
              <SelectTrigger id="controllerPolicy">
                <SelectValue placeholder="Select controller policy" />
              </SelectTrigger>
              <SelectContent>
                {CONTROLLER_POLICY_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {profile.allowMultiplayerToggle && (
            <label className="check-item self-end mb-2">
              <input
                type="checkbox"
                checked={Boolean(dynamicAttributes.supportsMultiplayer)}
                onChange={(e) =>
                  setDynamicAttributes((prev) => ({
                    ...prev,
                    supportsMultiplayer: e.target.checked,
                  }))
                }
              />
              <span>Supports Multiplayer</span>
            </label>
          )}

          {profile.showPlayArea && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="playAreaSqft">Recommended Play Area (sq ft)</Label>
              <Input
                id="playAreaSqft"
                type="number"
                min={0}
                value={dynamicAttributes.playAreaSqft}
                onChange={(e) =>
                  setDynamicAttributes((prev) => ({
                    ...prev,
                    playAreaSqft: Math.max(0, Number(e.target.value || 0)),
                  }))
                }
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
