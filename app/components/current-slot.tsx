import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CreditCard, IndianRupee, Smartphone, X, CheckCircle, Loader2 } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { FaCheck, FaPowerOff } from 'react-icons/fa';
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env";


// Helper function to format the timer (HH:MM:SS)
const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00:00"; // Return 00:00:00 if the value is invalid
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Function to calculate the elapsed time from the start time
const calculateElapsedTime = (startTime: string, date: string) => {
  if (!startTime) return 0; // Return 0 if startTime is missing

  const currentTime = new Date();
  const startDate = new Date(date);

  // Ensure correct AM/PM handling for start time
  const [time, modifier] = startTime.trim().split(" ");
  const [hours, minutes] = time.split(":").map(Number);

  let adjustedHours = hours;
  if (modifier === "PM" && hours < 12) {
    adjustedHours += 12; // Convert PM hours
  }
  if (modifier === "AM" && hours === 12) {
    adjustedHours = 0; // Convert 12 AM to 00 hours
  }

  startDate.setHours(adjustedHours, minutes, 0, 0);
  return Math.floor((currentTime.getTime() - startDate.getTime()) / 1000); // Time in seconds
};

// Function to calculate the extra time (difference between end time and current time)
const calculateExtraTime = (endTime: string, date: string) => {
  if (!endTime) return 0; // Return 0 if endTime is missing

  const currentTime = new Date();
  const endDate = new Date(date);

  // Ensure correct AM/PM handling for end time
  const [time, modifier] = endTime.trim().split(" ");
  const [hours, minutes] = time.split(":").map(Number);

  let adjustedHours = hours;
  if (modifier === "PM" && hours < 12) {
    adjustedHours += 12; // Convert PM hours
  }
  if (modifier === "AM" && hours === 12) {
    adjustedHours = 0; // Convert 12 AM to 00 hours
  }

  endDate.setHours(adjustedHours, minutes, 0, 0);

  return Math.max(Math.floor((currentTime.getTime() - endDate.getTime()) / 1000), 0); // Time in seconds
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
  
  return (endMinutes - startMinutes) * 60; // Convert to seconds
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
      return true;
    } else {
      console.log("Failed to release the slot.");
      return false;
    }
  } catch (error) {
    console.error("Error releasing slot:", error);
    return false;
  }
};

// Calculate extra amount based on time
const calculateExtraAmount = (extraSeconds: number, ratePerHour = 1) => {
  const extraHours = extraSeconds / 3600;
  return Math.ceil(extraHours * ratePerHour);
};

// Merge consecutive slots helper function
const mergeConsecutiveSlots = (slots: any[]) => {
  if (!slots || !slots.length) return [];
  
  // Implementation would go here
  return slots;
};

