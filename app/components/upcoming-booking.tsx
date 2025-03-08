import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Play, Monitor, X, Gamepad2 } from "lucide-react";
import { useState } from "react";

export function getIcon(system: string): JSX.Element {
  if (system.includes("PS5"))
    return <Gamepad2 className="w-36 h-36 text-blue-400" />;
  if (system.includes("Xbox"))
    return <Gamepad2 className="w-36 h-36 text-green-400" />;
  return <Monitor className="w-36 h-36 text-white" />;
}

export function UpcomingBookings({ upcomingBookings }: { upcomingBookings: any[] }): JSX.Element {
  const [startCard, setStartCard] = useState(false);
  const [SelectedSystem, setSelectedSystem] = useState("");
  
  function start(system: string): void {
    setSelectedSystem(system);
    setStartCard(true);
  }

  const [selectedPC, setSelectedPC] = useState<Set<number>>(new Set());

  const handleClick = (index: number): void => {
    setSelectedPC((prev: Set<number>) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0 },
  };

  return (
    <>
      {startCard && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/50 backdrop-blur-md"
        >
          <div className="flex flex-col items-center gap-4">
            <Card className="p-6 bg-grey-200 text-white text-center shadow-lg rounded-md flex flex-wrap gap-4 justify-center w-3/4 relative min-h-[400px]">
              <div>
                <X
                  className="h-8 w-8 text-red-600 hover:text-white hover:bg-gray-500 p-1 rounded-full absolute top-2 right-1 cursor-pointer font-bold text-2xl"
                  onClick={() => {
                    setStartCard(false);
                    setSelectedPC(new Set());
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-4 justify-center">
                {Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <Card
                        className={`w-52 h-52 flex flex-col justify-center items-center rounded-md cursor-pointer transition ${
                          selectedPC.has(index) ? "bg-gray-500" : "bg-black"
                        }`}
                        onClick={() => handleClick(index)}
                      >
                        {getIcon(SelectedSystem)}
                        <div className="text-lg text-white mt-2">
                          {SelectedSystem}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
              </div>

              <button className="w-1/2 bg-green-600 py-2 px-4 rounded-md font-semibold">
                Submit
              </button>
            </Card>
          </div>
        </motion.div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Bookings
          </h2>
          <button className="text-sm text-emerald-500 hover:text-emerald-400">
            View all
          </button>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {upcomingBookings.map((booking) => (
            <motion.div
              key={booking.bookingId}
              variants={item}
              className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-800 shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white">
                    {booking.username}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                    {booking.consoleType}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-1 bg-emerald-500 text-white rounded-md text-sm hover:bg-emerald-600 transition-colors"
                  onClick={() => {
                    start(booking.consoleType);
                  }}
                >
                  <Play className="w-4 h-4" />
                  Start
                </motion.button>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-gray-500 dark:text-zinc-400">
                <span>{booking.time}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </>
  );
}
