"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { UpcomingBookings } from "./upcoming-booking"
import { CurrentSlots } from "./current-slot"
import SlotManagement from "./newSlot"
import { motion } from "framer-motion"
import {
  IndianRupee, CalendarCheck, WalletCards, Eye, EyeOff,
  TrendingUp, Lock, MonitorPlay, ExternalLink
} from 'lucide-react'
import { useDashboardData } from "@/app/context/DashboardDataContext"
import { useAccess } from "@/app/context/AccessContext"
import HashLoader from "./ui/HashLoader"
import { useSocket } from "../context/SocketContext"
import { useSubscription } from "@/hooks/useSubscription"
import { useRouter, useSearchParams } from "next/navigation"

const TERMINAL_BOOKING_STATUSES = ["cancelled", "canceled", "rejected", "completed", "discarded", "no_show"];
const DASHBOARD_TABS = ["live", "booking"] as const
type DashboardTab = (typeof DASHBOARD_TABS)[number]

// ✅ Locked overlay component
function LockedOverlay() {
  const router = useRouter()
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 rounded-lg bg-background/75 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="p-4 bg-destructive/10 rounded-full">
          <Lock className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h3 className="font-bold text-base text-foreground">Dashboard Locked</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Your subscription is inactive. All dashboard widgets are locked.
          </p>
        </div>
        <button
          onClick={() => router.push("/subscription")}
          className="mt-1 px-6 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-md"
        >
          Subscribe Now
        </button>
      </div>
    </div>
  )
}

