import { NextResponse } from "next/server"
import { ShopError, allow, shopOps } from "@/lib/shop/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const LIMITS: Record<string, number> = { "cart.add": 40, "cart.update": 60, "checkout.prepare": 20, "checkout.pay": 10, "checkout.complete": 30, "order.cancel": 5, "order.otp": 5 }

/** POST {op, args} with the dashboard bearer token and X-Vendor-Id. */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || ""
  const dashToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  const vendorId = Number(request.headers.get("x-vendor-id"))
  if (!dashToken) return NextResponse.json({ error: "Sign in again." }, { status: 401 })
  if (!Number.isSafeInteger(vendorId) || vendorId <= 0) return NextResponse.json({ error: "Select your cafe first." }, { status: 400 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }) }
  const op = typeof body?.op === "string" ? body.op : ""
  const run = Object.prototype.hasOwnProperty.call(shopOps, op) ? shopOps[op] : null
  if (!run) return NextResponse.json({ error: "Unknown action." }, { status: 404 })
  if (!allow(`${vendorId}:${op}`, LIMITS[op] || 120)) return NextResponse.json({ error: "Too many attempts. Wait a moment." }, { status: 429 })
  try {
    const result = await run({ dashToken, vendorId }, body.args && typeof body.args === "object" ? body.args : {})
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    if (error instanceof ShopError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: { "Cache-Control": "private, no-store" } })
    console.error("shop.op_failed", op, error instanceof Error ? error.name : "unknown")
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }
}
