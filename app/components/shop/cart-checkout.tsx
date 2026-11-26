"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, Lock, MapPin, Package, ShoppingCart, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { shopCall } from "@/lib/shop/client"
import { addressFromBuyer, type ShopAddress, type ShopCart } from "@/lib/shop/shape"
import { loadRazorpayScript } from "@/lib/razorpay"
import { rupees } from "./shop-utils"

const EMPTY: ShopAddress = { first_name: "", last_name: "", company: "", address_1: "", address_2: "", city: "", province: "", postal_code: "", phone: "" }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Checkout = { key: string; orderId: string; amount: number; currency: string; name: string; description: string; prefill: Record<string, string> }

function payWithRazorpay(checkout: Checkout): Promise<"paid" | "dismissed" | "failed"> {
  return new Promise((resolve) => {
    let settled = false
    const done = (v: "paid" | "dismissed" | "failed") => { if (!settled) { settled = true; resolve(v) } }
    const rzp = new window.Razorpay({
      key: checkout.key,
      order_id: checkout.orderId,
      amount: checkout.amount,
      currency: checkout.currency || "INR",
      name: checkout.name,
      description: checkout.description,
      prefill: checkout.prefill,
      retry: { enabled: true, max_count: 3 },
      modal: { confirm_close: true, ondismiss: () => done("dismissed") },
      handler: () => done("paid"),
    })
    rzp.on?.("payment.failed", () => { /* Razorpay lets the cafe retry inside the window. */ })
    rzp.open()
  })
}

type Props = {
  cart: ShopCart | null | undefined
  cartId: string
  onCart: (cart: ShopCart | null, cartId: string | null) => void
  onBrowse: () => void
  onOrdered: (orderId: string) => void
}

