"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Building2, Cpu, CpuIcon as Gpu, MemoryStickIcon as Memory, HardDrive, Activity } from "lucide-react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { DASHBOARD_URL } from "@/src/config/env";

type ConsoleType = "pc" | "ps5" | "xbox" | "vr";
type ConsoleStatus = "available" | "in use" | "under maintenance";

interface EditConsoleFormProps {
  console: any;
  onClose: (didUpdate?: boolean) => void;
}

const STATUS_OPTIONS: Array<{ label: string; value: ConsoleStatus }> = [
  { label: "Available", value: "available" },
  { label: "In Use", value: "in use" },
  { label: "Under Maintenance", value: "under maintenance" },
];

const TYPE_FIELDS: Record<ConsoleType, Array<"cpu" | "gpu" | "ram" | "storage">> = {
  pc: ["cpu", "gpu", "ram", "storage"],
  ps5: ["storage"],
  xbox: ["storage"],
  vr: ["storage"],
};

const NON_PC_MODEL_HINT: Record<Exclude<ConsoleType, "pc">, string> = {
  ps5: "PS5 / PS5 Slim / PS5 Pro",
  xbox: "Xbox Series S / Xbox Series X",
  vr: "Meta Quest / PS VR2",
};

export function EditConsoleForm({ console, onClose }: EditConsoleFormProps) {
  const consoleType = String(console?.type || "pc").toLowerCase() as ConsoleType;
  const visibleFields = TYPE_FIELDS[consoleType] || TYPE_FIELDS.pc;

  const [brand, setBrand] = useState(String(console?.brand || ""));
  const [name, setName] = useState(String(console?.name || ""));
  const [cpu, setCpu] = useState(String(console?.processor || ""));
  const [gpu, setGpu] = useState(String(console?.gpu || ""));
  const [ram, setRam] = useState(String(console?.ram || ""));
  const [storage, setStorage] = useState(String(console?.storage || ""));

  const initialStatus = useMemo<ConsoleStatus>(() => {
    const statusLabel = String(console?.statusLabel || "").toLowerCase().trim();
    if (statusLabel === "under maintenance") return "under maintenance";
    if (statusLabel === "in use") return "in use";
    if (statusLabel === "available") return "available";

    if (typeof console?.status === "boolean") {
      return console.status ? "available" : "in use";
    }
    return "available";
  }, [console?.status, console?.statusLabel]);

  const [status, setStatus] = useState<ConsoleStatus>(initialStatus);
  const [consoleModelType, setConsoleModelType] = useState(String(console?.consoleModelType || ""));
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decodedToken = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decodedToken.sub.id);
    }
  }, []);

  const canSave = Boolean(vendorId) && !isSaving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      setError("Vendor context missing. Please login again.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      consoleId: console?.id,
      consoleDetails: {
        name: name.trim(),
        brand: brand.trim(),
        processor: visibleFields.includes("cpu") ? cpu.trim() : null,
        gpu: visibleFields.includes("gpu") ? gpu.trim() : null,
        ram: visibleFields.includes("ram") ? ram.trim() : null,
        storage: visibleFields.includes("storage") ? storage.trim() : null,
        consoleModelType: consoleType === "pc" ? null : consoleModelType.trim(),
        status,
      },
    };

    try {
      await axios.put(
        `${DASHBOARD_URL}/api/console/update/vendor/${vendorId}`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      onClose(true);
    } catch (err: any) {
      const apiError = err?.response?.data?.error;
      setError(apiError || "Failed to update console. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit Console</DialogTitle>
          <p className="text-sm text-slate-400">
            Console type: <span className="font-semibold uppercase text-cyan-200">{consoleType}</span> | Console #{String(console?.number || "N/A")}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center">Console Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="HASH_1 / PS5_2" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand" className="flex items-center"><Building2 className="mr-2 h-4 w-4" />Brand</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="flex items-center"><Activity className="mr-2 h-4 w-4" />Status</Label>
              <Select value={status} onValueChange={(value: ConsoleStatus) => setStatus(value)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {consoleType !== "pc" && (
            <div className="space-y-2">
              <Label htmlFor="consoleModelType">Console Variant</Label>
              <Input
                id="consoleModelType"
                value={consoleModelType}
                onChange={(e) => setConsoleModelType(e.target.value)}
                placeholder={NON_PC_MODEL_HINT[consoleType as Exclude<ConsoleType, "pc">]}
              />
            </div>
          )}

          {visibleFields.includes("cpu") && (
            <div className="space-y-2">
              <Label htmlFor="cpu" className="flex items-center"><Cpu className="mr-2 h-4 w-4" />CPU</Label>
              <Input id="cpu" value={cpu} onChange={(e) => setCpu(e.target.value)} placeholder="Processor" />
            </div>
          )}

          {visibleFields.includes("gpu") && (
            <div className="space-y-2">
              <Label htmlFor="gpu" className="flex items-center"><Gpu className="mr-2 h-4 w-4" />GPU</Label>
              <Input id="gpu" value={gpu} onChange={(e) => setGpu(e.target.value)} placeholder="Graphics card" />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {visibleFields.includes("ram") && (
              <div className="space-y-2">
                <Label htmlFor="ram" className="flex items-center"><Memory className="mr-2 h-4 w-4" />RAM</Label>
                <Input id="ram" value={ram} onChange={(e) => setRam(e.target.value)} placeholder="RAM" />
              </div>
            )}

            {visibleFields.includes("storage") && (
              <div className="space-y-2">
                <Label htmlFor="storage" className="flex items-center"><HardDrive className="mr-2 h-4 w-4" />Storage</Label>
                <Input id="storage" value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="Storage" />
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
