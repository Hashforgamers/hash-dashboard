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
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          // className="fixed left-[80%] w-[25%] max-w-lg -translate-x-1/2 -translate-y-1/2 shadow-lg rounded-lg p-1 dark:border-gray-700 z-50 backdrop-blur-sm bg-black/30 "
          // className="fixed left-[80%] w-[25%] w-full h-full flex items-center justify-center z-50 backdrop-blur-sm bg-black/30"
          className="fixed w-full h-full z-50 backdrop-blur-sm bg-black/30 "
        >
          <Card className="p-2 absolute left-[70%] fixed ">
            <CardHeader className="top-0">
              <button
                className="absolute right-2 p-2 transition-all rounded-md hover:bg-red-500 hover:scale-110"
                onClick={() => setShowFilter(false)}
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              <CardTitle className="text-center text-lg font-semibold">
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Mode of Payment</h3>
                <div className="flex flex-wrap gap-2 mt-2 ">
                  {["Cash", "PayPal", null].map((option) => (
                    <Badge
                      key={option ?? "None"}
                      variant={
                        selectedFilters.modeOfPayment === option
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer text-sm px-3 py-1"
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
                  {["Hash", "Direct", null].map((option) => (
                    <Badge
                      key={option ?? "None"}
                      variant={
                        selectedFilters.bookingType === option
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer text-sm px-3 py-1"
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
                  {["Pending", "Done", null].map((option) => (
                    <Badge
                      key={option ?? "All"}
                      variant={
                        selectedFilters.settlementStatus === option
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer text-sm px-3 py-1"
                      onClick={() => toggleFilter("settlementStatus", option)}
                    >
                      {option ?? "All"}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-center mx-2 ">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="px-4 py-2 text-sm hover:bg-red-500 mx-2 my-4"
                >
                  Clear Filters
                </Button>
                <Button
                  onClick={applyFilters}
                  variant="outline"
                  className="px-4 py-2 text-sm hover:bg-green-500 mx-2 my-4"
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
