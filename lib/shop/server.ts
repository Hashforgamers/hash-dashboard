/*
 * Server side of the dashboard Shop: the cafe buys on the Hash Marketplace
 * (hash-medusa) with the same store API calls the website uses
 * (hfg-new-landing-page lib/server/ops/store.js). The browser never talks to
 * Medusa: this route signs the cafe in with its dashboard token
 * (POST /auth/customer/hfg-cafe) and keeps the Medusa customer token here.
 */
import { createHash } from "node:crypto"
import { cartView, orderDetail, orderSummary, parseAddress, productCard, productDetail } from "./shape"

const MEDUSA_URL = () => (process.env.HASH_MEDUSA_URL || "https://hash-medusa.onrender.com").replace(/\/$/, "")
const DASHBOARD_URL = () => (process.env.HFG_DASHBOARD_URL || process.env.NEXT_PUBLIC_DASHBOARD_URL || "").replace(/\/$/, "")

export class ShopError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const SAFE: Record<number, string> = {
  400: "The request could not be processed.",
  401: "Please sign in again.",
  403: "This action is not allowed for your cafe.",
  404: "Not found.",
  409: "This changed while you were checking out. Refresh and try again.",
  429: "Too many attempts. Wait a moment.",
}

function safeMessage(data: any, status: number) {
  if (status === 401) return SAFE[401]
  const candidate = data && (data.message || data.error?.message || data.error)
  if (typeof candidate === "string" && candidate.length <= 200 && !/traceback|exception|sql|stack|knex|mikro/i.test(candidate)) return candidate
  return SAFE[status] || "Something went wrong. Try again."
}

async function call(base: string, path: string, { method = "GET", body, token, headers = {}, timeoutMs = 30000 }: { method?: string; body?: unknown; token?: string; headers?: Record<string, string>; timeoutMs?: number } = {}) {
  const finalHeaders: Record<string, string> = { Accept: "application/json", "X-Client-Source": "dashboard", ...headers }
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json"
  if (token) finalHeaders.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(`${base}${path}`, { method, headers: finalHeaders, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(timeoutMs) })
  } catch {
    throw new ShopError(503, "The marketplace is not reachable right now. Try again.")
  }
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }
  if (!res.ok) throw new ShopError(res.status, safeMessage(data, res.status))
  return data
}

