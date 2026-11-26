"use client"

import { ensureFreshAccessToken, ensureFreshLoginToken, getPreferredAuthToken } from "@/lib/auth-session"

export class ShopCallError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const selectedCafeId = () => (typeof window === "undefined" ? "" : localStorage.getItem("selectedCafe") || "")

const cartKey = (vendorId: string) => `hash_shop_cart_v1:${vendorId}`
export const readCartId = (vendorId: string) => (vendorId && typeof window !== "undefined" ? localStorage.getItem(cartKey(vendorId)) || "" : "")
export function writeCartId(vendorId: string, cartId: string | null | undefined) {
  if (!vendorId || typeof window === "undefined") return
  if (cartId) localStorage.setItem(cartKey(vendorId), cartId)
  else localStorage.removeItem(cartKey(vendorId))
}

/** One Shop action through the dashboard's server (/api/shop), signed in as the selected cafe. */
export async function shopCall<T = any>(op: string, args: Record<string, unknown> = {}): Promise<T> {
  const vendorId = selectedCafeId()
  if (!vendorId) throw new ShopCallError(400, "Select your cafe first.")
  await Promise.all([ensureFreshLoginToken().catch(() => null), ensureFreshAccessToken().catch(() => null)])
  const token = getPreferredAuthToken()
  if (!token) throw new ShopCallError(401, "Sign in again.")
  let res: Response
  try {
    res = await fetch("/api/shop", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Vendor-Id": vendorId },
      body: JSON.stringify({ op, args }),
      cache: "no-store",
    })
  } catch {
    throw new ShopCallError(503, "Can't reach the Shop. Check your connection.")
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ShopCallError(res.status, data?.error || "Something went wrong. Try again.", data?.code)
  return data as T
}