// Merge consecutive bookings helper function
const mergeConsecutiveBookings = (slots: any[]) => {
  if (!slots || !slots.length) return [];
  
  // For demo purposes, just return the slots
  return slots;
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
  const [paymentMode, setPaymentMode] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [timers, setTimers] = useState<any[]>([]);

  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");

    if (token) {
      try {
        const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
        setVendorId(decoded_token.sub.id);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);

  // Update filtered slots when currentSlots or search query changes
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

    // Initialize timers
    const initialTimers = filtered.map((slot) => ({
      slotId: slot.slotId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      date: slot.date,
      elapsedTime: calculateElapsedTime(slot.startTime, slot.date),
      extraTime: calculateExtraTime(slot.endTime, slot.date),
      duration: calculateDuration(slot.startTime, slot.endTime)
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
          extraTime: calculateExtraTime(timer.endTime, timer.date)
        }))
      );
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Create extra booking function
  const createExtraBooking = async (payload: any) => {
    try {
      const response = await fetch(`${BOOKING_URL}/api/extraBooking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        throw new Error("Failed to create extra booking");
      }
  
      return await response.json();
    } catch (error) {
      console.error("Error creating extra booking:", error);
      throw error;
    }
  };

  // Handle settle function for extra time
  const handleSettle = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    setReleasingSlots(prev => ({ ...prev, [selectedSlot.slotId]: true }));
  
    const extraTime = calculateExtraTime(selectedSlot.endTime, selectedSlot.date);
    const amount = calculateExtraAmount(extraTime, selectedSlot.slot_price || 100);
  
    const extraBookingPayload = {
      consoleNumber: selectedSlot.consoleNumber,
      consoleType: selectedSlot.consoleType,
      date: new Date().toISOString().split("T")[0],
      slotId: selectedSlot.slotId,
      userId: selectedSlot.userId,
      username: selectedSlot.username,
      amount: amount,
      gameId: selectedSlot.game_id,
      vendorId: vendorId,
      modeOfPayment: paymentMode,
    };
  
    try {
      await createExtraBooking(extraBookingPayload);
      await releaseSlot(
        selectedSlot.consoleType,
        selectedSlot.game_id,
        selectedSlot.consoleNumber,
        vendorId,
        setRefreshSlots
      );
    } catch (err) {
      console.error("Error during settlement:", err);
    } finally {
      setReleasingSlots(prev => ({ ...prev, [selectedSlot.slotId]: false }));
      setShowOverlay(false);
      setSelectedSlot(null);
      setLoading(false);
    }
  };

  // Handle release slot function
  const handleRelease = async (consoleType: string, gameId: string, consoleNumber: string, vendorId: any, setRefreshSlots: any, slotId: string) => {
    setReleasingSlots(prev => ({ ...prev, [slotId]: true }));
    try {
      await releaseSlot(consoleType, gameId, consoleNumber, vendorId, setRefreshSlots);
    } catch (error) {
      console.error("Release error:", error);
    } finally {
      setReleasingSlots(prev => ({ ...prev, [slotId]: false }));
    }
  };

  // Handle search function
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header and Search */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white dark:text-white">Current Slots</h2>
            <motion.button 
              onClick={() => setRefreshSlots(prev => !prev)}
              whileTap={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="text-emerald-500 hover:text-emerald-600 transition-colors"
              title="Refresh slots"
            >
              <RefreshIcon size={20} />
            </motion.button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400dark:text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search by name or console type..."
              className="border bg-transparent rounded-lg pl-10 pr-4 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-full md:w-64 transition-all duration-200 ease-in-out"
            />
          </div>
        </div>

        {/* Table */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm bg-white/10 dark:bg-white/5 backdrop-blur-sm"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-white/20 dark:bg-white/10 backdrop-blur-sm">
                <tr>
                  {['Name', 'System', 'Time', 'Progress', 'Extra', 'Action'].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {filteredSlots.map((booking) => {
                    const timer = timers.find(t => t.slotId === booking.slotId) || {
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
                        className={`${hasExtraTime ? "hover:bg-white/10 dark:hover:bg-white/5" : "hover:bg-white/10 dark:hover:bg-white/5"} transition-colors`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                              <span className="text-emerald-700 dark:text-emerald-300 font-medium text-sm">
                                {booking.username.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{booking.username}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Console #{booking.consoleNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <ConsoleIcon type={booking.consoleType.toLowerCase()} />
                            <span className="text-sm text-gray-900 dark:text-white capitalize">{booking.consoleType}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">Start:</span>
                              <span>{booking.startTime}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">End:</span>
                              <span>{booking.endTime}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm font-medium mb-1">
                              {formatTime(timer.elapsedTime)}
                            </div>
                            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasExtraTime ? (
                            <motion.div
                              className="text-red-600 font-medium"
                              initial={{ scale: 1 }}
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              {formatTime(timer.extraTime)}
                            </motion.div>
                          ) : (
                            <span className="text-emerald-600">00:00:00</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasExtraTime ? (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setSelectedSlot(booking);
                                setShowOverlay(true);
                              }}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm flex items-center justify-center space-x-2 w-32 shadow-sm transition-all duration-200"
                            >
                              <FaCheck className="w-3.5 h-3.5" />
                              <span>Settle</span>
                            </motion.button>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() =>
                                handleRelease(
                                  booking.consoleType,
                                  booking.game_id,
                                  booking.consoleNumber,
                                  vendorId,
                                  setRefreshSlots,
                                  booking.slotId
                                )
                              }
                              disabled={isReleasing}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50 flex items-center justify-center space-x-2 w-32 shadow-sm transition-all duration-200"
                            >
                              {isReleasing ? (
                                <Loader2 className="animate-spin w-3.5 h-3.5" />
                              ) : (
                                <FaPowerOff className="w-3.5 h-3.5" />
                              )}
                              <span>{isReleasing ? "Releasing..." : "Release"}</span>
                            </motion.button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>

                {filteredSlots.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center"
                      >
                        <Search className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-2" />
                        <p className="text-lg">No active slots found</p>
                        <p className="text-sm">Try adjusting your search or check back later</p>
                      </motion.div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Payment Overlay */}
        <AnimatePresence>
          {showOverlay && (
            <motion.div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md space-y-6"
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
              >
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Extra Payment Required
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400dark:text-gray-400 mt-1">
                    The session has gone over the allotted time
                  </p>
                </div>

                <div className="flex justify-between items-center bg-red-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Extra time</p>
                    <p className="text-xl font-medium text-red-600">
                      {selectedSlot && formatTime(calculateExtraTime(selectedSlot.endTime, selectedSlot.date))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount due</p>
                    <p className="text-xl font-medium text-red-600">
                      ₹{selectedSlot && calculateExtraAmount(
                        calculateExtraTime(selectedSlot.endTime, selectedSlot.date),
                        selectedSlot.slot_price || 100
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Select Payment Mode
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setPaymentMode("cash")}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                        paymentMode === "cash"
                          ? "bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/30"
                          : "border-gray-300 hover:bg-gray-50 bg-gray-50 text-gray-900"
                      } transition-all duration-200`}
                    >
                      <IndianRupee className={`w-5 h-5 mb-1 ${paymentMode === "cash" ? "text-emerald-600" : "text-gray-500 dark:text-gray-400dark:text-gray-400"}`} />
                      <span className={`text-sm ${paymentMode === "cash" ? "text-emerald-700" : "text-gray-700 dark:text-gray-300"}`}>Cash</span>
                    </button>

                    <button
                      onClick={() => setPaymentMode("card")}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                        paymentMode === "card"
                          ? "bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/30"
                          : "border-gray-500 hover:bg-gray-50 bg-gray-50 text-gray-900"
                      } transition-all duration-200`}
                    >
                      <CreditCard className={`w-5 h-5 mb-1 ${paymentMode === "card" ? "text-emerald-600" : "text-gray-500 dark:text-gray-400dark:text-gray-400"}`} />
                      <span className={`text-sm ${paymentMode === "card" ? "text-emerald-700" : "text-gray-700 dark:text-gray-300"}`}>Card</span>
                    </button>

                    <button
                      onClick={() => setPaymentMode("upi")}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                        paymentMode === "upi"
                          ? "bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/30"
                          : "border-gray-300 hover:bg-gray-50 bg-gray-50 text-gray-900"
                      } transition-all duration-200`}
                    >
                      <Smartphone className={`w-5 h-5 mb-1 ${paymentMode === "upi" ? "text-emerald-600" : "text-gray-500 dark:text-gray-400dark:text-gray-400"}`} />
                      <span className={`text-sm ${paymentMode === "upi" ? "text-emerald-700" : "text-gray-700 dark:text-gray-300"}`}>UPI</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowOverlay(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all duration-200 disabled:opacity-50"
                    disabled={loading}
                  >
                    <span className="flex items-center gap-1">
                      <X className="w-4 h-4" />
                      Cancel
                    </span>
                  </button>

                  <button
                    onClick={handleSettle}
                    className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 disabled:opacity-50"
                    disabled={loading}
                  >
                    <span className="flex items-center gap-2">
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Settle
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Console icon component
function ConsoleIcon({ type }: { type: string }) {
  switch (type) {
    case 'playstation':
      return <GamepadIcon className="w-5 h-5 text-blue-600" />;
    case 'xbox':
      return <GamepadIcon className="w-5 h-5 text-green-600" />;
    case 'nintendo':
      return <GamepadIcon className="w-5 h-5 text-red-600" />;
    default:
      return <GamepadIcon className="w-5 h-5 text-gray-600" />;
  }
}

// Icons
function GamepadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <line x1="6" y1="12" x2="10" y2="12"></line>
      <line x1="8" y1="10" x2="8" y2="14"></line>
      <line x1="15" y1="13" x2="15.01" y2="13"></line>
      <line x1="18" y1="11" x2="18.01" y2="11"></line>
      <rect x="2" y="6" width="20" height="12" rx="2"></rect>
    </svg>
  );
}

function RefreshIcon(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}