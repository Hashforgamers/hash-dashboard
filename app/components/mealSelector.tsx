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

// ✅ Image caching utility
const imageCache = new Map<string, HTMLImageElement>();

const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (imageCache.has(src)) {
      resolve(imageCache.get(src)!);
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
};

// ✅ Optimized Image component with caching
const CachedImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    preloadImage(src)
      .then(() => setLoaded(true))
      .catch(() => setError(true));
  }, [src]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 ${className}`}>
        <ChefHat className="text-green-500" size={32} />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <Loader2 className="animate-spin text-green-500" size={24} />
        </div>
      )}
      <img
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        src={src}
        alt={alt}
        loading="lazy"
      />
    </div>
  );
};

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
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && vendorId) {
      fetchMeals();
    }
  }, [isOpen, vendorId]);

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
      console.log(data);
      if (data.success) {
        setCategories(data.categories || []);
        if (data.categories && data.categories.length > 0) {
          setSelectedCategory(data.categories[0].id);
        }
      } else {
        setError("failed to load meals");
        console.log(error);
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

  const clearSelection = () => setSelectedMeals([]);

  const handleConfirm = () => {
    onConfirm(selectedMeals);
    onClose();
  };

  const getTotalCost = () => selectedMeals.reduce((sum, meal) => sum + meal.total, 0);
  const getTotalItems = () => selectedMeals.reduce((sum, meal) => sum + meal.quantity, 0);

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
        className="relative h-[85vh] w-full max-w-4xl overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-br from-slate-900/95 via-slate-900/92 to-slate-950/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ✅ Compact Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/25 bg-slate-900/80 p-4">
          <div className="flex items-center gap-3"> {/* ✅ gap-3 instead of gap-4 */}
            <div className="rounded-lg bg-cyan-500/20 p-2 text-cyan-200">
              <ChefHat size={20} /> {/* ✅ size 20 instead of 28 */}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Add Meals & Extras
              </h2>
              <p className="text-xs text-slate-400">
                {categories.length} categories •{" "}
                {categories.reduce((sum, c) => sum + c.menu_count, 0)} items
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm text-white hover:from-emerald-400 hover:to-cyan-400 focus:outline-none"
              onClick={handleConfirm}
            >
              Add to Order
            </button>
            <button
              className="rounded-lg p-2 text-slate-300 hover:bg-slate-700"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} /> {/* ✅ size 20 instead of 24 */}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex h-[calc(85vh-120px)] overflow-hidden"> {/* ✅ Adjusted height calculation */}
          {/* ✅ Compact Sidebar */}
          <aside className="w-56 overflow-auto border-r border-cyan-500/20 bg-slate-900/60 p-3">
            <h3 className="mb-3 text-xs font-semibold uppercase text-slate-300">
              Categories
            </h3>
            {categories.length === 0 && (
              <p className="text-xs text-slate-400">No categories</p>
            )}
            <ul>
              {categories.map((category) => (
                <li key={category.id} className="mb-1.5"> {/* ✅ mb-1.5 instead of mb-2 */}
                  <button
                    className={`block w-full rounded-lg p-2 text-left transition-colors duration-200 ${
                      selectedCategory === category.id
                        ? "bg-cyan-500/20 text-cyan-200"
                        : "hover:bg-slate-800"
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium text-sm">{category.name}</span> {/* ✅ text-sm */}
                      <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-xs font-semibold text-slate-200">
                        {category.menu_count}
                      </span>
                    </div>
                    {category.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                        {category.description}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* ✅ Compact Main content */}
          <section className="flex-1 overflow-auto bg-slate-900/35 p-4">
            {loading && (
              <div className="flex flex-col items-center justify-center space-y-3 h-64"> {/* ✅ h-64 for fixed height */}
                <Loader2 size={36} className="animate-spin text-green-600" /> {/* ✅ size 36 instead of 48 */}
                <p className="text-green-800 dark:text-green-400 text-sm">Loading meals…</p> {/* ✅ text-sm */}
              </div>
            )}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center gap-4 text-red-600 h-64">
                <Package size={48} /> {/* ✅ size 48 instead of 64 */}
                <p className="text-sm">{error}</p> {/* ✅ text-sm */}
                <button
                  onClick={fetchMeals}
                  className="rounded bg-green-700 px-4 py-2 text-white hover:bg-green-800 text-sm"
                >
                  Retry
                </button>
              </div>
            )}
            {!loading && !error && categories.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 text-gray-400 h-64">
                <ChefHat size={48} /> {/* ✅ size 48 instead of 64 */}
                <p className="text-sm">No meals available</p> {/* ✅ text-sm */}
              </div>
            )}

            {/* ✅ Compact Grid Layout */}
            {!loading &&
              !error &&
              categories.length > 0 &&
              selectedCategory && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> {/* ✅ Grid layout with gap-4 */}
                  {categories
                    .find((c) => c.id === selectedCategory)
                    ?.menus?.map((item) => {
                      const quantity = getMealQuantity(item.id);

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          className={`rounded-lg border-2 bg-slate-800/80 shadow-sm ${
                            quantity > 0
                              ? "border-emerald-400/70 shadow-emerald-500/20"
                              : "border-slate-600"
                          }`} /* ✅ Removed max-w-md, removed mb-6 */
                          whileHover={{ y: -2 }} /* ✅ Less hover effect */
                        >
                          {/* ✅ Smaller Image Container */}
                          <div className="relative h-32 w-full overflow-hidden rounded-t-lg"> {/* ✅ h-32 instead of h-48 */}
                            {item.images.length > 0 ? (
                              <CachedImage
                                src={item.images[0].image_url}
                                alt={item.name}
                                className="h-full w-full"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                                <ChefHat className="text-green-500" size={32} /> {/* ✅ size 32 instead of 64 */}
                              </div>
                            )}
                            {quantity > 0 && (
                              <div className="absolute right-2 top-2 rounded-lg bg-cyan-500/90 px-2 py-1 text-xs font-semibold text-white">
                                {quantity}
                              </div>
                            )}
                          </div>

                          {/* ✅ Compact Card Content */}
                          <div className="p-3"> {/* ✅ p-3 instead of p-4 */}
                            <h3 className="mb-1 line-clamp-1 text-sm font-semibold text-slate-100">
                              {item.name}
                            </h3>
                            {item.description && (
                              <p className="mb-3 line-clamp-2 text-xs text-slate-400">
                                {item.description}
                              </p>
                            )}
                            
                            {/* ✅ Compact Price and Controls */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1 text-emerald-300">
                                <IndianRupee size={16} /> {/* ✅ size 16 instead of 20 */}
                                <span className="text-lg font-bold">{item.price}</span> {/* ✅ text-lg instead of text-xl */}
                              </div>
                              <div className="flex items-center space-x-2"> {/* ✅ space-x-2 instead of space-x-3 */}
                                <button
                                  onClick={() =>
                                    updateMealQuantity(item, quantity - 1, 
                                      categories.find(c => c.id === selectedCategory)?.name || ""
                                    )
                                  }
                                  disabled={quantity === 0}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors" /* ✅ h-7 w-7 instead of h-8 w-8 */
                                >
                                  <Minus size={12} /> {/* ✅ size 12 instead of 16 */}
                                </button>
                                <span className="min-w-[20px] text-center text-sm font-semibold text-slate-100">
                                  {quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateMealQuantity(item, quantity + 1,
                                      categories.find(c => c.id === selectedCategory)?.name || ""
                                    )
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors" /* ✅ h-7 w-7 */
                                >
                                  <Plus size={12} /> {/* ✅ size 12 */}
                                </button>
                              </div>
                            </div>
                            
                            {/* ✅ Compact Subtotal */}
                            {quantity > 0 && (
                              <motion.p
                                layout
                                className="mt-2 text-right text-sm font-semibold text-emerald-300"
                              >
                                Subtotal: ₹{(quantity * item.price).toFixed(2)}
                              </motion.p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              )}
          </section>
        </div>

        {/* ✅ Compact Footer */}
        <div className="my-[-2vh] border-t border-cyan-500/20 bg-slate-900/95 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-slate-400">
                  {getTotalItems()} item{getTotalItems() !== 1 ? 's' : ''} selected
                </p>
                <div className="flex items-center gap-1">
                  <IndianRupee className="w-4 h-4 text-emerald-300" />
                  <span className="text-xl font-bold text-emerald-300">
                    {getTotalCost()}
                  </span>
                </div>
              </div>
              
              {selectedMeals.length > 0 && (
                <button
                  onClick={clearSelection}
                  className="text-xs text-rose-300 hover:text-rose-200 underline"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex gap-2"> {/* ✅ gap-2 instead of gap-3 */}
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </button>
              
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-bold shadow-lg flex items-center gap-2 text-sm" /* ✅ text-sm */
              >
                <ShoppingCart className="w-4 h-4" /> {/* ✅ w-4 h-4 */}
                Add to Order
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MealSelector;
