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
import { Loader2 } from "lucide-react";

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
    console.log("I'm releaseing the slot ",gameId," consoleId ",consoleId, "vendorId ",vendorId);

    const response = await fetch(`https://hfg-dashboard.onrender.com/api/releaseDevice/consoleTypeId/${gameId}/console/${consoleId}/vendor/${vendorId}`, {
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

export function CurrentSlots({ currentSlots, refreshSlots, setRefreshSlots }: { currentSlots: any[]; refreshSlots: boolean; setRefreshSlots: (prev: boolean) => void; }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSlots, setFilteredSlots] = useState(currentSlots);

  const [releasingSlots, setReleasingSlots] = useState<Record<string, boolean>>({});

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

  const [timers, setTimers] = useState(() =>
    currentSlots.map((slot) => {
      // Ensure the correct initialization of startTime, endTime, and date
      const validStartTime = slot.startTime && slot.startTime !== "Invalid Date" ? slot.startTime : "00:00";
      const validEndTime = slot.endTime && slot.endTime !== "Invalid Date" ? slot.endTime : "00:00";
      const validDate = slot.date && slot.date !== "Invalid Date" ? slot.date : new Date().toISOString();  // Default to current date if invalid

      return {
        slotId: slot.slotId,
        startTime: validStartTime,
        endTime: validEndTime,
        date: validDate,  // Ensure this is present
        elapsedTime: calculateElapsedTime(validStartTime, validDate),
        extraTime: calculateExtraTime(validEndTime, validDate),
      };
    })
  );

  useEffect(() => {
    // Whenever refreshSlots or currentSlots changes, update filteredSlots
    setFilteredSlots(currentSlots);
    
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

    console.log("In Current Slot")
    // Cleanup the interval on component unmount
    return () => clearInterval(intervalId);
  }, [refreshSlots, currentSlots]);


  // Search handler
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);

    const filtered = currentSlots.filter(
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
                {filteredSlots.map((slot) => {
                  const timer = timers.find((t) => t.slotId === slot.slotId);
                  return (
                    <motion.tr
                      key={slot.slotId}
                      variants={item}
                      className="border-zinc-800 dark:border-zinc-700"
                    >
                      <TableCell className="text-gray-900 dark:text-white">{slot.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {slot.type === "pc" && <Monitor className="w-4 h-4 text-emerald-500" />}
                          {slot.type === "ps5" && <Gamepad2 className="w-4 h-4 text-blue-500" />}
                          {slot.type === "xbox" && <Gamepad className="w-4 h-4 text-purple-500" />}
                          {slot.consoleType}
                        </div>
                      </TableCell>
                      <TableCell>{slot.startTime}</TableCell>
                      <TableCell>{slot.endTime}</TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {timer ? formatTime(timer.extraTime) : "00:00:00"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono ${shakingEffect(timer ? timer.extraTime : 0)}`}>
                          {timer ? formatTime(timer.elapsedTime) : "00:00:00"}
                        </span>
                      </TableCell>

                      <TableCell>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          handleRelease(slot.consoleType, slot.game_id, slot.consoleNumber, 1, setRefreshSlots, slot.slotId)
                        }
                        className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors flex items-center justify-center"
                        disabled={releasingSlots[slot.slotId]}
                      >
                        {releasingSlots[slot.slotId] ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Releasing...
                          </>
                        ) : (
                          <>
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Release
                          </>
                        )}
                      </motion.button>

                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
