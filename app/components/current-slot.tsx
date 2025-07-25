import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Gamepad2, Loader2, RefreshCw } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { FaCheck, FaPowerOff } from 'react-icons/fa';
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env";
import { mergeConsecutiveBookings } from "@/app/utils/slot-utils";
import HashLoader from './ui/HashLoader';
import ExtraBookingOverlay from "./extraBookingOverlay";

// Helper function to format the timer (HH:MM:SS)
const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00:00";
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Function to calculate the elapsed time from the start time
const calculateElapsedTime = (startTime: string, date: string) => {
  if (!startTime) return 0;
  const currentTime = new Date();
  const startDate = new Date(date);
  const [time, modifier] = startTime.trim().split(" ");
  const [hours, minutes] = time.split(":").map(Number);
  let adjustedHours = hours;
  if (modifier === "PM" && hours < 12) adjustedHours += 12;
  if (modifier === "AM" && hours === 12) adjustedHours = 0;
  startDate.setHours(adjustedHours, minutes, 0, 0);
  return Math.floor((currentTime.getTime() - startDate.getTime()) / 1000);
};

// Function to calculate the extra time (difference between end time and current time)
const calculateExtraTime = (endTime: string, date: string) => {
  if (!endTime) return 0;
  const currentTime = new Date();
  const endDate = new Date(date);
  const [time, modifier] = endTime.trim().split(" ");
  const [hours, minutes] = time.split(":").map(Number);
  let adjustedHours = hours;
  if (modifier === "PM" && hours < 12) adjustedHours += 12;
  if (modifier === "AM" && hours === 12) adjustedHours = 0;
  endDate.setHours(adjustedHours, minutes, 0, 0);
  return Math.max(Math.floor((currentTime.getTime() - endDate.getTime()) / 1000), 0);
};

