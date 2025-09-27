import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Monitor, Play, X, Gamepad2, Calendar, Clock, User, Search,
  DollarSign, CalendarDays, Users, Timer, AlertCircle, Filter,
  BadgeCheck, Calendar as CalendarIcon, ChevronDown, RefreshCw, UtensilsCrossed, Plus
} from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faIndianRupeeSign } from '@fortawesome/free-solid-svg-icons'
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { format, parseISO, isToday, isTomorrow, startOfToday } from 'date-fns';
import { DASHBOARD_URL } from "@/src/config/env";
import ResponsiveSearchFilter from "./ResponsiveSearchFilter";
import MealDetailsModal from "./mealsDetailmodal";
import { useSocket } from "../context/SocketContext";

// Helper function for getting platform icons
export function getIcon(system?: string | null): JSX.Element {
  const sys = (system || "").toLowerCase();
  
  if (sys.includes("ps5")) return <Gamepad2 className="w-4 h-4 text-blue-500" />;
  if (sys.includes("xbox")) return <Gamepad2 className="w-4 h-4 text-green-500" />;
  return <Monitor className="w-4 h-4 text-purple-500" />;
}

// Helper function for date formatting
const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  } catch (error) {
    console.error("Date parsing error:", error);
    return 'Invalid Date';
  }
};

// Helper function for getting time of day
const getTimeOfDay = (time: string) => {
  if (!time) return "all";
  
  const hour = parseInt(time.split(":")[0]);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

// Helper function for merging consecutive bookings
const mergeConsecutiveBookings = (bookings: any[]) => {
  if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
    return [];
  }

  const byDate = bookings.reduce((acc: any, booking) => {
    const date = booking?.date || new Date().toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(booking);
    return acc;
  }, {});

  const parseTime = (time: string): Date => {
    if (!time || typeof time !== 'string') {
      console.warn('parseTime expected a string but received:', time);
      return new Date(1970, 0, 1, 0, 0);
    }

    const [timePart, period] = time.trim().split(" ");
    let [hours, minutes] = timePart.split(":").map(Number);
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return new Date(1970, 0, 1, hours, minutes);
  };

  const formatTimeRange = (start: Date, end: Date): string => {
    const to12Hour = (date: Date) => {
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const period = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${period}`;
    };
    return `${to12Hour(start)} - ${to12Hour(end)}`;
  };

  const mergedResults: any[] = [];

  Object.entries(byDate).forEach(([date, dateBookings]) => {
    const grouped = (dateBookings as any[]).reduce((acc: any, booking) => {
      const userId = booking?.userId || 'unknown';
      const gameId = booking?.game_id || 'unknown';
      const key = `${userId}_${gameId}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(booking);
      return acc;
    }, {});

    Object.values(grouped).forEach((group: any) => {
      const sorted = (group as any[]).sort((a, b) => {
        const aStart = parseTime(a.time?.split(" - ")[0] || "");
        const bStart = parseTime(b.time?.split(" - ")[0] || "");
        return aStart.getTime() - bStart.getTime();
      });

      let current = { ...sorted[0] };
      let currentStart = parseTime(current.time?.split(" - ")[0] || "");
      let currentEnd = parseTime(current.time?.split(" - ")[1] || "");
      let mergedIds = [current.bookingId];
      let totalPrice = current.slot_price || 0;

      for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        const nextStart = parseTime(next.time?.split(" - ")[0] || "");
        const nextEnd = parseTime(next.time?.split(" - ")[1] || "");

        if (nextStart.getTime() <= currentEnd.getTime()) {
          currentEnd = new Date(Math.max(currentEnd.getTime(), nextEnd.getTime()));
          mergedIds.push(next.bookingId);
          totalPrice += next.slot_price || 0;
        } else {
          current.time = formatTimeRange(currentStart, currentEnd);
          current.merged_booking_ids = mergedIds;
          current.total_price = totalPrice;
          current.duration = mergedIds.length;
          mergedResults.push(current);

          current = { ...next };
          currentStart = nextStart;
          currentEnd = nextEnd;
          mergedIds = [next.bookingId];
          totalPrice = next.slot_price || 0;
        }
      }

      current.time = formatTimeRange(currentStart, currentEnd);
      current.merged_booking_ids = mergedIds;
      current.total_price = totalPrice;
      current.duration = mergedIds.length;
      mergedResults.push(current);
    });
  });

  return mergedResults.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// Component props interface
