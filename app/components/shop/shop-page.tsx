"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { AlertCircle, Loader2, Package, RefreshCw, Search, ShoppingCart, Star, Store, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { VENDOR_ONBOARD_URL } from "@/src/config/env"
import { useModuleCache } from "@/app/hooks/useModuleCache"
import { readEnumParam, readStringParam, updateSearchParams } from "@/lib/deeplink"
import { readCartId, selectedCafeId, shopCall, writeCartId } from "@/lib/shop/client"
import type { ShopCart, ShopOrderSummary, ShopProduct } from "@/lib/shop/shape"
import { CartCheckout } from "./cart-checkout"
import { LegacyOrdersTable, type MarketplaceOrder } from "./legacy-orders"
import { OrderSheet } from "./order-sheet"
import { ProductSheet } from "./product-sheet"
import { orderStatusLabel, orderStatusVariant, percentOff, rupees, swatchFor } from "./shop-utils"

const VIEWS = ["products", "cart", "orders"] as const
type ShopView = typeof VIEWS[number]

export default function ShopPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = readEnumParam<ShopView>(searchParams, "view", VIEWS, "products")
  const openProductId = readStringParam(searchParams, "product", "")
  const openOrderId = readStringParam(searchParams, "order", "")
  const legacyOrderId = readStringParam(searchParams, "supplier_order", "")

  const [vendorId, setVendorId] = useState("")
  const [cart, setCart] = useState<ShopCart | null | undefined>(undefined)
  const [cartId, setCartId] = useState("")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const [notice, setNotice] = useState<{ tone: "error" | "info"; text: string } | null>(null)

  useEffect(() => setVendorId(selectedCafeId()), [])

  const go = useCallback((updates: Record<string, string | null>) => {
    const params = updateSearchParams(searchParams, updates)
    if (params.get("view") === "products") params.delete("view")
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])
  const setView = (next: ShopView) => go({ view: next, product: null, order: null, supplier_order: null })

  const catalog = useModuleCache<{ products: ShopProduct[]; categories: { id: string; name: string }[] }>(
    "shop_catalog_v2", () => shopCall("products"), 180000, "store", Boolean(vendorId))
  const orders = useModuleCache<ShopOrderSummary[]>(
    `shop_orders_v2_${vendorId}`, async () => (await shopCall<{ orders: ShopOrderSummary[] }>("orders")).orders, 60000, "store", Boolean(vendorId))
  // Orders placed with the old Shop stay visible as history.
  const legacy = useModuleCache<MarketplaceOrder[]>(`store_orders_${vendorId}`, async () => {
    const res = await fetch(`${VENDOR_ONBOARD_URL}/api/vendors/${vendorId}/orders`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  }, 300000, "store", Boolean(vendorId && VENDOR_ONBOARD_URL && view === "orders"))

  const applyCart = useCallback((next: ShopCart | null, id: string | null) => {
    setCart(next)
    setCartId(id || "")
    writeCartId(vendorId, id)
  }, [vendorId])

  const loadCart = useCallback(async () => {
    const saved = readCartId(vendorId)
    if (!saved) { applyCart(null, null); return }
    try {
      const data = await shopCall<{ cart: ShopCart | null; cartId: string | null }>("cart.get", { cartId: saved })
      applyCart(data.cart, data.cartId)
    } catch (err: any) {
      setCart((c) => (c === undefined ? null : c))
      setNotice({ tone: "error", text: err.message })
    }
  }, [vendorId, applyCart])

  useEffect(() => { if (vendorId) void loadCart() }, [vendorId, loadCart])

  const addToCart = useCallback(async (variantId: string, quantity: number) => {
    setNotice(null)
    try {
      const data = await shopCall<{ cart: ShopCart; cartId: string }>("cart.add", { cartId, variantId, quantity })
      applyCart(data.cart, data.cartId)
      setNotice({ tone: "info", text: `Added to cart. ${data.cart?.items.length || 0} item${data.cart?.items.length === 1 ? "" : "s"} · ${rupees(data.cart?.subtotal || 0)}` })
      return true
    } catch (err: any) {
      setNotice({ tone: "error", text: err.message })
      return false
    }
  }, [cartId, applyCart])

  const products = catalog.data?.products ?? []
  const categories = catalog.data?.categories ?? []
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => (!category || p.categoryId === category) && (!q || `${p.title} ${p.vendorName} ${p.category}`.toLowerCase().includes(q)))
  }, [products, query, category])
  const usedCategories = categories.filter((c) => products.some((p) => p.categoryId === c.id))

  const cartCount = cart?.items.reduce((n, i) => n + i.quantity, 0) || 0
  const orderList = orders.data ?? []
  const openOrders = orderList.filter((o) => o.status === "pending" || o.status === "requires_action").length
  const active = view === "orders" ? orders : catalog
  const loadError = view !== "cart" && active.error ? active.error.message || "Can't reach the Shop. Try again." : null

  const refresh = () => {
    if (view === "cart") return void loadCart()
    void active.refresh(true).catch(() => undefined)
    if (view === "orders") void legacy.refresh(true).catch(() => undefined)
  }

  return (
    <div className="dashboard-module flex h-full min-h-0 flex-col gap-3">
      <div className="dashboard-toolbar shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="tab-container" role="tablist" aria-label="Shop views">
          <button role="tab" aria-selected={view === "products"} className={view === "products" ? "tab-active" : "tab-inactive"} onClick={() => setView("products")}>
            <Package className="h-4 w-4" />Products
          </button>
          <button role="tab" aria-selected={view === "cart"} className={view === "cart" ? "tab-active" : "tab-inactive"} onClick={() => setView("cart")}>
            <ShoppingCart className="h-4 w-4" />Cart{cartCount > 0 && <Badge variant="info">{cartCount}</Badge>}
          </button>
          <button role="tab" aria-selected={view === "orders"} className={view === "orders" ? "tab-active" : "tab-inactive"} onClick={() => setView("orders")}>
            <Truck className="h-4 w-4" />Orders{openOrders > 0 && <Badge variant="warning">{openOrders}</Badge>}
          </button>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {view === "products" && (
            <>
              <div className="relative min-w-[180px] max-w-xs flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search gear or sellers" aria-label="Search products" className="dashboard-module-input h-8 pl-8 text-sm" />
              </div>
              {usedCategories.length > 1 && (
                <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category"
                  className="dashboard-module-input h-8 rounded-lg border border-border bg-background px-2 text-sm">
                  <option value="">All categories</option>
                  {usedCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </>
          )}
          <Button variant="outline" size="icon-sm" onClick={refresh} disabled={active.loading} aria-label="Refresh">
            <RefreshCw className={active.loading ? "animate-spin" : ""} />
          </Button>
          {view === "products" && (
            <Button size="sm" onClick={() => setView("cart")} disabled={!cartCount}>
              <ShoppingCart />Cart · {rupees(cart?.subtotal || 0)}
            </Button>
          )}
        </div>
      </div>

      {notice && (
        <div role={notice.tone === "error" ? "alert" : "status"}
          className={cn("shrink-0 flex items-center gap-3 rounded-lg text-sm", notice.tone === "error" ? "dashboard-error-banner" : "border border-border bg-muted px-3 py-2 text-foreground")}>
          <span className="flex-1">{notice.text}</span>
          {notice.tone === "info" && view !== "cart" && <Button size="sm" variant="outline" onClick={() => { setNotice(null); setView("cart") }}>View cart</Button>}
          <Button size="sm" variant="ghost" onClick={() => setNotice(null)}>Dismiss</Button>
        </div>
      )}
      {loadError && (
        <div role="alert" className="dashboard-error-banner shrink-0 flex items-center gap-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /><span className="flex-1">{loadError}</span>
          <Button variant="outline" size="sm" onClick={refresh}>Retry</Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {!vendorId ? (
          <div className="dashboard-empty-state"><Store className="h-5 w-5" />Select your cafe to shop.</div>
        ) : view === "products" ? (
          catalog.data === undefined && !loadError ? (
            <div className="dashboard-empty-state"><Loader2 className="h-5 w-5 animate-spin" />Loading products…</div>
          ) : shown.length === 0 ? (
            !loadError && <div className="dashboard-empty-state"><Package className="h-5 w-5" />{products.length ? "No products match." : "No products listed right now."}</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {shown.map((p) => <ProductCard key={p.id} product={p} onOpen={() => go({ product: p.id })} />)}
            </div>
          )
        ) : view === "cart" ? (
          <CartCheckout cart={cart} cartId={cartId} onCart={applyCart} onBrowse={() => setView("products")}
            onOrdered={(id) => { void orders.refresh(true).catch(() => undefined); go({ view: "orders", order: id }) }} />
        ) : (
          <div className="space-y-4">
            <MarketplaceOrders orders={orderList} loading={orders.data === undefined && !loadError} onOpen={(id) => go({ order: id })} onBrowse={() => setView("products")} />
            {(legacy.data?.length || 0) > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Earlier supplier orders</p>
                <LegacyOrdersTable orders={legacy.data || []} openOrderId={legacyOrderId} onToggle={(id) => go({ supplier_order: id === legacyOrderId ? null : id })} />
              </div>
            )}
          </div>
        )}
      </div>

      <ProductSheet productId={openProductId} onClose={() => go({ product: null })} onAdd={addToCart} />
      <OrderSheet orderId={openOrderId} onClose={() => go({ order: null })} onChanged={() => void orders.refresh(true).catch(() => undefined)} />
    </div>
  )
}

function ProductCard({ product, onOpen }: { product: ShopProduct; onOpen: () => void }) {
  const off = percentOff(product.price, product.mrp)
  const soldOut = product.available <= 0
  return (
    <button type="button" onClick={onOpen}
      className="dashboard-module-card group flex min-w-0 flex-col overflow-hidden rounded-lg text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40">
      <div className="relative aspect-square w-full bg-muted">
        {product.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.thumbnail} alt="" loading="lazy" className={cn("h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]", soldOut && "opacity-50")} />
        ) : <div className="flex h-full items-center justify-center text-muted-foreground"><Package className="h-6 w-6" /></div>}
        {off > 0 && <Badge variant="danger" className="absolute left-2 top-2">−{off}%</Badge>}
        {soldOut && <Badge variant="neutral" className="absolute right-2 top-2">Sold out</Badge>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground" title={product.title}>{product.title}</h3>
        <p className="truncate text-xs text-muted-foreground">{product.vendorName || "Hash partner"}{product.category ? ` · ${product.category}` : ""}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <p className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-foreground">{rupees(product.price)}</span>
            {off > 0 && <span className="text-xs text-muted-foreground line-through">{rupees(product.mrp)}</span>}
          </p>
          {product.rating && product.rating.count > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{product.rating.average.toFixed(1)}</span>
          )}
        </div>
        {(product.colors.length > 1 || product.variantCount > 1) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {product.colors.slice(0, 5).map((c) => {
              const sw = swatchFor(c)
              return sw ? <span key={c} title={c} className="h-3 w-3 rounded-full border border-border" style={{ background: sw }} /> : null
            })}
            <span>{product.colors.length > 1 ? `${product.colors.length} colours` : `${product.variantCount} options`}</span>
          </div>
        )}
      </div>
    </button>
  )
}

