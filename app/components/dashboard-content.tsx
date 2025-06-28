"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookingStats } from "./book-stats";
import { UpcomingBookings } from "./upcoming-booking";
import { CurrentSlots } from "./current-slot";
import { motion, AnimatePresence } from "framer-motion";
import {
  TabletSmartphone,
  ChevronRight,
  IndianRupee,
  CalendarCheck,
  WalletCards,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  TrendingUp as TrendingUpIcon,
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env";
import HashLoader from "./ui/HashLoader";
import clsx from "clsx";

export function DashboardContent() {
  const [showBookingStats, setShowBookingStats] = useState(true);
  const [showEarnings, setShowEarnings] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [refreshSlots, setRefreshSlots] = useState(false);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const DASHBOARD_CACHE_KEY = "dashboardData";
  const DASHBOARD_CACHE_TIME = 1 * 60 * 1000;
  const DASHBOARD_POLL_INTERVAL = 5 * 1000;
  const [refreshSignal, setRefreshSignal] = useState(false);

  function useDashboardData(vendorId: number | null, refreshSignal: boolean) {
    const [dashboardData, setDashboardData] = useState(null);

    useEffect(() => {
      if (!vendorId) return;

      const loadDashboardData = async (isInitial = false) => {
        try {
          const cache = localStorage.getItem(DASHBOARD_CACHE_KEY);
          const parsed = cache ? JSON.parse(cache) : null;
          const now = Date.now();

          if (isInitial && parsed && now - parsed.timestamp < DASHBOARD_CACHE_TIME) {
            setDashboardData(parsed.data);
            console.log("Loaded dashboard from cache");
          } else {
            const response = await fetch(`${DASHBOARD_URL}/api/getLandingPage/vendor/${vendorId}`);
            const data = await response.json();
            setDashboardData(data);
            localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({ data, timestamp: now }));
            console.log("Fetched and cached dashboard data");
          }
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
        }
      };

      loadDashboardData(true);

      const interval = setInterval(() => loadDashboardData(), DASHBOARD_POLL_INTERVAL);
      return () => clearInterval(interval);
    }, [vendorId, refreshSignal]);

    return dashboardData;
  }

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []);

  useEffect(() => {
    const handleRefresh = () => setRefreshSignal((prev) => !prev);
    window.addEventListener("refresh-dashboard", handleRefresh);
    return () => window.removeEventListener("refresh-dashboard", handleRefresh);
  }, []);

  const dashboardData = useDashboardData(vendorId, refreshSignal);

  if (!dashboardData) {
    return <HashLoader />;
  }

  return (
    <>
      {dashboardData?.available ? (
        <HashLoader />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Top Stats */}
          <div className="w-full h-[5vh] px-4 flex items-center justify-between gap-4 bg-transparent border-b dark:border-zinc-800 shadow-sm">
            {/* Earnings */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 flex items-center justify-start gap-3"
            >
              <IndianRupee className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Earnings:</span>
              <span className="font-bold text-zinc-900 dark:text-white text-sm">
                {showEarnings ? `₹${dashboardData?.stats?.todayEarnings ?? 0}` : "₹•••••"}
              </span>
              <button
                onClick={() => setShowEarnings(!showEarnings)}
                className="ml-2 text-emerald-500 hover:text-emerald-600 transition"
              >
                {showEarnings ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </motion.div>

            {/* Bookings */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1 flex items-center justify-center gap-3"
            >
              <CalendarCheck className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Bookings:</span>
              <span className="font-bold text-zinc-900 dark:text-white text-sm">
                {dashboardData?.stats?.todayBookings ?? 0}
              </span>
              <span className="text-xs text-green-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {dashboardData?.stats?.todayBookingsChange ?? 0}%
              </span>
            </motion.div>

            {/* Pending */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex-1 flex items-center justify-end gap-3"
            >
              <WalletCards className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Pending:</span>
              <span className="font-bold text-zinc-900 dark:text-white text-sm">
                {showPending ? `₹${dashboardData?.stats?.pendingAmount ?? 0}` : "₹•••••"}
              </span>
              <button
                onClick={() => setShowPending(!showPending)}
                className="ml-2 text-purple-500 hover:text-purple-600 transition"
              >
                {showPending ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </motion.div>
          </div>

          {/* Grid Layout */}
          <div
            className={clsx(
              "grid gap-6 grid-cols-1 transition-[grid-template-columns] duration-300",
              showBookingStats ? "lg:grid-cols-4" : "lg:grid-cols-3"
            )}
          >
            <div
              className={clsx(
                "space-y-6",
                showBookingStats ? "lg:col-span-3" : "lg:col-span-2"
              )}
            >
              {/* Booking Stats */}
              <AnimatePresence>
                {showBookingStats && (
                  <motion.div
                    key="booking-stats"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Card className="theme-card bg-card">
                      <div className="flex items-center justify-between p-2 border-b">
                        <h3 className="text-sm font-semibold">Available Devices</h3>
                        <button
                          onClick={() => setShowBookingStats(false)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <ChevronRight className="w-4 h-4 rotate-180" />
                        </button>
                      </div>
                      <BookingStats
                        stats={dashboardData.bookingStats}
                        refreshSlots={refreshSlots}
                        setRefreshSlots={setRefreshSlots}
                      />
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Current Slots */}
              <Card className="theme-card bg-card">
                <CurrentSlots
                  currentSlots={dashboardData.currentSlots}
                  refreshSlots={refreshSlots}
                  setRefreshSlots={setRefreshSlots}
                />
              </Card>
            </div>

            {/* Upcoming Bookings Sidebar - always visible, no expand/collapse */}
            <aside className="lg:col-span-1">
              <Card className="theme-card bg-card sticky top-6">
                <UpcomingBookings
                  upcomingBookings={dashboardData.upcomingBookings}
                  vendorId={dashboardData.vendorId}
                  setRefreshSlots={setRefreshSlots}
                />
              </Card>
            </aside>
          </div>

          {/* Floating Buttons for Booking Stats only */}
          {!showBookingStats && (
            <button
              onClick={() => setShowBookingStats(true)}
              className="fixed bottom-6 right-6 p-3 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700"
            >
              <TrendingUpIcon className="w-5 h-5" />
            </button>
          )}
        </motion.div>
      )}
    </>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <DashboardContent />
    </div>
  );
}

export default App;
