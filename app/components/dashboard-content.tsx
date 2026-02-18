"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookingStats } from "./book-stats"
import { UpcomingBookings } from "./upcoming-booking"
import { CurrentSlots } from "./current-slot"
import { motion, AnimatePresence } from "framer-motion"
import {
  IndianRupee, CalendarCheck, WalletCards, Eye, EyeOff,
  TrendingUp, RefreshCw, Zap, BarChart3, Monitor, Gamepad2,
  Gamepad, Headphones, Lock
} from 'lucide-react'
import { jwtDecode } from "jwt-decode"
import { DASHBOARD_URL } from "@/src/config/env"
import HashLoader from "./ui/HashLoader"
import { Button } from "@/components/ui/button"
import { NotificationButton } from "../components/NotificationButton"
import { useSocket } from "../context/SocketContext"
import { useSubscription } from "@/hooks/useSubscription"
import { useRouter } from "next/navigation"

interface DashboardContentProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

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
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-lg bg-background/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="p-4 bg-destructive/10 rounded-full">
          <Lock className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h3 className="font-bold text-base text-foreground">Subscription Required</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Subscribe to view and manage live sessions
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

export function DashboardContent({ activeTab, setActiveTab }: DashboardContentProps) {
  const [showBookingStats, setShowBookingStats] = useState(true)
  const [showEarnings, setShowEarnings] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const [refreshSlots, setRefreshSlots] = useState(false)
  const [vendorId, setVendorId] = useState<number | null>(null)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [upcomingBookingsRefresh, setUpcomingBookingsRefresh] = useState(false)
  const [latestBookingEvent, setLatestBookingEvent] = useState<any>(null)
  const [activeTopTab, setActiveTopTab] = useState<'analytics' | 'devices'>('analytics')
  const [bookingInfo, setBookingInfo] = useState([])
  const [realTimeStats, setRealTimeStats] = useState<{
    todayEarnings?: number
    todayBookings?: number
    pendingAmount?: number
    todayBookingsChange?: number
    lastUpdate?: string
  }>({})

  const { socket, isConnected, joinVendor } = useSocket()
  const { isLocked } = useSubscription()
  const router = useRouter()

  const handleBookingAccepted = (bookingData: any) => {
    console.log('🎯 Booking accepted - updating upcoming bookings:', bookingData)
    setUpcomingBookingsRefresh(prev => !prev)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('booking-accepted', { detail: bookingData }))
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("jwtToken")
    if (token) {
      try {
        const decoded_token = jwtDecode<{ sub: { id: number } }>(token)
        console.log('🔑 Decoded vendor ID:', decoded_token.sub.id)
        setVendorId(decoded_token.sub.id)
      } catch (error) {
        console.error('❌ Error decoding JWT token:', error)
      }
    }
  }, [])

  useEffect(() => {
    const loadInitialData = async () => {
      if (!vendorId) return
      try {
        console.log('📊 Loading initial dashboard data...')
        const response = await fetch(`${DASHBOARD_URL}/api/getLandingPage/vendor/${vendorId}`)
        const data = await response.json()
        setDashboardData(data)
        console.log('✅ Initial dashboard data loaded')
      } catch (error) {
        console.error('❌ Error loading initial dashboard data:', error)
      }
    }
    loadInitialData()
  }, [vendorId])

  useEffect(() => {
    const fetchBookingData = async () => {
      if (!vendorId) return
      try {
        const response = await fetch(`${DASHBOARD_URL}/api/getConsoles/vendor/${vendorId}`)
        const data = await response.json()
        setBookingInfo(data)
      } catch (error) {
        console.error('Error fetching booking data:', error)
      }
    }
    fetchBookingData()
  }, [vendorId, refreshSlots])

  useEffect(() => {
    if (!socket || !vendorId || !isConnected) return

    console.log('📊 Dashboard: Setting up booking event listener for real-time stats updates')
    joinVendor(vendorId)

    const fetchFreshStats = async () => {
      try {
        console.log('🔄 Fetching fresh dashboard stats...')
        const response = await fetch(`${DASHBOARD_URL}/api/getLandingPage/vendor/${vendorId}`)
        const data = await response.json()
        if (data.stats) {
          console.log('💰 Updated stats received:', data.stats)
          setRealTimeStats({
            todayEarnings: data.stats.todayEarnings,
            todayBookings: data.stats.todayBookings,
            pendingAmount: data.stats.pendingAmount,
            todayBookingsChange: data.stats.todayBookingsChange || 0,
            lastUpdate: new Date().toLocaleTimeString()
          })
          setDashboardData((prev: any) => ({ ...prev, stats: data.stats }))
        }
      } catch (error) {
        console.error('❌ Error fetching fresh stats:', error)
      }
    }

    function handleBookingEvent(data: any) {
      console.log('📅 Booking event received:', data)
      if (data.vendorId === vendorId) {
        const status = (data.status || '').toLowerCase()
        if (data.status === 'pending_acceptance') {
          console.log('🔔 Dashboard: Passing pay-at-cafe event to NotificationButton')
          setLatestBookingEvent(data)
        }
        if (status === 'confirmed' || status === 'paid' || status === 'completed') {
          console.log('✅ Booking confirmed/paid/completed - updating dashboard stats')
          setRealTimeStats(prev => ({
            ...prev,
            todayBookings: (prev.todayBookings || dashboardData?.stats?.todayBookings || 0) + 1,
            todayEarnings: (prev.todayEarnings || dashboardData?.stats?.todayEarnings || 0) + (data.amount || data.slot_price || 0),
            lastUpdate: new Date().toLocaleTimeString()
          }))
          setTimeout(() => { fetchFreshStats() }, 1000)
        }
        if (status === 'cancelled' || status === 'rejected') {
          console.log('❌ Booking cancelled/rejected - updating dashboard stats')
          setTimeout(() => { fetchFreshStats() }, 500)
        }
      }
    }

    function handleUpcomingBookingEvent(data: any) {
      console.log('📅 Upcoming booking event received:', data)
      if (data.vendorId === vendorId && data.status === 'Confirmed') {
        console.log('✅ New confirmed booking - updating stats')
        fetchFreshStats()
      }
    }

    function handleConsoleAvailabilityEvent(data: any) {
      console.log('🎮 Console availability event received:', data)
      if (data.vendorId === vendorId && data.is_available === true) {
        console.log('🎮 Session ended - refreshing stats for potential earnings update')
        setTimeout(() => { fetchFreshStats() }, 1000)
      }
    }

    socket.on('booking', handleBookingEvent)
    socket.on('upcoming_booking', handleUpcomingBookingEvent)
    socket.on('console_availability', handleConsoleAvailabilityEvent)

    return () => {
      console.log('🧹 Cleaning up dashboard booking listeners')
      socket.off('booking', handleBookingEvent)
      socket.off('upcoming_booking', handleUpcomingBookingEvent)
      socket.off('console_availability', handleConsoleAvailabilityEvent)
    }
  }, [socket, vendorId, isConnected, joinVendor, dashboardData?.stats])

  useEffect(() => {
    const handleRefresh = () => setRefreshSlots(prev => !prev)
    window.addEventListener("refresh-dashboard", handleRefresh)
    return () => window.removeEventListener("refresh-dashboard", handleRefresh)
  }, [])

  const currentStats = {
    todayEarnings: realTimeStats.todayEarnings ?? dashboardData?.stats?.todayEarnings ?? 0,
    todayBookings: realTimeStats.todayBookings ?? dashboardData?.stats?.todayBookings ?? 0,
    pendingAmount: realTimeStats.pendingAmount ?? dashboardData?.stats?.pendingAmount ?? 0,
    todayBookingsChange: realTimeStats.todayBookingsChange ?? dashboardData?.stats?.todayBookingsChange ?? 0
  }

  const platforms = platformMetadata.platforms.map(metadata => {
    const platformBooking = bookingInfo.filter((b: any) => b.type === metadata.type)
    const total = platformBooking.length
    const booked = platformBooking.filter((b: any) => b.status === false).length
    return { ...metadata, total, booked }
  })

  if (!dashboardData) {
    return <HashLoader className="py-[42vh]" />
  }

  return (
    <>
      {dashboardData?.available ? (
        <HashLoader className="py-[50vh]" />
      ) : (
        <div className="h-screen bg-background text-foreground p-2 sm:p-4 md:p-6 flex flex-col">

          {/* ✅ Subscription expired banner */}
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
          )}

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between mb-4 sm:mb-6 flex-shrink-0"
          >
            <div className="mb-4 md:mb-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">Dashboard</h1>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                {isConnected && realTimeStats.lastUpdate && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-xs text-green-600 font-medium"
                    title={`Last updated: ${realTimeStats.lastUpdate}`}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationButton
                vendorId={vendorId}
                onBookingAccepted={handleBookingAccepted}
                latestBookingEvent={latestBookingEvent}
              />
            </div>
          </motion.div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 sm:gap-4 flex-1 min-h-0">

            {/* Left Column */}
            <div className="xl:col-span-3 space-y-3 sm:space-y-4 flex flex-col min-h-0">

              {/* Tab Navigation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit flex-shrink-0"
              >
                <button
                  onClick={() => setActiveTopTab('analytics')}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                    activeTopTab === 'analytics'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BarChart3 className="w-3 sm:w-4 h-3 sm:h-4" />
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTopTab('devices')}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                    activeTopTab === 'devices'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Monitor className="w-3 sm:w-4 h-3 sm:h-4" />
                  Devices
                </button>
              </motion.div>

              {/* Analytics / Devices Cards */}
              <AnimatePresence mode="wait">
                {activeTopTab === 'analytics' && (
                  <motion.div
                    key="analytics"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-2 sm:gap-3 flex-shrink-0"
                  >
                    {/* Earnings Card */}
                    <motion.div
                      animate={{ scale: realTimeStats.lastUpdate ? [1, 1.05, 1] : 1 }}
                      transition={{ duration: 0.5 }}
                      className="flex-1"
                    >
                      <Card className="bg-card border-border backdrop-blur-sm rounded-lg shadow-sm h-full">
                        <CardContent className="p-2 sm:p-3">
                          <div className="flex items-center justify-between mb-1 sm:mb-2">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className="p-1 sm:p-1.5 rounded-full bg-emerald-500/20">
                                <IndianRupee className="w-3 sm:w-4 h-3 sm:h-4 text-emerald-400" />
                              </div>
                              <span className="text-xs sm:text-sm font-medium text-foreground">Earnings</span>
                            </div>
                            <button onClick={() => setShowEarnings(!showEarnings)} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                              {showEarnings ? <EyeOff className="w-3 sm:w-4 h-3 sm:h-4" /> : <Eye className="w-3 sm:w-4 h-3 sm:h-4" />}
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <motion.p
                              key={currentStats.todayEarnings}
                              initial={{ scale: 0.8, opacity: 0.5 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.3 }}
                              className="text-lg sm:text-xl font-bold text-foreground"
                            >
                              {showEarnings ? `₹${currentStats.todayEarnings}` : "₹•••••"}
                            </motion.p>
                            <div className="flex items-center gap-1 text-xs text-emerald-400">
                              <TrendingUp className="w-3 h-3" />
                              <span>Today</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Bookings Card */}
                    <motion.div
                      animate={{ scale: realTimeStats.lastUpdate ? [1, 1.05, 1] : 1 }}
                      transition={{ duration: 0.5 }}
                      className="flex-1"
                    >
                      <Card className="bg-card border-border backdrop-blur-sm rounded-lg shadow-sm h-full">
                        <CardContent className="p-2 sm:p-3">
                          <div className="flex items-center justify-between mb-1 sm:mb-2">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className="p-1 sm:p-1.5 rounded-full bg-blue-500/20">
                                <CalendarCheck className="w-3 sm:w-4 h-3 sm:h-4 text-blue-400" />
                              </div>
                              <span className="text-xs sm:text-sm font-medium text-foreground">Bookings</span>
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
                              className="text-lg sm:text-xl font-bold text-foreground"
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

                    {/* Pending Card */}
                    <motion.div
                      animate={{ scale: realTimeStats.lastUpdate ? [1, 1.05, 1] : 1 }}
                      transition={{ duration: 0.5 }}
                      className="flex-1"
                    >
                      <Card className="bg-card border-border backdrop-blur-sm rounded-lg shadow-sm h-full">
                        <CardContent className="p-2 sm:p-3">
                          <div className="flex items-center justify-between mb-1 sm:mb-2">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className="p-1 sm:p-1.5 rounded-full bg-yellow-500/20">
                                <WalletCards className="w-3 sm:w-4 h-3 sm:h-4 text-yellow-400" />
                              </div>
                              <span className="text-xs sm:text-sm font-medium text-foreground">Pending</span>
                            </div>
                            <button onClick={() => setShowPending(!showPending)} className="text-yellow-400 hover:text-yellow-300 transition-colors">
                              {showPending ? <EyeOff className="w-3 sm:w-4 h-3 sm:h-4" /> : <Eye className="w-3 sm:w-4 h-3 sm:h-4" />}
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <motion.p
                              key={currentStats.pendingAmount}
                              initial={{ scale: 0.8, opacity: 0.5 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.3 }}
                              className="text-lg sm:text-xl font-bold text-foreground"
                            >
                              {showPending ? `₹${currentStats.pendingAmount}` : "₹•••••"}
                            </motion.p>
                            <div className="flex items-center gap-1 text-xs text-yellow-400">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                              <span>Today</span>
                            </div>
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
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 flex-shrink-0"
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
                          className="bg-white dark:bg-card rounded-lg p-2 sm:p-3 shadow-sm border"
                        >
                          <div className="flex items-center justify-between mb-1 sm:mb-2">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className="p-1 sm:p-1.5 rounded-full" style={{ backgroundColor: platform.bgColor }}>
                                <Icon className="w-3 sm:w-4 h-3 sm:h-4" style={{ color: platform.color }} />
                              </div>
                              <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-100">
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

              {/* ✅ Current Slots - locked when subscription expired */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex-1 min-h-0"
              >
                <Card className="bg-card border-border backdrop-blur-sm h-full">
                  <CardContent className="p-2 sm:p-4 h-full overflow-hidden relative">
                    <CurrentSlots
                      currentSlots={dashboardData.currentSlots}
                      refreshSlots={refreshSlots}
                      setRefreshSlots={setRefreshSlots}
                    />
                    {isLocked && <LockedOverlay />}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* ✅ Right Column - Upcoming Bookings - locked when subscription expired */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="xl:col-span-1 flex flex-col min-h-0 mt-14"
            >
              <Card className="bg-card border-border backdrop-blur-sm flex-1 min-h-0 relative">
                <CardContent className="p-0 h-full overflow-hidden">
                  <UpcomingBookings
                    upcomingBookings={dashboardData.upcomingBookings || []}
                    vendorId={vendorId?.toString()}
                    setRefreshSlots={setRefreshSlots}
                    refreshTrigger={upcomingBookingsRefresh}
                  />
                </CardContent>
                {isLocked && <LockedOverlay />}
              </Card>
            </motion.div>
          </div>
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardContent activeTab="gaming-cafe" setActiveTab={() => {}} />
    </div>
  )
}

export default App
