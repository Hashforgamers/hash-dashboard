"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { UpcomingBookings } from "./upcoming-booking"
import { CurrentSlots } from "./current-slot"
import { motion } from "framer-motion"
import {
  AnalyticsUpIcon,
  Calendar02Icon,
  DollarCircleIcon,
  LockIcon,
  ViewIcon,
  ViewOffIcon,
  WalletCardsIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useDashboardData } from "@/app/context/DashboardDataContext"
import HashLoader from "./ui/HashLoader"
import { useSocket } from "../context/SocketContext"
import { useSubscription } from "@/hooks/useSubscription"
import { useRouter } from "next/navigation"

const TERMINAL_BOOKING_STATUSES = ["cancelled", "canceled", "rejected", "completed", "discarded", "no_show"];

// ✅ Locked overlay component
function LockedOverlay() {
  const router = useRouter()
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 rounded-lg bg-background/75 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="p-4 bg-destructive/10 rounded-full">
          <HugeiconsIcon icon={LockIcon} size={32} strokeWidth={1.8} className="text-destructive" />
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
  const [showEarnings, setShowEarnings] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const [refreshSlots, setRefreshSlots] = useState(false)
  const { vendorId, landingData, consoles, refreshLanding, refreshConsoles } = useDashboardData()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [bookingInfo, setBookingInfo] = useState<any[]>([])
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
      if (vendorId != null) {
        joinVendor(vendorId)
      }
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
  const totalConsoles = Array.isArray(bookingInfo) ? bookingInfo.length : 0
  const occupiedConsoles = Array.isArray(bookingInfo)
    ? bookingInfo.filter((item: any) => item?.status === false || item?.is_available === false).length
    : 0
  const availableConsoles = Math.max(totalConsoles - occupiedConsoles, 0)
  const occupancyRate = totalConsoles > 0 ? Math.round((occupiedConsoles / totalConsoles) * 100) : 0
  const nextQueueCount = Array.isArray(dashboardData?.upcomingBookings) ? dashboardData.upcomingBookings.length : 0
  const liveSessionsCount = Array.isArray(dashboardData?.currentSlots) ? dashboardData.currentSlots.length : 0
  const trendPrefix = currentStats.todayBookingsChange >= 0 ? "+" : ""

  const metricCards = [
    {
      key: "earnings",
      label: "Net Earnings",
      accentClass: "text-[#16FF00]",
      icon: DollarCircleIcon,
      value: showEarnings ? formatMoney(currentStats.netEarnings) : "₹•••••",
      meta: "Today",
      action: (
        <button
          onClick={() => setShowEarnings(!showEarnings)}
          className="dashboard-metric-action"
          aria-label={showEarnings ? "Hide earnings" : "Show earnings"}
        >
          <HugeiconsIcon icon={showEarnings ? ViewOffIcon : ViewIcon} size={14} strokeWidth={1.8} />
        </button>
      ),
    },
    {
      key: "bookings",
      label: "Live Bookings",
      accentClass: "text-[#38BDF8]",
      icon: Calendar02Icon,
      value: String(currentStats.todayBookings),
      meta: `${trendPrefix}${currentStats.todayBookingsChange}%`,
      action: <span className="dashboard-metric-badge is-cyan">Trend</span>,
    },
    {
      key: "pending",
      label: "Pending Net",
      accentClass: "text-[#F97316]",
      icon: WalletCardsIcon,
      value: showPending ? formatMoney(currentStats.netPendingAmount) : "₹•••••",
      meta: nextQueueCount > 0 ? `${nextQueueCount} queued` : "Clear",
      action: (
        <button
          onClick={() => setShowPending(!showPending)}
          className="dashboard-metric-action"
          aria-label={showPending ? "Hide pending amount" : "Show pending amount"}
        >
          <HugeiconsIcon icon={showPending ? ViewOffIcon : ViewIcon} size={14} strokeWidth={1.8} />
        </button>
      ),
    },
    {
      key: "occupancy",
      label: "Floor Usage",
      accentClass: "text-[#F7FAFC]",
      icon: AnalyticsUpIcon,
      value: `${occupancyRate}%`,
      meta: `${occupiedConsoles}/${totalConsoles || 0}`,
      action: <span className="dashboard-metric-badge">Live</span>,
    },
  ]

  const insightCards = [
    {
      label: "Console Availability",
      value: `${availableConsoles}`,
      meta: "ready",
      accent: "cyan",
    },
    {
      label: "Active Sessions",
      value: `${liveSessionsCount}`,
      meta: "live",
      accent: "accent",
    },
    {
      label: "Upcoming Queue",
      value: `${nextQueueCount}`,
      meta: "queued",
      accent: "warm",
    },
  ]

  const mobileMetricsStrip = (
    <div className="dashboard-module-card flex w-full items-center justify-between gap-1 rounded-xl border border-border/60 bg-background/45 px-1.5 py-1 md:hidden">
      <div className="min-w-0 rounded-lg border border-blue-400/25 bg-blue-500/10 px-1.5 py-1 text-[10px] font-semibold text-blue-200">
        Bk {currentStats.todayBookings}
      </div>
      <div className="min-w-0 rounded-lg border border-yellow-400/25 bg-yellow-500/10 px-1.5 py-1 text-[10px] font-semibold text-yellow-200">
        Pd {formatMoney(currentStats.netPendingAmount)}
      </div>
      <div className="min-w-0 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-1 text-[10px] font-semibold text-emerald-200">
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
        <div className="dashboard-redesign relative flex h-full min-h-0 flex-col gap-4 overflow-hidden rounded-[30px] text-foreground sm:gap-5">
          {isLocked && <LockedOverlay />}
          <div
            className={`dashboard-redesign__inner flex min-h-0 flex-1 flex-col overflow-hidden ${
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

          <motion.section
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            className="dashboard-command-stage gaming-panel dashboard-module-panel dashboard-stage-card shrink-0 rounded-[32px]"
          >
            <div className="dashboard-command-stage__header">
              <div className="min-w-0">
                <div className="dashboard-command-stage__eyebrow">
                  <span className={`dashboard-status-dot ${isConnected ? "is-live" : ""}`} />
                  {isConnected ? "Live" : "Offline"}
                </div>
                <h1 className="dashboard-command-stage__title">Cafe Command</h1>
              </div>

              <div className="dashboard-command-stage__chips">
                <span className="cafe-pill">{availableConsoles} ready</span>
                <span className="cafe-pill">{liveSessionsCount} live</span>
                <span className="cafe-pill">{nextQueueCount} queued</span>
              </div>
            </div>

            <div className="dashboard-metric-grid">
              {metricCards.map((card) => (
                <Card key={card.key} className="gaming-kpi-card dashboard-kpi-card dashboard-metric-card border rounded-[24px] transition-all duration-200">
                  <CardContent className="p-0">
                    <div className="dashboard-metric-card__top">
                      <div className="flex items-center gap-2">
                        <span className={`dashboard-metric-card__icon ${card.accentClass}`}>
                          <HugeiconsIcon icon={card.icon} size={15} strokeWidth={1.8} />
                        </span>
                        <span className="dash-kpi-label">{card.label}</span>
                      </div>
                      {card.action}
                    </div>
                    <div className="dashboard-metric-card__value">{card.value}</div>
                    <div className="dashboard-metric-card__meta">{card.meta}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="dashboard-insight-grid shrink-0"
          >
            <div className="dashboard-insight-banner gaming-panel dashboard-module-panel dashboard-panel-card rounded-[28px]">
              <div>
                <div className="dashboard-block-eyebrow">Snapshot</div>
                <h2 className="dashboard-block-title">Operations</h2>
              </div>
            </div>

              {/* ✅ Current Slots - locked when subscription expired */}
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
                <div className="dashboard-module-head__meta">
                  <span>{occupiedConsoles} occupied</span>
                  <span>{availableConsoles} ready</span>
                </div>
              </div>

              <div className="gaming-panel dashboard-module-panel dashboard-panel-card dashboard-live-shell dashboard-orbit-surface relative flex-1 overflow-hidden rounded-[32px]">
                <CurrentSlots
                  currentSlots={dashboardData.currentSlots}
                  historyBookings={dashboardData.historyBookings || []}
                  refreshSlots={refreshSlots}
                  setRefreshSlots={setRefreshSlots}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 }}
              className="flex min-h-0 flex-col xl:col-span-4 2xl:col-span-3"
            >
              <div className="dashboard-module-head">
                <div>
                  <div className="dashboard-block-eyebrow">Queue</div>
                  <h2 className="dashboard-block-title">Upcoming Queue</h2>
                </div>
                <div className="dashboard-module-head__meta">
                  <span>{nextQueueCount} bookings</span>
                </div>
              </div>

              <div className="gaming-panel dashboard-module-panel dashboard-panel-card dashboard-upcoming-shell dashboard-orbit-surface relative flex-1 min-h-[360px] overflow-hidden rounded-[32px] xl:min-h-0">
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
