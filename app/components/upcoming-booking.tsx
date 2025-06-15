import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Monitor, Play, X, Gamepad2, Calendar, Clock, User, Search,
  DollarSign, CalendarDays, Users, Timer, AlertCircle, Filter,
  BadgeCheck, Calendar as CalendarIcon, ChevronDown
} from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faIndianRupeeSign } from '@fortawesome/free-solid-svg-icons'

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { format, parseISO, isToday, isTomorrow, startOfToday } from 'date-fns';
import { DASHBOARD_URL } from "@/src/config/env";
import ResponsiveSearchFilter from "./ResponsiveSearchFilter";

export function getIcon(system: string): JSX.Element {
  if (system.toLowerCase().includes("ps5")) return <Gamepad2 className="w-5 h-5 text-blue-500" />;
  if (system.toLowerCase().includes("xbox")) return <Gamepad2 className="w-5 h-5 text-green-500" />;
  return <Monitor className="w-5 h-5 text-purple-500" />;
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
  const hour = parseInt(time.split(":")[0]);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'bg-emerald-100 text-emerald-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const mergeConsecutiveBookings = (bookings: any[]) => {
  // Group bookings by date first
  const byDate = bookings.reduce((acc: any, booking) => {
    const date = booking.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(booking);
    return acc;
  }, {});

  const parseTime = (time: string): Date => {
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

  // Process each date group
  Object.entries(byDate).forEach(([date, dateBookings]) => {
    const grouped = (dateBookings as any[]).reduce((acc: any, booking) => {
      const key = `${booking.userId}_${booking.game_id}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(booking);
      return acc;
    }, {});

    Object.values(grouped).forEach((group: any) => {
      const sorted = (group as any[]).sort((a, b) => {
        const aStart = parseTime(a.time.split(" - ")[0]);
        const bStart = parseTime(b.time.split(" - ")[0]);
        return aStart.getTime() - bStart.getTime();
      });

      let current = { ...sorted[0] };
      let currentStart = parseTime(current.time.split(" - ")[0]);
      let currentEnd = parseTime(current.time.split(" - ")[1]);
      let mergedIds = [current.bookingId];
      let totalPrice = current.slot_price;

      for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        const nextStart = parseTime(next.time.split(" - ")[0]);
        const nextEnd = parseTime(next.time.split(" - ")[1]);

        if (nextStart.getTime() <= currentEnd.getTime()) {
          currentEnd = new Date(Math.max(currentEnd.getTime(), nextEnd.getTime()));
          mergedIds.push(next.bookingId);
          totalPrice += next.slot_price;
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
          totalPrice = next.slot_price;
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

export function UpcomingBookings({
  upcomingBookings,
  gameId,
  vendorId,
  dashboardUrl,
  setRefreshSlots,
}: {
  upcomingBookings: any[];
  gameId: string;
  vendorId: string;
  dashboardUrl: string;
  setRefreshSlots: (prev: boolean) => void;
}): JSX.Element {
  const [startCard, setStartCard] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState("");
  const [availableConsoles, setAvailableConsoles] = useState<any[]>([]);
  const [selectedConsole, setSelectedConsole] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [showFilters, setShowFilters] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");

  const filteredBookings = useMemo(() => {
    let filtered = upcomingBookings;

    // Filter by date
    filtered = filtered.filter(booking => {
      const bookingDate = new Date(booking.date);
      const selected = new Date(selectedDate);
      return bookingDate.toDateString() === selected.toDateString();
    });

    // Apply search
    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(booking => 
        (booking.username?.toLowerCase() || 'guest user').includes(term) ||
        booking.consoleType?.toLowerCase().includes(term)
      );
    }

    // Apply time filter
    if (timeFilter !== "all") {
      filtered = filtered.filter(booking => {
        const timeOfDay = getTimeOfDay(booking.time.split(" ")[0]);
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

  const fetchAvailableConsoles = async (gameId: string, vendorId: string) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${DASHBOARD_URL}/api/getAllDevice/consoleTypeId/${gameId}/vendor/${vendorId}`
      );
      setAvailableConsoles(response.data.filter((console: any) => console.is_available));
    } catch (error) {
      console.error("Error fetching available consoles:", error);
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
      } catch (error) {
        console.error("Error updating console status:", error);
      } finally {
        // ✅ Notify dashboard to refresh immediately
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
    <div className="h-full flex flex-col bg-transparent rounded-lg shadow-lg px-4 md:px-6 max-w-screen-xl mx-auto w-full">
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
              className="w-full max-w-md sm:max-w-md"
            >
              <Card className="bg-gray-50 dark:bg-zinc-900 overflow-hidden border border-gray-200 dark:border-zinc-800">
                <div className="p-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Select Gaming Console</h2>
                    <button
                      onClick={() => setStartCard(false)}
                      className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
                    </div>
                  ) : availableConsoles.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                      <h3 className="text-lg font-medium mb-1">No Consoles Available</h3>
                      <p className="text-gray-500 text-sm">All gaming consoles are currently in use.</p>
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
                          } p-4 transition-all duration-200`}
                        >
                          <div className="flex items-center space-x-3">
                            {getIcon(selectedSystem)}
                            <div>
                              <h3 className="font-medium">{console.brand}</h3>
                              <p className="text-sm text-gray-500">{console.consoleModelNumber}</p>
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
                    className={`w-full mt-6 py-1.5 rounded-lg font-medium flex items-center justify-center space-x-2 ${
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

      <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold">Upcoming Bookings</h2>
            <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
              {filteredBookings.length}
            </span>
          </div>
        </div>
        <ResponsiveSearchFilter
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {mergedBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-gray-500">
            <CalendarIcon className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-lg font-medium">No bookings found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
        <div className="p-4 space-y-4">
          {mergedBookings.map((booking) => (
            <motion.div
              key={booking.bookingId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 p-4 sm:p-3 hover:shadow-lg transition-shadow duration-300"
            >
              {/* Card content */}
              <div className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
                
                {/* Top: User + Info */}
                <div className="flex flex-col space-y-2">
                  
                  {/* Username + Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                    <div className="flex items-center gap-2 font-medium truncate">
                      <User className="w-4 h-4 shrink-0" />
                      <span className="truncate">{booking.username || "Guest User"}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold self-start sm:self-center ${getStatusColor(
                        booking.status
                      )}`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  {/* Console, Time, Duration, Price */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {getIcon(booking.consoleType)}
                      <span>{booking.consoleType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{booking.time} - {booking.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4" />
                      <span>
                        {booking.duration} hour{booking.duration > 1 ? "s" : ""}
                      </span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1 text-sm">
                        <FontAwesomeIcon icon={faIndianRupeeSign} className="w-3.5 h-3.5" />
                        {booking.total_price}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom: Start Button */}
                <div className="flex justify-end mt-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      start(booking.consoleType, booking.game_id, booking.bookingId)
                    }
                    className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold shadow-md shadow-emerald-500/30 transition-all"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}