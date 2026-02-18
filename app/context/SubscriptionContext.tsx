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
  const router = useRouter()
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

  const checkSubscription = async () => {
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
    if (skipPages.some(page => pathname?.includes(page))) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await subscriptionApi.checkStatus(vendorId)
      setStatus(response as SubscriptionStatus)
      // ✅ No redirect on locked — dashboard stays visible
    } catch (error) {
      console.error("Failed to check subscription:", error)
      setStatus({ is_active: true, locked: false, message: "Check failed" })
    } finally {
      setLoading(false)
    }
  }

  const refreshStatus = async () => {
    await checkSubscription()
  }

  useEffect(() => {
    if (vendorId && pathname?.includes("/dashboard")) {
      checkSubscription()
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