interface UpcomingBookingsProps {
  upcomingBookings: any[];
  vendorId?: string;
  setRefreshSlots: (prev: boolean) => void;
  refreshTrigger?: boolean;
}

export function UpcomingBookings({
  upcomingBookings: initialBookings,
  vendorId,
  setRefreshSlots,
  refreshTrigger
}: UpcomingBookingsProps): JSX.Element {
  
  const { socket, isConnected, joinVendor } = useSocket()
  
  const [upcomingBookings, setUpcomingBookings] = useState(Array.isArray(initialBookings) ? initialBookings : [])

  // State for modal and console selection
  const [startCard, setStartCard] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState("");
  const [availableConsoles, setAvailableConsoles] = useState<any[]>([]);
  const [selectedConsole, setSelectedConsole] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  
  // State for filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [timeFilter, setTimeFilter] = useState("all");

  // ✅ ENHANCED: Enhanced meal modal state with add food capability
  const [mealDetailsModal, setMealDetailsModal] = useState({
    isOpen: false,
    bookingId: '',
    customerName: '',
    mode: 'view' as 'view' | 'add', // New mode to distinguish between viewing and adding
    hasExistingMeals: false
  });

  // Update bookings when props change
  useEffect(() => {
    if (Array.isArray(initialBookings)) {
      console.log('📅 UpcomingBookings: Updating from props with', initialBookings.length, 'bookings')
      setUpcomingBookings(initialBookings)
    }
  }, [initialBookings])

  // Refresh bookings when triggered
  useEffect(() => {
    const fetchLatestBookings = async () => {
      if (!vendorId) return
      
      try {
        console.log('🔄 Refreshing upcoming bookings from API...')
        const response = await fetch(`${DASHBOARD_URL}/api/getLandingPage/vendor/${vendorId}`)
        const data = await response.json()
        
        if (data.upcomingBookings) {
          console.log('📅 Refreshed upcoming bookings:', data.upcomingBookings.length)
          setUpcomingBookings(data.upcomingBookings)
        }
      } catch (error) {
        console.error('❌ Error refreshing upcoming bookings:', error)
      }
    }

    if (refreshTrigger !== undefined) {
      fetchLatestBookings()
    }
  }, [refreshTrigger, vendorId])

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket || !vendorId || !isConnected) return

    console.log('📅 UpcomingBookings: Setting up socket listeners...')
    
    joinVendor(parseInt(vendorId))

    socket.off('upcoming_booking');
    socket.off('booking');
    socket.off('booking_accepted');

    function handleUpcomingBooking(data: any) {
      console.log('📅 Real-time upcoming booking:', data)
      
      if (!data || !data.vendorId) {
        console.warn('Invalid upcoming booking data:', data);
        return;
      }
      
      if (data.vendorId === parseInt(vendorId) && (data.status === 'Confirmed' || data.status === 'confirmed')) {
        setUpcomingBookings(prev => {
          if (!Array.isArray(prev)) prev = [];
          
          const exists = prev.some(booking => booking?.bookingId === data.bookingId)
          if (!exists) {
            console.log('➕ Adding new booking immediately')
            return [data, ...prev]
          }
          return prev
        })
      }
    }

    function handleBookingUpdate(data: any) {
      console.log('🔄 Booking update:', data)
      
      if (!data || !data.vendorId) {
        console.warn('Invalid booking update data:', data);
        return;
      }
      
      if (data.vendorId === parseInt(vendorId)) {
        setUpcomingBookings(prev => {
          if (!Array.isArray(prev)) prev = [];
          
          if ((data.status === 'Confirmed' || data.status === 'confirmed') && !prev.some(b => b?.bookingId === data.bookingId)) {
            return [data, ...prev]
          }
          
          return prev.map(booking => 
            booking?.bookingId === data.bookingId 
              ? { ...booking, ...data }
              : booking
          ).filter(booking => 
            booking?.status !== 'Cancelled' && booking?.status !== 'cancelled'
          )
        })
      }
    }

    function handleBookingAccepted(data: any) {
      console.log('✅ Booking accepted from notification panel:', data)
      
      if (data.vendorId === parseInt(vendorId)) {
        setUpcomingBookings(prev => {
          if (!Array.isArray(prev)) prev = [];
          
          const exists = prev.some(booking => booking?.bookingId === data.bookingId)
          if (!exists) {
            console.log('📅 ✅ Adding accepted booking to upcoming bookings immediately')
            return [data, ...prev]
          }
          return prev
        })
      }
    }

    socket.on('upcoming_booking', handleUpcomingBooking)
    socket.on('booking', handleBookingUpdate)
    socket.on('booking_accepted', handleBookingAccepted)

    return () => {
      console.log('🧹 Cleaning up UpcomingBookings listeners')
      socket.off('upcoming_booking', handleUpcomingBooking)
      socket.off('booking', handleBookingUpdate)
      socket.off('booking_accepted', handleBookingAccepted)
    }
  }, [socket, vendorId, isConnected, joinVendor])

  // Filter bookings based on search and date
  const filteredBookings = useMemo(() => {
    if (!Array.isArray(upcomingBookings)) return [];
    
    let filtered = upcomingBookings.filter(booking => booking && booking.date);

    filtered = filtered.filter(booking => {
      try {
        const bookingDate = new Date(booking.date);
        const selected = new Date(selectedDate);
        return bookingDate.toDateString() === selected.toDateString();
      } catch (error) {
        console.warn('Date filtering error for booking:', booking);
        return false;
      }
    });

    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(booking => 
        ((booking.username || '').toLowerCase()).includes(term) ||
        ((booking.consoleType || '').toLowerCase()).includes(term)
      );
    }

    if (timeFilter !== "all") {
      filtered = filtered.filter(booking => {
        const timeOfDay = getTimeOfDay(booking.time?.split(" ")[0]);
        return timeOfDay === timeFilter;
      });
    }

    return filtered;
  }, [upcomingBookings, searchTerm, selectedDate, timeFilter]);

  // Merge consecutive bookings
  const mergedBookings = useMemo(() => 
    mergeConsecutiveBookings(filteredBookings),
    [filteredBookings]
  );

  // 🔧 MOVED: Add debugging to see booking data structure AFTER mergedBookings is defined
  useEffect(() => {
    if (mergedBookings.length > 0) {
      console.log('📊 Sample booking structure:', mergedBookings[0]);
      console.log('📊 All booking game_ids:', mergedBookings.map(b => ({
        bookingId: b.bookingId,
        game_id: b.game_id,
        consoleType: b.consoleType,
        hasMeals: b.hasMeals
      })));
    }
  }, [mergedBookings]);

  // Enhanced start session handler with debugging
  const start = (system: string, gameId: string, bookingId: string) => {
    console.log('🚀 Start clicked with params:', { system, gameId, bookingId, vendorId });
    
    if (!system || !gameId || !bookingId) {
      console.error('❌ Missing required parameters:', { system, gameId, bookingId });
      return;
    }
    
    if (!vendorId) {
      console.error('❌ VendorId is not available');
      return;
    }
    
    setSelectedSystem(system);
    setSelectedGameId(gameId);
    setSelectedBookingId(bookingId);
    setStartCard(true);
    fetchAvailableConsoles(gameId, vendorId);
  };

  // Enhanced fetch available consoles with comprehensive debugging
  const fetchAvailableConsoles = async (gameId: string, vendorId?: string) => {
    if (!vendorId) {
      console.error('❌ VendorId is missing for fetchAvailableConsoles');
      return;
    }
    
    console.log('🔍 Fetching consoles for gameId:', gameId, 'vendorId:', vendorId);
    
    setIsLoading(true);
    try {
      const apiUrl = `${DASHBOARD_URL}/api/getAllDevice/consoleTypeId/${gameId}/vendor/${vendorId}`;
      console.log('📡 API URL:', apiUrl);
      
      const response = await axios.get(apiUrl);
      console.log('📦 Raw API Response:', response.data);
      console.log('📦 Response type:', typeof response.data);
      console.log('📦 Is array:', Array.isArray(response.data));
      
      if (response.data && Array.isArray(response.data)) {
        console.log('🎮 All consoles before filtering:', response.data.map(c => ({
          id: c.consoleId,
          brand: c.brand,
          model: c.consoleModelNumber,
          available: c.is_available,
          status: c.status,
          raw: c // Include full object for debugging
        })));
        
        // Try different filtering approaches to debug
        console.log('🔍 Checking is_available values:', response.data.map(c => ({
          id: c.consoleId,
          is_available: c.is_available,
          type: typeof c.is_available,
          stringValue: String(c.is_available)
        })));
        
        // Filter with multiple approaches
        const strictFilter = response.data.filter((console: any) => console?.is_available === true);
        const looseFilter = response.data.filter((console: any) => console?.is_available);
        const stringFilter = response.data.filter((console: any) => 
          String(console?.is_available).toLowerCase() === 'true'
        );
        
        console.log('✅ Strict filter (=== true):', strictFilter.length, 'consoles');
        console.log('✅ Loose filter (truthy):', looseFilter.length, 'consoles'); 
        console.log('✅ String filter ("true"):', stringFilter.length, 'consoles');
        
        // Use the filter that returns results, preferring strict
        let availableOnly = strictFilter;
        if (availableOnly.length === 0 && looseFilter.length > 0) {
          availableOnly = looseFilter;
          console.log('🔄 Using loose filter instead');
        }
        if (availableOnly.length === 0 && stringFilter.length > 0) {
          availableOnly = stringFilter;
          console.log('🔄 Using string filter instead');
        }
        
        console.log('✅ Final available consoles:', availableOnly.length);
        console.log('✅ Available console details:', availableOnly.map(c => ({
          id: c.consoleId,
          brand: c.brand,
          model: c.consoleModelNumber,
          available: c.is_available
        })));
        
        setAvailableConsoles(availableOnly);
      } else {
        console.warn('⚠️ API response is not an array or is empty:', response.data);
        setAvailableConsoles([]);
      }
    } catch (error) {
      console.error("❌ Error fetching available consoles:", error);
      if (axios.isAxiosError(error)) {
        console.error("📡 API Error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
      }
      setAvailableConsoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle session start submission
  const handleSubmit = async () => {
    if (selectedConsole && selectedGameId && selectedBookingId) {
      setIsLoading(true);

      const selectedMergedBooking = mergedBookings.find(
        (booking) => booking.bookingId === selectedBookingId || booking.merged_booking_ids?.includes(selectedBookingId)
      );
      const bookingIds = selectedMergedBooking?.merged_booking_ids || [selectedBookingId];

      const url = bookingIds.length > 1
        ? `${DASHBOARD_URL}/api/assignConsoleToMultipleBookings`
        : `${DASHBOARD_URL}/api/updateDeviceStatus/consoleTypeId/${selectedGameId}/console/${selectedConsole}/bookingId/${selectedBookingId}/vendor/${vendorId}`;

      const payload = bookingIds.length > 1
        ? {
            console_id: selectedConsole,
            game_id: selectedGameId,
            booking_ids: bookingIds,
            vendor_id: vendorId,
          }
        : null;

      try {
        if (bookingIds.length > 1) {
          await axios.post(url, payload);
        } else {
          await axios.post(url);
        }

        setStartCard(false);
        setRefreshSlots((prev) => !prev);
        
        setUpcomingBookings(prev => 
          Array.isArray(prev) ? prev.filter(booking => !bookingIds.includes(booking?.bookingId)) : []
        );
        
      } catch (error) {
        console.error("Error updating console status:", error);
      } finally {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("refresh-dashboard"));
        }
        setIsLoading(false);
      }
    }
  };

  // Handle console selection
  const handleConsoleSelection = (consoleId: number) => {
    setSelectedConsole(consoleId);
  };

  // ✅ ENHANCED: Enhanced meal/food icon click handlers
  const handleFoodIconClick = (bookingId: string, customerName: string, hasMeals: boolean) => {
    console.log('🍽️ Food icon clicked:', { bookingId, customerName, hasMeals });
    
    setMealDetailsModal({
      isOpen: true,
      bookingId,
      customerName,
      mode: 'view', // Always start in view mode, modal can switch to add
      hasExistingMeals: hasMeals
    });
  };

  const handleAddFoodClick = (bookingId: string, customerName: string) => {
    console.log('➕ Add food clicked:', { bookingId, customerName });
    
    setMealDetailsModal({
      isOpen: true,
      bookingId,
      customerName,
      mode: 'add', // Direct add mode
      hasExistingMeals: false
    });
  };

  const closeMealDetailsModal = () => {
    setMealDetailsModal({
      isOpen: false,
      bookingId: '',
      customerName: '',
      mode: 'view',
      hasExistingMeals: false
    });
  };

  return (
    // 🚀 FIXED: Proper flex container structure
    <div className="h-full flex flex-col overflow-hidden">
      <AnimatePresence>
        {startCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[9999] bg-transparent backdrop-blur-sm p-2 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="w-full max-w-xs sm:max-w-md md:max-w-lg"
            >
              <Card className="bg-gray-50 dark:bg-zinc-900 overflow-hidden border border-gray-200 dark:border-zinc-800">
                <div className="p-2 sm:p-3 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Select Console</h2>
                    <button
                      onClick={() => setStartCard(false)}
                      className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-2 sm:p-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-24 sm:h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent"></div>
                    </div>
                  ) : availableConsoles.length === 0 ? (
                    <div className="text-center py-6">
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <h3 className="text-sm font-medium mb-1">No Consoles Available</h3>
                      <p className="text-gray-500 text-xs">All consoles are in use.</p>
                      {/* Debug info - remove in production */}
                      <div className="mt-4 p-2 bg-gray-100 dark:bg-zinc-800 rounded text-xs text-left">
                        <p>Debug Info:</p>
                        <p>GameId: {selectedGameId}</p>
                        <p>VendorId: {vendorId}</p>
                        <p>Check console for API response details</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableConsoles.map((console) => (
                        <motion.div
                          key={console.consoleId}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleConsoleSelection(console.consoleId)}
                          className={`cursor-pointer rounded-lg border ${
                            selectedConsole === console.consoleId
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                              : "border-gray-200 dark:border-zinc-800 hover:border-emerald-500/50"
                          } p-2 sm:p-3 transition-all duration-200`}
                        >
                          <div className="flex items-center space-x-2">
                            {getIcon(selectedSystem)}
                            <div>
                              <h3 className="text-sm font-medium">{console.brand}</h3>
                              <p className="text-xs text-gray-500">{console.consoleModelNumber}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={!selectedConsole || isLoading}
                    className={`w-full mt-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center space-x-2 ${
                      selectedConsole && !isLoading
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Start Session</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Fixed height */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 sm:pb-3 gap-2 sm:gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 mt-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mt-2">Upcoming Bookings</h3>
          <span className="px-2 py-0.5 bg-emerald-100 mt-2 text-emerald-800 rounded-full text-xs">
            {filteredBookings.length}
          </span>
        </div>
      </div>

      {/* Search Filter - Fixed height */}
      <div className="pb-2 sm:pb-3 flex-shrink-0">
        <ResponsiveSearchFilter
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
        />
      </div>

      {/* 🚀 FIXED: Scrollable content area that takes remaining space */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {mergedBookings.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-6 px-3 text-gray-500">
            <CalendarIcon className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No bookings found</p>
            <p className="text-xs mt-1 text-center">
              {isConnected ? "Waiting for bookings..." : "Check filters"}
            </p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="space-y-2 sm:space-y-3 lg:space-y-4 p-2 sm:p-4">
              <AnimatePresence mode="popLayout">
                {mergedBookings.map((booking, index) => (
                  <motion.div
                    key={booking.bookingId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    layout
                    transition={{ 
                      duration: 0.3, 
                      delay: index * 0.02 
                    }}
                    className="bg-gray-50 dark:bg-zinc-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-zinc-700 p-2 sm:p-4 hover:shadow-sm transition-shadow duration-200"
                  >
                    <div className="space-y-2">
                      {/* User info row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate text-xs sm:text-sm font-medium">{booking.username || "Guest User"}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 shrink-0">
                          Paid
                        </span>
                      </div>

                      {/* Time/duration row */}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{booking.time || 'No time set'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Timer className="w-3 h-3 shrink-0" />
                          <span>{booking.duration || 1}hr</span>
                        </div>
                        
                        {/* ✅ ENHANCED: Food/Meal icons - Conditional rendering */}
                        <div className="flex items-center gap-2 ml-auto">
                          {booking.hasMeals ? (
                            // Show food icon for users who have ordered meals
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFoodIconClick(booking.bookingId, booking.username || 'Guest User', true);
                              }}
                              className="flex items-center gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full p-1.5 transition-all duration-200 group"
                              title="View meals & add more"
                            >
                              <UtensilsCrossed className="w-4 h-4 text-emerald-600 group-hover:text-emerald-700 transition-colors" />
                              <span className="text-xs text-emerald-600 group-hover:text-emerald-700 font-medium">
                                Meals
                              </span>
                            </motion.button>
                          ) : (
                            // Show add food icon for users who haven't ordered meals
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddFoodClick(booking.bookingId, booking.username || 'Guest User');
                              }}
                              className="flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full p-1.5 transition-all duration-200 group border border-dashed border-blue-300 dark:border-blue-600"
                              title="Add meals to this booking"
                            >
                              <Plus className="w-3 h-3 text-blue-600 group-hover:text-blue-700 transition-colors" />
                              <UtensilsCrossed className="w-3 h-3 text-blue-600 group-hover:text-blue-700 transition-colors" />
                              <span className="text-xs text-blue-600 group-hover:text-blue-700 font-medium">
                                Add
                              </span>
                            </motion.button>
                          )}
                        </div>
                      </div>

                      {/* Start button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          start(booking.consoleType || "", booking.game_id, booking.bookingId)
                        }
                        className="w-full py-1.5 sm:py-2 text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-md font-medium transition-all flex items-center justify-center gap-2"
                      >
                        <Play className="w-3 h-3" />
                        Start
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
      
      {/* ✅ ENHANCED: Pass additional props to MealDetailsModal */}
      <MealDetailsModal
        isOpen={mealDetailsModal.isOpen}
        onClose={closeMealDetailsModal}
        bookingId={mealDetailsModal.bookingId}
        customerName={mealDetailsModal.customerName}
        initialMode={mealDetailsModal.mode}
        hasExistingMeals={mealDetailsModal.hasExistingMeals}
        vendorId={vendorId}
      />
    </div>
  );
}
