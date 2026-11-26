"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Loader2, Minus, Package, Plus, ShoppingCart, Star, Store } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { shopCall } from "@/lib/shop/client"
import type { ShopOption, ShopProductDetail, ShopVariant } from "@/lib/shop/shape"
import { isColourOption, percentOff, rupees, swatchFor } from "./shop-utils"

type Props = {
  productId: string
  onClose: () => void
  onAdd: (variantId: string, quantity: number) => Promise<boolean>
}

export function ProductSheet({ productId, onClose, onAdd }: Props) {
  const [product, setProduct] = useState<ShopProductDetail | null>(null)
  const [error, setError] = useState("")
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [image, setImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!productId) return
    let live = true
    setProduct(null)
    setError("")
    setQty(1)
    setImage(0)
    shopCall<{ product: ShopProductDetail }>("product", { productId })
      .then(({ product }) => {
        if (!live) return
        setProduct(product)
        const first = product.variants.find((v) => v.id === product.variantId) || product.variants[0]
        setPicked(first ? { ...first.options } : {})
      })
      .catch((err) => live && setError(err.message))
    return () => { live = false }
  }, [productId])

  const options = product?.options || []
  const variants = product?.variants || []
  const variant: ShopVariant | null = useMemo(() => {
    if (!product) return null
    if (!options.length) return variants.find((v) => v.id === product.variantId) || variants[0] || null
    return variants.find((v) => options.every((o) => v.options[o.key] === picked[o.key])) || null
  }, [product, options, variants, picked])

  const images = variant?.images?.length ? [...variant.images, ...(product?.images || []).filter((u) => !variant.images.includes(u))] : product?.images || []
  useEffect(() => setImage(0), [variant?.id])

  const price = variant?.price || product?.price || 0
  const mrp = variant ? variant.mrp : product?.mrp || 0
  const available = variant ? variant.available : product?.available || 0
  const maxQty = Math.max(1, Math.min(99, available || 1))
  const off = percentOff(price, mrp)

  // A value is pickable when some in-stock SKU has it alongside the other current picks.
  const valueState = (option: ShopOption, value: string) => {
    const matches = variants.filter((v) => v.options[option.key] === value && options.every((o) => o.key === option.key || !picked[o.key] || v.options[o.key] === picked[o.key]))
    return { exists: matches.length > 0, inStock: matches.some((v) => v.available > 0) }
  }
  const pick = (option: ShopOption, value: string) => {
    const next = { ...picked, [option.key]: value }
    // Keep the other picks only if that exact SKU exists; else jump to the first SKU with this value.
    if (!variants.some((v) => options.every((o) => v.options[o.key] === next[o.key]))) {
      const fallback = variants.find((v) => v.options[option.key] === value && v.available > 0) || variants.find((v) => v.options[option.key] === value)
      if (fallback) return setPicked({ ...fallback.options })
    }
    setPicked(next)
  }
  const photoFor = (option: ShopOption, value: string) => variants.find((v) => v.options[option.key] === value && v.images?.length)?.images[0] || ""

  const add = async () => {
    if (!variant) return
    setAdding(true)
    const ok = await onAdd(variant.id, Math.min(qty, maxQty))
    setAdding(false)
    if (ok) onClose()
  }

  return (
    <Sheet open={Boolean(productId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="dashboard-module flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border p-4 text-left">
          <SheetTitle className="pr-8 text-base">{product?.title || (error ? "Product" : "Loading product")}</SheetTitle>
          <SheetDescription className="flex items-center gap-1.5 text-xs">
            {product ? <><Store className="h-3.5 w-3.5" />Sold by {product.vendorName || "a Hash partner"}{product.category && ` · ${product.category}`}</> : "Hash Marketplace"}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error ? (
            <div role="alert" className="dashboard-error-banner flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>
          ) : !product ? (
            <div className="dashboard-empty-state"><Loader2 className="h-5 w-5 animate-spin" />Loading product…</div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
                  {images[image] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={images[image]} alt={product.title} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground"><Package className="h-8 w-8" /></div>
                  )}
                  {off > 0 && <Badge variant="danger" className="absolute left-3 top-3">−{off}%</Badge>}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((src, i) => (
                      <button key={src} type="button" onClick={() => setImage(i)} aria-label={`Photo ${i + 1}`} aria-pressed={i === image}
                        className={cn("h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-muted", i === image ? "border-primary" : "border-transparent opacity-70 hover:opacity-100")}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-foreground">{rupees(price)}</span>
                    {off > 0 && <span className="text-sm text-muted-foreground line-through">{rupees(mrp)}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">Inclusive of taxes · delivery worked out at checkout</p>
                </div>
                {product.rating && product.rating.count > 0 && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{product.rating.average.toFixed(1)} ({product.rating.count})</span>
                )}
              </div>

              {options.map((option) => {
                const colour = isColourOption(option)
                return (
                  <fieldset key={option.key} className="space-y-2">
                    <legend className="text-sm text-muted-foreground">{option.title}: <span className="font-medium text-foreground">{picked[option.key] || "Choose"}</span></legend>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value) => {
                        const active = picked[option.key] === value
                        const { exists, inStock } = valueState(option, value)
                        const photo = colour ? photoFor(option, value) : ""
                        const sw = colour ? swatchFor(value) : null
                        return (
                          <button key={value} type="button" aria-pressed={active} title={value} onClick={() => pick(option, value)}
                            aria-label={`${option.title} ${value}${inStock ? "" : ", sold out"}`}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border text-sm transition-colors",
                              photo ? "flex-col gap-1 p-1 text-xs" : "px-3 py-1.5",
                              active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                              (!exists || !inStock) && "opacity-50",
                              !inStock && "line-through",
                            )}>
                            {photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={photo} alt="" className="h-12 w-12 rounded-md object-cover" />
                            ) : sw ? <span className="h-3.5 w-3.5 rounded-full border border-border" style={{ background: sw }} aria-hidden /> : null}
                            <span className={photo ? "max-w-[4.5rem] truncate" : ""}>{value}</span>
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                )
              })}

              {product.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{product.description}</p>}

              {product.specs.length > 0 && (
                <div className="dashboard-table-shell">
                  <table className="dashboard-table">
                    <tbody>
                      {product.specs.map((s) => (
                        <tr key={s.label}><td className="w-2/5 text-muted-foreground">{s.label}</td><td className="text-foreground">{s.value}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {product && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border p-4">
            <p className="text-xs text-muted-foreground">
              {!variant ? "This combination isn't sold." : available > 0 ? `${available} in stock` : "Sold out"}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border">
                <Button variant="ghost" size="icon-sm" aria-label="Fewer" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}><Minus /></Button>
                <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{qty}</span>
                <Button variant="ghost" size="icon-sm" aria-label="More" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty}><Plus /></Button>
              </div>
              <Button onClick={add} disabled={!variant || available <= 0 || adding}>
                {adding ? <Loader2 className="animate-spin" /> : <ShoppingCart />}Add to cart · {rupees(price * qty)}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
