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
  const [activeVendorId, setActiveVendorId] = useState<string>("1");

  useEffect(() => {
    setHasMounted(true);
    const savedId = localStorage.getItem("selectedCafe") || "1";
    setActiveVendorId(savedId);

    const fetchData = async () => {
      setLoading(true);
      try {
        const [typesRes, passesRes] = await Promise.all([
          axios.get(`${DASHBOARD_URL}/api/pass_types`),
          axios.get(`${DASHBOARD_URL}/api/vendor/${savedId}/passes`),
        ]);
        setPassTypes(typesRes.data);
        setPasses(passesRes.data.passes || passesRes.data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (!hasMounted) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="icon-lg animate-spin text-blue-400" />
        </div>
      </div>
    );
  }

  const refreshPasses = async () => {
    try {
      const { data } = await axios.get(
        `${DASHBOARD_URL}/api/vendor/${activeVendorId}/passes`
      );
      setPasses(data.passes || data);
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
    "inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-gradient-to-r from-cyan-500/90 to-emerald-500/90 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-900/40 transition-all duration-200 hover:from-cyan-400 hover:to-emerald-400 hover:shadow-lg hover:shadow-cyan-600/25 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden px-1 pb-2 sm:px-2">

      {/* ✅ View Toggle */}
      <div className="gaming-panel mb-2 shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-xl p-3">
        <div className="flex items-center gap-1 rounded-lg border border-cyan-400/20 bg-slate-900/60 p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
              viewMode === "grid"
                ? "bg-slate-800 text-cyan-300 shadow-sm"
                : "text-slate-300 hover:text-cyan-100"
            }`}
          >
            <LayoutGrid className="icon-md" />
            Grid
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
              viewMode === "table"
                ? "bg-slate-800 text-cyan-300 shadow-sm"
                : "text-slate-300 hover:text-cyan-100"
            }`}
          >
            <TableIcon className="icon-md" />
            List
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!loading && passes.length > 0 && (
            <>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20">
              {hourPasses.length} Hour-Based
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
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
          <div className="gaming-panel flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-cyan-400/20 py-16">
            <BadgeCheck className="w-12 h-12 text-muted-foreground/30" />
            <h3 className="section-title text-muted-foreground/60">No passes found</h3>
            <p className="body-text-muted">Create your first pass to get started</p>
            <div className="mt-2">
              <AddPassDialog passTypes={passTypes} onSave={handleAddPass} buttonClassName={primaryButtonClass} />
            </div>
          </div>
        ) : viewMode === "grid" ? (

        /* ✅ GRID VIEW */
        <div className="section-spacing">
          {hourPasses.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="icon-blue p-1.5 rounded-lg">
                  <Clock className="icon-md text-blue-400" />
                </div>
                <h2 className="section-title">Hour-Based Passes</h2>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20">
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
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
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
    <div className="table-container overflow-hidden rounded-xl border border-cyan-500/25 bg-slate-950/35">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-900/70">
            <tr>
              {["Pass Name", "Mode", "Price", "Validity", "Hours", "Actions"].map((h) => (
                <th key={h} className="table-cell text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">{h}</th>
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
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
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
                  <div className="flex items-center gap-0.5 text-blue-400 font-bold">
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
                      className="inline-flex items-center justify-center rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-rose-300 transition-all duration-200 hover:border-rose-300/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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
    <Card className="gaming-panel border-cyan-400/20 bg-gradient-to-b from-slate-900/70 to-slate-950/70 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10">
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
            className="inline-flex items-center justify-center rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-rose-300 transition-all duration-200 hover:border-rose-300/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="flex items-center gap-0.5 text-blue-400 font-bold text-xl">
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
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
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
    setIsSubmitting(true);
    const payload = {
      ...form,
      price: Number(form.price),
      days_valid: Number(form.days_valid),
      pass_mode: passMode,
      total_hours:
        passMode === "hour_based" ? Number(form.total_hours) : undefined,
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

      <DialogContent className="w-[95vw] rounded-xl border border-cyan-400/25 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30 shadow-2xl sm:max-w-[520px]">
        {/* Modal Header */}
        <div className="border-b border-cyan-500/20 px-1 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base font-bold tracking-wide text-cyan-100 sm:text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-500/10">
              <PlusCircle className="h-4 w-4 text-cyan-300" />
            </span>
            Add New Pass
          </DialogTitle>
          <p className="mt-0.5 text-xs text-slate-300/70 sm:text-sm">Configure your new membership pass</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Mode Toggle */}
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Pass Mode</label>
            <div className="flex w-full items-center gap-1 rounded-lg border border-cyan-400/20 bg-slate-900/60 p-1">
              <button
                type="button"
                onClick={() => setPassMode("date_based")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
                  passMode === "date_based"
                    ? "bg-slate-800 text-cyan-300 shadow-sm"
                    : "text-slate-300 hover:text-cyan-100"
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
                    ? "bg-slate-800 text-cyan-300 shadow-sm"
                    : "text-slate-300 hover:text-cyan-100"
                }`}
              >
                <Clock className="icon-md" />
                Hour-Based
              </button>
            </div>
          </div>

          {/* Pass Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Pass Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Monthly Gaming Pass"
              required
              className="border-cyan-400/25 bg-slate-900/70 text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/60"
            />
          </div>

          {/* Price + Validity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Price (₹) *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                  className="border-cyan-400/25 bg-slate-900/70 pl-9 text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/60"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Validity (Days) *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                <Input
                  type="number"
                  value={form.days_valid}
                  onChange={(e) => setForm({ ...form, days_valid: e.target.value })}
                  required
                  className="border-cyan-400/25 bg-slate-900/70 pl-9 text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/60"
                />
              </div>
            </div>
          </div>

          {/* Total Hours (hour_based only) */}
          {passMode === "hour_based" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Total Hours *</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                <Input
                  type="number"
                  value={form.total_hours}
                  onChange={(e) => setForm({ ...form, total_hours: e.target.value })}
                  required
                  placeholder="e.g. 50"
                  className="border-cyan-400/25 bg-slate-900/70 pl-9 text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/60"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Description (Optional)</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description..."
              className="border-cyan-400/25 bg-slate-900/70 text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/60"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 border-t border-cyan-500/20 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition-all duration-200 hover:border-cyan-300/45 hover:bg-slate-800/80 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-gradient-to-r from-cyan-500/90 to-emerald-500/90 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-900/40 transition-all duration-200 hover:from-cyan-400 hover:to-emerald-400 hover:shadow-lg hover:shadow-cyan-600/25 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
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
    setIsSubmitting(true);
    await onSave(
      passObj.id,
      {
        ...form,
        price: Number(form.price),
        days_valid: Number(form.days_valid),
        total_hours: passObj.pass_mode === "hour_based" ? Number(form.total_hours) : undefined,
      },
      () => setOpen(false)
    );
    setIsSubmitting(false);
  };

  const isHourBased = passObj.pass_mode === "hour_based";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2 text-emerald-300 transition-all duration-200 hover:border-emerald-300/60 hover:bg-emerald-500/20" title="Edit">
          <Pencil className="icon-md text-emerald-400" />
        </button>
      </DialogTrigger>

      <DialogContent className="w-[95vw] rounded-xl border border-cyan-400/25 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30 shadow-2xl sm:max-w-[480px]">
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
              className="border-cyan-400/25 bg-slate-900/70 text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/60"
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
                  className="border-cyan-400/25 bg-slate-900/70 pl-9 text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/60"
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
                  className="border-cyan-400/25 bg-slate-900/70 pl-9 text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/60"
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
                  className="border-cyan-400/25 bg-slate-900/70 pl-9 text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/60"
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
              className="border-cyan-400/25 bg-slate-900/70 text-slate-100 placeholder:text-slate-400 focus-visible:ring-cyan-400/60"
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
