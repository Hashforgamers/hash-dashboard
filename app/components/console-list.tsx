"use client";
import { cn } from "@/lib/utils";
import CafeAuditPanel from "./cafe-audit-panel";
import {Dialog,DialogContent,DialogHeader,DialogTitle} from "@/components/ui/dialog";


import { creditAuthHeaders } from "@/lib/credit-auth";
import styles from "./console-list.module.css";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  History,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  Power,
  Monitor,
  Gamepad,
  Cpu,
  Building2,
  CpuIcon as Gpu,
  MemoryStickIcon as Memory,
  HardDrive,
  Activity,
  RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useDashboardData } from "@/app/context/DashboardDataContext";
import  HashLoader  from "./ui/HashLoader";

import { DASHBOARD_URL } from "@/src/config/env";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { normalizeConsoleSlug, resolveConsoleIcon } from "./console-catalog";



interface ConsoleListProps {
  onEdit: (console: any) => void;
  refreshKey?: number;
}

export function ConsoleList({ onEdit, refreshKey = 0 }: ConsoleListProps) {
  const [historyConsole,setHistoryConsole]=useState<{id:number;name:string}|null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [data, setdata] = useState<any[]>([]);
  const { vendorId: cachedVendorId, consoles: cachedConsoles, refreshConsoles, setConsoles: setCachedConsoles } = useDashboardData();
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingConsoleId, setDeletingConsoleId] = useState<number | null>(null);
  const [releasingConsoleId, setReleasingConsoleId] = useState<number | null>(null);
  const [unlinkingConsoleId, setUnlinkingConsoleId] = useState<number | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const flipCard = (id: number, showHardware: boolean) => {
    setFlippedCards((previous) => ({ ...previous, [id]: showHardware }));
    requestAnimationFrame(() => document.getElementById(`console-${id}-${showHardware ? "back" : "front"}-button`)?.focus());
  };

  const [activeGroup, setActiveGroup] = useState<string>("");
  const searchParams = useSearchParams();
  const requestedGroup = searchParams.get("type");
  useEffect(() => { setActiveGroup(requestedGroup || ""); }, [requestedGroup]);

  const loadConsoles = async (currentVendorId: number, force = false) => {
    if (!currentVendorId) return;
    setIsLoading(true);
    try {
      if (!force && Array.isArray(cachedConsoles) && cachedConsoles.length > 0) {
        setdata(cachedConsoles);
      } else {
        const fresh = await refreshConsoles(force);
        if (Array.isArray(fresh)) {
          setdata(fresh);
        } else {
          const response = await axios.get(
            `${DASHBOARD_URL}/api/getConsoles/vendor/${currentVendorId}`
          );
          const nextData = response?.data || [];
          setdata(nextData);
          setCachedConsoles(Array.isArray(nextData) ? nextData : []);
        }
      }
    } catch (error) {
      console.error("Error occurred while fetching consoles:", error);
    } finally {
      setIsLoading(false);
    }
  };


  // Decode token once when the component mounts
  useEffect(() => {
    if (cachedVendorId) {
      setVendorId(cachedVendorId);
      return;
    }
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
    }
  }, [cachedVendorId]); // runs once on mount


  useEffect(() => {
    if (!vendorId) return;
    if (Array.isArray(cachedConsoles) && cachedConsoles.length > 0) {
      setdata(cachedConsoles);
      setIsLoading(false);
      return;
    }
    loadConsoles(vendorId);
  }, [vendorId, refreshKey, cachedConsoles]); // rerun when vendor changes or caller asks refresh

  useEffect(() => {
    const handleRefresh = () => {
      if (!vendorId) return;
      loadConsoles(vendorId);
    };
    window.addEventListener("refresh-dashboard", handleRefresh);
    return () => window.removeEventListener("refresh-dashboard", handleRefresh);
  }, [vendorId]);



  const consolelistdata = data.map((item: any) => {
    const normalizedType = normalizeConsoleSlug(String(item.type || "")) || "unknown";
    const occupancyState = String(item.occupancyState || "").toLowerCase() || (item.status ? "free" : "occupied");
    const statusLabel = String(item.statusLabel || "").trim() || (occupancyState === "free" ? "Free" : "Occupied");
    const displayType = String(item.consoleDisplayName || "");
    return {
      id: item.id,
      currentQrSessionId: item.currentQrSessionId,
      type: normalizedType,
      displayType,
      name: item.name || "Unknown Console",
      number: item.number || "N/A",
      icon: resolveConsoleIcon(item.icon, normalizedType),
      brand: item.brand || "Unknown Brand",
      processor: item.processor || "N/A",
      gpu: item.gpu || "N/A",
      ram: item.ram || "N/A",
      storage: item.storage || "N/A",
      consoleModelType: item.consoleModelType || "N/A",
      screenSizeInches: item.screenSizeInches ?? null,
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

  const groupedConsoles = useMemo(() => {
    const grouped: Record<string, any[]> = {};

    consolelistdata.forEach((console: any) => {
      const key = String(console.type || "unknown");
      grouped[key] = grouped[key] || [];
      grouped[key].push(console);
    });

    return grouped;
  }, [consolelistdata]);

  const groupKeys = useMemo(() => Object.keys(groupedConsoles).sort(), [groupedConsoles]);

  const typeMeta = useMemo(() => {
    const meta: Record<string, { label: string; icon: any }> = {};
    groupKeys.forEach((key) => {
      const sample = groupedConsoles[key]?.[0];
      meta[key] = {
        label: sample?.displayType || key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()).replace(/\b(Pc|Vr|Vip)\b/g, (w: string) => w.toUpperCase()),
        icon: sample?.icon || resolveConsoleIcon(undefined, key),
      };
    });
    return meta;
  }, [groupKeys, groupedConsoles]);


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
        setCachedConsoles(data.filter((item: any) => item.id !== id));
        toast.success("Console deleted");
      }
    } catch (error) {
      console.log("something while wrong to delete the data", error);
      toast.error("Couldn't delete the console. Please try again.");
    } finally {
      setDeletingConsoleId(null);
    }
  };

  const handleRelease = async (consoleItem: any): Promise<void> => {
    if (!vendorId || !consoleItem?.id || !consoleItem?.gameId) return;
    try {
      setReleasingConsoleId(consoleItem.id);
      await axios.post(
        consoleItem.currentQrSessionId
          ? `${DASHBOARD_URL}/api/cafe/${vendorId}/sessions/${consoleItem.currentQrSessionId}/end`
          : `${DASHBOARD_URL}/api/releaseDevice/consoleTypeId/${consoleItem.gameId}/console/${consoleItem.id}/vendor/${vendorId}`,
        {},
        { headers: creditAuthHeaders() }
      );

      await loadConsoles(vendorId, true);
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
      await loadConsoles(vendorId, true);
      window.dispatchEvent(new Event("refresh-dashboard"));
      toast.success("Kiosk unlinked");
    } catch (error) {
      console.error("Failed to unlink kiosk:", error);
      toast.error("Couldn't unlink the kiosk. Please try again.");
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
          <p className="text-xs text-muted-foreground">Loading consoles...</p>
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


  const selectedGroup = groupKeys.includes(activeGroup) ? activeGroup : groupKeys[0];
  const visibleGroups = selectedGroup ? [selectedGroup] : [];

  return (
    <div className={`${styles.root} dashboard-module dashboard-typography flex h-full min-h-0 flex-col gap-3 overflow-hidden`}>
      <div className={styles.filters}>
        <div className="flex flex-wrap gap-2">
          {groupKeys.map((group) => {
            const Icon = typeMeta[group]?.icon || Monitor;
            const count = (groupedConsoles[group] || []).length;
            return (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                aria-pressed={selectedGroup === group}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                  selectedGroup === group
                    ? "border-blue-400/55 bg-blue-500/10 text-zinc-900 dark:bg-blue-500/15 dark:text-blue-200"
                    : "border-zinc-300 bg-white/80 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600/70 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-700/70"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {typeMeta[group]?.label || group} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-4">
          {visibleGroups.map((group) => {
            const consolesForGroup = groupedConsoles[group] || [];
            const GroupIcon = typeMeta[group]?.icon || Monitor;
            return (
              <div key={group} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <GroupIcon className="h-4 w-4 text-zinc-700 dark:text-blue-300" />
                  <h3 className="dash-title !text-sm">{typeMeta[group]?.label || group} Consoles</h3>
                  <span className={badgeVariants({ variant: "info" })}>
                    {consolesForGroup.length}
                  </span>
                </div>

            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className={styles.grid}
            >
              {consolesForGroup.map((console) => (
                <motion.div key={console.id} variants={item}>
                  <div className={styles.flipScene}>
                  <div className={`${styles.flipInner} ${flippedCards[console.id] ? styles.flipped : ""}`}>
                  <Card className={`${styles.card} ${styles.frontFace}`} aria-hidden={Boolean(flippedCards[console.id])}
                    ref={(element) => { if (element) element.inert = Boolean(flippedCards[console.id]); }}>
                    <CardContent className={styles.content}>
                      <div className={styles.identity}>
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className={styles.icon}>
                            <console.icon className="h-7 w-7 text-zinc-700 dark:text-blue-300" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 title={console.name} className="dash-title line-clamp-2 !text-base leading-tight">
                              {console.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {console.number}
                            </p>
                          </div>
                        </div>
                        {console.type === "pc" && console.kioskLinked && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(badgeVariants({ variant: "success" }), "cursor-help gap-2")}>
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

                      <div className="space-y-2 text-xs">
                        <button
                          id={`console-${console.id}-front-button`}
                          className={styles.flipButton}
                          type="button"
                          aria-label={`Show hardware details for ${console.name}`}
                          onClick={() => flipCard(console.id, true)}
                        >
                          <span>Hardware details</span><RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>

                        <div className={styles.status}>
                          <div className="flex items-center space-x-2">
                            <Activity className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                            <span className="text-zinc-600 dark:text-zinc-400">Status</span>
                          </div>
                          {console.occupancyState === "occupied" ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className={cn(badgeVariants({ variant: "warning" }), "cursor-help")}
                                  >
                                    Occupied
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                                  <p>Gamer: {console.currentUsername || "Session details unavailable"}</p>
                                  <p>Session: {console.currentStartTime || "--"} - {console.currentEndTime || "--"}</p>
                                  <p>Collectible: Rs {console.collectibleAmount.toFixed(2)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Badge variant={console.occupancyState === "free" ? "success" : "danger"}>
                              {console.occupancyState === "free" ? "Free" : "Under Maintenance"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div
                        className={styles.actions}
                      >
                        <Button variant="soft-info"
                          size="sm"
                          onClick={() => onEdit(console)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {console.occupancyState === "occupied" && (
                          <Button variant="soft-warning"
                            size="sm"
                            onClick={() => handleRelease(console)}
                            disabled={releasingConsoleId === console.id || deletingConsoleId !== null}>
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
                        {/* modal={false}: a modal menu that opens a dialog leaves the page unclickable (Radix focus bug) */}
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={styles.more} aria-label={`More actions for ${console.name}`}>
                              {deletingConsoleId === console.id || unlinkingConsoleId === console.id
                                ? <Loader2 className="animate-spin" />
                                : <MoreHorizontal />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setHistoryConsole({ id: console.id, name: console.name })}>
                              <History className="mr-2 h-4 w-4" />Session history
                            </DropdownMenuItem>
                            {console.type === "pc" && console.kioskLinked && (
                              <DropdownMenuItem disabled={unlinkingConsoleId === console.id || deletingConsoleId !== null} onSelect={() => handleUnlink(console)}>
                                <Power className="mr-2 h-4 w-4" />Unlink kiosk
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={deletingConsoleId !== null} onSelect={() => setDeleteTarget({ id: console.id, name: console.name })}
                              className="text-red-400 focus:bg-red-500/15 focus:text-red-300">
                              <Trash2 className="mr-2 h-4 w-4" />Delete console
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={`${styles.card} ${styles.backFace}`} aria-hidden={!flippedCards[console.id]}
                    ref={(element) => { if (element) element.inert = !flippedCards[console.id]; }}
                    onKeyDown={(event) => { if (event.key === "Escape") flipCard(console.id, false); }}>
                    <CardContent className={styles.backContent}>
                      <div className={styles.backHeader}>
                        <div><h3 className="text-sm font-semibold">Hardware details</h3><p className="text-xs text-muted-foreground">{console.name}</p></div>
                        <button id={`console-${console.id}-back-button`} type="button" className={styles.flipButton}
                          aria-label={`Back to ${console.name}`} onClick={() => flipCard(console.id, false)}>
                          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Back
                        </button>
                      </div>
                      <div className={styles.specs}>
<div className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-4 gap-y-2 pt-3">
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                            <span className="text-zinc-600 dark:text-zinc-400">Brand</span>
                          </div>
                          <span className="font-medium break-words text-foreground">{console.brand}</span>

                          {console.type === "pc" ? (
                            <>
                              <div className="flex items-center space-x-2">
                                <Cpu className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">CPU</span>
                              </div>
                              <span className="font-medium break-words text-foreground">
                                {console.processor || "N/A"}
                              </span>

                              <div className="flex items-center space-x-2">
                                <Gpu className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">GPU</span>
                              </div>
                              <span className="font-medium break-words text-foreground">{console.gpu || "N/A"}</span>

                              <div className="flex items-center space-x-2">
                                <Memory className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">RAM</span>
                              </div>
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">{console.ram || "N/A"}</span>

                              <div className="flex items-center space-x-2">
                                <HardDrive className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">Storage</span>
                              </div>
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">{console.storage || "N/A"}</span>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center space-x-2">
                                <Gamepad className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">Variant</span>
                              </div>
                              <span className="font-medium break-words text-foreground">{console.consoleModelType || "N/A"}{console.screenSizeInches ? ` · ${console.screenSizeInches}″ TV` : ""}</span>

                              <div className="flex items-center space-x-2">
                                <HardDrive className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">Storage</span>
                              </div>
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">{console.storage || "N/A"}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
              </div>
            );
          })}
        </div>
      </div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This removes the console from your café. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-700 text-white hover:bg-red-800"
              onClick={() => { if (deleteTarget) void handleDelete(deleteTarget.id); }}
            >
              <Trash2 className="mr-2 h-4 w-4" />Delete console
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={!!historyConsole} onOpenChange={open=>{if(!open)setHistoryConsole(null);}}><DialogContent className="max-h-[85vh] max-w-6xl overflow-y-auto"><DialogHeader><DialogTitle>{historyConsole?.name||'Console'} — session history</DialogTitle></DialogHeader>{historyConsole&&vendorId&&<CafeAuditPanel key={`${vendorId}:${historyConsole.id}`} vendorId={vendorId} consoleId={historyConsole.id}/>}</DialogContent></Dialog>
    </div>
  );
}