export function CartCheckout({ cart, cartId, onCart, onBrowse, onOrdered }: Props) {
  const [address, setAddress] = useState<ShopAddress>(EMPTY)
  const [email, setEmail] = useState("")
  const [prefilled, setPrefilled] = useState(false)
  const [prepared, setPrepared] = useState<{ payer: string; amount: number; vendorName: string } | null>(null)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [placed, setPlaced] = useState<{ orderId: string; displayId: string | number } | null>(null)

  // Start from the address already on the cart, else the cafe's own profile.
  useEffect(() => {
    if (prefilled || cart === undefined) return
    setPrefilled(true)
    if (cart?.shippingAddress?.address_1) {
      setAddress({ ...EMPTY, ...cart.shippingAddress })
      if (cart.email) setEmail(cart.email)
      return
    }
    shopCall<{ buyer: any }>("buyer").then(({ buyer }) => {
      if (!buyer) return
      setAddress((a) => (a.address_1 ? a : addressFromBuyer(buyer)))
      setEmail((e) => e || buyer.email || "")
    }).catch(() => undefined)
  }, [cart, prefilled])

  if (placed) {
    return (
      <div className="dashboard-empty-state">
        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
        <p className="text-sm font-semibold text-foreground">Order #{placed.displayId || placed.orderId} placed</p>
        <p className="text-xs">The seller will accept and ship it. Track it under Orders.</p>
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => onOrdered(placed.orderId)}>Track order</Button>
          <Button size="sm" variant="outline" onClick={() => { setPlaced(null); onBrowse() }}>Keep shopping</Button>
        </div>
      </div>
    )
  }

  if (cart === undefined) return <div className="dashboard-empty-state"><Loader2 className="h-5 w-5 animate-spin" />Loading cart…</div>
  if (!cart || cart.items.length === 0) {
    return (
      <div className="dashboard-empty-state">
        <ShoppingCart className="h-5 w-5" />Your cart is empty.
        <Button variant="outline" size="sm" className="mt-2" onClick={onBrowse}>Browse products</Button>
      </div>
    )
  }

  const changeQty = async (itemId: string, quantity: number) => {
    setBusy(`item:${itemId}`)
    setError("")
    setPrepared(null)
    try {
      const data = await shopCall<{ cart: ShopCart | null; cartId: string | null }>("cart.update", { cartId, itemId, quantity })
      onCart(data.cart, data.cartId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy("")
    }
  }

  const prepare = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setBusy("prepare")
    try {
      const data = await shopCall<{ cart: ShopCart; cartId: string; delivery: { payer: string; amount: number; vendorName: string } }>("checkout.prepare", { cartId, address, email })
      onCart(data.cart, data.cartId)
      setPrepared(data.delivery)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy("")
    }
  }

  const complete = async () => {
    // Capture can lag the Razorpay callback; keep the same cart and retry.
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await shopCall<{ status: string; orderId?: string; displayId?: number }>("checkout.complete", { cartId })
      if (res.status === "order" && res.orderId) return res
      await sleep(1500 * (attempt + 1))
    }
    return null
  }

  const pay = async () => {
    setError("")
    setBusy("pay")
    try {
      if (!(await loadRazorpayScript())) throw new Error("Couldn't load the payment window. Check your connection.")
      const { checkout } = await shopCall<{ checkout: Checkout }>("checkout.pay", { cartId })
      const result = await payWithRazorpay(checkout)
      if (result !== "paid") {
        setError("Payment was cancelled. Your cart is saved.")
        return
      }
      setBusy("complete")
      const res = await complete()
      if (res?.orderId) {
        setPlaced({ orderId: res.orderId, displayId: res.displayId || "" })
        onCart(null, null)
      } else {
        setError("Payment received. We're still confirming it with the bank, so check Orders in a minute. Don't pay again.")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy("")
    }
  }

  const set = (k: keyof ShopAddress) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrepared(null)
    setAddress({ ...address, [k]: e.target.value })
  }
  const field = (label: string, k: keyof ShopAddress, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <Input value={address[k]} onChange={set(k)} className="dashboard-module-input h-9 text-sm" {...props} />
    </label>
  )

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        <div className="dashboard-module-card rounded-lg p-3">
          <ul className="divide-y divide-border">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : <div className="flex h-full items-center justify-center text-muted-foreground"><Package className="h-5 w-5" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.variantTitle ? `${item.variantTitle} · ` : ""}{rupees(item.unitPrice)} each</p>
                </div>
                <select aria-label={`Quantity of ${item.title}`} value={item.quantity} disabled={busy === `item:${item.id}`}
                  onChange={(e) => changeQty(item.id, Number(e.target.value))}
                  className="dashboard-module-input h-8 rounded-lg border border-border bg-background px-2 text-sm">
                  {Array.from({ length: Math.max(10, item.quantity) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="hidden w-20 text-right text-sm font-semibold sm:block">{rupees(item.total || item.unitPrice * item.quantity)}</span>
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${item.title}`} disabled={busy === `item:${item.id}`} onClick={() => changeQty(item.id, 0)}>
                  {busy === `item:${item.id}` ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={prepare} className="dashboard-module-card space-y-3 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><MapPin className="h-4 w-4" />Deliver to</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("Receiver name", "first_name", { required: true, autoComplete: "given-name" })}
            {field("Last name", "last_name", { autoComplete: "family-name" })}
            <div className="sm:col-span-2">{field("Cafe / company", "company", { autoComplete: "organization" })}</div>
            <div className="sm:col-span-2">{field("Address", "address_1", { required: true, minLength: 4, autoComplete: "address-line1" })}</div>
            <div className="sm:col-span-2">{field("Landmark / line 2", "address_2", { autoComplete: "address-line2" })}</div>
            {field("City", "city", { required: true, autoComplete: "address-level2" })}
            {field("State", "province", { required: true, autoComplete: "address-level1" })}
            {field("PIN code", "postal_code", { required: true, inputMode: "numeric", pattern: "[1-9][0-9]{5}", autoComplete: "postal-code" })}
            {field("Phone", "phone", { required: true, inputMode: "tel", pattern: "\\+?[0-9]{8,15}", autoComplete: "tel" })}
            <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">
              <span>Email for the receipt</span>
              <Input type="email" required value={email} onChange={(e) => { setPrepared(null); setEmail(e.target.value) }} className="dashboard-module-input h-9 text-sm" autoComplete="email" />
            </label>
          </div>
          <Button type="submit" variant={prepared ? "outline" : "default"} className="w-full" disabled={busy === "prepare"}>
            {busy === "prepare" && <Loader2 className="animate-spin" />}{prepared ? "Update address" : "Save address and get delivery price"}
          </Button>
        </form>
      </div>

      <div className="lg:sticky lg:top-0 lg:self-start">
        <div className="dashboard-module-card space-y-3 rounded-lg p-4">
          <p className="text-sm font-semibold text-foreground">Order total</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Items</span><span className="text-foreground">{rupees(cart.subtotal)}</span></div>
            {cart.discount > 0 && <div className="flex justify-between text-emerald-300"><span>Discount</span><span>−{rupees(cart.discount)}</span></div>}
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery</span>
              <span className="text-foreground">{prepared ? (prepared.payer === "seller" ? "Free" : rupees(cart.shipping)) : "After address"}</span>
            </div>
            {cart.tax > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{rupees(cart.tax)}</span></div>}
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground"><span>Total</span><span>{rupees(cart.total)}</span></div>
          </div>
          {error && <div role="alert" className="dashboard-error-banner text-sm">{error}</div>}
          <Button className="w-full" size="lg" disabled={!prepared || busy === "pay" || busy === "complete"} onClick={pay}>
            {busy === "pay" || busy === "complete" ? <Loader2 className="animate-spin" /> : <Lock />}
            {busy === "complete" ? "Confirming payment" : `Pay ${rupees(cart.total)}`}
          </Button>
          <p className="text-xs text-muted-foreground">
            {prepared ? `Sold and shipped by ${prepared.vendorName || "the seller"}. ` : "Save the delivery address to continue. "}
            One seller per order. Share the completion code from the order only after it arrives.
          </p>
        </div>
      </div>
    </div>
  )
}
