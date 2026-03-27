"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { UpcomingBookings } from "./upcoming-booking"
import { CurrentSlots } from "./current-slot"
import { motion, AnimatePresence } from "framer-motion"
import {
  IndianRupee, CalendarCheck, WalletCards, Eye, EyeOff,
  TrendingUp, BarChart3, Monitor, Gamepad2,
  Gamepad, Headphones, Lock
} from 'lucide-react'
import { useDashboardData } from "@/app/context/DashboardDataContext"
import { DASHBOARD_URL } from "@/src/config/env"
import HashLoader from "./ui/HashLoader"
import { NotificationButton } from "../components/NotificationButton"
import { useSocket } from "../context/SocketContext"
import { useSubscription } from "@/hooks/useSubscription"
import { useRouter } from "next/navigation"

const platformMetadata = {
  platforms: [
    { name: "PC", icon: Monitor, color: "#3b82f6", bgColor: "#dbeafe", type: "pc" },
    { name: "PS5", icon: Gamepad2, color: "#a855f7", bgColor: "#f3e8ff", type: "ps5" },
    { name: "Xbox", icon: Gamepad, color: "#10b981", bgColor: "#d1fae5", type: "xbox" },
    { name: "VR", icon: Headphones, color: "#f59e0b", bgColor: "#fef3c7", type: "vr" },
  ]
}

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
  const [showBookingStats, setShowBookingStats] = useState(true)
  const [showEarnings, setShowEarnings] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const [refreshSlots, setRefreshSlots] = useState(false)
  const { vendorId, landingData, consoles, refreshLanding, refreshConsoles } = useDashboardData()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [latestBookingEvent, setLatestBookingEvent] = useState<any>(null)
  const [activeTopTab, setActiveTopTab] = useState<'analytics' | 'devices'>('analytics')
  const [bookingInfo, setBookingInfo] = useState([])
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
  const [nowISTDateText, setNowISTDateText] = useState<string>("")
  const [nowISTTimeText, setNowISTTimeText] = useState<string>("")
  const lastMealNoticeRef = useRef<{ key: string; ts: number } | null>(null)

  const { socket, isConnected, joinVendor } = useSocket()
  const { isLocked } = useSubscription()
  const router = useRouter()

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

  useEffect(() => {
    if (Array.isArray(consoles) && consoles.length > 0) {
      setBookingInfo(consoles)
    }
  }, [consoles])

  const loadLandingData = useCallback(async () => {
    await refreshLanding()
  }, [refreshLanding])

  const loadConsoleData = useCallback(async () => {
    await refreshConsoles()
  }, [refreshConsoles])

  const handleBookingAccepted = (bookingData: any) => {
    console.log('🎯 Booking accepted - updating upcoming bookings:', bookingData)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('booking-accepted', { detail: bookingData }))
    }
  }

  useEffect(() => {
    const dateFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const timeFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    const tick = () => {
      const now = new Date()
      setNowISTDateText(dateFormatter.format(now))
      setNowISTTimeText(timeFormatter.format(now))
    }
    tick()
    const timer = setInterval(() => {
      tick()
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!vendorId) return
    loadLandingData()
    loadConsoleData()
  }, [vendorId, loadLandingData, loadConsoleData])

  useEffect(() => {
    if (!socket || !vendorId || !isConnected) return

    console.log('📊 Dashboard: Setting up booking event listener for real-time stats updates')
    joinVendor(vendorId)

    function handleBookingEvent(data: any) {
      console.log('📅 Booking event received:', data)
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id)
      if (eventVendorId === vendorId) {
        const status = (data.status || '').toLowerCase()
        const bookingStatus = String(data?.booking_status || '').toLowerCase()
        if (status === 'pending_acceptance' || bookingStatus === 'pending_acceptance') {
          console.log('🔔 Dashboard: Passing pay-at-cafe event to NotificationButton')
          setLatestBookingEvent({
            ...data,
            vendorId: eventVendorId,
            status: status || bookingStatus || data?.status,
          })
        }
        if (status === 'confirmed' || status === 'paid' || status === 'completed') {
          setRealTimeStats(prev => ({
            ...prev,
            todayBookings: (prev.todayBookings || 0) + 1,
            todayEarnings: (prev.todayEarnings || 0) + (data.amount || data.slot_price || 0),
            lastUpdate: new Date().toLocaleTimeString()
          }))
        }
        if (status === 'cancelled' || status === 'rejected' || status === 'completed') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('history-booking-add', { detail: data }))
          }
        }
      }
    }

    function handleUpcomingBookingEvent(data: any) {
      console.log('📅 Upcoming booking event received:', data)
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id)
      if (eventVendorId === vendorId && (data.status === 'Confirmed' || data.status === 'confirmed')) {
        setRealTimeStats(prev => ({
          ...prev,
          todayBookings: (prev.todayBookings || 0) + 1,
          lastUpdate: new Date().toLocaleTimeString()
        }))
      }
    }

    function handleConsoleAvailabilityEvent(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id)
      if (eventVendorId === vendorId && data?.console_id !== undefined) {
        setBookingInfo((prev: any[]) =>
          Array.isArray(prev)
            ? prev.map((item: any) =>
                Number(item?.id) === Number(data.console_id)
                  ? { ...item, status: Boolean(data.is_available), is_available: Boolean(data.is_available) }
                  : item
              )
            : prev
        )
      }
    }

    function handleBookingPaymentUpdate(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id)
      if (eventVendorId !== vendorId) return
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
      joinVendor(vendorId)
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

  const platforms = platformMetadata.platforms.map(metadata => {
    const platformBooking = bookingInfo.filter((b: any) => b.type === metadata.type)
    const total = platformBooking.length
    const booked = platformBooking.filter((b: any) => b.status === false).length
    return { ...metadata, total, booked }
  })

  const topMetricsStrip = (
    <AnimatePresence mode="wait">
      {activeTopTab === 'analytics' && (
        <motion.div
          key="analytics"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 max-md:flex max-md:snap-x max-md:gap-2 max-md:overflow-x-auto max-md:pb-1 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden"
        >
          <motion.div
            animate={{ scale: realTimeStats.lastUpdate ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 0.5 }}
            className="flex-1 min-w-0 max-md:min-w-[82%] max-md:snap-start"
          >
            <Card className="gaming-kpi-card h-full rounded-xl transition-all duration-200">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="p-1 sm:p-1.5 rounded-full bg-emerald-500/20">
                      <IndianRupee className="w-3 sm:w-4 h-3 sm:h-4 text-emerald-400" />
                    </div>
                    <span className="dash-kpi-label">Earnings (Net)</span>
                  </div>
                  <button onClick={() => setShowEarnings(!showEarnings)} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                    {showEarnings ? <EyeOff className="w-3 sm:w-4 h-3 sm:h-4" /> : <Eye className="w-3 sm:w-4 h-3 sm:h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <motion.p
                    key={currentStats.netEarnings}
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="dash-kpi-value"
                  >
                    {showEarnings ? formatMoney(currentStats.netEarnings) : "₹•••••"}
                  </motion.p>
                  <div className="flex items-center gap-1 text-xs text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>Today</span>
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-emerald-400/90">
                  {showEarnings ? (
                    <>
                      Gross: {formatMoney(currentStats.todayEarnings)} · App Fee: {formatMoney(currentStats.todayAppFees)}
                    </>
                  ) : (
                    "Gross: ₹••••• · App Fee: ₹•••••"
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            animate={{ scale: realTimeStats.lastUpdate ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 0.5 }}
            className="flex-1 min-w-0 max-md:min-w-[82%] max-md:snap-start"
          >
            <Card className="gaming-kpi-card h-full rounded-xl transition-all duration-200">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="p-1 sm:p-1.5 rounded-full bg-blue-500/20">
                      <CalendarCheck className="w-3 sm:w-4 h-3 sm:h-4 text-blue-400" />
                    </div>
                    <span className="dash-kpi-label">Bookings</span>
                  </div>
                  <span className="text-xs font-bold text-green-400">
                    +{currentStats.todayBookingsChange}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <motion.p
                    key={currentStats.todayBookings}
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="dash-kpi-value"
                  >
                    {currentStats.todayBookings}
                  </motion.p>
                  <div className="flex items-center gap-1 text-xs text-blue-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>Today</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            animate={{ scale: realTimeStats.lastUpdate ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 0.5 }}
            className="flex-1 min-w-0 max-md:min-w-[82%] max-md:snap-start"
          >
            <Card className="gaming-kpi-card h-full rounded-xl transition-all duration-200">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="p-1 sm:p-1.5 rounded-full bg-yellow-500/20">
                      <WalletCards className="w-3 sm:w-4 h-3 sm:h-4 text-yellow-400" />
                    </div>
                    <span className="dash-kpi-label">Pending (Net)</span>
                  </div>
                  <button onClick={() => setShowPending(!showPending)} className="text-yellow-400 hover:text-yellow-300 transition-colors">
                    {showPending ? <EyeOff className="w-3 sm:w-4 h-3 sm:h-4" /> : <Eye className="w-3 sm:w-4 h-3 sm:h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <motion.p
                    key={currentStats.netPendingAmount}
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="dash-kpi-value"
                  >
                    {showPending ? formatMoney(currentStats.netPendingAmount) : "₹•••••"}
                  </motion.p>
                  <div className="flex items-center gap-1 text-xs text-yellow-400">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    <span>Today</span>
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-yellow-400/90">
                  {showPending ? (
                    <>
                      Gross: {formatMoney(currentStats.pendingAmount)} · App Fee: {formatMoney(currentStats.pendingAppFees)}
                    </>
                  ) : (
                    "Gross: ₹••••• · App Fee: ₹•••••"
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {activeTopTab === 'devices' && (
        <motion.div
          key="devices"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 max-md:flex max-md:snap-x max-md:gap-2 max-md:overflow-x-auto max-md:pb-1 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden"
        >
          {platforms.map((platform) => {
            const available = platform.total - platform.booked
            const bookedPercentage = platform.total
              ? Math.round((platform.booked / platform.total) * 100)
              : 0
            const Icon = platform.icon
            return (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="gaming-kpi-card rounded-xl p-2 shadow-sm backdrop-blur-sm sm:p-3 max-md:min-w-[70%] max-md:snap-start"
              >
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="dash-icon-chip" style={{ backgroundColor: platform.bgColor }}>
                      <Icon className="w-3 sm:w-4 h-3 sm:h-4" style={{ color: platform.color }} />
                    </div>
                    <span className="dash-kpi-label">
                      {platform.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: platform.color }}>
                    {bookedPercentage}%
                  </span>
                </div>
                <div className="w-full h-1 rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${bookedPercentage}%`, backgroundColor: platform.color }}
                  />
                </div>
                <div className="mt-1 sm:mt-2 text-xs flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Booked: {platform.booked}</span>
                  <span>Free: {available}</span>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (!dashboardData) {
    return <HashLoader className="py-[42vh]" />
  }

  return (
    <>
      {dashboardData?.available ? (
        <HashLoader className="py-[50vh]" />
      ) : (
        <div className="relative flex h-full min-h-0 flex-col gap-2 overflow-hidden text-foreground sm:gap-3">
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

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="gaming-panel shrink-0 rounded-xl p-2.5 md:p-3"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div className="flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2 sm:mb-2 sm:gap-3">
                  <h1 className="premium-heading dashboard-hero-title leading-tight max-md:text-[1.35rem] max-md:tracking-[0.02em]">Gaming Cafe Command</h1>
                  <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <NotificationButton
                    vendorId={vendorId}
                    onBookingAccepted={handleBookingAccepted}
                    latestBookingEvent={latestBookingEvent}
                  />
                  {isConnected && realTimeStats.lastUpdate && (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-xs text-green-600 font-medium"
                      title={`Last updated: ${realTimeStats.lastUpdate}`}
                    />
                  )}
                </div>
                <div className="mb-1.5 flex flex-wrap items-center gap-2 sm:mb-2">
                  <div className="flex max-w-full items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200 sm:px-3">
                    <span className="font-semibold">{nowISTTimeText} IST</span>
                    <span className="hidden sm:inline text-emerald-300/80">• {nowISTDateText}</span>
                  </div>
                </div>
                <p className="premium-subtle text-[11px] leading-relaxed sm:text-sm max-md:line-clamp-1">
                  Monitor live slots, revenue, and upcoming sessions in real time.
                </p>
              </div>
              <div className="flex items-start justify-end">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="dashboard-module-tab-group flex items-center gap-1 rounded-lg p-1"
              >
                <button
                  onClick={() => setActiveTopTab('analytics')}
                  className={`flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    activeTopTab === 'analytics'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTopTab('devices')}
                  className={`flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    activeTopTab === 'devices'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Monitor className="h-3 w-3 sm:h-4 sm:w-4" />
                  Devices
                </button>
              </motion.div>
            </div>
            </div>
          </motion.div>

          <div className="shrink-0">
            {topMetricsStrip}
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 gap-2 sm:gap-3 xl:grid-cols-12 flex-1 min-h-0 max-md:h-[68svh] max-md:grid-rows-[1fr_1fr]">

            {/* Left Column */}
            <div className="space-y-2 sm:space-y-4 flex flex-col min-h-0 xl:col-span-8 2xl:col-span-9 max-md:h-full max-md:min-h-0">

              {/* ✅ Current Slots - locked when subscription expired */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex-1 min-h-0 lg:h-full"
              >
                <div className="h-full overflow-hidden relative">
                  <CurrentSlots
                    currentSlots={dashboardData.currentSlots}
                    historyBookings={dashboardData.historyBookings || []}
                    refreshSlots={refreshSlots}
                    setRefreshSlots={setRefreshSlots}
                  />
                </div>
              </motion.div>
            </div>

            {/* ✅ Right Column - Upcoming Bookings - locked when subscription expired */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col min-h-0 xl:col-span-4 2xl:col-span-3 xl:h-full max-md:h-full max-md:min-h-0"
            >
              <div className="relative flex-1 min-h-[320px] xl:min-h-0 rounded-xl xl:h-full overflow-hidden max-md:min-h-0 max-md:h-full">
                <UpcomingBookings
                  upcomingBookings={dashboardData.upcomingBookings || []}
                  vendorId={vendorId?.toString()}
                  setRefreshSlots={setRefreshSlots}
                />
              </div>
            </motion.div>
          </div>
          </div>
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <div className="h-full min-h-0 bg-background">
      <DashboardContent />
    </div>
  )
}

export default App
