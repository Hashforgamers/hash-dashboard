import { motion } from "framer-motion";
import { Play } from "lucide-react";

const bookings = [
  {
    id: 1,
    user: "Martin Dokidia",
    system: "Xbox | Set 2",
    time: "12:00pm",
    duration: "2hrs",
    status: "Paid",
  },
  {
    id: 2,
    user: "Kianna Botosh",
    system: "PS5 | Set 5",
    time: "12:00pm",
    duration: "2hrs",
    status: "Not Paid",
  },
  {
    id: 3,
    user: "Kadri Gouse",
    system: "PC5",
    time: "12:00pm",
    duration: "2hrs",
    status: "Paid",
  },
  {
    id: 4,
    user: "Martin Dokidia",
    system: "Xbox | Set 2",
    time: "12:00pm",
    duration: "2hrs",
    status: "Paid",
  },
  {
    id: 5,
    user: "Kianna Botosh",
    system: "PS5 | Set 5",
    time: "12:00pm",
    duration: "2hrs",
    status: "Not Paid",
  },
  {
    id: 6,
    user: "Kadri Gouse",
    system: "PC5",
    time: "12:00pm",
    duration: "2hrs",
    status: "Paid",
  },];

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

export function UpcomingBookings() {
  return (
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
        className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-green-500 scrollbar-track-gray-100"
      >
        {bookings.map((booking) => (
          <motion.div
            key={booking.id}
            variants={item}
            className="bg-white dark:bg-zinc-900 rounded-lg p-2 border border-gray-200 dark:border-zinc-800 shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white">
                  {booking.user}
                </h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  {booking.system}
                </p>
              </div>
              {booking.status === "Paid" ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-1 bg-emerald-500 text-white rounded-md text-sm hover:bg-emerald-600 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start
                </motion.button>
              ) : (
                <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded-md text-xs">
                  Not Paid
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-500 dark:text-zinc-400">
              <span>{booking.time}</span>
              <span>{booking.duration}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

