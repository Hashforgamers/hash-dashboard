import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Minus,
  ShoppingCart,
  Package,
  IndianRupee,
  ChefHat,
  Loader2
} from "lucide-react";
import { BOOKING_URL, DASHBOARD_URL } from "../../src/config/env";

interface MealImage {
  id: number;
  image_url: string;
  public_id: string;
}

interface MealItem {
  id: number;
  name: string;
  price: number;
  description: string;
  is_active: boolean;
  images: MealImage[];
}

interface MealCategory {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  menu_count: number;
  menus: MealItem[];
}

interface SelectedMeal {
  menu_item_id: number;
  name: string;
  price: number;
  quantity: number;
  total: number;
  category: string;
}

interface MealSelectorProps {
  vendorId: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (meals: SelectedMeal[]) => void;
  initialSelectedMeals?: SelectedMeal[];
}

const MealSelector: React.FC<MealSelectorProps> = ({
  vendorId,
  isOpen,
  onClose,
  onConfirm,
  initialSelectedMeals = [],
}) => {
  const [categories, setCategories] = useState<MealCategory[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>(
    initialSelectedMeals
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Selected category for display
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && vendorId) {
      fetchMeals();
    }
  }, [isOpen, vendorId]);

  // Reset selected meals when initialSelectedMeals prop updates
  useEffect(() => {
    setSelectedMeals(initialSelectedMeals);
  }, [initialSelectedMeals]);

  async function fetchMeals() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${DASHBOARD_URL}/api/vendor/${vendorId}/extra-services`
      );
      const data = await response.json();
      console.log(data)
      if (data.success) {
        setCategories(data.categories || []);
        if (data.categories && data.categories.length > 0) {
          setSelectedCategory(data.categories[0].id);
        }
      } else {
        setError("failed to load meals");
        console.log(error)
      }
    } catch (err) {
      console.error(err);
      setError("Error loading meals");
    }
    setLoading(false);
  }

  const updateMealQuantity = (
    item: MealItem,
    newQuantity: number,
    categoryName: string
  ) => {
    if (newQuantity <= 0) {
      setSelectedMeals((prev) =>
        prev.filter((meal) => meal.menu_item_id !== item.id)
      );
    } else {
      setSelectedMeals((prev) => {
        const index = prev.findIndex((meal) => meal.menu_item_id === item.id);
        const updatedMeal: SelectedMeal = {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: newQuantity,
          total: item.price * newQuantity,
          category: categoryName,
        };
        if (index >= 0) {
          const copy = [...prev];
          copy[index] = updatedMeal;
          return copy;
        }
        return [...prev, updatedMeal];
      });
    }
  };

  const getMealQuantity = (itemId: number): number =>
    selectedMeals.find((meal) => meal.menu_item_id === itemId)?.quantity || 0;

  // Remove all selected meals
  const clearSelection = () => setSelectedMeals([]);

  // Confirm button callback
  const handleConfirm = () => {
    onConfirm(selectedMeals);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      key="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-300 p-6 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-green-700 p-3 text-white">
              <ChefHat size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Add Meals & Extras
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {categories.length} categories •{" "}
                {categories.reduce((sum, c) => sum + c.menu_count, 0)} items
                available
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg bg-green-600 px-5 py-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1"
              onClick={handleConfirm}
            >
              Add to Order
            </button>
            <button
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex h-[80vh] overflow-hidden">
          {/* Sidebar - Categories */}
          <aside className="w-64 overflow-auto border-r border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Categories
            </h3>
            {categories.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400">No categories</p>
            )}
            <ul>
              {categories.map((category) => (
                <li key={category.id} className="mb-2">
                  <button
                    className={`block w-full rounded-lg p-2 text-left transition-colors duration-200 ${
                      selectedCategory === category.id
                        ? "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : "hover:bg-green-100 dark:hover:bg-green-900/30"
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{category.name}</span>
                      <span className="rounded-full bg-gray-300 px-2 text-xs font-semibold text-gray-700 dark:bg-gray-600 dark:text-gray-300">
                        {category.menu_count}
                      </span>
                    </div>
                    {category.description && (
                      <p className="mt-1 text-xs text-gray-600 line-clamp-2 dark:text-gray-400">
                        {category.description}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Main content */}
          <section className="flex-1 overflow-auto p-6">
            {loading && (
              <div className="flex flex-col items-center justify-center space-y-3">
                <Loader2 size={48} className="animate-spin text-green-600" />
                <p className="text-green-800 dark:text-green-400">Loading meals…</p>
              </div>
            )}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center gap-4 text-red-600">
                <Package size={64} />
                <p>{error}</p>
                <button
                  onClick={fetchMeals}
                  className="rounded bg-green-700 px-4 py-2 text-white hover:bg-green-800"
                >
                  Retry
                </button>
              </div>
            )}
            {!loading && !error && categories.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 text-gray-400">
                <ChefHat size={64} />
                <p>No meals available</p>
              </div>
            )}

            {!loading &&
              !error &&
              categories.length > 0 &&
              selectedCategory &&
              categories
                .find((c) => c.id === selectedCategory)
                ?.menus?.map((item) => {
                  const quantity = getMealQuantity(item.id);

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      className={`mb-6 w-full max-w-md rounded-lg border-2 bg-white shadow-sm dark:bg-gray-700 ${
                        quantity > 0
                          ? "border-green-600 shadow-green-400"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      whileHover={{ y: -4 }}
                    >
                      {/* Image or placeholder */}
                      <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-t-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                        {item.images.length > 0 ? (
                          <img
                            className="h-full w-full object-cover"
                            src={item.images[0].image_url}
                            alt={item.name}
                          />
                        ) : (
                          <ChefHat className="text-green-500" size={64} />
                        )}
                        {quantity > 0 && (
                          <div className="pointer-events-none absolute right-4 top-4 rounded-lg bg-green-600 px-3 py-1 font-semibold text-white">
                            {quantity}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-200">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1 text-green-600">
                            <IndianRupee size={20} />
                            <span className="text-xl font-bold">{item.price}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() =>
                                updateMealQuantity(item, quantity - 1, selectedCategory)
                              }
                              disabled={quantity === 0}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="min-w-[26px] text-center font-semibold text-gray-900 dark:text-gray-100">
                              {quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateMealQuantity(item, quantity + 1, selectedCategory)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                        {quantity > 0 && (
                          <motion.p
                            layout
                            className="mt-4 text-right font-semibold text-green-700"
                          >
                            Subtotal: ₹{(quantity * item.price).toFixed(2)}
                          </motion.p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MealSelector;
