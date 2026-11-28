/*
 * Shapes Hash Marketplace (Medusa) records for the dashboard Shop. Kept free
 * of server-only imports so the same mapping is unit-tested and matches what
 * the website marketplace shows (hfg-new-landing-page lib/server/ops/store.js).
 */

export type ShopProduct = {
  id: string
  variantId: string
  title: string
  description: string
  kind: string
  vendorId: string
  vendorName: string
  price: number
  mrp: number
  available: number
  thumbnail: string
  rating: { average: number; count: number } | null
  category: string
  categoryId: string
  colors: string[]
  variantCount: number
}

export type ShopVariant = {
  id: string
  title: string
  sku?: string
  options: Record<string, string>
  price: number
  mrp: number
  available: number
  images: string[]
}

export type ShopOption = { key: string; title: string; values: string[] }

export type ShopProductDetail = ShopProduct & {
  images: string[]
  brand: string
  model: string
  options: ShopOption[]
  variants: ShopVariant[]
  specs: { label: string; value: string }[]
}

export type ShopCartItem = {
  id: string
  title: string
  variantTitle: string
  thumbnail: string
  quantity: number
  unitPrice: number
  total: number
  productId: string
}

export type ShopAddress = {
  first_name: string
  last_name: string
  company: string
  address_1: string
  address_2: string
  city: string
  province: string
  postal_code: string
  phone: string
}

export type ShopCart = {
  email: string
  currency: string
  items: ShopCartItem[]
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  shippingAddress: ShopAddress | null
  hasShippingMethod: boolean
  vendorName: string
}

export const https = (u: unknown): u is string => typeof u === "string" && u.startsWith("https://")
const money = (n: unknown) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : 0)

/** Card price: the live offer price when Hash computed one, else the list price. */
export function cardPricing(pricing: any, fallback: unknown) {
  const now = money(pricing?.calculated_amount) || money(fallback)
  const was = money(pricing?.original_amount)
  return { price: now, mrp: was > now ? was : 0 }
}

export function productCard(p: any): ShopProduct {
  const { price, mrp } = cardPricing(p.pricing, p.price_inr)
  const colors: string[] = []
  for (const variant of p.variants || []) {
    const c = variant?.options?.color
    if (typeof c === "string" && c && !colors.includes(c)) colors.push(c)
  }
  const category = (p.categories || [])[0]
  return {
    id: p.product_id,
    variantId: p.variant_id,
    title: p.title || "",
    description: String(p.description || "").slice(0, 400),
    kind: p.kind || "",
    vendorId: p.vendor_id || "",
    vendorName: p.vendor_name || "",
    price,
    mrp,
    available: Number(p.available || 0),
    thumbnail: https(p.thumbnail) ? p.thumbnail : https(p.gallery?.[0]?.url) ? p.gallery[0].url : "",
    rating: p.rating_summary ? { average: Number(p.rating_summary.average || 0), count: Number(p.rating_summary.count || 0) } : null,
    category: category?.name || "",
    categoryId: category?.id || "",
    colors: colors.slice(0, 8),
    variantCount: (p.variants || []).length || 1,
  }
}

export function titleCase(key: string) {
  return String(key).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase())
}

function specText(value: unknown, def?: { unit?: string }) {
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.filter((x) => x !== "" && x != null).join(", ")
  if (typeof value === "number") return def?.unit ? `${value} ${def.unit}` : String(value)
  if (typeof value === "string") return value.trim()
  return ""
}

type SpecCategory = { id: string; specifications: { key: string; label?: string; unit?: string }[] }

