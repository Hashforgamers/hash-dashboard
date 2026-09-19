'use client';

import React, { useState, useEffect } from 'react';
import {
  Card
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { motion } from "framer-motion"
import { ShoppingCart, Loader2, CheckCircle, Package, RefreshCw, AlertCircle } from 'lucide-react'
import Image from "next/image"
import { VENDOR_ONBOARD_URL } from '@/src/config/env';
import { useModuleCache } from "@/app/hooks/useModuleCache";

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

const VendorOrderPage: React.FC = () => {
  const VENDOR_ID = typeof window !== 'undefined' ? localStorage.getItem('selectedCafe') || '' : '';
  const [products, setProducts] = useState<Product[]>([]);
  const [productError, setProductError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  const cacheKey = "store_products";
  const fetcher = async () => {
    setProductError(null);
    try {
      if (!VENDOR_ONBOARD_URL) throw new Error('Store is not configured. Contact support.');
      const res = await fetch(`${VENDOR_ONBOARD_URL}/api/vendor/products`);
      if (!res.ok) throw new Error(`Unable to load products (HTTP ${res.status}).`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('The store returned an invalid product list.');
      return data.map((p: Product) => ({
        ...p,
        price: Number(p.price),
        stock: Number(p.stock),
        min_order_quantity: Number(p.min_order_quantity),
      }));
    } catch (err) {
      setProductError(err instanceof Error && err.message !== 'Failed to fetch'
        ? err.message : 'Unable to connect to the store. Try again.');
      throw err;
    }
  };

  const { data: cachedProducts, loading: fetchingProducts, refresh } = useModuleCache<Product[]>(cacheKey, fetcher, 300000, "store");
  const loading = fetchingProducts || (cachedProducts === undefined && !productError);

  useEffect(() => {
    if (Array.isArray(cachedProducts)) setProducts(cachedProducts);
  }, [cachedProducts]);

  const fetchProducts = async () => {
    try {
      await refresh(true);
    } catch {
      // The fetcher reports product errors for initial loads and refreshes alike.
    }
  };

  const handleQtyChange = (product_id: string, qty: number) => {
    if (qty < 0) return;
    setOrderItems(prev => {
      const newOrder = { ...prev };
      if (qty === 0) delete newOrder[product_id];
      else newOrder[product_id] = qty;
      return newOrder;
    });
  };

  const handleSubmitOrder = async () => {
    if (!VENDOR_ID) {
      setError('Vendor not identified. Please select your cafe first.');
      return;
    }
    if (Object.keys(orderItems).length === 0) {
      setError('Please select at least one product to order');
      return;
    }
    setError(null);
    setSubmitting(true);
    setSubmitSuccess(false);

    const itemsPayload: OrderItem[] = Object.entries(orderItems).map(([product_id, qty]) => ({
      product_id,
      quantity: qty,
    }));

    try {
      const itemsByCollaborator: Record<string, OrderItem[]> = {};
      itemsPayload.forEach(item => {
        const p = products.find(p => p.product_id === item.product_id);
        if (!p) return;
        if (!itemsByCollaborator[p.collaborator_id]) itemsByCollaborator[p.collaborator_id] = [];
        itemsByCollaborator[p.collaborator_id].push(item);
      });

      for (const [collaborator_id, items] of Object.entries(itemsByCollaborator)) {
        const payload = {
          cafe_id: parseInt(VENDOR_ID, 10),
          collaborator_id,
          items,
        };
        const res = await fetch(`${VENDOR_ONBOARD_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Order placement failed');
        }
      }
      setSubmitSuccess(true);
      setOrderItems({});
      setOrderModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  // Computes the current total order amount
  const totalAmount = Object.entries(orderItems).reduce((acc, [product_id, qty]) => {
    const product = products.find(p => p.product_id === product_id);
    if (!product) return acc;
    return acc + product.price * qty;
  }, 0);

  // Order summary as list
  const orderProducts = Object.entries(orderItems)
    .map(([product_id, qty]) => {
      const product = products.find(p => p.product_id === product_id);
      return product ? { ...product, qty } : undefined;
    })
    .filter(Boolean) as (Product & { qty: number })[];
  const primaryButtonClass =
    "dashboard-btn-primary inline-flex items-center justify-center gap-2 px-3 py-2 text-xs sm:px-4 sm:text-sm";
  const secondaryButtonClass =
    "dashboard-btn-secondary inline-flex items-center justify-center gap-2 px-3 py-2 text-xs sm:px-4 sm:text-sm";
  const quantityInputClass =
    "dashboard-module-input mt-1 h-8 text-xs";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex h-full min-h-0 flex-col gap-3 overflow-hidden"
    >
      {/* ---------- HEADER ---------- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="dashboard-toolbar shrink-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Products</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={primaryButtonClass}
              onClick={() => setOrderModalOpen(true)}
              disabled={Object.keys(orderItems).length === 0}
            >
              <ShoppingCart className="icon-md" />
              <span>Review order ({Object.keys(orderItems).length})</span>
            </button>
            <div className="dashboard-badge sm:text-sm">
              ₹{totalAmount.toFixed(2)}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {/* ---------- ERROR STATE ---------- */}
        {error && (
          <div role="alert" className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}
        {productError && !loading && (
          <div role="alert" className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="flex-1 text-sm text-foreground">{productError}</p>
            <button className={secondaryButtonClass} onClick={fetchProducts} disabled={fetchingProducts}>
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        )}

        {submitSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg border border-green-500/20 bg-green-500/10 p-2 text-green-400 sm:p-3"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="icon-lg" />
              <p className="body-text font-medium">Order placed successfully!</p>
            </div>
          </motion.div>
        )}

        {/* ---------- PRODUCT LIST (SHORT CARDS) ---------- */}
        {loading ? (
          <div className="rounded-lg border border-slate-200 py-6 text-center dark:border-slate-800">
            <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
            <p className="body-text-muted mt-2">Loading products...</p>
          </div>
        ) : products.length === 0 && productError ? null : products.length === 0 ? (
          <div className="rounded-lg border border-slate-200 py-6 text-center dark:border-slate-800">
            <Package className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No products available</p>
            <button className={`${secondaryButtonClass} mt-3`} onClick={fetchProducts}>
              Refresh
            </button>
          </div>
        ) : (
          <div className="section-spacing">
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-compact">
              {products.map((product, idx) => (
                <motion.div
                  key={product.product_id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.03 * idx }}
                  className="w-full min-w-0"
                >
                  <Card className="dashboard-module-card w-full min-h-[198px] flex flex-col justify-between overflow-hidden transition-shadow duration-300 hover:shadow-lg">
                    <div className="relative min-h-[84px] w-full aspect-video bg-black/5 dark:bg-white/5">
                      <Image
                        alt={product.name}
                        src={product.image_url || "/placeholder.svg?height=140&width=220&query=product"}
                        fill
                        className="object-cover rounded-t-lg"
                      />
                      <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                        <span className="dashboard-badge">
                          {product.category}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 p-tight">
                      <h3 className="truncate text-sm font-semibold text-foreground">{product.name}</h3>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-xs font-semibold text-foreground">₹{product.price}</span>
                        <span className="dashboard-badge" data-variant="success">
                          Stock: {product.stock}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Min: {product.min_order_quantity}</p>
                      <Input
                        type="number"
                        min={0}
                        max={product.stock}
                        step={product.min_order_quantity}
                        value={orderItems[product.product_id] || ''}
                        onChange={e => {
                          let val = parseInt(e.target.value, 10);
                          if (isNaN(val) || val < 0) val = 0;
                          if (val > 0 && val < product.min_order_quantity) val = product.min_order_quantity;
                          if (val > product.stock) val = product.stock;
                          handleQtyChange(product.product_id, val);
                        }}
                        className={quantityInputClass}
                        aria-label={`Quantity for ${product.name}`}
                        placeholder="Qty"
                      />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------- ORDER CONFIRM OVERLAY ---------- */}
      <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
        <DialogContent className="dashboard-module-panel max-h-[90vh] w-[95vw] overflow-y-auto rounded-xl p-0 shadow-2xl sm:max-w-[450px]">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="section-title flex items-center justify-between">
              <span>Order Summary</span>
            </DialogTitle>
            <DialogDescription className="body-text-muted mt-1">
              Review selected products and place your order.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 px-4 space-y-2 max-h-[300px] overflow-y-auto">
            {orderProducts.length === 0 ? (
              <div className="text-center body-text-muted my-8">No items selected.</div>
            ) : (
              orderProducts.map((prod) => (
                <div key={prod.product_id} className="flex items-center gap-3 border-b border-cyan-500/10 pb-2 last:border-b-0">
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-slate-900/50">
                    <Image src={prod.image_url || "/placeholder.svg?height=40&width=40&query=prod"} alt={prod.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="body-text-small font-semibold truncate">{prod.name}</div>
                    <div className="body-text-small truncate">Qty: {prod.qty} • ₹{prod.price} each</div>
                  </div>
                  <div className="body-text font-bold shrink-0">
                    ₹{(prod.price * prod.qty).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="p-4 border-t border-border flex flex-col gap-2">
            <div className="w-full flex items-center justify-between font-semibold body-text">
              <span>Total</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
            <button
              onClick={handleSubmitOrder}
              disabled={submitting || orderProducts.length === 0}
              className={`${primaryButtonClass} w-full`}
            >
              {submitting ? (
                <Loader2 className="icon-md mr-2 animate-spin" />
              ) : (
                <ShoppingCart className="icon-md mr-2" />
              )}
              Place Order
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default VendorOrderPage;
