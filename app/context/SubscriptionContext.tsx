"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react"
import { usePathname } from "next/navigation"
import { subscriptionApi } from "@/lib/api"

interface SubscriptionStatus {
  is_active: boolean
  locked: boolean
  message: string
  server_time_utc?: string
  active_subscription?: {
    id?: number | null
    status?: string | null
    period_start?: string | null
    period_end?: string | null
    external_ref?: string | null
  } | null
  latest_subscription?: {
    id?: number | null
    status?: string | null
    period_start?: string | null
    period_end?: string | null
    external_ref?: string | null
  } | null
}

interface SubscriptionContextType {
  status: SubscriptionStatus | null
  loading: boolean
  vendorId: number | null
  isLocked: boolean
  checkSubscription: (force?: boolean) => Promise<void>
  refreshStatus: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  status: null,
  loading: true,
  vendorId: null,
  isLocked: false,
  checkSubscription: async () => {},
  refreshStatus: async () => {},
})

function parseSelectedCafeId(raw: string | null): number | null {
  if (!raw || raw === "master") return null

  const direct = Number.parseInt(raw, 10)
  if (Number.isFinite(direct) && direct > 0) return direct

  try {
    const parsed = JSON.parse(raw)
    const id = Number.parseInt(String(parsed?.id ?? parsed?.vendor_id ?? parsed?.vendorId ?? ""), 10)
    return Number.isFinite(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

function isWindowActive(subscription?: SubscriptionStatus["active_subscription"] | null) {
  if (!subscription) return false
  const status = String(subscription.status || "").toLowerCase()
  if (!["active", "trialing", "past_due"].includes(status)) return false

  const now = Date.now()
  const startsAt = subscription.period_start ? Date.parse(subscription.period_start) : Number.NaN
  const endsAt = subscription.period_end ? Date.parse(subscription.period_end) : Number.NaN
  return (Number.isNaN(startsAt) || startsAt <= now) && (Number.isNaN(endsAt) || endsAt > now)
}

function normalizeSubscriptionStatus(raw: any): SubscriptionStatus {
  const activeFromPayload = Boolean(raw?.is_active ?? raw?.has_active ?? raw?.active)
  const activeFromSubscription = isWindowActive(raw?.active_subscription)
  const isActive = activeFromPayload || activeFromSubscription

  return {
    is_active: isActive,
    locked: Boolean(raw?.locked ?? !isActive),
    message: String(raw?.message || (isActive ? "Active" : "Subscription inactive")),
    server_time_utc: raw?.server_time_utc,
    active_subscription: raw?.active_subscription || null,
    latest_subscription: raw?.latest_subscription || null,
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [vendorId, setVendorId] = useState<number | null>(null)
  const checkInFlight = useRef(false)
  const pathname = usePathname()

  useEffect(() => {
    const selectedCafe = localStorage.getItem("selectedCafe")
    const id = parseSelectedCafeId(selectedCafe)
    if (id) {
      setVendorId(id)
    } else {
      setVendorId(null)
    }
  }, [pathname])

  const checkSubscription = useCallback(async (force = false) => {
    if (checkInFlight.current) return
    if (!vendorId || vendorId <= 0) {
      setLoading(false)
      return
    }

    const selectedCafe = localStorage.getItem("selectedCafe")
    if (selectedCafe === "master") {
      setStatus({ is_active: true, locked: false, message: "Master access" })
      setLoading(false)
      return
    }

    const skipPages = ["/subscription", "/login", "/select-cafe"]
    if (!force && skipPages.some(page => pathname?.includes(page))) {
      setLoading(false)
      return
    }

    try {
      checkInFlight.current = true
      setLoading(true)
      const response = await subscriptionApi.checkStatus(vendorId)
      setStatus(normalizeSubscriptionStatus(response))
      // ✅ No redirect on locked — dashboard stays visible
    } catch (error) {
      console.error("Failed to check subscription:", error)
      // Keep an already-active state on transient API errors to avoid false relocking.
      setStatus((prev) =>
        prev?.is_active
          ? prev
          : { is_active: false, locked: true, message: "Unable to verify subscription status" }
      )
    } finally {
      setLoading(false)
      checkInFlight.current = false
    }
  }, [vendorId, pathname])

  const refreshStatus = useCallback(async () => {
    await checkSubscription(true)
  }, [checkSubscription])

  useEffect(() => {
    if (!vendorId) return

    const skipPages = ["/login", "/select-cafe"]
    if (skipPages.some(page => pathname?.includes(page))) return

    void checkSubscription()
  }, [vendorId, pathname, checkSubscription])

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "hidden") return
      if (vendorId) {
        void checkSubscription(true)
      }
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [vendorId, checkSubscription])

  useEffect(() => {
    if (!vendorId) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void checkSubscription(true)
      }
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [vendorId, checkSubscription])

  const isLocked = Boolean(status?.locked && vendorId)

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        loading,
        vendorId,
        isLocked,
        checkSubscription,
        refreshStatus,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