/** Product detail from the Hash catalogue row: per-colour photos, SKU options and specifications. */
export function productDetail(raw: any, categories: SpecCategory[] = []): ShopProductDetail {
  const card = productCard(raw)
  const defs = new Map<string, { key: string; label?: string; unit?: string }>()
  for (const c of categories) {
    if (!(raw.categories || []).some((x: any) => x.id === c.id)) continue
    for (const d of c.specifications || []) if (d?.key && !defs.has(d.key)) defs.set(d.key, d)
  }
  const label = (key: string) => defs.get(key)?.label || titleCase(key)
  const variants: ShopVariant[] = (raw.variants || [])
    .filter((v: any) => v?.id)
    .map((v: any) => {
      const { price, mrp } = cardPricing(v.pricing, (v.prices || []).find((x: any) => x.currency_code === "inr")?.amount)
      return {
        id: v.id,
        title: v.title || "",
        sku: v.sku || "",
        options: v.options && typeof v.options === "object" ? v.options : {},
        price: price || card.price,
        mrp,
        available: Math.max(0, Number(v.available ?? 0)),
        images: (v.images || []).filter(https),
      }
    })
  const axes = Object.keys(variants[0]?.options || {})
  const options = axes
    .map((key) => ({ key, title: label(key), values: [...new Set(variants.map((v) => v.options[key]).filter((x) => typeof x === "string" && x))] }))
    .filter((o) => o.values.length > 1 || variants.length > 1)
  const values = raw.specifications && typeof raw.specifications === "object" ? raw.specifications : {}
  const keys = [...[...defs.keys()].filter((k) => k in values), ...Object.keys(values).filter((k) => !defs.has(k))]
  const specs: { label: string; value: string }[] = []
  for (const key of keys) {
    if (options.some((o) => o.key === key)) continue
    const text = specText(values[key], defs.get(key))
    if (text && text.length <= 300) specs.push({ label: label(key), value: text })
  }
  if (card.category && !specs.some((s) => s.label === "Category")) specs.push({ label: "Category", value: card.category })
  const gallery = (raw.gallery || []).map((g: any) => g?.url).filter(https)
  const images = [...gallery, raw.thumbnail].filter((u, i, all) => https(u) && all.indexOf(u) === i)
  const first = variants.find((v) => v.id === card.variantId) || variants[0]
  return {
    ...card,
    price: first?.price || card.price,
    mrp: first?.mrp || card.mrp,
    description: raw.description || card.description,
    images: (images.length ? images : card.thumbnail ? [card.thumbnail] : []).slice(0, 20),
    brand: typeof values.brand === "string" ? values.brand : "",
    model: typeof values.model === "string" ? values.model : "",
    options: variants.length > 1 ? options : [],
    variants,
    specs,
  }
}

function addressView(a: any): ShopAddress | null {
  if (!a) return null
  return {
    first_name: a.first_name || "",
    last_name: a.last_name || "",
    company: a.company || "",
    address_1: a.address_1 || "",
    address_2: a.address_2 || "",
    city: a.city || "",
    province: a.province || "",
    postal_code: a.postal_code || "",
    phone: a.phone || "",
  }
}

export function cartView(cart: any): ShopCart | null {
  if (!cart) return null
  return {
    email: cart.email || "",
    currency: cart.currency_code || "inr",
    items: (cart.items || []).map((i: any) => ({
      id: i.id,
      title: i.product_title || i.title || "",
      variantTitle: i.variant_title && i.variant_title !== "Default variant" ? i.variant_title : "",
      thumbnail: i.thumbnail || "",
      quantity: Number(i.quantity || 0),
      unitPrice: Number(i.unit_price || 0),
      total: Number(i.total ?? i.subtotal ?? 0),
      productId: i.product_id || "",
    })),
    subtotal: Number(cart.item_subtotal ?? cart.subtotal ?? 0),
    shipping: Number(cart.shipping_total || 0),
    tax: Number(cart.tax_total || 0),
    discount: Number(cart.discount_total || 0),
    total: Number(cart.total || 0),
    shippingAddress: addressView(cart.shipping_address),
    hasShippingMethod: Boolean(cart.shipping_methods?.length),
    vendorName: String(cart.metadata?.vendor_name || ""),
  }
}

export type ShopOrderSummary = {
  id: string
  displayId: number | string
  createdAt: string
  total: number
  currency: string
  status: string
  items: { title: string; quantity: number; thumbnail: string }[]
}

export function orderSummary(o: any): ShopOrderSummary {
  return {
    id: o.id,
    displayId: o.display_id,
    createdAt: o.created_at,
    total: Number(o.total || 0),
    currency: o.currency_code || "inr",
    status: o.status || "",
    items: (o.items || []).map((i: any) => ({ title: i.product_title || i.title || "", quantity: Number(i.quantity || 0), thumbnail: i.thumbnail || "" })),
  }
}

export type ShopOrderDetail = {
  id: string
  displayId: number | string
  createdAt: string
  total: number
  shipping: number
  currency: string
  status: string
  items: { title: string; variantTitle: string; quantity: number; unitPrice: number; total: number; thumbnail: string }[]
  address: ShopAddress | null
  paid: boolean
  completedAt: string | null
  completionEligible: boolean
  stage: string | null
  kind: string | null
  onHold: boolean
  courier: string
  trackingNumber: string
  expectedDelivery: string
  cancellation: { status: string } | null
  timeline: { id: string; status: string; at: string; note: string }[]
  trackingUrl: string
}

