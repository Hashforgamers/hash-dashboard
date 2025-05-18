import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Play, X, Gamepad2, Calendar, Clock, User, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import { parse, format } from 'date-fns';
import { DASHBOARD_URL } from "@/src/config/env";

export function getIcon(system: string): JSX.Element {
  if (system.includes("PS5")) return <Gamepad2 className="w-5 h-5 text-blue-500" />;
  if (system.includes("Xbox")) return <Gamepad2 className="w-5 h-5 text-green-500" />;
  return <Monitor className="w-5 h-5 text-purple-500" />;
}

const mergeConsecutiveBookings = (bookings: any[]) => {
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

  const grouped = bookings.reduce((acc: any, booking) => {
    const key = `${booking.userId}_${booking.game_id}_${booking.date}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(booking);
    return acc;
  }, {});

  const mergedResults: any[] = [];

  for (const group of Object.values(grouped)) {
    const sorted = (group as any[]).sort((a, b) => {
      const aStart = parseTime(a.time.split(" - ")[0]);
      const bStart = parseTime(b.time.split(" - ")[0]);
      return aStart.getTime() - bStart.getTime();
    });

    let current = { ...sorted[0] };
    let currentStart = parseTime(current.time.split(" - ")[0]);
    let currentEnd = parseTime(current.time.split(" - ")[1]);
    let mergedIds = [current.bookingId];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const nextStart = parseTime(next.time.split(" - ")[0]);
      const nextEnd = parseTime(next.time.split(" - ")[1]);

      if (nextStart.getTime() <= currentEnd.getTime()) {
        currentEnd = new Date(Math.max(currentEnd.getTime(), nextEnd.getTime()));
        mergedIds.push(next.bookingId);
      } else {
        current.time = formatTimeRange(currentStart, currentEnd);
        current.merged_booking_ids = mergedIds;
        mergedResults.push(current);

        current = { ...next };
        currentStart = nextStart;
        currentEnd = nextEnd;
        mergedIds = [next.bookingId];
      }
    }

    current.time = formatTimeRange(currentStart, currentEnd);
    current.merged_booking_ids = mergedIds;
    mergedResults.push(current);
  }

  return mergedResults;
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

  const mergedBookings = mergeConsecutiveBookings(upcomingBookings);

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
        setIsLoading(false);
      }
    }
  };

  const handleConsoleSelection = (consoleId: number) => {
    setSelectedConsole(consoleId);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-zinc-900 rounded-lg shadow-lg">
      <AnimatePresence>
        {startCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="w-full max-w-lg"
            >
              <Card className="bg-white dark:bg-zinc-900 overflow-hidden border border-gray-200 dark:border-zinc-800">
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

                <div className="p-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
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
                    className={`w-full mt-6 py-2.5 rounded-lg font-medium flex items-center justify-center space-x-2 ${
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

      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-500" />
          Upcoming Bookings
        </h2>
        <button className="text-sm text-emerald-500 hover:text-emerald-600 font-medium flex items-center gap-1">
          View all
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {mergedBookings.map((booking) => (
            <motion.div
              key={booking.bookingId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <h3 className="font-medium truncate">{booking.username}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {getIcon(booking.consoleType)}
                    <span>{booking.consoleType}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{booking.time}</span>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => start(booking.consoleType, booking.game_id, booking.bookingId)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Play className="w-4 h-4" />
                  Start
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}