import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Monitor, X, Gamepad2 } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";

export function getIcon(system: string): JSX.Element {
  if (system.includes("PS5")) return <Gamepad2 className="w-24 h-24 text-blue-400 transition-colors duration-200" />;
  if (system.includes("Xbox")) return <Gamepad2 className="w-24 h-24 text-green-400 transition-colors duration-200" />;
  return <Monitor className="w-24 h-24 text-white transition-colors duration-200" />;
}


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


  const fetchAvailableConsoles = async (gameId: string, vendorId: string) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `https://hfg-dashboard.onrender.com/api/getAllDevice/consoleTypeId/${gameId}/vendor/${vendorId}`
      );
      setAvailableConsoles(response.data.filter((console: any) => console.is_available));
    } catch (error) {
      console.error("Error fetching available consoles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const start = (system: string, gameId: string, bookingId: string) => {
    setSelectedSystem(system);
    setSelectedGameId(gameId);
    setSelectedBookingId(bookingId);
    setStartCard(true);
    fetchAvailableConsoles(gameId, vendorId);
  };
  
  const handleSubmit = async () => {
    if (selectedConsole !== null && selectedGameId !== null && selectedBookingId !== null) {
      setIsLoading(true);
      try {
        await axios.post(
          `https://hfg-dashboard.onrender.com/api/updateDeviceStatus/consoleTypeId/${selectedGameId}/console/${selectedConsole}/bookingId/${selectedBookingId}/vendor/${vendorId}`
        );
        setStartCard(false);
        setRefreshSlots((prev) => {
          console.log("I am Bhanu, previous value of refreshSlots:", prev);
          return !prev;
        });
             
        // ✅ Optional: Manually trigger a slot fetch if the parent isn't updating properly
        fetchAvailableConsoles(); 
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
    <>
      <AnimatePresence>
        {startCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ 
                duration: 0.2,
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
              className="w-full max-w-2xl"
            >
              <Card className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xl rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Select Console</h2>
                  <button
                    onClick={() => setStartCard(false)}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors duration-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {availableConsoles.map((console) => (
                        <motion.div
                          key={console.consoleId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card
                            className={`group cursor-pointer transition-all duration-200 overflow-hidden ${
                              selectedConsole === console.consoleId
                                ? "ring-2 ring-emerald-500 dark:ring-emerald-400"
                                : "hover:bg-gray-50 dark:hover:bg-zinc-800"
                            }`}
                            onClick={() => handleConsoleSelection(console.consoleId)}
                          >
                            <div className="p-4 flex flex-col items-center">
                              <motion.div
                                animate={{
                                  scale: selectedConsole === console.consoleId ? 1.1 : 1,
                                }}
                                transition={{ duration: 0.2 }}
                              >
                                {getIcon(selectedSystem)}
                              </motion.div>
                              <div className="text-center mt-2">
                                <h3 className="font-medium text-sm">{console.brand}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {console.consoleModelNumber}
                                </p>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedConsole && !isLoading
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                          : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      }`}
                      onClick={handleSubmit}
                      disabled={!selectedConsole || isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Processing...
                        </span>
                      ) : (
                        "Start Session"
                      )}
                    </motion.button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upcoming Bookings</h2>
          <button className="text-sm text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">
            View all
          </button>
        </div>

        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.1 } },
          }}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {upcomingBookings.map((booking) => (
            <motion.div
              key={booking.bookingId}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 },
              }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{booking.username}</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{booking.consoleType}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors duration-200"
                  onClick={() => start(booking.consoleType, booking.game_id, booking.bookingId)}
                >
                  <Play className="w-4 h-4" />
                  Start
                </motion.button>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-zinc-400">
                <span>{booking.time}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </>
  );
}

export default UpcomingBookings;