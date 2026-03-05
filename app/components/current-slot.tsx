import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Gamepad2, Loader2, RefreshCw, UtensilsCrossed, Plus } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { FaCheck, FaPowerOff } from 'react-icons/fa';
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env";
import { mergeConsecutiveBookings } from "@/app/utils/slot-utils";
import HashLoader from './ui/HashLoader';
import ExtraBookingOverlay from "./extraBookingOverlay";
import MealDetailsModal from "./mealsDetailmodal";
import { useSocket } from "../context/SocketContext";

// Keep all your existing helper functions unchanged
const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const parseLocalBookingDate = (dateInput: string): Date | null => {
  const raw = String(dateInput || "").trim();
  if (!raw) return null;

  // YYYY-MM-DD
  const dashed = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashed) {
    const year = Number(dashed[1]);
    const month = Number(dashed[2]) - 1;
    const day = Number(dashed[3]);
    return new Date(year, month, day);
  }

  // YYYYMMDD
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    const year = Number(compact[1]);
    const month = Number(compact[2]) - 1;
    const day = Number(compact[3]);
    return new Date(year, month, day);
  }

  // Fallback for other formats
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const parseTwelveHourTime = (timeInput: string) => {
  const [time, modifierRaw] = String(timeInput || "").trim().split(" ");
  const [hoursRaw, minutesRaw] = (time || "0:0").split(":");
  const hours = Number(hoursRaw || 0);
  const minutes = Number(minutesRaw || 0);
  const modifier = String(modifierRaw || "").toUpperCase();
  let adjustedHours = hours;
  if (modifier === "PM" && hours < 12) adjustedHours += 12;
  if (modifier === "AM" && hours === 12) adjustedHours = 0;
  return {
    hours: Math.max(0, Math.min(23, adjustedHours)),
    minutes: Math.max(0, Math.min(59, minutes)),
  };
};

const calculateElapsedTime = (startTime: string, date: string) => {
  if (!startTime) return 0;
  const currentTime = new Date();
  const startDate = parseLocalBookingDate(date);
  if (!startDate) return 0;
  const parsed = parseTwelveHourTime(startTime);
  startDate.setHours(parsed.hours, parsed.minutes, 0, 0);
  return Math.max(Math.floor((currentTime.getTime() - startDate.getTime()) / 1000), 0);
};

const calculateExtraTime = (endTime: string, date: string) => {
  if (!endTime) return 0;
  const currentTime = new Date();
  const endDate = parseLocalBookingDate(date);
  if (!endDate) return 0;
  const parsed = parseTwelveHourTime(endTime);
  endDate.setHours(parsed.hours, parsed.minutes, 0, 0);
  return Math.max(Math.floor((currentTime.getTime() - endDate.getTime()) / 1000), 0);
};

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

const calculateExtraAmount = (extraSeconds: number, ratePerHour = 1) => {
  const extraHours = extraSeconds / 3600;
  return Math.ceil(extraHours * ratePerHour);
};

