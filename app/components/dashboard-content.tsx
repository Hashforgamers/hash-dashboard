"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStats } from "./book-stats";
import { UpcomingBookings } from "./upcoming-booking";
import { CurrentSlots } from "./current-slot";
import { motion } from "framer-motion";
import { DollarSign, CalendarCheck, WalletCards, Eye, EyeOff, TrendingDown, TrendingUp, CheckCircle2 } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { BOOKING_URL, DASHBOARD_URL } from '@/src/config/env';
import { Loader2 } from "lucide-react";
import HashLoader from './ui/HashLoader';

export function DashboardContent() {
  const [showEarnings, setShowEarnings] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [refreshSlots, setRefreshSlots] = useState(false);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const DASHBOARD_CACHE_KEY = "dashboardData";
  const DASHBOARD_CACHE_TIME = 1 * 60 * 1000; // 5 minutes
  const DASHBOARD_POLL_INTERVAL = 5 * 1000;  // 1 minute
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
    }, [vendorId, refreshSignal]); // <-- trigger on refresh signal

    return dashboardData;
  }

  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");

    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []); // empty dependency, runs once on mount

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded.sub.id);
    }
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshSignal(prev => !prev); // toggles and re-triggers effect
    };
    window.addEventListener("refresh-dashboard", handleRefresh);
    return () => window.removeEventListener("refresh-dashboard", handleRefresh);
  }, []);

  const dashboardData = useDashboardData(vendorId, refreshSignal);

  // You can also conditionally show loader:
  if (!dashboardData) {
    return <HashLoader />; // Or your custom loading component
  }

  return (
     <>
    {dashboardData?.available ? (
      <HashLoader></HashLoader>
    ):(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
    {/* Stats Overview */}
    <div className="w-full h-[5vh] px-4 flex items-center justify-between gap-4 bg-transparent border-b dark:border-zinc-800 shadow-sm">
      {/* Today's Earning */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 flex items-center justify-start gap-3"
      >
        <DollarSign className="w-4 h-4 text-emerald-500" />
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

      {/* Today's Bookings */}
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

      {/* Pending Amount */}
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





      {/* Stats and Bookings Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          {/* Booking Stats Component */}
          <Card className="theme-card bg-card">
            <BookingStats stats={dashboardData.bookingStats} refreshSlots={refreshSlots} setRefreshSlots={setRefreshSlots}/>
          </Card>

          {/* Current Slots Component */}
          <Card className="theme-card bg-card">
            <CurrentSlots currentSlots={dashboardData.currentSlots} refreshSlots={refreshSlots} setRefreshSlots={setRefreshSlots}/>
          </Card>
        </div>

        {/* Upcoming Bookings Component */}
        <div className="lg:col-span-1">
          <Card className="theme-card bg-card sticky top-6">
            <UpcomingBookings upcomingBookings={dashboardData.upcomingBookings} vendorId={dashboardData.vendorId}  setRefreshSlots={setRefreshSlots}/>
          </Card>
        </div>
      </div>
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