function peekJwt(token: string): any {
  try { return JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8")) } catch { return {} }
}

/* ----------------------------------------------------------- config */
let configCache: { value: any; exp: number } | null = null
async function storeConfig() {
  if (configCache && configCache.exp > Date.now()) return configCache.value
  const data = await call(MEDUSA_URL(), "/hash-store/config")
  if (data?.version !== 1 || !String(data.publishable_api_key || "").startsWith("pk_") || !data.region_id || !data.sales_channel_id) {
    throw new ShopError(503, "The marketplace is temporarily unavailable. Try again.")
  }
  configCache = { value: data, exp: Date.now() + 5 * 60_000 }
  return data
}

/* ---------------------------------------------------------- sign-in */
type Buyer = { dashToken: string; vendorId: number }
type CustomerSession = { token: string; exp: number; customerId: string }
const sessions = new Map<string, CustomerSession>()
const sessionKey = (b: Buyer) => `${b.vendorId}:${createHash("sha256").update(b.dashToken).digest("hex")}`

async function exchange(b: Buyer) {
  const data = await call(MEDUSA_URL(), "/auth/customer/hfg-cafe", { method: "POST", body: { token: b.dashToken, vendor_id: b.vendorId } }).catch((error) => {
    if (error instanceof ShopError && error.status === 401) throw new ShopError(401, "The marketplace couldn't confirm your cafe. Sign in again.")
    throw error
  })
  if (!data?.token) throw new ShopError(502, "Store sign-in failed. Try again.")
  return data.token as string
}

async function cafeProfile(b: Buyer) {
  if (!DASHBOARD_URL()) return null
  try {
    const data = await call(DASHBOARD_URL(), `/api/vendor/${b.vendorId}/marketplace/buyer`, { token: b.dashToken, timeoutMs: 10000 })
    return data?.buyer || null
  } catch {
    return null
  }
}

/** Dashboard token -> Medusa customer token for this cafe, registering the store customer on first use. */
async function customerSession(b: Buyer): Promise<CustomerSession> {
  const key = sessionKey(b)
  const now = Math.floor(Date.now() / 1000)
  const cached = sessions.get(key)
  if (cached && cached.exp > now + 60) return cached
  const config = await storeConfig()
  let token = await exchange(b)
  if (!peekJwt(token).actor_id) {
    const buyer = await cafeProfile(b)
    const profile: Record<string, unknown> = { metadata: { hfg_vendor_id: String(b.vendorId), buyer_type: "cafe" } }
    if (buyer?.cafe_name) profile.company_name = String(buyer.cafe_name).slice(0, 120)
    if (buyer?.owner_name) profile.first_name = String(buyer.owner_name).slice(0, 60)
    const phone = String(buyer?.phone || "").replace(/[^\d+]/g, "")
    if (/^\+?\d{8,15}$/.test(phone)) profile.phone = phone
    // No email: the owner's email may already belong to their own gamer store account.
    try {
      await call(MEDUSA_URL(), "/store/customers", { method: "POST", body: profile, token, headers: { "x-publishable-api-key": config.publishable_api_key } })
    } catch (error) {
      if (!(error instanceof ShopError && [400, 409, 422].includes(error.status))) throw error
    }
    token = await exchange(b)
    if (!peekJwt(token).actor_id) throw new ShopError(502, "Your cafe's store account is still being set up. Try again.")
  }
  const claims = peekJwt(token)
  const session = { token, exp: Number(claims.exp) || now + 3600, customerId: String(claims.actor_id) }
  sessions.set(key, session)
  if (sessions.size > 500) sessions.delete(sessions.keys().next().value as string)
  return session
}

async function medusa(b: Buyer | null, path: string, { method = "GET", body, retry = true }: { method?: string; body?: unknown; retry?: boolean } = {}): Promise<any> {
  const config = await storeConfig()
  const session = b ? await customerSession(b) : null
  try {
    return await call(MEDUSA_URL(), path, { method, body, token: session?.token, headers: { "x-publishable-api-key": config.publishable_api_key } })
  } catch (error) {
    if (error instanceof ShopError) {
      if (retry && method === "GET" && error.status === 400 && /publishable/i.test(error.message)) {
        configCache = null
        return medusa(b, path, { method, body, retry: false })
      }
      if (b && error.status === 401) sessions.delete(sessionKey(b))
    }
    throw error
  }
}

/* -------------------------------------------------------- catalogue */
const catalogCache = new Map<string, { value: any; exp: number }>()
async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const entry = catalogCache.get(key)
  if (entry && entry.exp > Date.now()) return entry.value
  const value = await loader()
  catalogCache.set(key, { value, exp: Date.now() + ttlMs })
  return value
}

async function loadCatalog(): Promise<any[]> {
  return cached("catalog", 3 * 60_000, async () => {
    const all: any[] = []
    for (let offset = 0; offset < 1000; offset += 100) {
      const data = await medusa(null, `/store/hash/products?limit=100&offset=${offset}`)
      const page = data?.products || []
      all.push(...page)
      if (page.length < 100 || all.length >= Number(data?.count || 0)) break
    }
    return all
  })
}

async function loadCategories(): Promise<any[]> {
  return cached("categories", 10 * 60_000, async () => {
    try {
      const data = await medusa(null, "/store/hash/categories")
      return (data?.categories || []).map((c: any) => ({ id: c.id, name: c.name, specifications: Array.isArray(c.specifications) ? c.specifications : [] }))
    } catch {
      return []
    }
  })
}

/* ------------------------------------------------------------- cart */
const CART_ID = /^cart_[A-Za-z0-9]+$/
const VARIANT_ID = /^variant_[A-Za-z0-9]+$/
const ITEM_ID = /^cali_[A-Za-z0-9]+$/
const ORDER_ID = /^order_[A-Za-z0-9]+$/
const PRODUCT_ID = /^prod_[A-Za-z0-9]+$/

function str(value: unknown, name: string, pattern: RegExp) {
  if (typeof value !== "string" || !pattern.test(value)) throw new ShopError(400, `Invalid ${name}.`)
  return value
}
function int(value: unknown, name: string, min: number, max: number) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) throw new ShopError(400, `Invalid ${name}.`)
  return n
}

/** The cafe's open cart, or null when it is gone, completed or not this cafe's. */
async function loadCart(b: Buyer, cartId: unknown) {
  if (typeof cartId !== "string" || !CART_ID.test(cartId)) return null
  try {
    const data = await medusa(b, `/store/carts/${cartId}`)
    const cart = data?.cart
    const { customerId } = await customerSession(b)
    if (!cart || cart.completed_at || (cart.customer_id && cart.customer_id !== customerId)) return null
    return cart
  } catch (error) {
    if (error instanceof ShopError && error.status === 404) return null
    throw error
  }
}

