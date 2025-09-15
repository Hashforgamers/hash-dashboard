import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Monitor, Play, X, Gamepad2, Calendar, Clock, User, Search,
  DollarSign, CalendarDays, Users, Timer, AlertCircle, Filter,
  BadgeCheck, Calendar as CalendarIcon, ChevronDown, RefreshCw, UtensilsCrossed
} from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faIndianRupeeSign } from '@fortawesome/free-solid-svg-icons'
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { format, parseISO, isToday, isTomorrow, startOfToday } from 'date-fns';
import { DASHBOARD_URL } from "@/src/config/env";
import ResponsiveSearchFilter from "./ResponsiveSearchFilter";
import { useSocket } from "../context/SocketContext";

// Keep all your existing helper functions exactly the same
export function getIcon(system?: string | null): JSX.Element {
  const sys = (system || "").toLowerCase();
  
  if (sys.includes("ps5")) return <Gamepad2 className="w-4 h-4 text-blue-500" />;
  if (sys.includes("xbox")) return <Gamepad2 className="w-4 h-4 text-green-500" />;
  return <Monitor className="w-4 h-4 text-purple-500" />;
}

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

const getTimeOfDay = (time: string) => {
  if (!time) return "all";
  
  const hour = parseInt(time.split(":")[0]);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

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

  // Existing state - keep all the same
  const [startCard, setStartCard] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState("");
  const [availableConsoles, setAvailableConsoles] = useState<any[]>([]);
  const [selectedConsole, setSelectedConsole] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [timeFilter, setTimeFilter] = useState("all");

  // ✅ Keep all your existing useEffect hooks exactly the same
  useEffect(() => {
    if (Array.isArray(initialBookings)) {
      console.log('📅 UpcomingBookings: Updating from props with', initialBookings.length, 'bookings')
      setUpcomingBookings(initialBookings)
    }
  }, [initialBookings])

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

  // Keep all your existing functions exactly the same
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

  const mergedBookings = useMemo(() => 
    mergeConsecutiveBookings(filteredBookings),
    [filteredBookings]
  );

  const start = (system: string, gameId: string, bookingId: string) => {
    setSelectedSystem(system);
    setSelectedGameId(gameId);
    setSelectedBookingId(bookingId);
    setStartCard(true);
    fetchAvailableConsoles(gameId, vendorId);
  };

  const fetchAvailableConsoles = async (gameId: string, vendorId?: string) => {
    if (!vendorId) return;
    
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${DASHBOARD_URL}/api/getAllDevice/consoleTypeId/${gameId}/vendor/${vendorId}`
      );
      setAvailableConsoles(response.data?.filter((console: any) => console?.is_available) || []);
    } catch (error) {
      console.error("Error fetching available consoles:", error);
      setAvailableConsoles([]);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleConsoleSelection = (consoleId: number) => {
    setSelectedConsole(consoleId);
  };

  return (
    <div className="h-full flex flex-col">
      <AnimatePresence>
        {startCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[9999] bg-transparent backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="w-full max-w-md"
            >
              <Card className="bg-gray-50 dark:bg-zinc-900 overflow-hidden border border-gray-200 dark:border-zinc-800">
                <div className="p-3 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
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

                <div className="p-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent"></div>
                    </div>
                  ) : availableConsoles.length === 0 ? (
                    <div className="text-center py-6">
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <h3 className="text-sm font-medium mb-1">No Consoles Available</h3>
                      <p className="text-gray-500 text-xs">All consoles are in use.</p>
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
                          } p-3 transition-all duration-200`}
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
                    className={`w-full mt-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 ${
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

      {/* ✅ COMPACT: Minimal header with just connection indicator and title */}
      <div className="flex items-center justify-between pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 mt-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <h3 className="text-sm font-semibold text-foreground mt-2">Upcoming Bookings</h3>
          <span className="px-2 py-0.5 bg-emerald-100 mt-2 text-emerald-800 rounded-full text-xs">
            {filteredBookings.length}
          </span>
        </div>
      </div>

      {/* ✅ COMPACT: Simplified search - smaller */}
      <div className="pb-3 shrink-0">
        <ResponsiveSearchFilter
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
        />
      </div>

      {/* ✅ COMPACT: Scrollable content with smaller padding */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {mergedBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-6 px-3 text-gray-500">
            <CalendarIcon className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No bookings found</p>
            <p className="text-xs mt-1 text-center">
              {isConnected ? "Waiting for bookings..." : "Check filters"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 pr-1">
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
                  className="bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 p-2 hover:shadow-sm transition-shadow duration-200"
                >
                  <div className="space-y-2">
                    {/* ✅ COMPACT: User info with smaller elements */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate text-sm font-medium">{booking.username || "Guest User"}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 shrink-0">
                        Paid
                      </span>
                    </div>

                    {/* ✅ COMPACT: Time and duration info - smaller */}
                    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{booking.time || 'No time set'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Timer className="w-3 h-3 shrink-0" />
                        <span>{booking.duration || 1}hr</span>
                      </div>
                       {booking.hasMeals && (
                        <div className="flex items-center gap-1 ml-auto">
                         <UtensilsCrossed className="w-4 h-5 mr-2 my-1 text-emerald-600" title="Meals/Extras included" />
                         </div>
                       )}
                    </div>

                    {/* ✅ COMPACT: Start button - smaller */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        start(booking.consoleType || "", booking.game_id, booking.bookingId)
                      }
                      className="w-full py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-md font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-3 h-3" />
                      Start
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
