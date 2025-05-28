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

export function DashboardContent() {
  const [dashboardData, setDashboardData] = useState(null);
  const [showEarnings, setShowEarnings] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [refreshSlots, setRefreshSlots] = useState(false);
  const [vendorId, setVendorId] = useState(null);

  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");

    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []); // empty dependency, runs once on mount


useEffect(() => {
  console.log("Printing the change in dash content");

  // Fetch dashboard data
  fetch(`${DASHBOARD_URL}/api/getLandingPage/vendor/${vendorId}`)
    .then(response => response.json())
    .then(data => setDashboardData(data))
    .catch(error => console.error("Error fetching dashboard data:", error));

    const fetchUsers = async () => {
      const usersCacheKey = "userList";
      const timestampKey = "userListTimestamp";
      const cachedUsers = localStorage.getItem(usersCacheKey);
      const cachedTimestamp = localStorage.getItem(timestampKey);
      const { data, timestamp } = JSON.parse(cachedUsers);

      const now = Date.now();
      const isCacheValid = cachedTimestamp && (now - parseInt(timestamp, 10)) < 10 * 60 * 1000;

      if (cachedUsers && isCacheValid) {
        console.log("Loaded user list from valid cache");
      } else {
        try {
          const response = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`);
          const data = await response.json();
          if (Array.isArray(data)) {
            localStorage.setItem("userList", JSON.stringify({ data, timestamp: Date.now() }));
            console.log("Fetched and cached fresh user list");
          }
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      }
    };

    if (vendorId) {
      fetchUsers();
    }
  }, [vendorId, refreshSlots]);

  
  if (!dashboardData) {
    return <div>Loading...</div>; // Render a loading state until the data is fetched
  }

  return (
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
