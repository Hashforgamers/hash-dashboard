import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";

interface FilterProps {
  filters: {
    modeOfPayment: string | null;
    bookingType: string | null;
    settlementStatus: string | null;
  };
  setFilters: React.Dispatch<
    React.SetStateAction<{
      modeOfPayment: string | null;
      bookingType: string | null;
      settlementStatus: string | null;
    }>
  >;
  showFilter: boolean;
  setShowFilter: (show: boolean) => void;
}

const FilterComponent: React.FC<FilterProps> = ({
  filters,
  setFilters,
  showFilter,
  setShowFilter,
}) => {
  const [selectedFilters, setSelectedFilters] = useState(filters);

  const clearFilters = () => {
    const clearedFilters = {
      modeOfPayment: null,
      bookingType: null,
      settlementStatus: null,
    };
    setSelectedFilters(clearedFilters);
    setFilters(clearedFilters);
    setShowFilter(false);
  };

  const toggleFilter = (
    filterType: keyof typeof filters,
    value: string | null
  ) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType] === value ? null : value,
    }));
  };

  const applyFilters = () => {
    setFilters(selectedFilters);
    setShowFilter(false);
  };

  return (
    <AnimatePresence>
      {showFilter && (
        <motion.div
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1 }}
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setShowFilter(false)}
        >
          <Card
            className="dashboard-module dashboard-module-card fixed inset-x-2 bottom-2 top-20 w-auto overflow-y-auto p-2 shadow-xl md:inset-x-auto md:bottom-auto md:right-4 md:top-24 md:w-[min(92vw,24rem)] md:overflow-visible"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="top-0">
              <button
                className="absolute right-2 rounded-md p-2 transition-all hover:scale-110 hover:bg-rose-50 dark:hover:bg-rose-500/20"
                onClick={() => setShowFilter(false)}
              >
                <X className="h-5 w-5 text-slate-700 dark:text-gray-300" />
              </button>

              <CardTitle className="text-center text-lg font-semibold text-slate-900 dark:text-white">
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">Mode of Payment</h3>
                <div className="flex flex-wrap gap-2 mt-2 ">
                  {["Cash", "PayPal", null].map((option) => (
                    <Badge
                      key={option ?? "None"}
                      variant={
                        selectedFilters.modeOfPayment === option
                          ? "default"
                          : "outline"
                      }
                      className={`cursor-pointer px-3 py-1 text-sm ${
                        selectedFilters.modeOfPayment === option
                          ? "border border-cyan-300 bg-cyan-50 text-slate-900 dark:border-cyan-500/40 dark:bg-cyan-500/20 dark:text-cyan-200"
                          : "border border-slate-300 text-slate-700 dark:border-slate-500/70 dark:text-slate-300"
                      }`}
                      onClick={() => toggleFilter("modeOfPayment", option)}
                    >
                      {option ?? "None"}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Booking Type */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">Booking Type</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["Hash", "Direct", null].map((option) => (
                    <Badge
                      key={option ?? "None"}
                      variant={
                        selectedFilters.bookingType === option
                          ? "default"
                          : "outline"
                      }
                      className={`cursor-pointer px-3 py-1 text-sm ${
                        selectedFilters.bookingType === option
                          ? "border border-cyan-300 bg-cyan-50 text-slate-900 dark:border-cyan-500/40 dark:bg-cyan-500/20 dark:text-cyan-200"
                          : "border border-slate-300 text-slate-700 dark:border-slate-500/70 dark:text-slate-300"
                      }`}
                      onClick={() => toggleFilter("bookingType", option)}
                    >
                      {option ?? "None"}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Settlement Status */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">Settlement Status</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["Pending", "Done", null].map((option) => (
                    <Badge
                      key={option ?? "All"}
                      variant={
                        selectedFilters.settlementStatus === option
                          ? "default"
                          : "outline"
                      }
                      className={`cursor-pointer px-3 py-1 text-sm ${
                        selectedFilters.settlementStatus === option
                          ? "border border-cyan-300 bg-cyan-50 text-slate-900 dark:border-cyan-500/40 dark:bg-cyan-500/20 dark:text-cyan-200"
                          : "border border-slate-300 text-slate-700 dark:border-slate-500/70 dark:text-slate-300"
                      }`}
                      onClick={() => toggleFilter("settlementStatus", option)}
                    >
                      {option ?? "All"}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="mx-2 flex flex-col justify-center gap-2 sm:flex-row">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="mx-0 my-2 px-4 py-2 text-sm text-slate-900 hover:bg-rose-50 sm:mx-2 sm:my-4 dark:text-white dark:hover:bg-rose-500/20"
                >
                  Clear Filters
                </Button>
                <Button
                  onClick={applyFilters}
                  variant="outline"
                  className="mx-0 my-2 border border-emerald-300 bg-white px-4 py-2 text-sm text-slate-900 hover:bg-emerald-50 sm:mx-2 sm:my-4 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                >
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilterComponent;
