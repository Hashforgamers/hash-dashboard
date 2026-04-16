"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BadgeCheck,
  Pencil,
  Trash2,
  PlusCircle,
  Loader2,
  Clock,
  Calendar,
  LayoutGrid,
  Table as TableIcon,
  IndianRupee,
} from "lucide-react";
import { DASHBOARD_URL } from "@/src/config/env";
import { useModuleCache } from "@/app/hooks/useModuleCache";
import { useIsMobile } from "@/components/ui/use-mobile";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { readEnumParam, updateSearchParams } from "@/lib/deeplink";
import { jwtDecode } from "jwt-decode";

/* ------------------------------------------------------------------ */
/*                          TYPE DEFINITIONS                           */
/* ------------------------------------------------------------------ */
type PassType = {
  id: number;
  name: string;
  description?: string;
};

type CafePass = {
  id: number;
  name: string;
  price: number;
  description?: string;
  pass_type?: string;
  pass_mode: "date_based" | "hour_based";
  days_valid: number;
  total_hours?: number;
  hour_calculation_mode?: "actual_duration" | "vendor_config";
  hours_per_slot?: number;
};

/* ------------------------------------------------------------------ */
/*                          MAIN COMPONENT                             */
/* ------------------------------------------------------------------ */
export default function ManagePassesPage() {
  const [passes, setPasses] = useState<CafePass[]>([]);
  const [passTypes, setPassTypes] = useState<PassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [hasMounted, setHasMounted] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string>("");
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deepLinkReady, setDeepLinkReady] = useState(false);

  const passTypesKey = "pass_types";
  const passesKey = `passes:${activeVendorId}`;
  const passBasePath = `${DASHBOARD_URL}/api/vendor/${activeVendorId}/passes`;

  const parseVendorId = (value: unknown): string | null => {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return String(n);
    return null;
  };

  const resolveVendorIdFromSession = (): string | null => {
    try {
      const accessToken = localStorage.getItem("rbac_access_token_v1");
      const jwtToken = localStorage.getItem("jwtToken");
      const token = accessToken || jwtToken;
      if (token) {
        const decoded: any = jwtDecode(token);
        const tokenVendor =
          parseVendorId(decoded?.vendor_id) ||
          parseVendorId(decoded?.sub?.id) ||
          (typeof decoded?.sub === "string" ? parseVendorId(decoded.sub) : null);
        if (tokenVendor) return tokenVendor;
      }
    } catch {
      // Ignore token parsing failures and continue to selectedCafe fallback.
    }

    const selectedCafeRaw = localStorage.getItem("selectedCafe");
    if (!selectedCafeRaw || selectedCafeRaw === "master") return null;

    try {
      const parsed = JSON.parse(selectedCafeRaw);
      if (parsed && typeof parsed === "object") {
        const fromObject =
          parseVendorId((parsed as any).id) ||
          parseVendorId((parsed as any).vendor_id) ||
          parseVendorId((parsed as any).vendorId) ||
          parseVendorId((parsed as any).cafe_id);
        if (fromObject) return fromObject;
      }
    } catch {
      // selectedCafe may be a plain number string (e.g. "41")
    }

    return parseVendorId(selectedCafeRaw);
  };

  const { data: cachedPassTypes, refresh: refreshPassTypes } = useModuleCache<PassType[]>(
    passTypesKey,
    async () => {
      const res = await axios.get(`${DASHBOARD_URL}/api/pass_types`);
      return res.data || [];
    },
    600000,
    passesKey
  );

  const { data: cachedPasses, refresh: refreshPassesCache } = useModuleCache<CafePass[]>(
    passesKey,
    async () => {
      try {
        const res = await axios.get(passBasePath);
        return res.data?.passes || res.data || [];
      } catch (error: any) {
        if (error?.response?.status === 404) {
          try {
            const fallback = await axios.get(`${passBasePath}/`);
            return fallback.data?.passes || fallback.data || [];
          } catch (fallbackErr: any) {
            if (fallbackErr?.response?.status === 404) return [];
            throw fallbackErr;
          }
        }
        throw error;
      }
    },
    120000,
    passesKey
  );

  useEffect(() => {
    setHasMounted(true);
    const resolvedVendorId = resolveVendorIdFromSession();
    if (resolvedVendorId) setActiveVendorId(resolvedVendorId);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    const vm = readEnumParam(searchParams, "vm", ["grid", "table"], "table");
    setViewMode(vm);
    setDeepLinkReady(true);
  }, [hasMounted]);

  useEffect(() => {
    if (!activeVendorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const hydrate = async () => {
      try {
        if (cachedPassTypes) {
          setPassTypes(cachedPassTypes);
        } else {
          const types = await refreshPassTypes();
          if (types) setPassTypes(types);
        }
        if (cachedPasses) {
          setPasses(cachedPasses);
        } else {
          const list = await refreshPassesCache();
          if (list) setPasses(list);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, [activeVendorId, cachedPassTypes, cachedPasses, refreshPassTypes, refreshPassesCache]);

  const refreshPasses = async () => {
    try {
      const list = await refreshPassesCache(true);
      if (list) setPasses(list);
    } catch (error) {
      console.error("Failed to refresh:", error);
    }
  };

  const handleAddPass = async (data: any, close: () => void) => {
    try {
      await axios.post(
        `${DASHBOARD_URL}/api/vendor/${activeVendorId}/passes`,
        data
      );
      await refreshPasses();
      close();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || "Failed to create pass"}`);
    }
  };

  const handleEditPass = async (
    id: number,
    data: any,
    close: () => void
  ) => {
    try {
      await axios.put(
        `${DASHBOARD_URL}/api/vendor/${activeVendorId}/passes/${id}`,
        data
      );
      await refreshPasses();
      close();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || "Failed to update pass"}`);
    }
  };

  const handleDeletePass = async (id: number) => {
    if (!confirm("Are you sure you want to delete this pass?")) return;
    setDeletingId(id);
    try {
      await axios.delete(
        `${DASHBOARD_URL}/api/vendor/${activeVendorId}/passes/${id}`
      );
      await refreshPasses();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || "Failed to delete pass"}`);
    } finally {
      setDeletingId(null);
    }
  };

  const datePasses = passes.filter((p) => p.pass_mode === "date_based");
  const hourPasses = passes.filter((p) => p.pass_mode === "hour_based");
  const primaryButtonClass =
    "ui-action-primary inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm";

  useEffect(() => {
    if (!hasMounted || !deepLinkReady) return;
    const desiredMode = isMobile ? "grid" : viewMode;
    const next = updateSearchParams(searchParams, { vm: desiredMode });
    const currentQuery = searchParams.toString();
    const nextQuery = next.toString();
    if (currentQuery === nextQuery) return;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [viewMode, isMobile, hasMounted, deepLinkReady, pathname, router, searchParams]);

  if (!hasMounted) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="icon-lg animate-spin text-blue-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-module dashboard-typography flex h-full min-h-0 flex-col gap-4 overflow-hidden px-1 pb-2 sm:px-2">

      {/* ✅ View Toggle */}
      <div className="gaming-panel dashboard-module-panel mb-2 shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-xl p-3">
        <div className="dashboard-module-tab-group flex items-center gap-1 rounded-lg p-1">
          {!isMobile && (
            <>
              <button
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                  viewMode === "grid"
                    ? "dashboard-module-tab-active bg-cyan-500/12 text-slate-900 shadow-sm dark:text-cyan-100"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-cyan-100"
                }`}
              >
                <LayoutGrid className="icon-md" />
                Grid
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                  viewMode === "table"
                    ? "dashboard-module-tab-active bg-cyan-500/12 text-slate-900 shadow-sm dark:text-cyan-100"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-cyan-100"
                }`}
              >
                <TableIcon className="icon-md" />
                List
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!loading && passes.length > 0 && (
            <>
            <span className="rounded-full border border-blue-300/40 bg-blue-50 px-2 py-0.5 text-xs font-bold text-sky-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
              {hourPasses.length} Hour-Based
            </span>
            <span className="rounded-full border border-emerald-300/40 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              {datePasses.length} Date-Based
            </span>
            </>
          )}
          <AddPassDialog passTypes={passTypes} onSave={handleAddPass} buttonClassName={primaryButtonClass} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {/* ✅ Content */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <p className="body-text-muted">Loading passes...</p>
          </div>
        ) : passes.length === 0 ? (
          <div className="gaming-panel dashboard-module-panel flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-cyan-400/20 py-16">
            <BadgeCheck className="w-12 h-12 text-muted-foreground/30" />
            <h3 className="section-title text-muted-foreground/60">No passes found</h3>
            <p className="body-text-muted">Create your first pass to get started</p>
            <div className="mt-2">
              <AddPassDialog passTypes={passTypes} onSave={handleAddPass} buttonClassName={primaryButtonClass} />
            </div>
          </div>
        ) : (isMobile || viewMode === "grid") ? (

        /* ✅ GRID VIEW */
        <div className="section-spacing">
          {hourPasses.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="icon-blue p-1.5 rounded-lg">
                  <Clock className="icon-md text-blue-400" />
                </div>
                <h2 className="section-title">Hour-Based Passes</h2>
                <span className="rounded-full border border-blue-300/40 bg-blue-50 px-2 py-0.5 text-xs font-bold text-sky-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                  {hourPasses.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {hourPasses.map((pass) => (
                  <PassCard
                    key={pass.id}
                    pass={pass}
                    passTypes={passTypes}
                    onEdit={handleEditPass}
                    onDelete={handleDeletePass}
                    deletingId={deletingId}
                  />
                ))}
              </div>
            </div>
          )}

          {datePasses.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="icon-green p-1.5 rounded-lg">
                  <Calendar className="icon-md text-emerald-400" />
                </div>
                <h2 className="section-title">Date-Based Passes</h2>
                <span className="rounded-full border border-emerald-300/40 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                  {datePasses.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {datePasses.map((pass) => (
                  <PassCard
                    key={pass.id}
                    pass={pass}
                    passTypes={passTypes}
                    onEdit={handleEditPass}
                    onDelete={handleDeletePass}
                    deletingId={deletingId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        ) : (

        /* ✅ TABLE VIEW */
        <PassesTable
          passes={passes}
          passTypes={passTypes}
          onEdit={handleEditPass}
          onDelete={handleDeletePass}
          deletingId={deletingId}
        />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                          TABLE VIEW                                 */
/* ------------------------------------------------------------------ */
function PassesTable({ passes, passTypes, onEdit, onDelete, deletingId }: any) {
  return (
    <div className="dashboard-table-shell">
      <div className="dashboard-table-wrap">
        <table className="dashboard-table text-left">
          <thead className="dashboard-module-table-head">
            <tr>
              {["Pass Name", "Mode", "Price", "Validity", "Hours", "Actions"].map((h) => (
                <th key={h} className="table-cell dashboard-module-table-header text-[11px] font-bold uppercase tracking-wider sm:text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {passes.map((pass: CafePass) => (
              <tr key={pass.id} className="table-row border-b border-cyan-500/10 last:border-0">

                {/* Name */}
                <td className="table-cell">
                  <p className="body-text font-semibold">{pass.name}</p>
                  {pass.description && (
                    <p className="body-text-muted text-xs line-clamp-1 mt-0.5">
                      {pass.description}
                    </p>
                  )}
                </td>

                {/* Mode badge */}
                <td className="table-cell">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                      pass.pass_mode === "hour_based"
                        ? "border-blue-300/40 bg-blue-50 text-sky-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400"
                        : "border-emerald-300/40 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                    }`}
                  >
                    {pass.pass_mode === "hour_based" ? (
                      <Clock className="w-3 h-3" />
                    ) : (
                      <Calendar className="w-3 h-3" />
                    )}
                    {pass.pass_mode === "hour_based" ? "Hour" : "Date"}
                  </span>
                </td>

                {/* Price */}
                <td className="table-cell">
                  <div className="flex items-center gap-0.5 font-bold text-sky-700 dark:text-blue-400">
                    <IndianRupee className="icon-md" />
                    <span>{pass.price}</span>
                  </div>
                </td>

                {/* Validity */}
                <td className="table-cell">
                  <div className="flex items-center gap-1 body-text-muted">
                    <Calendar className="icon-md shrink-0" />
                    <span>{pass.days_valid} days</span>
                  </div>
                </td>

                {/* Hours (only for hour-based) */}
                <td className="table-cell">
                  {pass.pass_mode === "hour_based" ? (
                    <div className="flex items-center gap-1 body-text-muted">
                      <Clock className="icon-md shrink-0" />
                      <span>{pass.total_hours} hrs</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="table-cell">
                  <div className="flex items-center gap-1">
                    <EditPassDialog
                      passTypes={passTypes}
                      passObj={pass}
                      onSave={onEdit}
                    />
                    <button
                      onClick={() => onDelete(pass.id)}
                      disabled={deletingId === pass.id}
                      className="inline-flex items-center justify-center rounded-lg border border-rose-300/50 bg-rose-50 p-2 text-rose-600 transition-all duration-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                      title="Delete"
                    >
                      {deletingId === pass.id ? (
                        <Loader2 className="icon-md text-destructive animate-spin" />
                      ) : (
                        <Trash2 className="icon-md text-destructive" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                           PASS CARD (Grid)                          */
/* ------------------------------------------------------------------ */
function PassCard({ pass, passTypes, onEdit, onDelete, deletingId }: any) {
  const isHourBased = pass.pass_mode === "hour_based";

  return (
    <Card className="dashboard-module-surface transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10">
      <CardHeader className="flex flex-row items-start justify-between border-b border-cyan-500/15 p-4">
        <div className="min-w-0 flex-1">
          <h2 className="card-title truncate">{pass.name}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            {isHourBased ? (
              <Clock className="w-3 h-3 text-blue-400 shrink-0" />
            ) : (
              <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
            )}
            <span className="body-text-muted text-xs">
              {isHourBased
                ? `Hour-Based • ${pass.total_hours} hrs`
                : `Date-Based • ${pass.days_valid} days`}
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <EditPassDialog passTypes={passTypes} passObj={pass} onSave={onEdit} />
          <button
            onClick={() => onDelete(pass.id)}
            disabled={deletingId === pass.id}
            className="inline-flex items-center justify-center rounded-lg border border-rose-300/50 bg-rose-50 p-2 text-rose-600 transition-all duration-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
            title="Delete"
          >
            {deletingId === pass.id ? (
              <Loader2 className="icon-md text-destructive animate-spin" />
            ) : (
              <Trash2 className="icon-md text-destructive" />
            )}
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Price + Validity row */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-0.5 text-xl font-bold text-sky-700 dark:text-blue-400">
              <IndianRupee className="w-4 h-4" />
              <span>{pass.price}</span>
            </div>
            <p className="table-header-text mt-0.5">Price</p>
          </div>
          <div className="text-right">
            <p className="body-text font-semibold">
              {isHourBased ? `${pass.total_hours} hrs` : `${pass.days_valid} days`}
            </p>
            <p className="table-header-text mt-0.5">
              {isHourBased ? "Total Hours" : "Valid For"}
            </p>
          </div>
        </div>

        {/* Mode badge */}
        <div className="pt-2 border-t border-dashed border-border">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
              isHourBased
                ? "border-blue-300/40 bg-blue-50 text-sky-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400"
                : "border-emerald-300/40 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
            }`}
          >
            {isHourBased ? (
              <Clock className="w-3 h-3" />
            ) : (
              <Calendar className="w-3 h-3" />
            )}
            {isHourBased ? "Hour-Based" : "Date-Based"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*                         ADD PASS DIALOG                             */
/* ------------------------------------------------------------------ */
function AddPassDialog({ passTypes, onSave, buttonClassName }: any) {
  const [open, setOpen] = useState(false);
  const [passMode, setPassMode] = useState<"date_based" | "hour_based">("date_based");
  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    pass_type_id: "",
    days_valid: "",
    total_hours: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const parsedPrice = Number(form.price);
    const parsedDays = Number(form.days_valid);
    const parsedTotalHours = Number(form.total_hours);

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      alert("Please enter a valid price.");
      return;
    }
    if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
      alert("Please enter valid days.");
      return;
    }
    if (passMode === "hour_based" && (!Number.isFinite(parsedTotalHours) || parsedTotalHours <= 0)) {
      alert("Please enter valid total hours for hour-based pass.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ...form,
      price: parsedPrice,
      days_valid: parsedDays,
      pass_mode: passMode,
      total_hours:
        passMode === "hour_based" ? parsedTotalHours : undefined,
      hour_calculation_mode:
        passMode === "hour_based" ? "actual_duration" : undefined,
    };
    await onSave(payload, () => {
      setOpen(false);
      setForm({
        name: "",
        price: "",
        description: "",
        pass_type_id: "",
        days_valid: "",
        total_hours: "",
      });
    });
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={buttonClassName || "btn-primary"}>
          <PlusCircle className="icon-md" />
          New Pass
        </button>
      </DialogTrigger>

      <DialogContent className="ui-dialog-surface w-[95vw] rounded-xl shadow-2xl sm:max-w-[520px]">
        {/* Modal Header */}
        <div className="border-b border-cyan-500/20 px-1 pb-2">
          <DialogTitle className="ui-dialog-title flex items-center gap-2 text-base font-bold tracking-wide sm:text-lg">
            <span className="feature-action-icon inline-flex h-8 w-8 items-center justify-center rounded-lg">
              <PlusCircle className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />
            </span>
            Add New Pass
          </DialogTitle>
          <p className="ui-dialog-subtle mt-0.5 text-xs sm:text-sm">Configure your new membership pass</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Mode Toggle */}
          <div>
            <label className="table-header-text mb-2 block">Pass Mode</label>
            <div className="dashboard-module-tab-group flex w-full items-center gap-1 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setPassMode("date_based")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
                  passMode === "date_based"
                    ? "dashboard-module-tab-active bg-cyan-500/12 text-slate-900 shadow-sm dark:text-cyan-100"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-cyan-100"
                }`}
              >
                <Calendar className="icon-md" />
                Date-Based
              </button>
              <button
                type="button"
                onClick={() => setPassMode("hour_based")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
                  passMode === "hour_based"
                    ? "dashboard-module-tab-active bg-cyan-500/12 text-slate-900 shadow-sm dark:text-cyan-100"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-cyan-100"
                }`}
              >
                <Clock className="icon-md" />
                Hour-Based
              </button>
            </div>
          </div>

          {/* Pass Name */}
          <div className="space-y-1.5">
            <label className="table-header-text">Pass Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Monthly Gaming Pass"
              required
              className="ui-input-surface"
            />
          </div>

          {/* Price + Validity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="table-header-text">Price (₹) *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                  className="ui-input-surface pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="table-header-text">Validity (Days) *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                <Input
                  type="number"
                  value={form.days_valid}
                  onChange={(e) => setForm({ ...form, days_valid: e.target.value })}
                  required
                  className="ui-input-surface pl-9"
                />
              </div>
            </div>
          </div>

          {/* Total Hours (hour_based only) */}
          {passMode === "hour_based" && (
            <div className="space-y-1.5">
              <label className="table-header-text">Total Hours *</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                <Input
                  type="number"
                  value={form.total_hours}
                  onChange={(e) => setForm({ ...form, total_hours: e.target.value })}
                  required
                  placeholder="e.g. 50"
                  className="ui-input-surface pl-9"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="table-header-text">Description (Optional)</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description..."
              className="ui-input-surface"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 border-t border-cyan-500/20 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ui-action-secondary inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ui-action-primary inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="icon-md animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="icon-md" />
                  Create Pass
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*                        EDIT PASS DIALOG                             */
/* ------------------------------------------------------------------ */
function EditPassDialog({ passObj, passTypes, onSave }: any) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: passObj.name,
    price: String(passObj.price),
    description: passObj.description || "",
    days_valid: String(passObj.days_valid),
    total_hours: String(passObj.total_hours || ""),
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const parsedPrice = Number(form.price);
    const parsedDays = Number(form.days_valid);
    const parsedTotalHours = Number(form.total_hours);

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      alert("Please enter a valid price.");
      return;
    }
    if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
      alert("Please enter valid days.");
      return;
    }
    if (isHourBased && (!Number.isFinite(parsedTotalHours) || parsedTotalHours <= 0)) {
      alert("Please enter valid total hours for hour-based pass.");
      return;
    }

    setIsSubmitting(true);
    await onSave(
      passObj.id,
      {
        ...form,
        price: parsedPrice,
        days_valid: parsedDays,
        total_hours: passObj.pass_mode === "hour_based" ? parsedTotalHours : undefined,
        hour_calculation_mode: passObj.pass_mode === "hour_based"
          ? (passObj.hour_calculation_mode || "actual_duration")
          : undefined,
      },
      () => setOpen(false)
    );
    setIsSubmitting(false);
  };

  const isHourBased = passObj.pass_mode === "hour_based";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center justify-center rounded-lg border border-emerald-300/50 bg-emerald-50 p-2 text-emerald-700 transition-all duration-200 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20" title="Edit">
          <Pencil className="icon-md text-emerald-600 dark:text-emerald-400" />
        </button>
      </DialogTrigger>

      <DialogContent className="ui-dialog-surface w-[95vw] rounded-xl shadow-2xl sm:max-w-[480px]">
        {/* Modal Header */}
        <div className="border-b border-cyan-500/20 px-1 pb-2">
          <DialogTitle className="section-title">Edit Pass</DialogTitle>
          <p className="body-text-muted mt-0.5">Update pass details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Pass Name */}
          <div className="space-y-1.5">
            <label className="table-header-text">Pass Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Pass name"
              required
              className="ui-input-surface"
            />
          </div>

          {/* Price + Days */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="table-header-text">Price (₹) *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                  className="ui-input-surface pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="table-header-text">Validity (Days) *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                <Input
                  type="number"
                  value={form.days_valid}
                  onChange={(e) => setForm({ ...form, days_valid: e.target.value })}
                  required
                  className="ui-input-surface pl-9"
                />
              </div>
            </div>
          </div>

          {/* Total Hours (hour_based only) */}
          {isHourBased && (
            <div className="space-y-1.5">
              <label className="table-header-text">Total Hours *</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                <Input
                  type="number"
                  value={form.total_hours}
                  onChange={(e) => setForm({ ...form, total_hours: e.target.value })}
                  className="ui-input-surface pl-9"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="table-header-text">Description (Optional)</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description..."
              className="ui-input-surface"
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-cyan-500/20 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary flex-1 justify-center"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="icon-md animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
