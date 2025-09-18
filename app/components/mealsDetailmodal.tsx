// components/MealDetailsModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChefHat, Loader2, IndianRupee, Package } from 'lucide-react';
import { BOOKING_URL, DASHBOARD_URL } from '@/src/config/env';

interface MealDetail {
  id: number;
  menu_item_name: string;
  category_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface MealDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  customerName: string;
}

const MealDetailsModal: React.FC<MealDetailsModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  customerName
}) => {
  const [mealDetails, setMealDetails] = useState<MealDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchMealDetails();
    }
  }, [isOpen, bookingId]);

  const fetchMealDetails = async () => {
    setLoading(true);
    setError('');
    try {
      // ✅ Try different URL patterns
      let response;
      let data;
      
      // Try DASHBOARD_URL first
      try {
        response = await fetch(`${DASHBOARD_URL}/api/booking/${bookingId}/details`);
        if (!response.ok) {
          // If 404 or error, try BOOKING_URL
          response = await fetch(`${BOOKING_URL}/api/booking/${bookingId}/details`);
        }
      } catch {
        // Fallback to BOOKING_URL
        response = await fetch(`${BOOKING_URL}/api/booking/${bookingId}/details`);
      }
      
      // ✅ Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned HTML instead of JSON - endpoint may not exist');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      data = await response.json();
      
      if (data.success && data.booking && data.booking.extra_services) {
        setMealDetails(data.booking.extra_services);
      } else if (data.success && Array.isArray(data.booking)) {
        // Handle different response format
        setMealDetails(data.booking);
      } else {
        console.log('API Response:', data); // Debug log
        setMealDetails([]);
      }
    } catch (err) {
      console.error('Error fetching meal details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load meal details');
    } finally {
      setLoading(false);
    }
  };

  const getTotalMealCost = () => 
    mealDetails.reduce((sum, meal) => sum + meal.total_price, 0);

  const getTotalItems = () => 
    mealDetails.reduce((sum, meal) => sum + meal.quantity, 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-lg">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  Meal Details
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {customerName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading meal details...</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-8 text-red-600">
                <Package className="w-8 h-8 mb-3" />
                <p className="text-sm text-center">{error}</p>
                <button
                  onClick={fetchMealDetails}
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                >
                  Retry
                </button>
                {/* Debug info */}
                <div className="mt-2 text-xs text-gray-500">
                  <p>Booking ID: {bookingId}</p>
                  <p>URL: {DASHBOARD_URL}/api/booking/{bookingId}/details</p>
                </div>
              </div>
            )}

            {!loading && !error && mealDetails.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <ChefHat className="w-8 h-8 mb-3 opacity-50" />
                <p className="text-sm">No meals ordered for this booking</p>
              </div>
            )}

            {!loading && !error && mealDetails.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <span>{getTotalItems()} items • Booking ID: {bookingId}</span>
                </div>

                {/* Meal Items */}
                <div className="space-y-2">
                  {mealDetails.map((meal, index) => (
                    <motion.div
                      key={meal.id || index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800 dark:text-white text-sm">
                            {meal.menu_item_name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {meal.category_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              ₹{meal.unit_price} × {meal.quantity}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-600">
                            ₹{meal.total_price}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Total */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 dark:text-white">Total Meal Cost:</span>
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-lg text-emerald-600">
                        {getTotalMealCost()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MealDetailsModal;
