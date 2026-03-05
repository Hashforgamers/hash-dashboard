"use client"

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react"
import { usePathname } from "next/navigation"
import { subscriptionApi } from "@/lib/api"

interface SubscriptionStatus {
  is_active: boolean
  locked: boolean
  message: string
}

interface SubscriptionContextType {
  status: SubscriptionStatus | null
  loading: boolean
  vendorId: number | null
  isLocked: boolean
  checkSubscription: () => Promise<void>
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

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [vendorId, setVendorId] = useState<number | null>(null)
  const checkInFlight = useRef(false)
  const pathname = usePathname()

  useEffect(() => {
    const selectedCafe = localStorage.getItem("selectedCafe")
    if (selectedCafe && selectedCafe !== "master") {
      const id = parseInt(selectedCafe)
      setVendorId(id)
    } else {
      setVendorId(null)
    }
  }, [pathname])

  const checkSubscription = async (force = false) => {
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
      setStatus(response as SubscriptionStatus)
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
  }

  const refreshStatus = async () => {
    await checkSubscription(true)
  }

  useEffect(() => {
    if (!vendorId) return

    const skipPages = ["/login", "/select-cafe"]
    if (skipPages.some(page => pathname?.includes(page))) return

    checkSubscription()
  }, [vendorId, pathname])

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
  }, [vendorId, pathname])

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
