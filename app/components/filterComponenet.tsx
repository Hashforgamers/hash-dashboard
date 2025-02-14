import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
  const toggleFilter = (
    filterType: keyof typeof filters,
    value: string | null
  ) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType] === value ? null : value,
    }));
  };

  return (
    <AnimatePresence>
      {showFilter && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="relative left-[80%] w-[25%] max-w-lg -translate-x-1/2 -translate-y-1/2 shadow-lg rounded-lg p-1  dark:border-gray-700  "
        >
          {/* Exit Button */}
          {/* <button
            className="absolute top-3 right-2 p-2 transition-all rounded-md hover:bg-red-500 hover:scale-110"
            onClick={() => setShowFilter(false)}
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button> */}

          {/* Filter Options */}
          <Card className="p-2 absolute  z-20 ">
            {/* <button
              className="absolute top-3 right-2 p-2 transition-all rounded-md hover:bg-red-500 hover:scale-110"
              onClick={() => setShowFilter(false)}
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button> */}
            <CardHeader className="top-0">
              <button
                className="absolute right-2 p-2 transition-all rounded-md hover:bg-red-500 hover:scale-110"
                onClick={() => setShowFilter(false)}
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              <CardTitle className="text-center text-lg font-semibold ">
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode of Payment */}
              <div>
                <h3 className="text-sm font-medium">Mode of Payment</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["Cash", "PayPal", null].map((option) => (
                    <Badge
                      key={option ?? "None"}
                      variant={
                        filters.modeOfPayment === option ? "outline" : "default"
                      }
                      className="cursor-pointer"
                      onClick={() => toggleFilter("modeOfPayment", option)}
                    >
                      {option ?? "None"}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Booking Type */}
              <div>
                <h3 className="text-sm font-medium">Booking Type</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["hash", "direct", null].map((option) => (
                    <Badge
                      key={option ?? "None"}
                      variant={
                        filters.bookingType === option ? "outline" : "default"
                      }
                      className="cursor-pointer"
                      onClick={() => toggleFilter("bookingType", option)}
                    >
                      {option ?? "None"}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Settlement Status */}
              <div>
                <h3 className="text-sm font-medium">Settlement Status</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["pending", "done", null].map((option) => (
                    <Badge
                      key={option ?? "All"}
                      variant={
                        filters.settlementStatus === option
                          ? "outline"
                          : "default"
                      }
                      className="cursor-pointer"
                      onClick={() => toggleFilter("settlementStatus", option)}
                    >
                      {option ?? "All"}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Apply Button */}
              {/* <div className="flex justify-center mt-4 ">
                <Button
                  onClick={() => setShowFilter(false)}
                  className="px-6 py-2  hower:bg-green-400"
                >
                  Apply Filters
                </Button>
              </div> */}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilterComponent;
