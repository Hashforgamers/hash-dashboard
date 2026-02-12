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
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {currentSlots?.available ? (
        <div className="flex justify-center items-center h-full">
          <HashLoader />
        </div>
      ) : (
        <>
          {/* Header with responsive spacing and sizing */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 sm:pb-3 gap-2 sm:gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                   title={isConnected ? 'Real-time connected' : 'Connecting...'} />
              <span className="text-xs sm:text-sm md:text-base font-semibold text-white">
                Current Slots ({filteredSlots.length})
              </span>
            </div>
            
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 w-3 sm:w-4 h-3 sm:h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by name or console..."
                className="w-full sm:w-48 md:w-64 pl-7 sm:pl-8 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded-md text-xs sm:text-sm mb-2 flex-shrink-0"
            >
              {error}
            </motion.div>
          )}

          {/* Table container with proper height constraints */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex-1 min-h-0 rounded-md border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm shadow-sm overflow-hidden"
          >
            <div className="h-full overflow-y-auto">
              <table ref={tableRef} className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-zinc-900/50 sticky top-0 z-10">
                  <tr>
                    {['Name', 'System', 'Time', 'Progress', 'Extra', 'Action'].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
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

                        // ✅ ENHANCED: Check meal status from both original data and local tracking
                        const bookingIdToCheck = String(booking.bookingId || booking.bookId || '');
                        const hasMeals = bookingMealStatus[bookingIdToCheck] ?? booking.hasMeals ?? false;

                        return (
                          <motion.tr
                            key={uniqueKey}
                            variants={item}
                            className="hover:bg-gray-100 dark:hover:bg-zinc-700/50 transition-colors"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            {/* ✅ ENHANCED: Name cell with dynamic meal/add food buttons */}
                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <div className="h-6 w-6 sm:h-8 sm:w-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-xs font-medium text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                                  {(booking.username || 'Guest').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                                    {booking.username || 'Guest'}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
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
                                    className="flex items-center gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full p-1.5 transition-all duration-200 group flex-shrink-0"
                                    title="View meals & add more"
                                  >
                                    <UtensilsCrossed className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 group-hover:text-emerald-700 transition-colors" />
                                    <span className="text-xs text-emerald-600 group-hover:text-emerald-700 font-medium hidden sm:inline">
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
                                    className="flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full p-1 sm:p-1.5 transition-all duration-200 group border border-dashed border-blue-300 dark:border-blue-600 flex-shrink-0"
                                    title="Add meals to this booking"
                                  >
                                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600 group-hover:text-blue-700 transition-colors" />
                                    <UtensilsCrossed className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600 group-hover:text-blue-700 transition-colors" />
                                    <span className="text-xs text-blue-600 group-hover:text-blue-700 font-medium hidden sm:inline">
                                      Add
                                    </span>
                                  </motion.button>
                                )}
                              </div>
                            </td>

                            {/* System cell - unchanged */}
                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <Gamepad2 className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${
                                  (booking.consoleType || '').toLowerCase().includes('playstation') || 
                                  (booking.consoleType || '').toLowerCase().includes('ps') ? 'text-blue-600' : 
                                  (booking.consoleType || '').toLowerCase().includes('xbox') ? 'text-green-600' : 'text-red-600'
                                }`} />
                                <span className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                                  {booking.consoleType || 'Gaming Console'}
                                </span>
                              </div>
                            </td>

                            {/* Time cell - unchanged */}
                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
                              <div className="text-xs space-y-0.5 sm:space-y-1">
                                <div className="truncate">
                                  <span className="text-gray-600 hidden sm:inline">Start:</span>
                                  <span className="text-gray-600 sm:hidden">S:</span>{' '}
                                  {booking.startTime || 'N/A'}
                                </div>
                                <div className="truncate">
                                  <span className="text-gray-600 hidden sm:inline">End:</span>
                                  <span className="text-gray-600 sm:hidden">E:</span>{' '}
                                  {booking.endTime || 'N/A'}
                                </div>
                              </div>
                            </td>

                            {/* Progress cell - unchanged */}
                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
                              <div className="space-y-1">
                                <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {formatTime(timer.elapsedTime)}
                                </div>
                                <div className="h-1.5 sm:h-1 w-16 sm:w-20 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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

                            {/* Extra Time cell - unchanged */}
                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
                              {hasExtraTime ? (
                                <div className="text-red-600 dark:text-red-400 font-medium text-xs sm:text-sm">
                                  {formatTime(timer.extraTime)}
                                </div>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                                  00:00:00
                                </span>
                              )}
                            </td>

                            {/* Action cell - unchanged */}
                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
                              {hasExtraTime ? (
                                <button
                                  onClick={() => {
                                    setSelectedSlot(booking);
                                    setShowOverlay(true);
                                    setError("");
                                  }}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 sm:px-3 py-1 rounded text-xs w-16 sm:w-20 transition-colors"
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
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 sm:px-3 py-1 rounded text-xs w-16 sm:w-20 disabled:opacity-50 transition-colors"
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
                      <td colSpan={6} className="px-2 sm:px-3 md:px-4 py-6 sm:py-8 text-center text-gray-500 dark:text-gray-400">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center space-y-2"
                        >
                          <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 dark:text-gray-600" />
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
