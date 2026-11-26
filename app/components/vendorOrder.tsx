'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { AlertCircle, ChevronDown, ChevronRight, Loader2, Package, RefreshCw, ShoppingCart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VENDOR_ONBOARD_URL } from '@/src/config/env';
import { useModuleCache } from "@/app/hooks/useModuleCache";
import { readEnumParam, readStringParam, updateSearchParams } from "@/lib/deeplink";

interface Product {
  product_id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  min_order_quantity: number;
  description?: string;
  image_url?: string;
  collaborator_id: string;
  collaborator_brand: string;
}

interface OrderItem {
  product_id: string;
  quantity: number;
}

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

const VIEWS = ["products", "orders"] as const;
type StoreView = typeof VIEWS[number];

const rupees = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const CATEGORY_LABELS: Record<string, string> = {
  energy_drink: 'Energy drink', energy_bar: 'Energy bar', mouse: 'Mouse', keyboard: 'Keyboard', mousepad: 'Mousepad', other: 'Other',
};
const STATUS_VARIANT: Record<string, "neutral" | "warning" | "success" | "danger" | "info"> = {
  pending: 'warning', confirmed: 'info', shipped: 'info', delivered: 'success', cancelled: 'danger',
};

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message !== 'Failed to fetch' ? err.message : fallback;

