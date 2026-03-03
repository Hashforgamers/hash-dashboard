import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Search, X } from "lucide-react";

export default function ResponsiveSearchFilter({
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  timeFilter,
  setTimeFilter,
  className = "",
}) {
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <div className={`w-full ${className}`}>
      {/* Top Bar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 sm:h-4 sm:w-4" />
          <input
            type="text"
            placeholder="Search by name or console..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-600/70 bg-slate-800/70 py-2 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-400 focus:border-cyan-400/60 focus:outline-none sm:text-sm"
          />
        </div>

        {/* Filter Icon */}
        <button
          onClick={() => setShowOverlay(true)}
          className="rounded-lg border border-slate-600/70 bg-slate-800/70 p-2 text-slate-300 transition-colors hover:bg-slate-700/70"
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
              className="h-full w-[85vw] bg-slate-900 p-4 shadow-lg sm:w-[400px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium text-slate-100">Filters</h3>
                <button onClick={() => setShowOverlay(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Date Picker */}
              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium text-slate-200">Select Date</label>
                <input
                  type="date"
                  value={selectedDate.split("T")[0]}
                  onChange={(e) =>
                    setSelectedDate(new Date(e.target.value).toISOString())
                  }
                  className="w-full rounded-lg border border-slate-600/70 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400/60 focus:outline-none transition-colors"
                />
              </div>
            {/* Time Slot Selection */}
            <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-slate-200">Select Time Slot</label>
            <div className="grid grid-cols-2 gap-2">
                {["all", "morning", "afternoon", "evening"].map((slot) => (
                <button
                    key={slot}
                    onClick={() => {
                    setTimeFilter(slot);
                    setShowOverlay(false);
                    }}
                    className={`rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                    timeFilter === slot
                        ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                        : "border-slate-600/70 bg-slate-800/70 text-slate-200 hover:bg-slate-700/70"
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
