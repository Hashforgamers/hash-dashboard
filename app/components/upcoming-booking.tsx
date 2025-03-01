import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Play, Monitor, X, Gamepad2 } from "lucide-react";

import { useState } from "react";

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

export function getIcon(system: string) {
  console.log(system);
  if (system.includes("PS5"))
    return <Gamepad2 className="w-36 h-36 text-blue-400" />;
  if (system.includes("Xbox"))
    return <Gamepad2 className="w-36 h-36 text-green-400" />;
  return <Monitor className="w-36 h-36 text-white" />;
}

export function UpcomingBookings() {
  const [startCard, setStartCard] = useState<boolean>(false);
  const [SelectedSystem, setSelectedSystem] = useState<string>("");
  function start(system: string) {
    setSelectedSystem(system);
    setStartCard(true);
  }
  const [selectedPC, setSelectedPC] = useState<Set<number>>(new Set());

  const handleClick = (index: number) => {
    setSelectedPC((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index); // Unselect if already selected
      } else {
        newSet.add(index); // Select if not already selected
      }
      return newSet;
    });
  };
  return (
    <>
      {startCard && ( // ✅ Corrected conditional rendering
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/50 backdrop-blur-md"
        >
          <div className="flex flex-col items-center gap-4">
            {/* Green Background Div */}
            <Card className="p-6 bg-grey-200 text-white text-center shadow-lg rounded-md flex flex-wrap gap-4 justify-center w-3/4 relative min-h-[400px]">
              {/* Close Button */}
              <div>
                {" "}
                <X
                  className="h-8 w-8 text-red-600 hover:text-white hover:bg-gray-500 p-1 rounded-full absolute top-2 right-1 cursor-pointer font-bold text-2xl"
                  onClick={() => {
                    setStartCard(false);
                    setSelectedPC(new Set());
                  }}
                />
              </div>

              {/* Animated Monitor Cards */}
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

              <button className="w-1/2 bg-green-600  py-2 px-4 rounded-md font-semibold ">
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
          {bookings.map((booking) => (
            <motion.div
              key={booking.id}
              variants={item}
              className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-zinc-800 shadow"
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
                    onClick={() => {
                      start(booking.system);
                    }}
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
    </>
  );
}