export function orderDetail(o: any, h: any, tracking: any): ShopOrderDetail {
  return {
    id: o.id,
    displayId: o.display_id,
    createdAt: o.created_at,
    total: Number(o.total || 0),
    shipping: Number(o.shipping_total || 0),
    currency: o.currency_code || "inr",
    status: o.status || "",
    items: (o.items || []).map((i: any) => ({
      title: i.product_title || i.title || "",
      variantTitle: i.variant_title && i.variant_title !== "Default variant" ? i.variant_title : "",
      quantity: Number(i.quantity || 0),
      unitPrice: Number(i.unit_price || 0),
      total: Number(i.total || 0),
      thumbnail: i.thumbnail || "",
    })),
    address: addressView(tracking?.delivery_address || o.shipping_address),
    paid: Boolean(h?.paid),
    completedAt: h?.completed_at || null,
    completionEligible: Boolean(h?.completion_eligible),
    stage: tracking?.status || null,
    kind: tracking?.kind || null,
    onHold: Boolean(tracking?.on_hold),
    courier: tracking?.courier || "",
    trackingNumber: tracking?.tracking_number || "",
    expectedDelivery: tracking?.expected_delivery || "",
    cancellation: tracking?.cancellation ? { status: String(tracking.cancellation.status || "requested") } : null,
    timeline: (tracking?.timeline || [])
      .map((t: any) => ({ id: String(t.id), status: String(t.status || ""), at: t.at, note: typeof t.note === "string" ? t.note.slice(0, 300) : "" }))
      .sort((a: any, b: any) => String(a.at).localeCompare(String(b.at))),
    trackingUrl: https(tracking?.tracking_url) ? tracking.tracking_url : "",
  }
}


const PIN = /^[1-9][0-9]{5}$/
const PHONE = /^\+?[0-9]{8,15}$/
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)

/** Validates a delivery address from the form; throws a readable message. */
export function parseAddress(raw: any) {
  const a = raw && typeof raw === "object" ? raw : {}
  const out = {
    first_name: clean(a.first_name, 60),
    last_name: clean(a.last_name, 60),
    company: clean(a.company, 120),
    address_1: clean(a.address_1, 160),
    address_2: clean(a.address_2, 160),
    city: clean(a.city, 60),
    province: clean(a.province, 60),
    postal_code: String(a.postal_code ?? "").replace(/\s+/g, ""),
    country_code: "in",
    phone: String(a.phone ?? "").replace(/[^\d+]/g, ""),
  }
  if (!out.first_name) throw new Error("Enter the receiver's name.")
  if (out.address_1.length < 4) throw new Error("Enter the delivery address.")
  if (!out.city) throw new Error("Enter the city.")
  if (!out.province) throw new Error("Enter the state.")
  if (!PIN.test(out.postal_code)) throw new Error("Enter a valid 6-digit PIN code.")
  if (!PHONE.test(out.phone)) throw new Error("Enter a valid phone number.")
  return out
}

/** Best-effort address from the cafe's profile; the form lets the cafe correct it. */
export function addressFromBuyer(buyer: any): ShopAddress {
  const [first = "", ...rest] = String(buyer?.owner_name || "").trim().split(/\s+/)
  const line1 = String(buyer?.address?.line1 || "")
  const parts = line1.split(",").map((s) => s.trim()).filter(Boolean)
  const city = parts.length > 1 ? parts[parts.length - 1].replace(/\b\d{6}\b/, "").trim() : ""
  const phone = String(buyer?.phone || "").replace(/[^\d+]/g, "")
  return {
    first_name: first,
    last_name: rest.join(" "),
    company: String(buyer?.cafe_name || ""),
    address_1: line1,
    address_2: String(buyer?.address?.line2 || ""),
    city,
    province: String(buyer?.address?.state || ""),
    postal_code: String(buyer?.address?.pincode || "").replace(/\s+/g, ""),
    phone,
  }
}

/**
 * Email for the cafe's marketplace store account. Medusa needs one and it must not
 * collide with the owner's gamer account, so the cafe email gets a "+hashcafe<id>"
 * tag (still delivered to the same inbox by most providers). Without a usable cafe
 * email, a per-cafe address on the Hash domain is used. Receipts use the email
 * entered at checkout, not this one.
 */
export function cafeStoreEmail(email: unknown, vendorId: number) {
  const raw = String(email || "").trim().toLowerCase()
  const match = /^([^\s@+]{1,48})(?:\+[^\s@]*)?@([a-z0-9.-]+\.[a-z]{2,})$/.exec(raw)
  if (match) return `${match[1]}+hashcafe${vendorId}@${match[2]}`
  return `cafe-${vendorId}@buyers.hashforgamers.com`
}
