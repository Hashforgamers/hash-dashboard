"use client";


import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Edit,
  Trash2,
  Loader2,
  Power,
  Monitor,
  Gamepad,
  Tv,
  Headset,
  Cpu,
  Building2,
  CpuIcon as Gpu,
  MemoryStickIcon as Memory,
  HardDrive,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import  HashLoader  from "./ui/HashLoader";

import { DASHBOARD_URL } from "@/src/config/env";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";



interface ConsoleListProps {
  onEdit: (console: any) => void;
  refreshKey?: number;
}

export function ConsoleList({ onEdit, refreshKey = 0 }: ConsoleListProps) {
  const [data, setdata] = useState([]);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingConsoleId, setDeletingConsoleId] = useState<number | null>(null);
  const [releasingConsoleId, setReleasingConsoleId] = useState<number | null>(null);
  const [unlinkingConsoleId, setUnlinkingConsoleId] = useState<number | null>(null);
  const [activeGroup, setActiveGroup] = useState<"all" | "pc" | "ps5" | "xbox" | "vr">("all");

  const loadConsoles = async (currentVendorId: number) => {
    if (!currentVendorId) return;
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${DASHBOARD_URL}/api/getConsoles/vendor/${currentVendorId}`
      );
      setdata(response?.data || []);
    } catch (error) {
      console.error("Error occurred while fetching consoles:", error);
    } finally {
      setIsLoading(false);
    }
  };


  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");


    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []); // runs once on mount


  useEffect(() => {
    if (!vendorId) return;
    loadConsoles(vendorId);
  }, [vendorId, refreshKey]); // rerun when vendor changes or caller asks refresh

  useEffect(() => {
    const handleRefresh = () => {
      if (!vendorId) return;
      loadConsoles(vendorId);
    };
    window.addEventListener("refresh-dashboard", handleRefresh);
    return () => window.removeEventListener("refresh-dashboard", handleRefresh);
  }, [vendorId]);



  const consoleIconByType: Record<string, any> = {
    pc: Monitor,
    ps5: Tv,
    xbox: Gamepad,
    vr: Headset,
  };

  const consolelistdata = data.map((item: any) => {
    const normalizedType = String(item.type || "pc").toLowerCase();
    const occupancyState = String(item.occupancyState || "").toLowerCase() || (item.status ? "free" : "occupied");
    const statusLabel = String(item.statusLabel || "").trim() || (occupancyState === "free" ? "Free" : "Occupied");
    return {
      id: item.id,
      type: normalizedType,
      name: item.name || "Unknown Console",
      number: item.number || "N/A",
      icon: consoleIconByType[normalizedType] || Monitor,
      brand: item.brand || "Unknown Brand",
      processor: item.processor || "N/A",
      gpu: item.gpu || "N/A",
      ram: item.ram || "N/A",
      storage: item.storage || "N/A",
      consoleModelType: item.consoleModelType || "N/A",
      status: occupancyState === "free",
      statusLabel,
      occupancyState,
      gameId: item.gameId,
      currentBookingId: item.currentBookingId,
      currentUsername: item.currentUsername,
      currentStartTime: item.currentStartTime,
      currentEndTime: item.currentEndTime,
      collectibleAmount: Number(item.collectibleAmount || 0),
      hasPendingCollection: Boolean(item.hasPendingCollection),
      kioskLinked: Boolean(item.kioskLinked),
      kioskId: item.kioskId || null,
      kioskLinkSessionId: item.kioskLinkSessionId || null,
    };
  });

  const typeMeta: Record<"pc" | "ps5" | "xbox" | "vr", { label: string; icon: any }> = {
    pc: { label: "PC", icon: Monitor },
    ps5: { label: "PS5", icon: Tv },
    xbox: { label: "Xbox", icon: Gamepad },
    vr: { label: "VR", icon: Headset },
  };

  const groupOrder: Array<"pc" | "ps5" | "xbox" | "vr"> = ["pc", "ps5", "xbox", "vr"];

  const groupedConsoles = useMemo(() => {
    const grouped: Record<"pc" | "ps5" | "xbox" | "vr", any[]> = {
      pc: [],
      ps5: [],
      xbox: [],
      vr: [],
    };

    consolelistdata.forEach((console: any) => {
      if (grouped[console.type as keyof typeof grouped]) {
        grouped[console.type as keyof typeof grouped].push(console);
      } else {
        grouped.pc.push(console);
      }
    });

    return grouped;
  }, [consolelistdata]);


  const handleDelete = async (id: number): Promise<void> => {
    try {
      setDeletingConsoleId(id);
      const response = await axios.delete(
        `${DASHBOARD_URL}/api/console/${vendorId}/${id}`
      );
      if (!response) {
        console.log("something went wrong while deleting the data");
      } else {
        console.log(response.data.message);
        setdata((prevData) => prevData.filter((item: any) => item.id !== id));
      }
    } catch (error) {
      console.log("something while wrong to delete the data", error);
    } finally {
      setDeletingConsoleId(null);
    }
  };

  const handleRelease = async (consoleItem: any): Promise<void> => {
    if (!vendorId || !consoleItem?.id || !consoleItem?.gameId) return;
    try {
      setReleasingConsoleId(consoleItem.id);
      await axios.post(
        `${DASHBOARD_URL}/api/releaseDevice/consoleTypeId/${consoleItem.gameId}/console/${consoleItem.id}/vendor/${vendorId}`,
        { bookingStats: {} }
      );

      await loadConsoles(vendorId);
      window.dispatchEvent(new Event("refresh-dashboard"));
    } catch (error) {
      console.error("Failed to release console:", error);
    } finally {
      setReleasingConsoleId(null);
    }
  };

  const handleUnlink = async (consoleItem: any): Promise<void> => {
    if (!vendorId || !consoleItem?.id) return;
    try {
      setUnlinkingConsoleId(consoleItem.id);
      await axios.post(
        `${DASHBOARD_URL}/api/vendors/${vendorId}/pcs/unlink`,
        { console_id: consoleItem.id }
      );
      await loadConsoles(vendorId);
      window.dispatchEvent(new Event("refresh-dashboard"));
    } catch (error) {
      console.error("Failed to unlink kiosk:", error);
    } finally {
      setUnlinkingConsoleId(null);
    }
  };


  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };


  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };


  // Show loading screen while fetching data
  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <HashLoader size={60} />
          <p className="dash-subtitle premium-subtle">Loading consoles...</p>
        </div>
      </div>
    );
  }


  // Show message if no consoles found
  if (!isLoading && consolelistdata.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <p className="dash-title">No consoles found</p>
          <p className="dash-subtitle premium-subtle mt-2">Add a new console to get started</p>
        </div>
      </div>
    );
  }


  const visibleGroups = activeGroup === "all"
    ? groupOrder.filter((group) => groupedConsoles[group].length > 0)
    : [activeGroup];

  return (
    <div className="dashboard-module dashboard-typography flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="gaming-panel shrink-0 rounded-xl border border-cyan-500/25 p-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveGroup("all")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
              activeGroup === "all"
                ? "border-cyan-400/55 bg-cyan-500/10 text-slate-900 dark:bg-cyan-500/15 dark:text-cyan-200"
                : "border-slate-300 bg-white/80 text-slate-700 hover:bg-slate-100 dark:border-slate-600/70 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700/70"
            }`}
          >
            All ({consolelistdata.length})
          </button>
          {groupOrder.map((group) => {
            const Icon = typeMeta[group].icon;
            const count = groupedConsoles[group].length;
            return (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                  activeGroup === group
                    ? "border-cyan-400/55 bg-cyan-500/10 text-slate-900 dark:bg-cyan-500/15 dark:text-cyan-200"
                    : "border-slate-300 bg-white/80 text-slate-700 hover:bg-slate-100 dark:border-slate-600/70 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700/70"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {typeMeta[group].label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-4">
          {visibleGroups.map((group) => {
            const consolesForGroup = groupedConsoles[group];
            const GroupIcon = typeMeta[group].icon;
            return (
              <div key={group} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <GroupIcon className="h-4 w-4 text-slate-700 dark:text-cyan-300" />
                  <h3 className="dash-title !text-sm">{typeMeta[group].label} Consoles</h3>
                  <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2 py-0.5 text-xs text-slate-900 dark:text-cyan-200">
                    {consolesForGroup.length}
                  </span>
                </div>

            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {consolesForGroup.map((console) => (
                <motion.div key={console.id} variants={item}>
                  <Card className="gaming-panel group rounded-xl border border-cyan-500/25 transition-all duration-300 hover:scale-[1.01] hover:border-cyan-400/45 hover:shadow-[0_0_20px_rgba(6,182,212,0.12)]">
                    <CardContent className="flex h-full flex-col p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="feature-action-icon p-2.5 transition-colors group-hover:bg-slate-100 dark:group-hover:bg-slate-800/80">
                            <console.icon className="h-7 w-7 text-slate-700 dark:text-cyan-300" />
                          </div>
                          <div>
                            <h3 className="dash-title !text-base leading-tight">
                              {console.name}
                            </h3>
                            <p className="dash-subtitle premium-subtle">
                              {console.number}
                            </p>
                          </div>
                        </div>
                        {console.type === "pc" && console.kioskLinked && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex cursor-help items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                  Linked
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p>Kiosk linked</p>
                                {console.kioskId ? <p>ID: {console.kioskId}</p> : null}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>

                      <div className="flex-grow space-y-2.5 text-sm">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            <span className="text-slate-600 dark:text-slate-400">Brand</span>
                          </div>
                          <span className="font-medium truncate text-slate-900 dark:text-slate-100">{console.brand}</span>

                          {console.type === "pc" ? (
                            <>
                              <div className="flex items-center space-x-2">
                                <Cpu className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400">CPU</span>
                              </div>
                              <span className="font-medium truncate text-slate-900 dark:text-slate-100">
                                {console.processor || "N/A"}
                              </span>

                              <div className="flex items-center space-x-2">
                                <Gpu className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400">GPU</span>
                              </div>
                              <span className="font-medium truncate text-slate-900 dark:text-slate-100">{console.gpu || "N/A"}</span>

                              <div className="flex items-center space-x-2">
                                <Memory className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400">RAM</span>
                              </div>
                              <span className="font-medium text-slate-900 dark:text-slate-100">{console.ram || "N/A"}</span>

                              <div className="flex items-center space-x-2">
                                <HardDrive className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400">Storage</span>
                              </div>
                              <span className="font-medium text-slate-900 dark:text-slate-100">{console.storage || "N/A"}</span>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center space-x-2">
                                <Gamepad className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400">Variant</span>
                              </div>
                              <span className="font-medium truncate text-slate-900 dark:text-slate-100">{console.consoleModelType || "N/A"}</span>

                              <div className="flex items-center space-x-2">
                                <HardDrive className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400">Storage</span>
                              </div>
                              <span className="font-medium text-slate-900 dark:text-slate-100">{console.storage || "N/A"}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700/70">
                          <div className="flex items-center space-x-2">
                            <Activity className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            <span className="text-slate-600 dark:text-slate-400">Status</span>
                          </div>
                          {console.occupancyState === "occupied" ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex cursor-help items-center rounded-md border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200"
                                  >
                                    Occupied
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                                  <p>Gamer: {console.currentUsername || "Unknown"}</p>
                                  <p>Session: {console.currentStartTime || "--"} - {console.currentEndTime || "--"}</p>
                                  <p>Collectible: Rs {console.collectibleAmount.toFixed(2)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Badge className={console.occupancyState === "free"
                              ? "border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200"
                              : "border border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200"}
                            >
                              {console.occupancyState === "free" ? "Free" : "Under Maintenance"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div
                        className={`mt-4 flex justify-end space-x-2 transition-opacity ${
                          deletingConsoleId === console.id
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(console)}
                          className="border-cyan-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-cyan-400/40 dark:bg-cyan-500/10 dark:text-cyan-200 dark:hover:bg-cyan-500/20"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {console.type === "pc" && console.kioskLinked && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnlink(console)}
                            disabled={unlinkingConsoleId === console.id || deletingConsoleId !== null}
                            className="border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 dark:border-emerald-400/45 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                          >
                            {unlinkingConsoleId === console.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Unlinking...
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4 mr-1" />
                                Unlink
                              </>
                            )}
                          </Button>
                        )}
                        {console.occupancyState === "occupied" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRelease(console)}
                            disabled={releasingConsoleId === console.id || deletingConsoleId !== null}
                            className="border-amber-300 bg-white text-amber-800 hover:bg-amber-50 dark:border-amber-400/45 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
                          >
                            {releasingConsoleId === console.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Releasing...
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4 mr-1" />
                                Release
                              </>
                            )}
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button
                              variant="outline"
                              size="sm"
                              disabled={deletingConsoleId !== null}
                              className="border-rose-300 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-400/45 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                            >
                              {deletingConsoleId === console.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Are you sure you want to delete?
                              </AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-700 hover:bg-red-800 text-white flex items-center gap-2"
                                onClick={() => handleDelete(console.id)}
                                disabled={deletingConsoleId !== null}
                              >
                                {deletingConsoleId === console.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 size={18} />
                                    Confirm Delete
                                  </>
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
