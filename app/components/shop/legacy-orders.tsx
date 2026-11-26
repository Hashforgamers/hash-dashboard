"use client";

// Supplier orders placed through the old dashboard Shop (hfg-onboard /api/orders).
// New purchases go through the Hash Marketplace; these stay visible as history.
import React from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface MarketplaceOrder {
  order_id: string;
  collaborator_id: string | null;
  collaborator_name: string;
  collaborator_brand?: string | null;
  order_date: string | null;
  updated_at?: string | null;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | string;
  total_amount: number;
  commission_amount: number;
  items: { product_id: string | null; product_name: string; image_url?: string | null; quantity: number; unit_price: number; subtotal: number }[];
}

const rupees = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const STATUS_VARIANT: Record<string, "neutral" | "warning" | "success" | "danger" | "info"> = {
  pending: 'warning', confirmed: 'info', shipped: 'info', delivered: 'success', cancelled: 'danger',
};


export function LegacyOrdersTable({ orders, openOrderId, onToggle }: {
  orders: MarketplaceOrder[];
  openOrderId: string;
  onToggle: (id: string) => void;
}) {
  if (orders.length === 0) return null;
  return (
    <div className="dashboard-table-shell">
      <div className="dashboard-table-wrap">
        <table className="dashboard-table min-w-[720px]">
          <thead>
            <tr>
              <th className="w-8" aria-label="Expand" />
              <th>Order</th><th>Date</th><th>Supplier</th><th>Items</th><th className="text-right">Total</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const open = order.order_id === openOrderId;
              const units = order.items.reduce((sum, i) => sum + i.quantity, 0);
              return (
                <React.Fragment key={order.order_id}>
                  <tr className="cursor-pointer" onClick={() => onToggle(order.order_id)} aria-expanded={open}>
                    <td>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                    <td className="font-mono text-xs">#{order.order_id.slice(0, 8).toUpperCase()}</td>
                    <td className="whitespace-nowrap">{order.order_date ? format(new Date(order.order_date), "dd MMM yyyy, HH:mm") : '-'}</td>
                    <td>{order.collaborator_brand || order.collaborator_name}</td>
                    <td>{units} unit{units === 1 ? '' : 's'} · {order.items.length} product{order.items.length === 1 ? '' : 's'}</td>
                    <td className="text-right font-semibold">{rupees(order.total_amount)}</td>
                    <td><Badge variant={STATUS_VARIANT[order.status] || 'neutral'} className="capitalize">{order.status}</Badge></td>
                  </tr>
                  {open && (
                    <tr>
                      <td />
                      <td colSpan={6} className="bg-muted/30">
                        <div className="space-y-1 py-1">
                          {order.items.map((item, idx) => (
                            <div key={`${item.product_id}-${idx}`} className="flex items-center justify-between gap-3 text-sm">
                              <span className="truncate">{item.product_name}</span>
                              <span className="shrink-0 text-muted-foreground">{item.quantity} × {rupees(item.unit_price)} = <span className="font-medium text-foreground">{rupees(item.subtotal)}</span></span>
                            </div>
                          ))}
                          {order.updated_at && order.updated_at !== order.order_date && (
                            <p className="pt-1 text-xs text-muted-foreground">Last updated {format(new Date(order.updated_at), "dd MMM yyyy, HH:mm")}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

