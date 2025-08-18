"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookingStats } from "./book-stats"
import { UpcomingBookings } from "./upcoming-booking"
import RapidBookings from "../components/rapid-bookings"
import { CurrentSlots } from "./current-slot"
import { motion, AnimatePresence } from "framer-motion"
import { TabletSmartphone, ChevronRight, IndianRupee, CalendarCheck, WalletCards, Eye, EyeOff, TrendingUp, TrendingDown, CheckCircle2, TrendingUpIcon, Plus, RefreshCw, Zap } from 'lucide-react'
import { jwtDecode } from "jwt-decode"
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env"
import HashLoader from "./ui/HashLoader"
import clsx from "clsx"
import { Button } from "@/components/ui/button"

interface DashboardContentProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function DashboardContent({ activeTab, setActiveTab }: DashboardContentProps) {
  const [showBookingStats, setShowBookingStats] = useState(true)
  const [showEarnings, setShowEarnings] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const [refreshSlots, setRefreshSlots] = useState(false)
  const [vendorId, setVendorId] = useState<number | null>(null)

  const DASHBOARD_CACHE_KEY = "dashboardData"
  const DASHBOARD_CACHE_TIME = 1 * 60 * 1000
  const DASHBOARD_POLL_INTERVAL = 5 * 1000
  const [refreshSignal, setRefreshSignal] = useState(false)

  function useDashboardData(vendorId: number | null, refreshSignal: boolean) {
    const [dashboardData, setDashboardData] = useState(null)

    useEffect(() => {
      if (!vendorId) return

      const loadDashboardData = async (isInitial = false) => {
        try {
          const cache = localStorage.getItem(DASHBOARD_CACHE_KEY)
          const parsed = cache ? JSON.parse(cache) : null
          const now = Date.now()

          if (isInitial && parsed && now - parsed.timestamp < DASHBOARD_CACHE_TIME) {
            setDashboardData(parsed.data)
            console.log("Loaded dashboard from cache")
          } else {
            const response = await fetch(`${DASHBOARD_URL}/api/getLandingPage/vendor/${vendorId}`)
            const data = await response.json()
            setDashboardData(data)
            localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({ data, timestamp: now }))
            console.log("Fetched and cached dashboard data")
          }
        } catch (error) {
          console.error("Error fetching dashboard data:", error)
        }
      }

      loadDashboardData(true)
      const interval = setInterval(() => loadDashboardData(), DASHBOARD_POLL_INTERVAL)
      return () => clearInterval(interval)
    }, [vendorId, refreshSignal])

    return dashboardData
  }

  useEffect(() => {
    const token = localStorage.getItem("jwtToken")
    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token)
      setVendorId(decoded_token.sub.id)
    }
  }, []);

  useEffect(() => {
    const handleRefresh = () => setRefreshSignal((prev) => !prev)
    window.addEventListener("refresh-dashboard", handleRefresh)
    return () => window.removeEventListener("refresh-dashboard", handleRefresh)
  }, []);

  const dashboardData = useDashboardData(vendorId, refreshSignal)

  if (!dashboardData) {
    return <HashLoader className="py-[42vh]" />
  }

  return (
    <>
      {dashboardData?.available ? (
        <HashLoader className="py-[50vh]"/>
      ) : (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between mb-8"
          >
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Rapid Booking Button - switches to rapid booking tab */}
              <Button 
                onClick={() => setActiveTab("product")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                <Zap className="w-4 h-4 mr-2" />
                Rapid Booking
              </Button>
              <button className="p-2 bg-card hover:bg-muted rounded-lg transition-colors duration-200">
                <RefreshCw className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </motion.div>

          {/* Top Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8"
          >
            {/* Earnings Card */}
            <Card className="bg-card border-border backdrop-blur-sm">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <IndianRupee className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Earnings</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl md:text-2xl font-bold text-foreground">
                          {showEarnings ? `₹${dashboardData?.stats?.todayEarnings ?? 0}` : "₹•••••"}
                        </p>
                        <button
                          onClick={() => setShowEarnings(!showEarnings)}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          {showEarnings ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <TrendingUp className="w-5 h-5 text-emerald-400 mb-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bookings Card */}
            <Card className="bg-card border-border backdrop-blur-sm">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <CalendarCheck className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Bookings</p>
                      <p className="text-xl md:text-2xl font-bold text-foreground">
                        {dashboardData?.stats?.todayBookings ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-400 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      {dashboardData?.stats?.todayBookingsChange ?? 0}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Card */}
            <Card className="bg-card border-border backdrop-blur-sm">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <WalletCards className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Pending</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl md:text-2xl font-bold text-foreground">
                          {showPending ? `₹${dashboardData?.stats?.pendingAmount ?? 0}` : "₹•••••"}
                        </p>
                        <button
                          onClick={() => setShowPending(!showPending)}
                          className="text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                          {showPending ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Left Column - Available Devices & Current Slots */}
            <div className="xl:col-span-3 space-y-6">
              {/* Available Devices */}
              <AnimatePresence>
                {showBookingStats && (
                  <motion.div
                    key="booking-stats"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Card className="bg-card border-border backdrop-blur-sm">
                      <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="text-lg font-semibold text-foreground">Available Devices</CardTitle>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setRefreshSlots(!refreshSlots)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => setShowBookingStats(false)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                          >
                            <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <BookingStats
                          stats={dashboardData.bookingStats}
                          refreshSlots={refreshSlots}
                          setRefreshSlots={setRefreshSlots}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Current Slots */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-card border-border backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground"></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CurrentSlots
                      currentSlots={dashboardData.currentSlots}
                      refreshSlots={refreshSlots}
                      setRefreshSlots={setRefreshSlots}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Column - Upcoming Bookings */}
         {/* Right Column - Upcoming Bookings */}
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: 0.4 }}
  className="xl:col-span-1"
>
  <Card className="bg-card border-border backdrop-blur-sm sticky top-6">
    <CardHeader className="flex flex-row items-center justify-between pb-4">
      <CardTitle className="text-lg font-semibold text-foreground">
        
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      {/* Fixed height container with scroll */}
      <div className="h-[500px] overflow-y-auto px-6 pb-6">
        <UpcomingBookings
          upcomingBookings={dashboardData.upcomingBookings}
          vendorId={dashboardData.vendorId}
          setRefreshSlots={setRefreshSlots}
        />
      </div>
    </CardContent>
  </Card>
</motion.div>

          </div>

          {/* Floating Action Button */}
          {!showBookingStats && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => setShowBookingStats(true)}
              className="fixed bottom-6 right-6 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50"
            >
              <TrendingUpIcon className="w-6 h-6" />
            </motion.button>
          )}
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