const releaseSlot = async (consoleType: string, gameId: string, consoleId: string, vendorId: any, setRefreshSlots: any) => {
  try {
    console.log('🔄 Client: Calling release API for console:', consoleId);
    const response = await fetch(`${DASHBOARD_URL}/api/releaseDevice/consoleTypeId/${gameId}/console/${consoleId}/vendor/${vendorId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingStats: {} }),
    });
    if (response.ok) {
      console.log('✅ Client: Release API call successful');
      setRefreshSlots((prev: boolean) => !prev);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-dashboard"));
      }
      return true;
    }
    throw new Error("Failed to release the slot.");
  } catch (error) {
    console.error("❌ Client: Error calling release API:", error);
    return false;
  }
};

interface CurrentSlotsProps {
  currentSlots: any[];
  refreshSlots: boolean;
  setRefreshSlots: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export function CurrentSlots({ currentSlots: initialSlots, refreshSlots, setRefreshSlots }: CurrentSlotsProps) {
  const { socket, isConnected, joinVendor } = useSocket()
  
  const [currentSlots, setCurrentSlots] = useState(initialSlots || [])
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSlots, setFilteredSlots] = useState(currentSlots);
  const [releasingSlots, setReleasingSlots] = useState<Record<string, boolean>>({});
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [timers, setTimers] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const tableRef = useRef<HTMLTableElement>(null);

  // ✅ ENHANCED: Updated meal details modal state with mode and meal status tracking
  const [mealDetailsModal, setMealDetailsModal] = useState({
    isOpen: false,
    bookingId: '',
    customerName: '',
    mode: 'view' as 'view' | 'add',
    hasExistingMeals: false
  });

  // ✅ NEW: Track which bookings have meals locally for instant UI updates
  const [bookingMealStatus, setBookingMealStatus] = useState<Record<string, boolean>>({});
  const [bookingOutstandingDue, setBookingOutstandingDue] = useState<Record<string, number>>({});

  // Get vendorId
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

  // Update from props
  useEffect(() => {
    if (initialSlots && Array.isArray(initialSlots)) {
      setCurrentSlots(initialSlots)
      
      // ✅ Initialize meal status tracking
      const mealStatus: Record<string, boolean> = {};
      initialSlots.forEach(slot => {
        if (slot.bookingId || slot.bookId) {
          const bookingId = String(slot.bookingId || slot.bookId);
          mealStatus[bookingId] = Boolean(slot.hasMeals);
        }
      });
      setBookingMealStatus(mealStatus);
    }
  }, [initialSlots])

  // ✅ ENHANCED: Listen for meal addition events to update UI immediately
  useEffect(() => {
    const handleMealAdded = (event: CustomEvent) => {
      const { bookingId } = event.detail || {};
      if (bookingId) {
        console.log('🍽️ Meal added event received for booking:', bookingId);
        setBookingMealStatus(prev => ({
          ...prev,
          [String(bookingId)]: true
        }));
        
        // Also update the currentSlots to reflect hasMeals = true
        setCurrentSlots(prev => 
          prev.map(slot => {
            const slotBookingId = String(slot.bookingId || slot.bookId || '');
            if (slotBookingId === String(bookingId)) {
              return { ...slot, hasMeals: true };
            }
            return slot;
          })
        );
      }
    };

    window.addEventListener('meal-added', handleMealAdded as EventListener);
    return () => {
      window.removeEventListener('meal-added', handleMealAdded as EventListener);
    };
  }, []);

  // Socket listeners (keep your existing working code)
  useEffect(() => {
    if (!socket || !vendorId || !isConnected) return

    joinVendor(vendorId)
    socket.off('current_slot');
    socket.off('console_availability');

    function handleCurrentSlot(data: any) {
      const dataVendorId = parseInt(data.vendorId || data.vendor_id)
      const shouldProcess = dataVendorId === vendorId || !data.vendorId;
      
      if (shouldProcess) {
        const newSlot = {
          slotId: data.slotId,
          bookingId: data.bookId,
          username: data.username,
          consoleType: data.consoleType,
          consoleNumber: data.consoleNumber,
          game_id: data.game_id,
          startTime: data.startTime,
          endTime: data.endTime,
          date: data.date,
          status: 'active',
          slot_price: data.slot_price,
          userId: data.userId,
          hasMeals: data.hasMeals
        }
        
        setCurrentSlots(prevSlots => {
          const exists = prevSlots.some(slot => 
            slot.slotId === newSlot.slotId || 
            slot.bookingId === newSlot.bookingId ||
            (slot.consoleNumber === newSlot.consoleNumber && slot.status === 'active')
          )
          
          if (!exists) {
            // ✅ Update meal status tracking for new slots
            const bookingId = String(newSlot.bookingId);
            setBookingMealStatus(prev => ({
              ...prev,
              [bookingId]: Boolean(newSlot.hasMeals)
            }));
            
            return [newSlot, ...prevSlots]
          } else {
            return prevSlots
          }
        })
      }
    }

    function handleConsoleAvailability(data: any) {
      const dataVendorId = parseInt(data.vendorId || data.vendor_id)
      if (dataVendorId === vendorId) {
        setRefreshSlots(prev => !prev);
        
        if (data.is_available === true) {
          setCurrentSlots(prevSlots => {
            const updated = prevSlots.filter(slot => 
              slot.consoleNumber !== data.console_id.toString()
            )
            return updated
          })
        }
      }
    }

    socket.on('current_slot', handleCurrentSlot)
    socket.on('console_availability', handleConsoleAvailability)

    return () => {
      socket.off('current_slot', handleCurrentSlot)
      socket.off('console_availability', handleConsoleAvailability)
    }
  }, [socket, vendorId, isConnected, joinVendor, setRefreshSlots])

  // Update filtered slots and timers
  useEffect(() => {
    const mergedSlots = mergeConsecutiveBookings(currentSlots);
    const filtered = searchQuery
      ? mergedSlots.filter(
          (slot) =>
            (slot.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (slot.consoleType || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : mergedSlots;
    setFilteredSlots(filtered);

    const initialTimers = filtered.map((slot) => ({
      slotId: slot.slotId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      date: slot.date,
      elapsedTime: calculateElapsedTime(slot.startTime || '', slot.date || ''),
      extraTime: calculateExtraTime(slot.endTime || '', slot.date || ''),
      duration: calculateDuration(slot.startTime || '', slot.endTime || ''),
    }));
    setTimers(initialTimers);
  }, [currentSlots, searchQuery]);

  // Track outstanding dues per booking so under-time sessions with meal dues still require settlement.
  useEffect(() => {
    if (!Array.isArray(filteredSlots) || filteredSlots.length === 0) {
      setBookingOutstandingDue({});
      return;
    }

    const bookingIds = Array.from(
      new Set(
        filteredSlots
          .map((slot) => Number(slot.bookingId || slot.bookId))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    );

    if (bookingIds.length === 0) {
      setBookingOutstandingDue({});
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    const token = localStorage.getItem("jwtToken");

    const fetchOutstanding = async () => {
      try {
        const results = await Promise.all(
          bookingIds.map(async (bookingId) => {
            try {
              const response = await fetch(`${BOOKING_URL}/api/booking/${bookingId}/payment-summary`, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                signal: controller.signal,
              });
              if (!response.ok) return [String(bookingId), 0] as const;
              const data = await response.json();
              const due = Number(data?.payment_status?.amount_due ?? data?.financial_summary?.amount_due ?? 0);
              return [String(bookingId), Number.isFinite(due) ? due : 0] as const;
            } catch {
              return [String(bookingId), 0] as const;
            }
          })
        );

        if (isMounted) {
          setBookingOutstandingDue(Object.fromEntries(results));
        }
      } catch {
        if (isMounted) {
          setBookingOutstandingDue({});
        }
      }
    };

    fetchOutstanding();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [filteredSlots, refreshSlots]);

  // Debug logging (unchanged)
  useEffect(() => {
    if (filteredSlots.length > 0) {
      const sampleSlot = filteredSlots[0];
      console.log('🔍 CurrentSlots sample booking structure:', {
        bookingId: sampleSlot.bookingId,
        bookId: sampleSlot.bookId,
        hasMeals: sampleSlot.hasMeals,
        username: sampleSlot.username
      });
    }
  }, [filteredSlots.length]);

  // Update timers every second
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => ({
          ...timer,
          elapsedTime: calculateElapsedTime(timer.startTime || '', timer.date || ''),
          extraTime: calculateExtraTime(timer.endTime || '', timer.date || ''),
        }))
      );
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Handle release slot with unique identifier
  const handleRelease = async (consoleType: string, gameId: string, consoleNumber: string, vendorId: any, setRefreshSlots: any, slotId: string, uniqueKey: string) => {
    setReleasingSlots((prev) => ({ ...prev, [uniqueKey]: true }));
    try {
      const success = await releaseSlot(consoleType, gameId, consoleNumber, vendorId, setRefreshSlots);
      if (success) {
        setCurrentSlots(prev => prev.filter(slot => slot.slotId !== slotId))
      } else {
        setError("Failed to release slot. Please try again.");
      }
    } catch (error) {
      setError("Error releasing slot. Please try again.");
    } finally {
      setReleasingSlots((prev) => ({ ...prev, [uniqueKey]: false }));
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setError("");
  };

  // ✅ ENHANCED: Meal icon click handler for existing meals
  const handleMealIconClick = (bookingId: string, customerName: string) => {
    console.log('🍽️ CurrentSlots: Meal icon clicked', { 
      originalBookingId: bookingId, 
      customerName,
      isValidId: Boolean(bookingId && bookingId !== 'undefined')
    });

    if (!bookingId || bookingId === 'undefined') {
      console.error('❌ Invalid booking ID for meal details');
      setError('Cannot load meal details - invalid booking ID');
      return;
    }

    setMealDetailsModal({
      isOpen: true,
      bookingId: bookingId,
      customerName: customerName || 'Guest User',
      mode: 'view',
      hasExistingMeals: true
    });
  };

  // ✅ NEW: Add food click handler for bookings without meals
  const handleAddFoodClick = (bookingId: string, customerName: string) => {
    console.log('➕ CurrentSlots: Add food clicked', { 
      bookingId, 
      customerName,
      isValidId: Boolean(bookingId && bookingId !== 'undefined')
    });

    if (!bookingId || bookingId === 'undefined') {
      console.error('❌ Invalid booking ID for adding food');
      setError('Cannot add food - invalid booking ID');
      return;
    }

    setMealDetailsModal({
      isOpen: true,
      bookingId: bookingId,
      customerName: customerName || 'Guest User',
      mode: 'add',
      hasExistingMeals: false
    });
  };

  // ✅ ENHANCED: Modal close handler with meal status refresh
  const closeMealDetailsModal = () => {
    setMealDetailsModal({
      isOpen: false,
      bookingId: '',
      customerName: '',
      mode: 'view',
      hasExistingMeals: false
    });
    
    // ✅ Emit event to refresh dashboard and update meal status
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/65 via-slate-900/40 to-slate-900/70 p-3 sm:p-4">
      {currentSlots?.available ? (
        <div className="flex h-full items-center justify-center">
          <HashLoader />
        </div>
      ) : (
        <>
          <div className="mb-3 flex shrink-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                   title={isConnected ? 'Real-time connected' : 'Connecting...'} />
              <span className="dash-title">
                Live Console Sessions ({filteredSlots.length})
              </span>
            </div>
            
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 sm:h-4 sm:w-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by name or console..."
                className="w-full rounded-lg border border-slate-600/70 bg-slate-800/70 py-2 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-400 focus:border-cyan-400/60 focus:outline-none sm:w-56 sm:text-sm md:w-72"
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 shrink-0 rounded-md border border-red-500/30 bg-red-950/30 p-2 text-xs text-red-300 sm:text-sm"
            >
              {error}
            </motion.div>
          )}

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex-1 min-h-0 overflow-hidden rounded-xl border border-cyan-500/20 bg-slate-900/55 backdrop-blur-sm"
          >
            <div className="h-full overflow-x-auto overflow-y-auto">
              <table ref={tableRef} className="min-w-[760px] w-full divide-y divide-slate-700/70">
                <thead className="sticky top-0 z-10 bg-slate-900/95">
                  <tr>
                    {['Name', 'System', 'Time', 'Progress', 'Extra', 'Action'].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-300 md:px-4"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {Array.isArray(filteredSlots) && filteredSlots.length > 0 ? (
                    <AnimatePresence mode="popLayout">
                      {filteredSlots.map((booking, index) => {
                        const timer = timers.find((t) => t.slotId === booking.slotId) || {
                          elapsedTime: 0,
                          extraTime: 0,
                          duration: 3600,
                        };
                        
                        const uniqueKey = `${booking.slotId}-${booking.bookingId || booking.bookId}-${booking.consoleNumber}`;
                        const isReleasing = releasingSlots[uniqueKey] || false;
                        const progress = Math.min(100, (timer.elapsedTime / timer.duration) * 100);
                        const hasExtraTime = timer.extraTime > 0;
                        const bookingIdForDue = String(booking.bookingId || booking.bookId || "");
                        const outstandingDue = Number(bookingOutstandingDue[bookingIdForDue] || 0);
                        const hasOutstandingDue = outstandingDue > 0.01;
                        const needsSettlement = hasExtraTime || hasOutstandingDue;
                        const remainingTime = Math.max((timer.duration || 0) - (timer.elapsedTime || 0), 0);
                        const progressPercent = Number.isFinite(progress) ? Math.max(0, Math.round(progress)) : 0;
                        const progressState = hasExtraTime
                          ? "Overtime"
                          : progressPercent >= 90
                            ? "Ending Soon"
                            : progressPercent >= 60
                              ? "In Session"
                              : "Stable";

                        // ✅ ENHANCED: Check meal status from both original data and local tracking
                        const bookingIdToCheck = String(booking.bookingId || booking.bookId || '');
                        const hasMeals = bookingMealStatus[bookingIdToCheck] ?? booking.hasMeals ?? false;

                        return (
                          <motion.tr
                            key={uniqueKey}
                            variants={item}
                            className="transition-colors hover:bg-slate-800/45"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            {/* ✅ ENHANCED: Name cell with dynamic meal/add food buttons */}
                            <td className="px-3 py-3 md:px-4">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300 sm:h-8 sm:w-8">
                                  {(booking.username || 'Guest').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate dash-title !text-sm">
                                    {booking.username || 'Guest'}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    #{booking.consoleNumber}
                                  </div>
                                </div>
                                
                                {/* ✅ ENHANCED: Conditional rendering of meal/add food buttons */}
                                {hasMeals ? (
                                  // Show food icon for users who have meals
                                  <motion.button
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMealIconClick(bookingIdToCheck, booking.username || 'Guest User');
                                    }}
                                    className="group flex flex-shrink-0 items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 p-1.5 transition-all duration-200 hover:bg-emerald-500/20"
                                    title="View meals & add more"
                                  >
                                    <UtensilsCrossed className="h-3 w-3 text-emerald-300 transition-colors group-hover:text-emerald-200 sm:h-4 sm:w-4" />
                                    <span className="hidden text-xs font-medium text-emerald-200 sm:inline">
                                      Meals
                                    </span>
                                  </motion.button>
                                ) : (
                                  // Show add food button for users who haven't ordered meals
                                  <motion.button
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddFoodClick(bookingIdToCheck, booking.username || 'Guest User');
                                    }}
                                    className="group flex flex-shrink-0 items-center gap-1 rounded-full border border-dashed border-cyan-400/60 bg-cyan-500/10 p-1 transition-all duration-200 hover:bg-cyan-500/20 sm:p-1.5"
                                    title="Add meals to this booking"
                                  >
                                    <Plus className="h-2.5 w-2.5 text-cyan-300 transition-colors group-hover:text-cyan-200 sm:h-3 sm:w-3" />
                                    <UtensilsCrossed className="h-2.5 w-2.5 text-cyan-300 transition-colors group-hover:text-cyan-200 sm:h-3 sm:w-3" />
                                    <span className="hidden text-xs font-medium text-cyan-200 sm:inline">
                                      Add
                                    </span>
                                  </motion.button>
                                )}
                              </div>
                            </td>

                            {/* System cell - unchanged */}
                            <td className="px-3 py-3 md:px-4">
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <Gamepad2 className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${
                                  (booking.consoleType || '').toLowerCase().includes('playstation') || 
                                  (booking.consoleType || '').toLowerCase().includes('ps') ? 'text-blue-600' : 
                                  (booking.consoleType || '').toLowerCase().includes('xbox') ? 'text-green-600' : 'text-red-600'
                                }`} />
                                <span className="truncate text-xs text-slate-100 sm:text-sm">
                                  {booking.consoleType || 'Gaming Console'}
                                </span>
                              </div>
                            </td>

                            {/* Time cell - unchanged */}
                            <td className="px-3 py-3 md:px-4">
                              <div className="text-xs space-y-0.5 sm:space-y-1">
                                <div className="truncate">
                                  <span className="hidden text-slate-400 sm:inline">Start:</span>
                                  <span className="text-slate-400 sm:hidden">S:</span>{' '}
                                  {booking.startTime || 'N/A'}
                                </div>
                                <div className="truncate">
                                  <span className="hidden text-slate-400 sm:inline">End:</span>
                                  <span className="text-slate-400 sm:hidden">E:</span>{' '}
                                  {booking.endTime || 'N/A'}
                                </div>
                              </div>
                            </td>

                            {/* Progress cell - enhanced */}
                            <td className="px-3 py-3 md:px-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs font-semibold text-slate-100 sm:text-sm">
                                    {formatTime(timer.elapsedTime)}
                                  </div>
                                  <span
                                    className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold sm:text-xs ${
                                      hasExtraTime
                                        ? "border-red-500/40 bg-red-500/10 text-red-300"
                                        : progressPercent >= 90
                                          ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                    }`}
                                  >
                                    {progressPercent}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-700/90 sm:w-28">
                                  <motion.div
                                    className={`h-full ${
                                      hasExtraTime
                                        ? "bg-gradient-to-r from-red-500 to-rose-400"
                                        : progress < 75
                                          ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                                          : progress < 90
                                            ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                                            : "bg-gradient-to-r from-orange-500 to-red-500"
                                    }`}
                                    style={{ width: `${progress}%` }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                  />
                                </div>
                                <div className={`text-[10px] sm:text-xs ${hasExtraTime ? "text-red-300" : "text-slate-400"}`}>
                                  {hasExtraTime ? `Extended: ${formatTime(timer.extraTime)}` : `Remaining: ${formatTime(remainingTime)}`}
                                  <span className="ml-1 text-slate-500">({progressState})</span>
                                </div>
                              </div>
                            </td>

                            {/* Extra Time cell - unchanged */}
                            <td className="px-3 py-3 md:px-4">
                              {hasExtraTime ? (
                                <div className="text-xs font-semibold text-red-400 sm:text-sm">
                                  {formatTime(timer.extraTime)}
                                </div>
                              ) : (
                                <span className="text-xs text-emerald-400 sm:text-sm">
                                  00:00:00
                                </span>
                              )}
                            </td>

                            {/* Action cell - unchanged */}
                            <td className="px-3 py-3 md:px-4">
                              {needsSettlement ? (
                                <button
                                  onClick={() => {
                                    setSelectedSlot(booking);
                                    setShowOverlay(true);
                                    setError("");
                                  }}
                                  className={`w-20 rounded-md px-2 py-1 text-xs text-white transition-colors sm:w-24 ${
                                    hasOutstandingDue && !hasExtraTime
                                      ? "bg-orange-500 hover:bg-orange-600"
                                      : "bg-yellow-500 hover:bg-yellow-600"
                                  }`}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <FaCheck className="w-2 h-2 sm:w-3 sm:h-3" />
                                    <span className="hidden sm:inline">Settle</span>
                                    <span className="sm:hidden">Set</span>
                                  </div>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRelease(
                                    booking.consoleType || '', 
                                    booking.game_id || '', 
                                    booking.consoleNumber || '', 
                                    vendorId, 
                                    setRefreshSlots, 
                                    booking.slotId,
                                    uniqueKey
                                  )}
                                  disabled={isReleasing || !vendorId}
                                  className="w-20 rounded-md bg-emerald-500 px-2 py-1 text-xs text-white transition-colors hover:bg-emerald-400 disabled:opacity-50 sm:w-24"
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    {isReleasing ? (
                                      <Loader2 className="animate-spin w-2 h-2 sm:w-3 sm:h-3" />
                                    ) : (
                                      <FaPowerOff className="w-2 h-2 sm:w-3 sm:h-3" />
                                    )}
                                    <span className="hidden sm:inline">{isReleasing ? "..." : "Release"}</span>
                                    <span className="sm:hidden">{isReleasing ? "..." : "Rel"}</span>
                                  </div>
                                </button>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center space-y-2"
                        >
                          <Search className="h-7 w-7 text-slate-600 sm:h-8 sm:w-8" />
                          <p className="text-xs sm:text-sm font-medium">No active slots found</p>
                          <p className="text-xs">
                            {isConnected ? "Waiting for new sessions..." : "Check connection"}
                          </p>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
          
          <ExtraBookingOverlay
            showOverlay={showOverlay}
            setShowOverlay={setShowOverlay}
            selectedSlot={selectedSlot}
            vendorId={vendorId}
            setRefreshSlots={setRefreshSlots}
            setSelectedSlot={setSelectedSlot}
            calculateExtraTime={calculateExtraTime}
            calculateExtraAmount={calculateExtraAmount}
            formatTime={formatTime}
            releaseSlot={releaseSlot}
          />
          
          {/* ✅ ENHANCED: MealDetailsModal with updated props */}
          <MealDetailsModal
            isOpen={mealDetailsModal.isOpen}
            onClose={closeMealDetailsModal}
            bookingId={mealDetailsModal.bookingId}
            customerName={mealDetailsModal.customerName}
            initialMode={mealDetailsModal.mode}
            hasExistingMeals={mealDetailsModal.hasExistingMeals}
            vendorId={String(vendorId || '')}
          />
        </>
      )}
    </div>
  );
}
