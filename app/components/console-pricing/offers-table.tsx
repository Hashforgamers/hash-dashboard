import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";
import { Calendar, Clock, Loader2, Pencil, Trash2 } from "lucide-react";
import { PricingOffer } from "./types";

interface OffersTableProps {
  offers: PricingOffer[];
  onEdit: (offer: PricingOffer) => void;
  onDelete: (offerId: number) => void;
  deletingOfferId: number | null;
  getConsoleIcon: (type: string) => ComponentType<any>;
}

export function OffersTable({ offers, onEdit, onDelete, deletingOfferId, getConsoleIcon }: OffersTableProps) {
  return (
    <div className="dashboard-table-shell">
      <div className="dashboard-table-wrap">
        <table className="dashboard-table text-left">
          <thead className="dashboard-module-table-head sticky top-0 z-10">
            <tr>
              {["Offer Name", "Console", "Pricing", "Validity", "Actions"].map((h) => (
                <th key={h} className="table-cell dashboard-module-table-header text-xs font-semibold uppercase tracking-wider sm:text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const Icon = getConsoleIcon(offer.console_type);
              const isDeleting = deletingOfferId === offer.id;
              return (
                <tr key={offer.id} className="table-row border-b border-border last:border-0">
                  <td className="table-cell">
                    <p className="body-text font-semibold">{offer.offer_name}</p>
                    {offer.is_currently_active && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-emerald-300">
                        <span className="h-1 w-1 rounded-full animate-pulse bg-emerald-400" />
                        LIVE NOW
                      </span>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2 body-text-muted">
                      <Icon className="icon-md text-primary" />
                      <span>{offer.console_type}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <span className="stat-value text-primary">₹{offer.offered_price}</span>
                      <span className="body-text-muted line-through">₹{offer.default_price}</span>
                      <span className="rounded px-1.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-300">
                        {offer.discount_percentage}%
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="space-y-0.5 body-text-muted">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="icon-md shrink-0" />
                        <span>Valid From: {offer.start_date} {offer.start_time}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="icon-md shrink-0" />
                        <span>Valid To: {offer.end_date} {offer.end_time}</span>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEdit(offer)}
                        className={buttonVariants({ variant: "soft-success", size: "icon-sm" })}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5 text-emerald-400" />
                      </button>
                      <button
                        onClick={() => onDelete(offer.id)}
                        disabled={isDeleting}
                        className={cn(buttonVariants({ variant: "soft-danger", size: "icon-sm" }), "disabled:cursor-not-allowed")}
                        title="Delete"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 text-destructive animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