export function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showEarnings, setShowEarnings] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const [refreshSlots, setRefreshSlots] = useState(false)
  const [activeDashboardTab, setActiveDashboardTab] = useState<DashboardTab>("live")
  const { vendorId, landingData, refreshLanding, refreshConsoles } = useDashboardData()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [realTimeStats, setRealTimeStats] = useState<{
    todayEarnings?: number
    todayBookings?: number
    pendingAmount?: number
    todayAppFees?: number
    pendingAppFees?: number
    netEarnings?: number
    netPendingAmount?: number
    todayBookingsChange?: number
    lastUpdate?: string
  }>({})
  const lastMealNoticeRef = useRef<{ key: string; ts: number } | null>(null)

  const { socket, isConnected, joinVendor } = useSocket()
  const { isLocked } = useSubscription()
  const { activeStaff } = useAccess()
  const isOwnerSession = (activeStaff?.role || "owner") === "owner"

  useEffect(() => {
    const requestedTab = searchParams.get("tab")
    setActiveDashboardTab(requestedTab === "booking" ? "booking" : "live")
  }, [searchParams])

  const openDashboardTab = useCallback((tab: DashboardTab) => {
    setActiveDashboardTab(tab)
    const next = new URLSearchParams(searchParams.toString())
    if (tab === "live") {
      next.delete("tab")
    } else {
      next.set("tab", tab)
    }
    const query = next.toString()
    router.replace(query ? `/dashboard?${query}` : "/dashboard", { scroll: false })
  }, [router, searchParams])

  const showDashboardToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const toast = document.createElement('div')
    const bgClass =
      type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-rose-500' : 'bg-cyan-500'
    toast.className = `fixed top-4 right-4 px-5 py-3 rounded-lg shadow-xl z-[10000] text-white font-medium transform transition-all duration-300 ${bgClass}`
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
        <span>${message}</span>
      </div>
    `
    document.body.appendChild(toast)
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast)
    }, 4500)
  }, [])

  useEffect(() => {
    if (landingData) {
      setDashboardData(landingData)
      if (landingData?.stats) {
        setRealTimeStats({
          todayEarnings: landingData.stats.todayEarnings,
          todayBookings: landingData.stats.todayBookings,
          pendingAmount: landingData.stats.pendingAmount,
          todayAppFees: landingData.stats.todayAppFees,
          pendingAppFees: landingData.stats.pendingAppFees,
          netEarnings: landingData.stats.netEarnings,
          netPendingAmount: landingData.stats.netPendingAmount,
          todayBookingsChange: landingData.stats.todayBookingsChange || 0,
          lastUpdate: new Date().toLocaleTimeString(),
        })
      }
    }
  }, [landingData])

  const loadLandingData = useCallback(async () => {
    await refreshLanding()
  }, [refreshLanding])

  const loadConsoleData = useCallback(async () => {
    await refreshConsoles()
  }, [refreshConsoles])

  useEffect(() => {
    if (!vendorId) return
    loadLandingData()
    loadConsoleData()
  }, [vendorId, loadLandingData, loadConsoleData])

  useEffect(() => {
    if (!socket || !vendorId || !isConnected) return

    console.log('📊 Dashboard: Setting up booking event listener for real-time stats updates')
    const activeVendorId = vendorId
    joinVendor(activeVendorId)

    function handleBookingEvent(data: any) {
      console.log('📅 Booking event received:', data)
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id)
      if (eventVendorId === activeVendorId) {
        const status = (data.status || '').toLowerCase()
        const bookingStatus = String(data?.booking_status || '').toLowerCase()
        if (status === 'pending_acceptance' || bookingStatus === 'pending_acceptance') {
          console.log('🔔 Dashboard: Pay-at-cafe pending event received')
        }
        if (status === 'confirmed' || status === 'paid' || status === 'completed') {
          setRealTimeStats(prev => ({
            ...prev,
            todayBookings: (prev.todayBookings || 0) + 1,
            todayEarnings: (prev.todayEarnings || 0) + (data.amount || data.slot_price || 0),
            lastUpdate: new Date().toLocaleTimeString()
          }))
        }
        if (TERMINAL_BOOKING_STATUSES.includes(status)) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('history-booking-add', { detail: data }))
          }
        }
      }
    }

    function handleUpcomingBookingEvent(data: any) {
      console.log('📅 Upcoming booking event received:', data)
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id)
      if (eventVendorId === activeVendorId && (data.status === 'Confirmed' || data.status === 'confirmed')) {
        setRealTimeStats(prev => ({
          ...prev,
          todayBookings: (prev.todayBookings || 0) + 1,
          lastUpdate: new Date().toLocaleTimeString()
        }))
      }
    }

    function handleConsoleAvailabilityEvent(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id)
      if (eventVendorId === activeVendorId && data?.console_id !== undefined) {
        // Keep dashboard reactive without relying on removed local booking state.
        setRefreshSlots((prev) => !prev)
        loadConsoleData()
      }
    }

    function handleBookingPaymentUpdate(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id)
      if (eventVendorId !== activeVendorId) return
      const eventType = String(data?.event || "").toLowerCase()
      if (eventType === "meals_added") {
        const bookingId = data?.bookingId ?? data?.booking_id
        const amountAdded = Number(data?.amount_added || 0)
        const customerName = data?.username || data?.user_name || "Customer"
        const noticeKey = `${bookingId || "booking"}:${amountAdded}:${data?.settlement_status || ""}`
        const nowTs = Date.now()
        const lastNotice = lastMealNoticeRef.current
        if (!lastNotice || lastNotice.key !== noticeKey || nowTs - lastNotice.ts > 15000) {
          lastMealNoticeRef.current = { key: noticeKey, ts: nowTs }
          showDashboardToast(`Meals added by ${customerName} (+₹${amountAdded.toFixed(0)})`, "info")
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              const browserNotif = new Notification("Meals added during session", {
                body: `${customerName} added meals (+₹${amountAdded.toFixed(0)})`,
                icon: "/favicon.ico",
                tag: `meals_${bookingId || "unknown"}`
              })
              setTimeout(() => browserNotif.close(), 8000)
            } catch (err) {
              console.warn("Browser notification failed:", err)
            }
          }
        }
      }
      setRefreshSlots((prev) => !prev)
      loadLandingData()
      loadConsoleData()
      setRealTimeStats(prev => ({
        ...prev,
        lastUpdate: new Date().toLocaleTimeString(),
      }))
    }

    function handleSocketResync() {
      joinVendor(activeVendorId)
      loadLandingData()
      loadConsoleData()
    }

    socket.on('booking', handleBookingEvent)
    socket.on('upcoming_booking', handleUpcomingBookingEvent)
    socket.on('console_availability', handleConsoleAvailabilityEvent)
    socket.on('booking_payment_update', handleBookingPaymentUpdate)
    socket.on('connect', handleSocketResync)
    if (socket.io) {
      socket.io.on('reconnect', handleSocketResync)
    }
    window.addEventListener('socket-reconnected', handleSocketResync)

    return () => {
      console.log('🧹 Cleaning up dashboard booking listeners')
      socket.off('booking', handleBookingEvent)
      socket.off('upcoming_booking', handleUpcomingBookingEvent)
      socket.off('console_availability', handleConsoleAvailabilityEvent)
      socket.off('booking_payment_update', handleBookingPaymentUpdate)
      socket.off('connect', handleSocketResync)
      if (socket.io) {
        socket.io.off('reconnect', handleSocketResync)
      }
      window.removeEventListener('socket-reconnected', handleSocketResync)
    }
  }, [socket, vendorId, isConnected, joinVendor, loadLandingData, loadConsoleData])

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshSlots(prev => !prev)
      loadLandingData()
      loadConsoleData()
    }
    window.addEventListener("refresh-dashboard", handleRefresh)
    return () => window.removeEventListener("refresh-dashboard", handleRefresh)
  }, [loadLandingData, loadConsoleData])

  const currentStats = {
    todayEarnings: realTimeStats.todayEarnings ?? dashboardData?.stats?.todayEarnings ?? 0,
    todayBookings: realTimeStats.todayBookings ?? dashboardData?.stats?.todayBookings ?? 0,
    pendingAmount: realTimeStats.pendingAmount ?? dashboardData?.stats?.pendingAmount ?? 0,
    todayAppFees: realTimeStats.todayAppFees ?? dashboardData?.stats?.todayAppFees ?? 0,
    pendingAppFees: realTimeStats.pendingAppFees ?? dashboardData?.stats?.pendingAppFees ?? 0,
    netEarnings: realTimeStats.netEarnings ?? dashboardData?.stats?.netEarnings ?? 0,
    netPendingAmount: realTimeStats.netPendingAmount ?? dashboardData?.stats?.netPendingAmount ?? 0,
    todayBookingsChange: realTimeStats.todayBookingsChange ?? dashboardData?.stats?.todayBookingsChange ?? 0
  }

  const formatMoney = (value?: number) => `₹${Number(value || 0).toFixed(2)}`

  const topMetricsStrip = (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-wrap items-stretch gap-2 max-md:flex max-md:snap-x max-md:overflow-x-auto max-md:pb-1 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden"
    >
      <motion.div
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-w-[168px] flex-1 max-md:min-w-[64%] max-md:snap-start"
      >
        <Card className="gaming-kpi-card h-full rounded-lg transition-all duration-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="rounded-md bg-[#30d158]/12 p-1.5">
                  <IndianRupee className="h-3.5 w-3.5 text-[#30d158]" />
                </div>
                <span className="dash-kpi-label">Earnings (Net)</span>
              </div>
              <button onClick={() => setShowEarnings(!showEarnings)} className="text-[#8e8e93] transition-colors hover:text-[#f5f5f7]">
                {showEarnings ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <motion.p
                key={currentStats.netEarnings}
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-sm font-semibold text-foreground sm:text-base"
              >
                {showEarnings ? formatMoney(currentStats.netEarnings) : "₹•••••"}
              </motion.p>
              <span className="text-[10px] font-medium text-[#8e8e93]">Today</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-w-[150px] flex-1 max-md:min-w-[58%] max-md:snap-start"
      >
        <Card className="gaming-kpi-card h-full rounded-lg transition-all duration-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="rounded-md bg-[#0a84ff]/12 p-1.5">
                  <CalendarCheck className="h-3.5 w-3.5 text-[#0a84ff]" />
                </div>
                <span className="dash-kpi-label">Bookings</span>
              </div>
              <span
                className={`text-[10px] font-medium ${isConnected ? "text-[#30d158]" : "text-[#ff9f0a]"}`}
                title={isConnected ? "Realtime updates connected" : "Realtime reconnecting"}
              >
                {isConnected ? "Live" : "Syncing"}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <motion.p
                key={currentStats.todayBookings}
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-sm font-semibold text-foreground sm:text-base"
              >
                {currentStats.todayBookings}
              </motion.p>
              <div className="flex items-center gap-1 text-[10px] text-[#8e8e93]">
                <TrendingUp className="h-3 w-3" />
                <span>Today</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-w-[168px] flex-1 max-md:min-w-[64%] max-md:snap-start"
      >
        <Card className="gaming-kpi-card h-full rounded-lg transition-all duration-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="rounded-md bg-[#ff9f0a]/12 p-1.5">
                  <WalletCards className="h-3.5 w-3.5 text-[#ff9f0a]" />
                </div>
                <span className="dash-kpi-label">Pending (Net)</span>
              </div>
              <button onClick={() => setShowPending(!showPending)} className="text-[#8e8e93] transition-colors hover:text-[#f5f5f7]">
                {showPending ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <motion.p
                key={currentStats.netPendingAmount}
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-sm font-semibold text-foreground sm:text-base"
              >
                {showPending ? formatMoney(currentStats.netPendingAmount) : "₹•••••"}
              </motion.p>
              <div className="flex items-center gap-1 text-[10px] text-[#8e8e93]">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ff9f0a]" />
                <span>Today</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  const mobileMetricsStrip = (
    <div className="dashboard-module-card flex w-full items-center justify-between gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-1.5 py-1 md:hidden">
      <div className="min-w-0 rounded-md border border-[#0a84ff]/20 bg-[#0a84ff]/10 px-1.5 py-1 text-[10px] font-medium text-[#9dccff]">
        Bk {currentStats.todayBookings}
      </div>
      <div className="min-w-0 rounded-md border border-[#ff9f0a]/20 bg-[#ff9f0a]/10 px-1.5 py-1 text-[10px] font-medium text-[#ffd60a]">
        Pd {formatMoney(currentStats.netPendingAmount)}
      </div>
      <div className="min-w-0 rounded-md border border-[#30d158]/20 bg-[#30d158]/10 px-1.5 py-1 text-[10px] font-medium text-[#30d158]">
        Er {formatMoney(currentStats.netEarnings)}
      </div>
    </div>
  )

  if (!dashboardData) {
    return <HashLoader className="py-[42vh]" />
  }

  return (
    <>
      {dashboardData?.available ? (
        <HashLoader className="py-[50vh]" />
      ) : (
        <div className="relative flex h-full min-h-0 flex-col gap-2 overflow-hidden text-foreground max-md:gap-1.5 sm:gap-3">
          {isLocked && <LockedOverlay />}
          <div
            className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
              isLocked ? "pointer-events-none select-none opacity-70" : ""
            }`}
          >

          {/* ✅ Subscription expired banner
          {isLocked && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 flex-shrink-0"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive font-medium">
                  Your subscription has expired. Live sessions and bookings are locked.
                </p>
              </div>
              <button
                onClick={() => router.push("/subscription")}
                className="shrink-0 text-xs font-bold text-destructive underline underline-offset-2 hover:text-destructive/80 transition-colors whitespace-nowrap"
              >
                Renew Now →
              </button>
            </motion.div>
          )}  */}

          {/* Top Compact Row */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="gaming-panel shrink-0 rounded-lg p-3 max-md:p-2 md:p-3.5"
          >
            <div
              className={
                isOwnerSession
                  ? "grid grid-cols-1 gap-3 max-md:grid-cols-[minmax(0,1fr)_minmax(138px,42vw)] max-md:items-start max-md:gap-1 lg:grid-cols-[minmax(245px,0.8fr)_minmax(0,1.9fr)_auto] lg:items-center"
                  : "grid grid-cols-1 gap-1.5"
              }
            >
              <div className="min-w-0">
                <div className="flex h-full flex-col items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <h1 className="premium-heading dashboard-hero-title leading-tight max-md:text-[1.1rem]">
                        Operations Dashboard
                      </h1>
                    </div>
                    <p className="premium-subtle mt-0.5 text-[11px] leading-relaxed sm:text-xs">
                      Live sessions, bookings, and revenue for today.
                    </p>
                  </div>
                  <div className="tab-container">
                    <button
                      type="button"
                      onClick={() => openDashboardTab("live")}
                      className={activeDashboardTab === "live" ? "tab-active" : "tab-inactive"}
                    >
                      <MonitorPlay className="h-4 w-4" />
                      <span>Live View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openDashboardTab("booking")}
                      className={activeDashboardTab === "booking" ? "tab-active" : "tab-inactive"}
                    >
                      <CalendarCheck className="h-4 w-4" />
                      <span>Booking</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="min-w-0 max-md:hidden">
                <div className="min-w-0">
                  {isOwnerSession ? topMetricsStrip : null}
                </div>
              </div>
              <div className="max-md:w-full max-md:self-start">
                {isOwnerSession ? mobileMetricsStrip : null}
              </div>
            </div>
          </motion.div>

          {activeDashboardTab === "booking" ? (
            <motion.div
              key="dashboard-booking"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 min-h-0 flex-1 overflow-hidden rounded-lg sm:mt-3"
            >
              <div className="gaming-panel h-full min-h-0 overflow-hidden rounded-lg p-0">
                <SlotManagement embedded />
              </div>
            </motion.div>
          ) : (
            <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 max-md:mt-1 max-md:gap-1.5 sm:mt-3 sm:gap-3">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="dashboard-booking-slab gaming-panel shrink-0 overflow-hidden rounded-lg"
              >
                <div className="dashboard-booking-slab-body">
                  <SlotManagement embedded slab />
                </div>
              </motion.div>

              <div className="grid flex-1 grid-cols-1 gap-2 overflow-hidden max-md:min-h-[520px] max-md:grid-rows-[1.05fr_0.95fr] max-md:gap-1.5 sm:gap-3 xl:grid-cols-12">
                <div className="space-y-2 sm:space-y-4 flex flex-col min-h-0 xl:col-span-8 2xl:col-span-9 max-md:h-full max-md:min-h-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex-1 min-h-0 lg:h-full max-md:overflow-hidden"
                >
                  <div className="relative h-full overflow-hidden">
                    <CurrentSlots
                      currentSlots={dashboardData.currentSlots}
                      historyBookings={dashboardData.historyBookings || []}
                      refreshSlots={refreshSlots}
                      setRefreshSlots={setRefreshSlots}
                    />
                  </div>
                </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col min-h-0 xl:col-span-4 2xl:col-span-3 xl:h-full max-md:h-full max-md:min-h-0"
                >
                  <div className="relative flex-1 min-h-[320px] overflow-hidden rounded-lg xl:h-full xl:min-h-0 max-md:min-h-0 max-md:h-full">
                    <UpcomingBookings
                      upcomingBookings={dashboardData.upcomingBookings || []}
                      vendorId={vendorId?.toString()}
                      setRefreshSlots={setRefreshSlots}
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          </div>
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <div className="h-full min-h-0 bg-transparent">
      <DashboardContent />
    </div>
  )
}

export default App
