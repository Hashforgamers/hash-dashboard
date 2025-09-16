"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookingStats } from "./book-stats"
import { UpcomingBookings } from "./upcoming-booking"
import { CurrentSlots } from "./current-slot"
import { motion, AnimatePresence } from "framer-motion"
import { IndianRupee, CalendarCheck, WalletCards, Eye, EyeOff, TrendingUp, ChevronRight, RefreshCw, Zap, TrendingUpIcon, BarChart3, Monitor, Gamepad2, Gamepad, Headphones } from 'lucide-react'
import { jwtDecode } from "jwt-decode"
import { DASHBOARD_URL } from "@/src/config/env"
import HashLoader from "./ui/HashLoader"
import { Button } from "@/components/ui/button"
import {NotificationButton} from "../components/NotificationButton"
import { useSocket } from "../context/SocketContext"

interface DashboardContentProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

// Platform metadata remains the same...
const platformMetadata = {
  platforms: [
    {
      name: "PC",
      icon: Monitor,
      color: "#3b82f6",
      bgColor: "#dbeafe",
      type: "pc"
    },
    {
      name: "PS5",
      icon: Gamepad2,
      color: "#a855f7",
      bgColor: "#f3e8ff",
      type: "ps5"
    },
    {
      name: "Xbox",
      icon: Gamepad,
      color: "#10b981",
      bgColor: "#d1fae5",
      type: "xbox"
    },
    {
      name: "VR",
      icon: Headphones,
      color: "#f59e0b",
      bgColor: "#fef3c7",
      type: "vr"
    }
  ]
};

