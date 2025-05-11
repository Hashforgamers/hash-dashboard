"use client"

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Monitor, Gamepad2, Gamepad, RefreshCcw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X, CheckCircle, Loader2 } from "lucide-react";
import { CreditCard, IndianRupee, Smartphone } from "lucide-react";
import dayjs from "dayjs";
import { differenceInMilliseconds, format } from 'date-fns';
import { mergeConsecutiveSlots, mergeConsecutiveBookings , Booking} from "@/app/utils/slot-utils";
import { FaCheck, FaPowerOff } from 'react-icons/fa'; // Import icons


// Helper function to format the timer (HH:MM:SS)
const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00:00"; // Return 00:00:00 if the value is invalid
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const sec = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
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

  const extraTime = Math.max(Math.floor((currentTime.getTime() - endDate.getTime()) / 1000), 0); // Time in seconds
  return extraTime;
};

// Function to release the slot by calling the API
const releaseSlot = async (consoleType, gameId, consoleId, vendorId, setRefreshSlots) => {
  try {
    const response = await fetch(`https://hfg-dashboard.onrender.com/api/releaseDevice/consoleTypeId/${gameId}/console/${consoleId}/vendor/2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookingStats: {} }), // Modify with actual body as per API requirements
    });
    if (response.ok) {
      // alert("Slot released successfully!");
      setRefreshSlots((prev) => {
        console.log("I am Bhanu, previous value of refreshSlots in release Slot :", prev);
        return !prev;
      });
    } else {
      console.log("Failed to release the slot.");
      // alert("Failed to release the slot.");
    }
  } catch (error) {
    console.error("Error releasing slot:", error);
    alert("Error releasing the slot.");
  }
};

// Add the shaking effect conditionally for extended slots
const shakingEffect = (extraTime: number) => {
  return extraTime > 30 ? "animate-shake" : ""; // Trigger shaking after 30 seconds of extra time
};

const enrichMergedSlots = (merged) =>
  merged.map((slot) => ({
    ...slot,
    elapsedTime: calculateElapsedTime(slot.startTime, slot.date),
    extraTime: calculateExtraTime(slot.endTime, slot.date),
  }));


  
export function CurrentSlots({ currentSlots, refreshSlots, setRefreshSlots }: { currentSlots: any[]; refreshSlots: boolean; setRefreshSlots: (prev: boolean) => void; }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSlots, setFilteredSlots] = useState(currentSlots);
  const [releasingSlots, setReleasingSlots] = useState<Record<string, boolean>>({});

  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [loading, setLoading] = useState(false);
  const mergedSlots = mergeConsecutiveSlots(currentSlots);

  // In your component:
  const mergedBookings = mergeConsecutiveBookings(currentSlots);

  const calculateExtraAmount = (extraSeconds: number, ratePerMinute = 2) => {
    const extraMinutes = Math.ceil(extraSeconds / 60);
    return extraMinutes * ratePerMinute;
  };

  const createExtraBooking = async (payload) => {
    try {
      const response = await fetch("https://hfg-booking.onrender.com/api/extraBooking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        throw new Error("Failed to create extra booking");
      }
  
      return await response.json(); // or response.text() if needed
    } catch (error) {
      console.error("Error creating extra booking:", error);
      throw error;
    }
  };
  

  const handleSettle = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    setReleasingSlots(prev => ({ ...prev, [selectedSlot.slotId]: true }));
  
    const extraTime = calculateExtraTime(selectedSlot.endTime, selectedSlot.date);
    const amount = calculateExtraAmount(extraTime);
  
    const extraBookingPayload = {
      consoleNumber: selectedSlot.consoleNumber,
      consoleType: selectedSlot.consoleType,
      date: new Date().toISOString().split("T")[0],
      slotId: selectedSlot.slotId,
      userId: selectedSlot.userId,
      username: selectedSlot.username,
      amount: amount,
      gameId: selectedSlot.game_id,
      vendorId: 1, // Replace with dynamic value if needed
      modeOfPayment: paymentMode,
    };    
  
    try {
      await createExtraBooking(extraBookingPayload);
      await releaseSlot(
        selectedSlot.consoleType,
        selectedSlot.game_id,
        selectedSlot.consoleNumber,
        1,
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
  

  const handleRelease = async (consoleType, gameId, consoleNumber, value, setRefreshSlots, slotId) => {
    setReleasingSlots(prev => ({ ...prev, [slotId]: true }));
    try {
      await releaseSlot(consoleType, gameId, consoleNumber, value, setRefreshSlots);
    } catch (error) {
      console.error("Release error:", error);
    } finally {
      setReleasingSlots(prev => ({ ...prev, [slotId]: false }));
    }
  };

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

  // Add a separate state for timer updates (instead of using currentSlots and refreshSlots)
  const [timers, setTimers] = useState(() =>
    filteredSlots.map((slot) => ({
      slotId: slot.slotId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      date: slot.date,  // Ensure this is present
      elapsedTime: calculateElapsedTime(slot.startTime, slot.date),
      extraTime: calculateExtraTime(slot.endTime, slot.date),
    }))
  );

  useEffect(() => {
    // Reset timers when refreshSlots changes
    const updatedTimers = currentSlots.map((slot) => {
      const elapsedTime = calculateElapsedTime(slot.startTime, slot.date);  // Calculate elapsed time
      const extraTime = calculateExtraTime(slot.endTime, slot.date);  // Calculate extra time
      return { ...slot, elapsedTime, extraTime };  // Update slot with elapsed and extra time
    });
  
    // Update the timers state
    setTimers(updatedTimers);
    setFilteredSlots(enrichMergedSlots(mergeConsecutiveSlots(currentSlots)));
  
    // Update the timers every second
    const intervalId = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => {
          const newElapsedTime = calculateElapsedTime(timer.startTime, timer.date);
          const newExtraTime = calculateExtraTime(timer.endTime, timer.date);
          return {
            ...timer,
            elapsedTime: newElapsedTime,
            extraTime: newExtraTime,
          };
        })
      );
    }, 1000);
  
    // Cleanup the interval on component unmount or when refreshSlots changes
    return () => clearInterval(intervalId);
  }, [refreshSlots, currentSlots]);
  
  // Search handler
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);

    const mergedSlots = mergeConsecutiveSlots(currentSlots);
    const filtered = mergedSlots.filter(
      (slot) =>
        slot.username.toLowerCase().includes(query) ||
        slot.consoleType.toLowerCase().includes(query)
    );
    setFilteredSlots(filtered);
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Current Slots</h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-600 dark:text-zinc-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search slots..."
              className="bg-white/50 border border-zinc-300 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-opacity-50 w-full md:w-64 placeholder-zinc-600 dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-400 dark:border-zinc-700 transition-all duration-200 ease-in-out"
            />
          </div>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="rounded-lg border border-zinc-800 dark:border-zinc-700 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 dark:border-zinc-700">
                  <TableHead className="text-zinc-400 dark:text-zinc-300">Name</TableHead>
                  <TableHead className="text-zinc-400 dark:text-zinc-300">System</TableHead>
                  <TableHead className="text-zinc-400 dark:text-zinc-300">Start Time</TableHead>
                  <TableHead className="text-zinc-400 dark:text-zinc-300">End Time</TableHead>
                  <TableHead className="text-zinc-400 dark:text-zinc-300">Extra Time</TableHead>
                  <TableHead className="text-zinc-400 dark:text-zinc-300">Timer</TableHead>
                  <TableHead className="text-zinc-400 dark:text-zinc-300">Release Slot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {mergedBookings.map((booking) => {
                const isReleasing = releasingSlots[booking.slotId] || false;

                const merged = mergedBookings.find(
                  (mb) => Array.isArray(mb.bookings) && mb.bookings.some((b) => b.slotId === booking.slotId)
                );

                const mergedStartTime = merged?.bookings?.[0]?.startTime || booking.startTime;
                const mergedEndTime =
                  merged?.bookings?.[merged.bookings.length - 1]?.endTime || booking.endTime;
                const mergedDate = merged?.bookings?.[0]?.date || booking.date;

                const extraTime = calculateExtraTime(mergedEndTime, mergedDate);
                const elapsedTime = calculateElapsedTime(mergedStartTime, mergedDate);
                const extraAmount = calculateExtraAmount(extraTime);
                return (
                  <TableRow key={booking.slotId}>
                    <TableCell>{booking.username}</TableCell>
                    <TableCell className="capitalize">{booking.consoleType}</TableCell>
                    <TableCell>{booking.startTime}</TableCell>
                    <TableCell>{booking.endTime}</TableCell>
                    <TableCell>
                      {extraTime > 0 ? (
                        <span className="text-red-500">{formatTime(extraTime)}</span>
                      ) : (
                        <span className="text-green-500">00:00:00</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-blue-600 font-mono">{formatTime(elapsedTime)}</span>
                    </TableCell>
                    <TableCell>
                      {extraTime > 0 ? (
                        <button
                          onClick={() => {
                            setSelectedSlot(booking);
                            setShowOverlay(true);
                          }}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm flex items-center justify-center space-x-2 w-32"
                        >
                          <FaCheck className="w-4 h-4" />
                          <span>Settle</span>
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleRelease(
                              booking.consoleType,
                              booking.game_id,
                              booking.consoleNumber,
                              1,
                              setRefreshSlots,
                              booking.slotId
                            )
                          }
                          disabled={isReleasing}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 flex items-center justify-center space-x-2 w-32"
                        >
                          {isReleasing ? <Loader2 className="animate-spin w-4 h-4" /> : <FaPowerOff className="w-4 h-4" />}
                          <span>{isReleasing ? "Releasing..." : "Release"}</span>
                        </button>
                      )}
                    </TableCell>
                  </TableRow>

                );
              })}
            </TableBody>
            </Table>
          </div>
        </motion.div>
        {showOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-6 w-full max-w-md space-y-6 animate-fade-in">
              <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-gray-100">
                Extra Payment Required
              </h2>

              <div className="text-center text-lg font-medium text-red-600 dark:text-red-400">
                ₹{calculateExtraAmount(timers.find(t => t.slotId === selectedSlot.slotId)?.extraTime || 0)} for extra time
              </div>

              {/* Payment Mode Cards */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Payment Mode
                </label>
                <div className="flex justify-between gap-3">
                  <button
                    onClick={() => setPaymentMode("cash")}
                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-lg border ${
                      paymentMode === "cash"
                        ? "bg-emerald-100 dark:bg-emerald-700 border-emerald-600"
                        : "border-zinc-300 dark:border-zinc-600"
                    } hover:bg-emerald-50 dark:hover:bg-zinc-800 transition`}
                  >
                    <IndianRupee className="w-6 h-6 mb-1" />
                    <span className="text-sm">Cash</span>
                  </button>

                  <button
                    onClick={() => setPaymentMode("card")}
                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-lg border ${
                      paymentMode === "card"
                        ? "bg-emerald-100 dark:bg-emerald-700 border-emerald-600"
                        : "border-zinc-300 dark:border-zinc-600"
                    } hover:bg-emerald-50 dark:hover:bg-zinc-800 transition`}
                  >
                    <CreditCard className="w-6 h-6 mb-1" />
                    <span className="text-sm">Card</span>
                  </button>

                  <button
                    onClick={() => setPaymentMode("upi")}
                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-lg border ${
                      paymentMode === "upi"
                        ? "bg-emerald-100 dark:bg-emerald-700 border-emerald-600"
                        : "border-zinc-300 dark:border-zinc-600"
                    } hover:bg-emerald-50 dark:hover:bg-zinc-800 transition`}
                  >
                    <Smartphone className="w-6 h-6 mb-1" />
                    <span className="text-sm">UPI</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowOverlay(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-shadow shadow-sm hover:shadow-md"
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>

                <button
                  onClick={handleSettle}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={loading}
                >
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
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
