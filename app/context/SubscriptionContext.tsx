"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { subscriptionApi } from "@/lib/api"
import { toast } from "sonner"

interface SubscriptionStatus {
  is_active: boolean
  locked: boolean
  message: string
}

interface SubscriptionContextType {
  status: SubscriptionStatus | null
  loading: boolean
  vendorId: number | null
  checkSubscription: () => Promise<void>
  refreshStatus: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  status: null,
  loading: true,
  vendorId: null,
  checkSubscription: async () => {},
  refreshStatus: async () => {},
})

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(false) // ✅ Changed to false initially
  const [vendorId, setVendorId] = useState<number | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Get current vendor ID from localStorage
  useEffect(() => {
    const selectedCafe = localStorage.getItem("selectedCafe")
    if (selectedCafe && selectedCafe !== "master") {
      const id = parseInt(selectedCafe)
      setVendorId(id)
    } else {
      setVendorId(null)
    }
  }, [pathname]) // ✅ Re-check when pathname changes

  // Check subscription status
  const checkSubscription = async () => {
    // ✅ Don't check if no vendorId or on auth pages
    if (!vendorId || vendorId <= 0) {
      setLoading(false)
      return
    }

    // ✅ Skip check for master analytics
    const selectedCafe = localStorage.getItem("selectedCafe")
    if (selectedCafe === "master") {
      setStatus({ is_active: true, locked: false, message: "Master access" })
      setLoading(false)
      return
    }

    // ✅ Skip check on these pages
    const skipPages = ["/subscription", "/login", "/select-cafe"]
    if (skipPages.some(page => pathname?.includes(page))) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await subscriptionApi.checkStatus(vendorId)
      setStatus(response as SubscriptionStatus)

      // ✅ Only redirect if on dashboard and locked
      if (response.locked && pathname?.includes("/dashboard")) {
        toast.error("Your subscription has expired. Please renew to continue.")
        router.push("/subscription")
      }
    } catch (error) {
      console.error("Failed to check subscription:", error)
      // ✅ Don't block on error - allow access
      setStatus({ is_active: true, locked: false, message: "Check failed" })
    } finally {
      setLoading(false)
    }
  }

  // Refresh status (for after payment)
  const refreshStatus = async () => {
    await checkSubscription()
  }

  // ✅ Only check when vendorId is set AND on dashboard
  useEffect(() => {
    if (vendorId && pathname?.includes("/dashboard")) {
      checkSubscription()
    }
  }, [vendorId, pathname])

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        loading,
        vendorId,
        checkSubscription,
        refreshStatus,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