async function requireCart(b: Buyer, cartId: unknown) {
  const cart = await loadCart(b, cartId)
  if (!cart) throw new ShopError(404, "Your cart is empty.", "cart_gone")
  return cart
}

/* -------------------------------------------------------------- ops */
type Op = (b: Buyer, args: any) => Promise<any>

export const shopOps: Record<string, Op> = {
  async products() {
    const [catalog, categories] = await Promise.all([loadCatalog(), loadCategories()])
    return { products: catalog.map(productCard), categories: categories.map((c) => ({ id: c.id, name: c.name })) }
  },

  /** The cafe's own name, contact and address, to start the delivery form. */
  async buyer(b) {
    return { buyer: await cafeProfile(b) }
  },

  async product(_b, args) {
    const productId = str(args.productId, "product", PRODUCT_ID)
    const raw = (await loadCatalog()).find((p) => p.product_id === productId)
    if (!raw) throw new ShopError(404, "This product is not available right now.")
    return { product: productDetail(raw, await loadCategories()) }
  },

  async "cart.get"(b, args) {
    const cart = await loadCart(b, args.cartId)
    return { cart: cartView(cart), cartId: cart?.id || null }
  },

  async "cart.add"(b, args) {
    const variantId = str(args.variantId, "variant", VARIANT_ID)
    const quantity = int(args.quantity ?? 1, "quantity", 1, 99)
    const config = await storeConfig()
    let cart = await loadCart(b, args.cartId)
    try {
      if (!cart) {
        const data = await medusa(b, "/store/carts", { method: "POST", body: { region_id: config.region_id, sales_channel_id: config.sales_channel_id, items: [{ variant_id: variantId, quantity }] } })
        cart = data?.cart
      } else {
        const data = await medusa(b, `/store/carts/${cart.id}/line-items`, { method: "POST", body: { variant_id: variantId, quantity } })
        cart = data?.cart
      }
    } catch (error) {
      if (error instanceof ShopError && /vendor|seller/i.test(error.message)) {
        throw new ShopError(409, "Your cart has items from another seller. Check out or clear it first.", "mixed_vendor")
      }
      throw error
    }
    return { cart: cartView(cart), cartId: cart?.id || null }
  },

  async "cart.update"(b, args) {
    const cart = await requireCart(b, args.cartId)
    const itemId = str(args.itemId, "item", ITEM_ID)
    const quantity = int(args.quantity, "quantity", 0, 99)
    if (quantity === 0) await medusa(b, `/store/carts/${cart.id}/line-items/${itemId}`, { method: "DELETE" })
    else await medusa(b, `/store/carts/${cart.id}/line-items/${itemId}`, { method: "POST", body: { quantity } })
    const next = await loadCart(b, cart.id)
    return { cart: cartView(next), cartId: next?.id || null }
  },

  /** Saves the address, prices delivery and selects it. Returns final totals. */
  async "checkout.prepare"(b, args) {
    const cart = await requireCart(b, args.cartId)
    let address
    try { address = parseAddress(args.address) } catch (error: any) { throw new ShopError(400, error.message) }
    const email = String(args.email || "").trim()
    if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email)) throw new ShopError(400, "Enter an email for the order receipt.")
    await medusa(b, `/store/carts/${cart.id}`, { method: "POST", body: { email, shipping_address: address, billing_address: address } })
    const policy = await medusa(b, `/store/hash/carts/${cart.id}/delivery`)
    if (policy?.missing_package_product_ids?.length) throw new ShopError(409, "The seller hasn't finished delivery details for an item. Try again later.")
    const options = await medusa(b, `/store/shipping-options?cart_id=${cart.id}`)
    const option = (options?.shipping_options || []).find((o: any) => o.provider_id === (policy?.provider_id || "hash_delivery_hash_delivery"))
    if (!option) throw new ShopError(409, "Delivery isn't available to this PIN code yet.")
    const calc = await medusa(b, `/store/shipping-options/${option.id}/calculate`, { method: "POST", body: { cart_id: cart.id, data: {} } })
    const deliveryAmount = Number(calc?.shipping_option?.calculated_price?.calculated_amount ?? calc?.shipping_option?.amount ?? 0)
    const selected = await medusa(b, `/store/carts/${cart.id}/shipping-methods`, { method: "POST", body: { option_id: option.id, data: {} } })
    return {
      cart: cartView(selected?.cart),
      cartId: cart.id,
      delivery: { payer: policy?.payer || "customer", amount: policy?.payer === "seller" ? 0 : deliveryAmount, vendorName: policy?.vendor_name || "" },
    }
  },

  /** Creates the Razorpay session for the cart's current server total. */
  async "checkout.pay"(b, args) {
    const cart = await requireCart(b, args.cartId)
    if (!cart.shipping_methods?.length) throw new ShopError(409, "Confirm the delivery address first.")
    const config = await storeConfig()
    const providers = await medusa(b, `/store/payment-providers?region_id=${config.region_id}`)
    if (!(providers?.payment_providers || []).some((p: any) => p.id === "pp_razorpay_razorpay")) throw new ShopError(503, "Online payment isn't enabled for the marketplace yet.")
    const collection = await medusa(b, "/store/payment-collections", { method: "POST", body: { cart_id: cart.id } })
    const pcId = collection?.payment_collection?.id
    const withSession = await medusa(b, `/store/payment-collections/${pcId}/payment-sessions`, { method: "POST", body: { provider_id: "pp_razorpay_razorpay", data: {} } })
    const session = (withSession?.payment_collection?.payment_sessions || []).find((s: any) => s.provider_id === "pp_razorpay_razorpay")
    const data = session?.data || {}
    if (!data.id || !data.amount || !data.key_id) throw new ShopError(502, "Payment could not be started. Try again.")
    return {
      // data.amount is already paise; never multiply again.
      checkout: {
        key: data.key_id,
        orderId: data.id,
        amount: Number(data.amount),
        currency: data.currency || "INR",
        name: "Hash Marketplace",
        description: `${cart.items?.length || 0} item(s) for your cafe`,
        prefill: { name: cart.shipping_address?.company || cart.shipping_address?.first_name || "", email: cart.email || "", contact: cart.shipping_address?.phone || "" },
      },
      total: Number(cart.total || 0),
    }
  },

  async "checkout.complete"(b, args) {
    const cartId = str(args.cartId, "cart", CART_ID)
    const data = await medusa(b, `/store/carts/${cartId}/complete`, { method: "POST", body: {} })
    if (data?.type === "order" && data.order?.id) return { status: "order", orderId: data.order.id, displayId: data.order.display_id }
    // Payment still pending capture: keep the same cart and retry.
    return { status: "pending", message: data?.error?.message || "Payment is still being verified." }
  },

  async orders(b) {
    const data = await medusa(b, "/store/orders?limit=50&offset=0&order=-created_at")
    return { orders: (data?.orders || []).map(orderSummary) }
  },

  async order(b, args) {
    const orderId = str(args.orderId, "order", ORDER_ID)
    const [detail, hash] = await Promise.all([
      medusa(b, `/store/orders/${orderId}`),
      medusa(b, `/store/hash/orders/${orderId}`).catch((error) => {
        if (error instanceof ShopError && error.status === 404) return null // reconciliation lag
        throw error
      }),
    ])
    const h = hash?.order || {}
    return { order: orderDetail(detail?.order || {}, h, hash?.tracking || h.tracking || null) }
  },

  async "order.cancel"(b, args) {
    const orderId = str(args.orderId, "order", ORDER_ID)
    const reason = String(args.reason || "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 300)
    if (reason.length < 3) throw new ShopError(400, "Tell the seller why you're cancelling.")
    const data = await medusa(b, `/store/hash/orders/${orderId}/cancellation`, { method: "POST", body: { reason } })
    return { cancellation: { status: data?.cancellation?.status || "requested" } }
  },

  async "order.otp"(b, args) {
    const orderId = str(args.orderId, "order", ORDER_ID)
    const data = await medusa(b, `/store/hash/orders/${orderId}/otp`, { method: "POST", body: {} })
    return { code: data?.code, expiresAt: data?.expires_at, instruction: data?.instruction }
  },
}

/** Per-cafe, per-op rate limit (in memory; a backstop for runaway clients). */
const hits = new Map<string, number[]>()
export function allow(key: string, max: number, windowMs = 60_000) {
  const now = Date.now()
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs)
  if (list.length >= max) return false
  list.push(now)
  hits.set(key, list)
  if (hits.size > 5000) hits.delete(hits.keys().next().value as string)
  return true
}
