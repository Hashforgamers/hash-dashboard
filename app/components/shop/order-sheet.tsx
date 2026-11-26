"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { AlertCircle, ExternalLink, KeyRound, Loader2, Package, Truck, XCircle } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { shopCall } from "@/lib/shop/client"
import type { ShopOrderDetail } from "@/lib/shop/shape"
import { rupees, stageLabel, stageVariant } from "./shop-utils"

const when = (at: string | null | undefined, pattern = "dd MMM yyyy, HH:mm") => {
  if (!at) return ""
  const d = new Date(at)
  return Number.isNaN(d.getTime()) ? "" : format(d, pattern)
}

export function OrderSheet({ orderId, onClose, onChanged }: { orderId: string; onClose: () => void; onChanged: () => void }) {
  const [order, setOrder] = useState<ShopOrderDetail | null>(null)
  const [error, setError] = useState("")
  const [otp, setOtp] = useState<{ code: string; expiresAt?: string; instruction?: string } | null>(null)
  const [busy, setBusy] = useState("")
  const [actionError, setActionError] = useState("")
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState("")

  const load = useCallback(async () => {
    try {
      const data = await shopCall<{ order: ShopOrderDetail }>("order", { orderId })
      setOrder(data.order)
      setError("")
    } catch (err: any) {
      setError((prev) => (order ? prev : err.message))
    }
  }, [orderId, order])

  useEffect(() => {
    setOrder(null)
    setOtp(null)
    setCancelOpen(false)
    setReason("")
    setActionError("")
    if (!orderId) return
    let live = true
    shopCall<{ order: ShopOrderDetail }>("order", { orderId })
      .then((data) => live && setOrder(data.order))
      .catch((err) => live && setError(err.message))
    return () => { live = false }
  }, [orderId])

  // Keep the tracker fresh while it is open.
  useEffect(() => {
    if (!orderId) return
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load() }, 60_000)
    return () => window.clearInterval(timer)
  }, [orderId, load])

  const getCode = async () => {
    setBusy("otp")
    setActionError("")
    try {
      const data = await shopCall<{ code: string; expiresAt?: string; instruction?: string }>("order.otp", { orderId })
      setOtp(data)
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setBusy("")
    }
  }

  const cancel = async () => {
    setBusy("cancel")
    setActionError("")
    try {
      await shopCall("order.cancel", { orderId, reason })
      setCancelOpen(false)
      await load()
      onChanged()
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setBusy("")
    }
  }

  const finished = Boolean(order && (order.completedAt || order.stage === "delivered" || order.stage === "completed" || order.stage === "canceled" || order.status === "canceled"))
  const canCancel = Boolean(order && !finished && !order.cancellation)

  return (
    <Sheet open={Boolean(orderId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="dashboard-module flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border p-4 text-left">
          <SheetTitle className="flex flex-wrap items-center gap-2 pr-8 text-base">
            Order #{order?.displayId || orderId.slice(-8).toUpperCase()}
            {order?.stage && <Badge variant={stageVariant(order.stage)}>{stageLabel(order.stage)}</Badge>}
            {order?.onHold && <Badge variant="warning">On hold</Badge>}
          </SheetTitle>
          <SheetDescription className="text-xs">{order ? `Placed ${when(order.createdAt)} · ${rupees(order.total)}${order.paid ? " · Paid" : ""}` : "Hash Marketplace order"}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {error && !order ? (
            <div role="alert" className="dashboard-error-banner flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>
          ) : !order ? (
            <div className="dashboard-empty-state"><Loader2 className="h-5 w-5 animate-spin" />Loading order…</div>
          ) : (
            <>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {order.items.map((item, i) => (
                  <li key={`${item.title}-${i}`} className="flex items-center gap-3 p-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : <div className="flex h-full items-center justify-center text-muted-foreground"><Package className="h-4 w-4" /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.variantTitle ? `${item.variantTitle} · ` : ""}{item.quantity} × {rupees(item.unitPrice)}</p>
                    </div>
                    <span className="text-sm font-semibold">{rupees(item.total || item.unitPrice * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              {(order.courier || order.trackingNumber || order.expectedDelivery) && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{order.courier || "Courier"}</span>
                  {order.trackingNumber && <span className="font-mono text-xs text-muted-foreground">{order.trackingNumber}</span>}
                  {order.expectedDelivery && <span className="text-xs text-muted-foreground">· expected {when(order.expectedDelivery, "dd MMM")}</span>}
                  {order.trackingUrl && (
                    <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline">Track<ExternalLink className="h-3 w-3" /></a>
                  )}
                </div>
              )}

              {order.timeline.length > 0 && (
                <ol className="space-y-3 border-l border-border pl-4">
                  {order.timeline.map((t) => (
                    <li key={`${t.id}-${t.at}`} className="relative">
                      <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
                      <p className="text-sm font-medium text-foreground">{stageLabel(t.status)}</p>
                      <p className="text-xs text-muted-foreground">{when(t.at)}{t.note ? ` · ${t.note}` : ""}</p>
                    </li>
                  ))}
                </ol>
              )}

              {order.address && (
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Delivering to</p>
                  <p className="text-foreground">{[order.address.first_name, order.address.last_name].filter(Boolean).join(" ")}{order.address.company ? `, ${order.address.company}` : ""}</p>
                  <p className="text-muted-foreground">{[order.address.address_1, order.address.address_2, order.address.city, order.address.province, order.address.postal_code].filter(Boolean).join(", ")}</p>
                  {order.address.phone && <p className="text-muted-foreground">{order.address.phone}</p>}
                </div>
              )}

              {order.cancellation && <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">Cancellation {order.cancellation.status.replace(/_/g, " ")}. Hash reviews refunds separately.</div>}

              {otp && (
                <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Completion code</p>
                  <p className="font-mono text-2xl font-semibold tracking-[0.3em] text-foreground">{otp.code}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{otp.instruction || "Share this only after you receive the order."}{otp.expiresAt ? ` Expires ${when(otp.expiresAt, "HH:mm")}.` : ""}</p>
                </div>
              )}

              {cancelOpen && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <label htmlFor="shop-cancel-reason" className="text-sm text-foreground">Why are you cancelling?</label>
                  <Textarea id="shop-cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} className="text-sm" />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setCancelOpen(false)}>Keep order</Button>
                    <Button size="sm" variant="soft-danger" disabled={reason.trim().length < 3 || busy === "cancel"} onClick={cancel}>
                      {busy === "cancel" && <Loader2 className="animate-spin" />}Request cancellation
                    </Button>
                  </div>
                </div>
              )}
              {actionError && <div role="alert" className="dashboard-error-banner text-sm">{actionError}</div>}
            </>
          )}
        </div>

        {order && !finished && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4">
            {canCancel && !cancelOpen && <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}><XCircle />Cancel order</Button>}
            {order.completionEligible && (
              <Button size="sm" onClick={getCode} disabled={busy === "otp"}>{busy === "otp" ? <Loader2 className="animate-spin" /> : <KeyRound />}{otp ? "New code" : "Get completion code"}</Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
