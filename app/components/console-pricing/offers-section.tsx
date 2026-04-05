import type { ComponentType } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  PlusCircle,
  Sparkles,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { OffersTable } from "./offers-table";
import { PricingOffer } from "./types";

interface OffersSectionProps {
  offers: PricingOffer[];
  viewMode: "grid" | "table";
  setViewMode: (value: "grid" | "table") => void;
  setShowOfferForm: (value: boolean) => void;
  isLoadingOffers: boolean;
  deletingOfferId: number | null;
  getConsoleIcon: (type: string) => ComponentType<any>;
  onEditOffer: (offer: PricingOffer) => void;
  onDeleteOffer: (id: number) => void;
  primaryButtonClass: string;
  secondaryButtonClass: string;
  iconButtonClass: string;
  destructiveIconButtonClass: string;
}

export function OffersSection({
  offers,
  viewMode,
  setViewMode,
  setShowOfferForm,
  isLoadingOffers,
  deletingOfferId,
  getConsoleIcon,
  onEditOffer,
  onDeleteOffer,
  primaryButtonClass,
  secondaryButtonClass,
  iconButtonClass,
  destructiveIconButtonClass,
}: OffersSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden"
    >
      <div className="gaming-panel shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <h2 className="section-title">Active Promotions</h2>

          <div className="dashboard-module-tab-group flex items-center gap-1 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "grid"
                  ? "dashboard-module-tab-active bg-cyan-500/12 text-slate-900 shadow-sm dark:text-cyan-100"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-cyan-100"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="icon-md" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "table"
                  ? "dashboard-module-tab-active bg-cyan-500/12 text-slate-900 shadow-sm dark:text-cyan-100"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-cyan-100"
              }`}
              title="Table View"
            >
              <TableIcon className="icon-md" />
            </button>
          </div>
        </div>

        <button onClick={() => setShowOfferForm(true)} className={primaryButtonClass}>
          <PlusCircle className="icon-md" />
          New Offer
        </button>
      </div>

      {isLoadingOffers ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
          <p className="body-text-muted">Loading offers...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="gaming-panel flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-cyan-400/20 py-16">
          <Sparkles className="w-12 h-12 text-muted-foreground/30" />
          <h3 className="section-title text-muted-foreground/60">No active offers yet</h3>
          <p className="body-text-muted">Create your first promotional offer</p>
          <button onClick={() => setShowOfferForm(true)} className={`${secondaryButtonClass} mt-2`}>
            <Plus className="icon-md" />
            Add New Offer
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 overflow-y-auto pb-4">
          {offers.map((offer) => {
            const Icon = getConsoleIcon(offer.console_type);
            const isDeleting = deletingOfferId === offer.id;
            return (
              <Card
                key={offer.id}
                className="dashboard-module-surface flex flex-col transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10"
              >
                <CardHeader className="flex flex-row items-start justify-between border-b border-cyan-500/15 p-4">
                  <div className="min-w-0 flex-1 pr-2">
                    <h2 className="card-title truncate">{offer.offer_name}</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Icon className="w-3 h-3 text-blue-400 shrink-0" />
                      <span className="table-header-text text-slate-700 dark:text-cyan-100/80">{offer.console_type}</span>
                      {offer.is_currently_active && (
                        <span className="flex items-center gap-1 rounded border border-emerald-300/40 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => onEditOffer(offer)} className={iconButtonClass} title="Edit">
                      <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                    <button
                      onClick={() => onDeleteOffer(offer.id)}
                      disabled={isDeleting}
                      className={destructiveIconButtonClass}
                      title="Delete"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 text-destructive animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      )}
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="stat-value-large text-sky-700 dark:text-blue-400">₹{offer.offered_price}</p>
                      <p className="table-header-text mt-0.5">Offer Rate</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 line-through dark:text-slate-400">₹{offer.default_price}</p>
                      <span className="mt-1 inline-block rounded-full border border-emerald-300/40 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        {offer.discount_percentage}% OFF
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-border pt-3 space-y-1.5">
                    <div className="flex items-center gap-2 body-text-muted">
                      <Calendar className="icon-md text-blue-400/70 shrink-0" />
                      <span>
                        {offer.start_date} → {offer.end_date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 body-text-muted">
                      <Clock className="icon-md text-blue-400/70 shrink-0" />
                      <span>
                        {offer.start_time} - {offer.end_time}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <OffersTable
          offers={offers}
          onEdit={onEditOffer}
          onDelete={onDeleteOffer}
          deletingOfferId={deletingOfferId}
          getConsoleIcon={getConsoleIcon}
        />
      )}
    </motion.div>
  );
}