// Function to calculate booking duration in seconds
const calculateDuration = (startTime: string, endTime: string) => {
  if (!startTime || !endTime) return 0;
  const parseTimeToMinutes = (timeStr: string) => {
    const [time, modifier] = timeStr.trim().split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  return (endMinutes - startMinutes) * 60;
};

// Function to calculate extra amount based on time
const calculateExtraAmount = (extraSeconds: number, ratePerHour = 1) => {
  const extraHours = extraSeconds / 3600;
  return Math.ceil(extraHours * ratePerHour);
};

// Function to release the slot by calling the API
const releaseSlot = async (consoleType: string, gameId: string, consoleId: string, vendorId: any, setRefreshSlots: any) => {
  try {
    const response = await fetch(`${DASHBOARD_URL}/api/releaseDevice/consoleTypeId/${gameId}/console/${consoleId}/vendor/${vendorId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookingStats: {} }),
    });
    if (response.ok) {
      setRefreshSlots((prev: boolean) => !prev);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-dashboard"));
      }
      return true;
    }
    throw new Error("Failed to release the slot.");
  } catch (error) {
    console.error("Error releasing slot:", error);
    return false;
  }
};

interface CurrentSlotsProps {
  currentSlots: any[];
  refreshSlots: boolean;
  setRefreshSlots: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export function CurrentSlots({ currentSlots, refreshSlots, setRefreshSlots }: CurrentSlotsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSlots, setFilteredSlots] = useState(currentSlots);
  const [releasingSlots, setReleasingSlots] = useState<Record<string, boolean>>({});
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [timers, setTimers] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const tableRef = useRef<HTMLTableElement>(null);

  // Decode token to get vendorId
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      try {
        const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
        setVendorId(decoded_token.sub.id);
      } catch (error) {
        console.error("Error decoding token:", error);
        setError("Failed to authenticate user.");
      }
    } else {
      setError("No authentication token found.");
    }
  }, []);

  // Update filtered slots and timers
  useEffect(() => {
    const mergedSlots = mergeConsecutiveBookings(currentSlots);
    const filtered = searchQuery
      ? mergedSlots.filter(
          (slot) =>
            slot.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            slot.consoleType.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : mergedSlots;
    setFilteredSlots(filtered);

    const initialTimers = filtered.map((slot) => ({
      slotId: slot.slotId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      date: slot.date,
      elapsedTime: calculateElapsedTime(slot.startTime, slot.date),
      extraTime: calculateExtraTime(slot.endTime, slot.date),
      duration: calculateDuration(slot.startTime, slot.endTime),
    }));
    setTimers(initialTimers);
  }, [currentSlots, searchQuery]);

  // Update timers every second
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => ({
          ...timer,
          elapsedTime: calculateElapsedTime(timer.startTime, timer.date),
          extraTime: calculateExtraTime(timer.endTime, timer.date),
        }))
      );
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Handle release slot
  const handleRelease = async (consoleType: string, gameId: string, consoleNumber: string, vendorId: any, setRefreshSlots: any, slotId: string) => {
    setReleasingSlots((prev) => ({ ...prev, [slotId]: true }));
    try {
      const success = await releaseSlot(consoleType, gameId, consoleNumber, vendorId, setRefreshSlots);
      if (!success) {
        setError("Failed to release slot. Please try again.");
      }
    } catch (error) {
      setError("Error releasing slot. Please try again.");
    } finally {
      setReleasingSlots((prev) => ({ ...prev, [slotId]: false }));
    }
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setError(""); // Clear errors on search
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {currentSlots?.available ? (
        <div className="flex justify-center items-center h-64">
          <HashLoader />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header and Search */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Current Slots</h2>
              <motion.button
                onClick={() => setRefreshSlots((prev) => !prev)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ rotate: 360 }}
                transition={{ duration: 0.3 }}
                className="text-emerald-600 hover:text-emerald-700 transition-colors"
                title="Refresh slots"
                aria-label="Refresh slots"
              >
                <RefreshCw size={20} />
              </motion.button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by name or console type..."
                className="w-full md:w-72 pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                aria-label="Search slots"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Table */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm shadow-md"
          >
            <div className="overflow-x-auto">
              <table ref={tableRef} className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-zinc-900/50">
                  <tr>
                    {['Name', 'System', 'Time', 'Progress', 'Extra', 'Action'].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {Array.isArray(filteredSlots) && filteredSlots.length > 0 ? (
                    <AnimatePresence>
                      {filteredSlots.map((booking) => {
                        const timer = timers.find((t) => t.slotId === booking.slotId) || {
                          elapsedTime: 0,
                          extraTime: 0,
                          duration: 3600,
                        };
                        const isReleasing = releasingSlots[booking.slotId] || false;
                        const progress = Math.min(100, (timer.elapsedTime / timer.duration) * 100);
                        const hasExtraTime = timer.extraTime > 0;

                        return (
                          <motion.tr
                            key={booking.slotId}
                            variants={item}
                            className="hover:bg-gray-100 dark:hover:bg-zinc-700/50 transition-colors"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            {/* Name */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                  {booking.username.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 dark:text-white">{booking.username}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Console #{booking.consoleNumber}</div>
                                </div>
                              </div>
                            </td>

                            {/* System */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <Gamepad2 className={`w-5 h-5 ${booking.consoleType.toLowerCase() === 'playstation' ? 'text-blue-600' : booking.consoleType.toLowerCase() === 'xbox' ? 'text-green-600' : 'text-red-600'}`} />
                                <span className="capitalize text-gray-900 dark:text-gray-100">{booking.consoleType}</span>
                              </div>
                            </td>

                            {/* Time */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">Start:</span>
                                  <span>{booking.startTime}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">End:</span>
                                  <span>{booking.endTime}</span>
                                </div>
                              </div>
                            </td>

                            {/* Progress */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-2">
                                <div className="font-medium text-gray-900 dark:text-gray-100">{formatTime(timer.elapsedTime)}</div>
                                <div className="h-2.5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <motion.div
                                    className={`h-full ${progress < 75 ? 'bg-emerald-500' : progress < 90 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${progress}%` }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Extra Time */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {hasExtraTime ? (
                                <motion.div
                                  className="text-red-600 dark:text-red-400 font-medium"
                                  initial={{ scale: 1 }}
                                  animate={{ scale: [1, 1.05, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                >
                                  {formatTime(timer.extraTime)}
                                </motion.div>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">00:00:00</span>
                              )}
                            </td>

                            {/* Action */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {hasExtraTime ? (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    setSelectedSlot(booking);
                                    setShowOverlay(true);
                                    setError("");
                                  }}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm w-28 shadow-sm transition-all duration-200"
                                  aria-label={`Settle extra time for ${booking.username}`}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <FaCheck className="w-4 h-4" />
                                    Settle
                                  </div>
                                </motion.button>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleRelease(booking.consoleType, booking.game_id, booking.consoleNumber, vendorId, setRefreshSlots, booking.slotId)}
                                  disabled={isReleasing || !vendorId}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm w-28 disabled:opacity-50 shadow-sm transition-all duration-200"
                                  aria-label={`Release slot for ${booking.username}`}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    {isReleasing ? (
                                      <Loader2 className="animate-spin w-4 h-4" />
                                    ) : (
                                      <FaPowerOff className="w-4 h-4" />
                                    )}
                                    <span>{isReleasing ? "Releasing..." : "Release"}</span>
                                  </div>
                                </motion.button>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center space-y-2"
                        >
                          <Search className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                          <p className="text-base font-medium">No active slots found</p>
                          <p className="text-sm">Try adjusting your search or check back later</p>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* ExtraBookingOverlay */}
          <ExtraBookingOverlay
            showOverlay={showOverlay}
            setShowOverlay={setShowOverlay}
            selectedSlot={selectedSlot}
            vendorId={vendorId}
            setRefreshSlots={setRefreshSlots}
            setSelectedSlot={setSelectedSlot} // Added
            calculateExtraTime={calculateExtraTime}
            calculateExtraAmount={calculateExtraAmount}
            formatTime={formatTime}
            releaseSlot={releaseSlot}
          />
        </div>
      )}
    </div>
  );
}