export function DashboardContent({ activeTab, setActiveTab }: DashboardContentProps) {
  // All existing state remains the same...
  const [showBookingStats, setShowBookingStats] = useState(true)
  const [showEarnings, setShowEarnings] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const [refreshSlots, setRefreshSlots] = useState(false)
  const [vendorId, setVendorId] = useState<number | null>(null)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [upcomingBookingsRefresh, setUpcomingBookingsRefresh] = useState(false)
  const [latestBookingEvent, setLatestBookingEvent] = useState<any>(null)
  const [activeTopTab, setActiveTopTab] = useState<'analytics' | 'devices'>('analytics')
  const [bookingInfo, setBookingInfo] = useState([]);
  const [realTimeStats, setRealTimeStats] = useState<{
    todayEarnings?: number;
    todayBookings?: number;
    pendingAmount?: number;
    todayBookingsChange?: number;
    lastUpdate?: string;
  }>({})

  const { socket, isConnected, joinVendor } = useSocket()

  // All existing useEffect hooks remain the same...
  const handleBookingAccepted = (bookingData: any) => {
    console.log('🎯 Booking accepted - updating upcoming bookings:', bookingData)
    setUpcomingBookingsRefresh(prev => !prev)
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('booking-accepted', { 
        detail: bookingData 
      }))
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
      if (!vendorId) return;
      
      try {
        const response = await fetch(`${DASHBOARD_URL}/api/getConsoles/vendor/${vendorId}`);
        const data = await response.json();
        setBookingInfo(data);
      } catch (error) {
        console.error('Error fetching booking data:', error);
      }
    };

    fetchBookingData();
  }, [vendorId, refreshSlots]);

  // All socket listeners remain the same...
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
          
          setDashboardData(prev => ({
            ...prev,
            stats: data.stats
          }))
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
          
          setRealTimeStats(prev => {
            const newBookings = (prev.todayBookings || dashboardData?.stats?.todayBookings || 0) + 1
            const newEarnings = (prev.todayEarnings || dashboardData?.stats?.todayEarnings || 0) + (data.amount || data.slot_price || 0)
            
            return {
              ...prev,
              todayBookings: newBookings,
              todayEarnings: newEarnings,
              lastUpdate: new Date().toLocaleTimeString()
            }
          })
          
          setTimeout(() => {
            fetchFreshStats()
          }, 1000)
        }
        
        if (status === 'cancelled' || status === 'rejected') {
          console.log('❌ Booking cancelled/rejected - updating dashboard stats')
          
          setTimeout(() => {
            fetchFreshStats()
          }, 500)
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
        
        setTimeout(() => {
          fetchFreshStats()
        }, 1000)
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
    const platformBooking = bookingInfo.filter(b => b.type === metadata.type);
    const total = platformBooking.length;
    const booked = platformBooking.filter(b => b.status === false).length;
    return { ...metadata, total, booked };
  });

  if (!dashboardData) {
    return <HashLoader className="py-[42vh]" />
  }

  return (
    <>
      {dashboardData?.available ? (
        <HashLoader className="py-[50vh]"/>
      ) : (
        // 🚀 FIXED: Root container with proper viewport height
        <div className="h-screen bg-background text-foreground p-2 sm:p-4 md:p-6 flex flex-col">
          {/* Header - Fixed height */}
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
                  >
                  
                  </motion.div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationButton vendorId={vendorId} onBookingAccepted={handleBookingAccepted} latestBookingEvent={latestBookingEvent}/>
              <Button 
                onClick={() => setActiveTab("product")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Rapid Booking
              </Button>
              <button className="p-2 bg-card hover:bg-muted rounded-lg transition-colors duration-200">
                <RefreshCw className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground" />
              </button>
            </div>
          </motion.div>

          {/* 🚀 FIXED: Main Layout Grid with flex-1 to take remaining height */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 sm:gap-4 flex-1 min-h-0">
            {/* Left Column */}
            <div className="xl:col-span-3 space-y-3 sm:space-y-4 flex flex-col min-h-0">
              {/* Tab Navigation - Fixed height */}
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

              {/* Analytics/Devices Cards - Fixed height */}
              <AnimatePresence mode="wait">
                {activeTopTab === 'analytics' && (
                  <motion.div
                    key="analytics"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 flex-shrink-0"
                  >
                    {/* Analytics Cards */}
                    <motion.div animate={{ scale: realTimeStats.lastUpdate ? [1, 1.05, 1] : 1 }} transition={{ duration: 0.5 }}>
                      <Card className="bg-card border-border h-[10vh] sm:h-[12vh] md:h-[13.8vh] backdrop-blur-sm">
                        <CardContent className="p-2 sm:p-3 flex flex-col justify-center">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className="p-1 sm:p-1.5 bg-emerald-500/20 mt-2 sm:mt-3 rounded-lg">
                                <IndianRupee className="w-2 sm:w-3 h-2 sm:h-3 text-emerald-400" />
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs sm:text-sm mt-2 sm:mt-3 font-medium">Earnings</p>
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <motion.p 
                                    key={currentStats.todayEarnings}
                                    initial={{ scale: 0.8, opacity: 0.5 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-xs sm:text-sm font-bold text-foreground"
                                  >
                                    {showEarnings ? `₹${currentStats.todayEarnings}` : "₹•••••"}
                                  </motion.p>
                                  <button onClick={() => setShowEarnings(!showEarnings)} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                                    {showEarnings ? <EyeOff className="w-2 sm:w-3 h-2 sm:h-3" /> : <Eye className="w-2 sm:w-3 h-2 sm:h-3" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <TrendingUp className="w-2 sm:w-3 h-2 sm:h-3 text-emerald-400" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div animate={{ scale: realTimeStats.lastUpdate ? [1, 1.05, 1] : 1 }} transition={{ duration: 0.5 }}>
                      <Card className="bg-card border-border h-[10vh] sm:h-[12vh] md:h-[13.8vh] backdrop-blur-sm">
                        <CardContent className="p-2 sm:p-3 flex flex-col justify-center">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className="p-1 sm:p-1.5 bg-blue-500/20 mt-2 sm:mt-3 rounded-lg">
                                <CalendarCheck className="w-2 sm:w-3 h-2 sm:h-3 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs sm:text-sm mt-2 sm:mt-3 font-medium">Bookings</p>
                                <motion.p 
                                  key={currentStats.todayBookings}
                                  initial={{ scale: 0.8, opacity: 0.5 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                  className="text-xs sm:text-sm font-bold text-foreground"
                                >
                                  {currentStats.todayBookings}
                                </motion.p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-green-400 text-xs sm:text-sm font-medium">
                              <TrendingUp className="w-1.5 sm:w-2 h-1.5 sm:h-2" />
                              {currentStats.todayBookingsChange}%
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div animate={{ scale: realTimeStats.lastUpdate ? [1, 1.05, 1] : 1 }} transition={{ duration: 0.5 }}>
                      <Card className="bg-card border-border h-[10vh] sm:h-[12vh] md:h-[13.8vh] backdrop-blur-sm">
                        <CardContent className="p-2 sm:p-3 flex flex-col justify-center">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className="p-1 sm:p-1.5 mt-2 sm:mt-3 bg-yellow-500/20 rounded-lg">
                                <WalletCards className="w-2 sm:w-3 h-2 sm:h-3 text-yellow-400" />
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs sm:text-sm mt-2 sm:mt-3 font-medium">Pending</p>
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <motion.p 
                                    key={currentStats.pendingAmount}
                                    initial={{ scale: 0.8, opacity: 0.5 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-xs sm:text-sm font-bold text-foreground"
                                  >
                                    {showPending ? `₹${currentStats.pendingAmount}` : "₹•••••"}
                                  </motion.p>
                                  <button onClick={() => setShowPending(!showPending)} className="text-yellow-400 hover:text-yellow-300 transition-colors">
                                    {showPending ? <EyeOff className="w-2 sm:w-3 h-2 sm:h-3" /> : <Eye className="w-2 sm:w-3 h-2 sm:h-3" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-yellow-400 rounded-full animate-pulse"></div>
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
                      const available = platform.total - platform.booked;
                      const bookedPercentage = platform.total
                        ? Math.round((platform.booked / platform.total) * 100)
                        : 0;
                      const Icon = platform.icon;

                      return (
                        <motion.div
                          key={platform.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white dark:bg-zinc-900 rounded-lg p-2 sm:p-3 shadow-sm border"
                        >
                          <div className="flex items-center justify-between mb-1 sm:mb-2">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div
                                className="p-1 sm:p-1.5 rounded-full"
                                style={{ backgroundColor: platform.bgColor }}
                              >
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
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 🚀 FIXED: Current Slots with flex-1 to take remaining space */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex-1 min-h-0"
              >
                <Card className="bg-card border-border backdrop-blur-sm h-full">
                  <CardContent className="p-2 sm:p-4 h-full overflow-hidden">
                    <CurrentSlots
                      currentSlots={dashboardData.currentSlots}
                      refreshSlots={refreshSlots}
                      setRefreshSlots={setRefreshSlots}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* 🚀 RIGHT COLUMN - UPCOMING BOOKINGS with matching height structure */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="xl:col-span-1 flex flex-col min-h-0"
            >
              <Card className="bg-card border-border backdrop-blur-sm flex-1 min-h-0">
                <CardContent className="p-0 h-full overflow-hidden">
                  <UpcomingBookings
                    upcomingBookings={dashboardData.upcomingBookings || []}
                    vendorId={vendorId?.toString()}
                    setRefreshSlots={setRefreshSlots}
                    refreshTrigger={upcomingBookingsRefresh}
                  />
                </CardContent>
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
