import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStats } from "./book-stats";
import { UpcomingBookings } from "./upcoming-booking";
import { CurrentSlots } from "./current-slot";
import { motion } from "framer-motion";
import { useState } from "react";
import { 
  DollarSign, 
  CalendarCheck, 
  WalletCards,
  Eye,
  EyeOff,
  TrendingDown,
  TrendingUp,
  CheckCircle2
} from "lucide-react";

export function DashboardContent() {
  const [showEarnings, setShowEarnings] = useState(false);
  const [showPending, setShowPending] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Stats Overview */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="theme-card bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                <CardTitle className="theme-text text-emerald-500">Today's Earning</CardTitle>
              </div>
              <button 
                onClick={() => setShowEarnings(!showEarnings)}
                className="text-emerald-500 hover:text-emerald-600 transition-colors"
              >
                {showEarnings ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </CardHeader>
            <CardContent>
              <div className="theme-title text-2xl font-bold">
                {showEarnings ? "₹25,049" : "₹•••••"}
              </div>
              <p className="theme-subtext text-xs mt-1 flex items-center space-x-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span>12% less than yesterday</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="theme-card bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center space-x-2">
                <CalendarCheck className="h-5 w-5 text-blue-500" />
                <CardTitle className="theme-text text-blue-500">Today's Bookings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="theme-title text-2xl font-bold">128</div>
              <p className="theme-subtext text-xs mt-1 flex items-center space-x-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>8% more than yesterday</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="theme-card bg-gradient-to-br from-purple-500/10 to-purple-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center space-x-2">
                <WalletCards className="h-5 w-5 text-purple-500" />
                <CardTitle className="theme-text text-purple-500">Pending Amount</CardTitle>
              </div>
              <button 
                onClick={() => setShowPending(!showPending)}
                className="text-purple-500 hover:text-purple-600 transition-colors"
              >
                {showPending ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </CardHeader>
            <CardContent>
              <div className="theme-title text-2xl font-bold">
                {showPending ? "₹2,549" : "₹•••••"}
              </div>
              <p className="theme-subtext text-xs mt-1 flex items-center space-x-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>₹20,000 Cleared</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
        {/* Left Side - Stats and Available Consoles */}
        <div className="lg:col-span-3 space-y-6">
          {/* Available Consoles - Now full width */}
          <Card className="theme-card bg-card">
            <BookingStats />
          </Card>

          {/* Current Slots - Moved up */}
          <Card className="theme-card bg-card">
            <CurrentSlots />
          </Card>
        </div>

        {/* Right Side - Upcoming Bookings */}
        <div className="lg:col-span-1">
          <Card className="theme-card bg-card sticky top-6">
            <UpcomingBookings />
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