function MarketplaceOrders({ orders, loading, onOpen, onBrowse }: { orders: ShopOrderSummary[]; loading: boolean; onOpen: (id: string) => void; onBrowse: () => void }) {
  if (loading) return <div className="dashboard-empty-state"><Loader2 className="h-5 w-5 animate-spin" />Loading orders…</div>
  if (orders.length === 0) {
    return (
      <div className="dashboard-empty-state">
        <ShoppingCart className="h-5 w-5" />No marketplace orders yet.
        <Button variant="outline" size="sm" className="mt-2" onClick={onBrowse}>Browse products</Button>
      </div>
    )
  }
  return (
    <div className="dashboard-table-shell">
      <div className="dashboard-table-wrap">
        <table className="dashboard-table min-w-[640px]">
          <thead>
            <tr><th>Order</th><th>Date</th><th>Items</th><th className="text-right">Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const units = o.items.reduce((n, i) => n + i.quantity, 0)
              return (
                <tr key={o.id} className="cursor-pointer" onClick={() => onOpen(o.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onOpen(o.id) }}>
                  <td className="font-mono text-xs">#{o.displayId || o.id.slice(-8).toUpperCase()}</td>
                  <td className="whitespace-nowrap">{o.createdAt ? format(new Date(o.createdAt), "dd MMM yyyy, HH:mm") : "-"}</td>
                  <td className="max-w-[280px] truncate">{o.items[0]?.title || "-"}{o.items.length > 1 ? ` +${o.items.length - 1} more` : ""} <span className="text-muted-foreground">· {units} unit{units === 1 ? "" : "s"}</span></td>
                  <td className="text-right font-semibold">{rupees(o.total)}</td>
                  <td><Badge variant={orderStatusVariant(o.status)}>{orderStatusLabel(o.status)}</Badge></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
