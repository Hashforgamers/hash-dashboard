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
  const clearFilters = () => {
    const allFiltersNull =
      !filters.modeOfPayment &&
      !filters.bookingType &&
      !filters.settlementStatus;

    if (!allFiltersNull) {
      setFilters({
        modeOfPayment: null,
        bookingType: null,
        settlementStatus: null,
      });
      setShowFilter(false);
    }
    // setFilters({
    //   modeOfPayment: null,
    //   bookingType: null,
    //   settlementStatus: null,
    // });

    if (allFiltersNull) {
      setShowFilter(false);
    }
  };

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
          <Card className="p-2 absolute  z-20 ">
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
                        filters.modeOfPayment === option ? "default" : "outline"
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
                        filters.bookingType === option ? "default" : "outline"
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
                          ? "default"
                          : "outline"
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
              <div className="flex justify-center mt-4 ">
                <Button
                  onClick={() => clearFilters()}
                  variant="outline"
                  className="px-4 py-2 hover:bg-green-500 "
                >
                  Clear Filters
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
