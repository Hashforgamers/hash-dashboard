'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { motion } from "framer-motion"
import { ShoppingCart, Package, Loader2, CheckCircle, X } from 'lucide-react'
import Image from "next/image"
import { VENDOR_ONBOARD_URL } from '@/src/config/env';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://127.0.0.1:5052/api/vendor/products`);
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      const mapped: Product[] = data.map((p: any) => ({
        ...p,
        price: Number(p.price),
        stock: Number(p.stock),
        min_order_quantity: Number(p.min_order_quantity),
      }));
      setProducts(mapped);
    } catch (err) {
      setError('Unable to load products');
    } finally {
      setLoading(false);
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
        const res = await fetch(`http://127.0.0.1:5052/api/orders`, {
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background text-foreground p-2 sm:p-4 md:p-6 space-y-4 relative"
    >
      {/* ---------- HEADER ---------- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4"
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2 truncate">
            Place Orders
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Select products and quantities to order
          </p>
        </div>
        {/* Order Summary as Floating Button */}
        <div className="flex items-center gap-2">
          <Button
            className="bg-blue-600 text-white rounded-full shadow-md px-4 py-2 flex items-center"
            onClick={() => setOrderModalOpen(true)}
            disabled={Object.keys(orderItems).length === 0}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            <span className="font-semibold">{Object.keys(orderItems).length}</span>
            <span className="ml-2 font-medium">Order</span>
          </Button>
          <div className="bg-muted/30 px-3 py-1 rounded-full text-sm font-semibold text-primary">
            ₹{totalAmount.toFixed(2)}
          </div>
        </div>
      </motion.div>

      {/* ---------- ERROR STATE ---------- */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 sm:p-3 text-destructive mb-2 max-w-lg mx-auto">
          <p className="font-medium text-sm sm:text-base">Error:</p>
          <p className="text-xs sm:text-sm mt-1 break-words">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs sm:text-sm"
            onClick={fetchProducts}
          >
            Try Again
          </Button>
        </div>
      )}

      {submitSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 sm:p-3 text-green-400 flex items-center gap-2 max-w-md mx-auto"
        >
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          <p className="font-medium text-sm sm:text-base">Order placed successfully!</p>
        </motion.div>
      )}

      {/* ---------- PRODUCT LIST (SHORT CARDS) ---------- */}
      {loading ? (
        <div className="text-center py-8 sm:py-12">
          <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-muted-foreground text-sm sm:text-base">No products available.</p>
          <Button
            className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm sm:text-base"
            onClick={fetchProducts}
          >
            Refresh Products
          </Button>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-4">
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
            {products.map((product, idx) => (
              <motion.div
                key={product.product_id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.03 * idx }}
                className="w-full max-w-[230px] mx-auto"
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-muted/30 border border-border rounded-lg w-full min-h-[192px] flex flex-col justify-between">
                  {/* <CardContent className="p-0"> */}
                  <div className="aspect-video relative w-full min-h-[84px] bg-background">
                    <Image
                      alt={product.name}
                      src={product.image_url || "/placeholder.svg?height=140&width=220&query=product"}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                      <span className="px-1.5 py-0.5 bg-background/80 text-xs font-medium rounded-full text-muted-foreground">
                        {product.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 space-y-0.5">
                    <h3 className="font-semibold text-foreground text-xs sm:text-sm truncate">{product.name}</h3>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-xs text-muted-foreground font-medium">₹{product.price}</span>
                      <span className="px-1 rounded text-[11px] font-medium bg-green-500/20 text-green-500">
                        Stock: {product.stock}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Min: {product.min_order_quantity}</p>
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
                      className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg text-xs h-7 mt-1"
                      placeholder="Qty"
                    />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- ORDER CONFIRM OVERLAY ---------- */}
      <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
        <DialogContent className="sm:max-w-[450px] w-[95vw] max-h-[90vh] p-0 bg-card/95 border border-border shadow-2xl rounded-lg overflow-y-auto">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-lg font-semibold flex items-center justify-between">
              <span>Order Summary</span>
              <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setOrderModalOpen(false)}>
               
              </Button>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-1">
              Review selected products and place your order.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 px-4 space-y-2 max-h-[300px] overflow-y-auto">
            {orderProducts.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm my-8">No items selected.</div>
            ) : (
              orderProducts.map((prod) => (
                <div key={prod.product_id} className="flex items-center gap-3 border-b border-border pb-2 last:border-b-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-background relative">
                    <Image src={prod.image_url || "/placeholder.svg?height=40&width=40&query=prod"} alt={prod.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-foreground truncate">{prod.name}</div>
                    <div className="text-xs text-muted-foreground truncate">Qty: {prod.qty} • ₹{prod.price} each</div>
                  </div>
                  <div className="font-bold text-sm text-foreground shrink-0">
                    ₹{(prod.price * prod.qty).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="p-4 border-t border-border flex flex-col gap-2">
            <div className="w-full flex items-center justify-between font-semibold text-base">
              <span>Total</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
            <Button
              onClick={handleSubmitOrder}
              disabled={submitting || orderProducts.length === 0}
              className="w-full bg-primary text-primary-foreground font-semibold rounded-lg px-4 py-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4 mr-2" />
              )}
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default VendorOrderPage;
