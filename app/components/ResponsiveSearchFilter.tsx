import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronDown, Filter, Search, X } from "lucide-react";

export default function ResponsiveSearchFilter({
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  timeFilter,
  setTimeFilter,
}) {
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <div className="w-full">
      {/* Top Bar */}
      <div className="flex items-center gap-2 sm:gap-3 flex-nowrap overflow-x-auto px-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-sm w-full pl-8 pr-2 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
          />
        </div>

        {/* Filter Icon */}
        <button
          onClick={() => setShowOverlay(true)}
          className="p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Slide-In Right Overlay Drawer */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-end"
            onClick={() => setShowOverlay(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
              className="bg-white dark:bg-zinc-900 w-[85vw] sm:w-[400px] h-full p-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium">Filters</h3>
                <button onClick={() => setShowOverlay(false)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Date Picker */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Select Date</label>
                <input
                  type="date"
                  value={selectedDate.split("T")[0]}
                  onChange={(e) =>
                    setSelectedDate(new Date(e.target.value).toISOString())
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                />
              </div>
            {/* Time Slot Selection */}
            <div className="mt-6">
            <label className="block text-sm font-medium mb-2">Select Time Slot</label>
            <div className="grid grid-cols-2 gap-2">
                {["all", "morning", "afternoon", "evening"].map((slot) => (
                <button
                    key={slot}
                    onClick={() => {
                    setTimeFilter(slot);
                    setShowOverlay(false);
                    }}
                    className={`px-3 py-2 text-sm rounded-lg border text-center transition-colors ${
                    timeFilter === slot
                        ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 border-emerald-300"
                        : "border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800"
                    }`}
                >
                    {slot.charAt(0).toUpperCase() + slot.slice(1)}
                </button>
                ))}
            </div>
            </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