const VendorOrderPage: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = readEnumParam<StoreView>(searchParams, "view", VIEWS, "products");
  const openOrderId = readStringParam(searchParams, "order", "");

  const [vendorId, setVendorId] = useState('');
  const [orderItems, setOrderItems] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  useEffect(() => { setVendorId(localStorage.getItem('selectedCafe') || ''); }, []);

  const setView = (next: StoreView, order?: string | null) => {
    const params = updateSearchParams(searchParams, { view: next === "products" ? null : next, order: order ?? null });
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const products = useModuleCache<Product[]>("store_products", async () => {
    if (!VENDOR_ONBOARD_URL) throw new Error('Store is not configured. Contact support.');
    const res = await fetch(`${VENDOR_ONBOARD_URL}/api/vendor/products`);
    if (!res.ok) throw new Error(`Unable to load products (HTTP ${res.status}).`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('The store returned an invalid product list.');
    return data.map((p: Product) => ({ ...p, price: Number(p.price), stock: Number(p.stock), min_order_quantity: Number(p.min_order_quantity) || 1 }));
  }, 300000, "store");

  const orders = useModuleCache<MarketplaceOrder[]>(`store_orders_${vendorId}`, async () => {
    const res = await fetch(`${VENDOR_ONBOARD_URL}/api/vendors/${vendorId}/orders`);
    if (!res.ok) throw new Error(`Unable to load orders (HTTP ${res.status}).`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, 60000, "store", Boolean(vendorId && VENDOR_ONBOARD_URL));

  const productList = products.data ?? [];
  const orderList = orders.data ?? [];
  const openOrders = orderList.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;

  const cart = useMemo(() => Object.entries(orderItems)
    .map(([id, qty]) => { const p = productList.find(x => x.product_id === id); return p ? { ...p, qty } : null; })
    .filter(Boolean) as (Product & { qty: number })[], [orderItems, productList]);
  const cartTotal = cart.reduce((sum, p) => sum + p.price * p.qty, 0);

  const setQty = (product: Product, raw: string) => {
    let qty = parseInt(raw, 10);
    if (isNaN(qty) || qty < 0) qty = 0;
    if (qty > 0 && qty < product.min_order_quantity) qty = product.min_order_quantity;
    if (qty > product.stock) qty = product.stock;
    setOrderItems(prev => {
      const next = { ...prev };
      if (qty === 0) delete next[product.product_id]; else next[product.product_id] = qty;
      return next;
    });
  };

  const placeOrder = async () => {
    if (!vendorId) { setError('Select your cafe first.'); return; }
    if (cart.length === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      const byCollaborator: Record<string, OrderItem[]> = {};
      cart.forEach(p => { (byCollaborator[p.collaborator_id] ||= []).push({ product_id: p.product_id, quantity: p.qty }); });
      for (const [collaborator_id, items] of Object.entries(byCollaborator)) {
        const res = await fetch(`${VENDOR_ONBOARD_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cafe_id: parseInt(vendorId, 10), collaborator_id, items }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Order placement failed');
        }
        // Drop items already ordered so a retry after a partial failure does not double-order.
        setOrderItems(prev => { const next = { ...prev }; items.forEach(i => delete next[i.product_id]); return next; });
      }
      setOrderModalOpen(false);
      await Promise.allSettled([orders.refresh(true), products.refresh(true)]);
      setView("orders");
    } catch (err) {
      setError(errorMessage(err, 'Failed to place order. Try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const activeSource = view === "orders" ? orders : products;
  const loadError = activeSource.error ? errorMessage(activeSource.error, 'Unable to connect to the store. Try again.') : null;

  return (
    <div className="dashboard-module flex h-full min-h-0 flex-col gap-3">
      <div className="dashboard-toolbar shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="tab-container" role="tablist" aria-label="Shop views">
          <button role="tab" aria-selected={view === "products"} className={view === "products" ? "tab-active" : "tab-inactive"} onClick={() => setView("products")}>
            <Package className="h-4 w-4" />Products
          </button>
          <button role="tab" aria-selected={view === "orders"} className={view === "orders" ? "tab-active" : "tab-inactive"} onClick={() => setView("orders")}>
            <ShoppingCart className="h-4 w-4" />Orders{openOrders > 0 && <Badge variant="warning">{openOrders}</Badge>}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void activeSource.refresh(true).catch(() => undefined)} disabled={activeSource.loading} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${activeSource.loading ? 'animate-spin' : ''}`} />
          </Button>
          {view === "products" && (
            <Button size="sm" onClick={() => setOrderModalOpen(true)} disabled={cart.length === 0}>
              <ShoppingCart className="h-4 w-4" />Review order · {rupees(cartTotal)}
            </Button>
          )}
        </div>
      </div>

      {error && <div role="alert" className="dashboard-error-banner shrink-0 text-sm">{error}</div>}
      {loadError && (
        <div role="alert" className="dashboard-error-banner shrink-0 flex items-center gap-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /><span className="flex-1">{loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void activeSource.refresh(true).catch(() => undefined)}>Retry</Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {view === "products" ? (
          products.data === undefined && !loadError ? (
            <div className="dashboard-empty-state"><Loader2 className="h-5 w-5 animate-spin" />Loading products…</div>
          ) : productList.length === 0 ? (
            !loadError && <div className="dashboard-empty-state"><Package className="h-5 w-5" />No products available right now.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {productList.map(product => {
                const qty = orderItems[product.product_id] || 0;
                const outOfStock = product.stock <= 0;
                return (
                  <div key={product.product_id} className={`dashboard-module-card flex min-w-0 flex-col overflow-hidden rounded-lg ${qty ? 'ring-1 ring-primary' : ''}`}>
                    <div className="relative aspect-video w-full bg-muted">
                      <Image alt={product.name} src={product.image_url || "/placeholder.svg"} fill sizes="(max-width: 768px) 50vw, 240px" className="object-cover" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground" title={product.name}>{product.name}</h3>
                        <span className="shrink-0 text-sm font-semibold text-foreground">{rupees(product.price)}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{product.collaborator_brand} · {CATEGORY_LABELS[product.category] || product.category}</p>
                      <p className="text-xs text-muted-foreground">{outOfStock ? 'Out of stock' : `${product.stock} in stock · min ${product.min_order_quantity}`}</p>
                      <Input
                        type="number"
                        min={0}
                        max={product.stock}
                        step={product.min_order_quantity}
                        value={qty || ''}
                        disabled={outOfStock}
                        onChange={e => setQty(product, e.target.value)}
                        className="dashboard-module-input mt-auto h-8 text-xs"
                        aria-label={`Quantity for ${product.name}`}
                        placeholder="Qty"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <MarketplaceOrders
            orders={orderList}
            loading={orders.data === undefined && !loadError}
            openOrderId={openOrderId}
            onToggle={id => setView("orders", id === openOrderId ? null : id)}
            onBrowse={() => setView("products")}
          />
        )}
      </div>

      <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
        <DialogContent className="dashboard-module-panel max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Confirm order</DialogTitle></DialogHeader>
          <div className="max-h-[300px] space-y-2 overflow-y-auto">
            {cart.map(item => (
              <div key={item.product_id} className="flex items-center justify-between gap-3 border-b border-border pb-2 text-sm last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.qty} × {rupees(item.price)} · {item.collaborator_brand}</p>
                </div>
                <span className="shrink-0 font-semibold">{rupees(item.price * item.qty)}</span>
              </div>
            ))}
          </div>
          {error && <div role="alert" className="dashboard-error-banner text-sm">{error}</div>}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <div className="flex w-full items-center justify-between font-semibold"><span>Total</span><span>{rupees(cartTotal)}</span></div>
            <Button className="w-full" onClick={placeOrder} disabled={submitting || cart.length === 0}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Place order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function MarketplaceOrders({ orders, loading, openOrderId, onToggle, onBrowse }: {
  orders: MarketplaceOrder[];
  loading: boolean;
  openOrderId: string;
  onToggle: (id: string) => void;
  onBrowse: () => void;
}) {
  if (loading) return <div className="dashboard-empty-state"><Loader2 className="h-5 w-5 animate-spin" />Loading orders…</div>;
  if (orders.length === 0) {
    return (
      <div className="dashboard-empty-state">
        <ShoppingCart className="h-5 w-5" />No orders yet.
        <Button variant="outline" size="sm" className="mt-2" onClick={onBrowse}>Browse products</Button>
      </div>
    );
  }
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

export default VendorOrderPage;
