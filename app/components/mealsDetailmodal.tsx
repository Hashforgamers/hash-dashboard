// components/MealDetailsModal.tsx - Complete responsive version
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChefHat, Loader2, IndianRupee, Package, Plus, Minus, 
  ShoppingCart, Save, UtensilsCrossed, Eye, PlusCircle, AlertTriangle,
  CheckCircle2, Users, User, Phone
} from 'lucide-react';
import { BOOKING_URL, DASHBOARD_URL } from '@/src/config/env';

interface MealDetail {
  id: number;
  menu_item_name: string;
  category_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

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

interface SquadDetails {
  enabled?: boolean;
  player_count?: number;
  playerCount?: number;
  member_console_map?: Array<{
    member_position?: number;
    member_user_id?: number | null;
    member_name?: string;
    console_id?: number;
    console_label?: string;
  }>;
  member_meal_ledger?: Array<{
    added_at?: string;
    member_position?: number;
    member_user_id?: number | null;
    member_name?: string;
    meals_total?: number;
    meals?: Array<{
      name?: string;
      quantity?: number;
      total_price?: number;
    }>;
  }>;
}

interface SquadMember {
  id?: number;
  member_user_id?: number | null;
  member_position?: number;
  name_snapshot?: string;
  phone_snapshot?: string;
  name?: string;
  phone?: string;
  is_captain?: boolean;
}

interface TargetMember {
  member_user_id?: number | null;
  member_position?: number;
  name?: string;
}

interface MealDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  customerName: string;
  initialMode?: 'view' | 'add';
  hasExistingMeals?: boolean;
  vendorId?: string;
  targetMember?: TargetMember | null;
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

// ✅ Optimized Image component with responsive sizing
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
        <ChefHat className="text-green-500 w-6 h-6 sm:w-8 sm:h-8" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <Loader2 className="animate-spin text-green-500 w-4 h-4 sm:w-6 sm:h-6" />
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

const MealDetailsModal: React.FC<MealDetailsModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  customerName,
  initialMode = 'view',
  hasExistingMeals = false,
  vendorId,
  targetMember = null,
}) => {
  // State for existing meals
  const [mealDetails, setMealDetails] = useState<MealDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [squadDetails, setSquadDetails] = useState<SquadDetails | null>(null);
  const [squadMembers, setSquadMembers] = useState<SquadMember[]>([]);
  const [activeTargetMember, setActiveTargetMember] = useState<TargetMember | null>(targetMember);
  
  // State for adding new meals
  const [mode, setMode] = useState<'view' | 'add'>(initialMode);
  const [categories, setCategories] = useState<MealCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSelectedMeals([]);
      setError('');
      setMenuError('');
      setSuccessMessage('');
      setSquadDetails(null);
      setSquadMembers([]);
      setActiveTargetMember(targetMember);
      
      if (bookingId) {
        fetchMealDetails();
      }
    }
  }, [isOpen, bookingId, initialMode]);

  useEffect(() => {
    setActiveTargetMember(targetMember);
  }, [targetMember]);

  // Fetch menu items when switching to add mode
  useEffect(() => {
    if (isOpen && mode === 'add' && vendorId) {
      fetchAvailableMenuItems();
    }
  }, [isOpen, mode, vendorId]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Updated fetchMealDetails function
  const fetchMealDetails = async () => {
    setLoading(true);
    setError('');
    try {
      console.log(`🔍 Fetching meal details for booking ${bookingId}`);
      
      let response;
      
      // Try the new booking details endpoint
      try {
        response = await fetch(`${DASHBOARD_URL}/api/booking/${bookingId}/details`);
      } catch {
        // Fallback to dashboard URL if booking URL fails  
        response = await fetch(`${DASHBOARD_URL}/api/booking/${bookingId}/details`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned HTML instead of JSON - endpoint may not exist');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📋 Booking details response:', data);

      if (data.success && data.booking) {
        setSquadDetails((data.booking.squad_details || null) as SquadDetails | null);
        setSquadMembers(Array.isArray(data.booking.squad_members) ? data.booking.squad_members : []);
      } else {
        setSquadDetails(null);
        setSquadMembers([]);
      }
      
      if (data.success && data.booking && Array.isArray(data.booking.extra_services)) {
        setMealDetails(data.booking.extra_services);
        console.log(`✅ Found ${data.booking.extra_services.length} existing meals`);
      } else {
        console.log('ℹ️ No existing meals found for this booking');
        setMealDetails([]);
      }
    } catch (err) {
      console.error('❌ Error fetching meal details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load meal details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available menu items
  const fetchAvailableMenuItems = async () => {
    if (!vendorId) {
      setMenuError('Vendor ID not available');
      return;
    }
    
    setIsLoadingMenu(true);
    setMenuError('');
    
    try {
      console.log(`🍽️ Fetching menu for vendor ${vendorId}...`);
      
      const response = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/extra-services`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch menu: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Menu API Response:', data);
      
      if (data.success && Array.isArray(data.categories)) {
        const activeCategories = data.categories.filter(cat => cat.is_active && cat.menus?.length > 0);
        setCategories(activeCategories);
        
        // Set first category as selected
        if (activeCategories.length > 0) {
          setSelectedCategory(activeCategories[0].id);
        }
      } else {
        console.warn('⚠️ Unexpected API response structure:', data);
        setCategories([]);
      }
    } catch (err) {
      console.error('❌ Error fetching menu items:', err);
      setMenuError(err instanceof Error ? err.message : 'Failed to load menu items');
    } finally {
      setIsLoadingMenu(false);
    }
  };

  // Update meal quantity
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

  // Updated handleSubmitAdditionalMeals function
  const handleSubmitAdditionalMeals = async () => {
    if (selectedMeals.length === 0) return;

    setIsSubmitting(true);
    try {
      console.log(`🍽️ Adding meals to booking ${bookingId}:`, selectedMeals);
      
      const response = await fetch(`${BOOKING_URL}/api/booking/${bookingId}/add-meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settle_on_release: true,
          squad_member: activeTargetMember
            ? {
                member_user_id: activeTargetMember.member_user_id ?? null,
                member_position: activeTargetMember.member_position ?? null,
                name: activeTargetMember.name || null,
              }
            : null,
          meals: selectedMeals.map(meal => ({
            menu_item_id: meal.menu_item_id,
            quantity: meal.quantity
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Add meals response:', result);
      
      if (result.success) {
        // Success - refresh existing meals and switch back to view mode
        await fetchMealDetails();
        setSelectedMeals([]);
        setMode('view');
        setSuccessMessage(`Successfully added ${result.added_meals?.length || selectedMeals.length} meals!`);
        
        // Emit refresh event for dashboard
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('refresh-dashboard'));
        }
        
        console.log(`✅ Successfully added ${result.added_meals?.length || 0} meals`);
      } else {
        throw new Error(result.message || 'Failed to add meals');
      }
    } catch (error) {
      console.error('❌ Error adding meals:', error);
      setMenuError(error instanceof Error ? error.message : 'Failed to add meals');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTotalMealCost = () => 
    mealDetails.reduce((sum, meal) => sum + meal.total_price, 0);

  const getTotalItems = () => 
    mealDetails.reduce((sum, meal) => sum + meal.quantity, 0);

  const totalNewMealsPrice = selectedMeals.reduce((sum, meal) => sum + meal.total, 0);
  const totalNewItems = selectedMeals.reduce((sum, meal) => sum + meal.quantity, 0);
  const squadPlayerCount = Number(
    squadDetails?.player_count ?? squadDetails?.playerCount ?? (squadMembers.length > 0 ? squadMembers.length : 1)
  );
  const isSquadBooking = Boolean((squadDetails?.enabled ?? false) || squadPlayerCount > 1 || squadMembers.length > 1);
  const memberMealSummary = useMemo(() => {
    const ledger = Array.isArray(squadDetails?.member_meal_ledger) ? squadDetails.member_meal_ledger : [];
    const bucket = new Map<string, {
      member_name: string;
      member_position: number;
      total: number;
      meals: Map<string, { name: string; quantity: number; total: number }>;
    }>();

    for (const entry of ledger) {
      const memberPosition = Number(entry?.member_position || 0);
      const memberName = String(entry?.member_name || `Player ${memberPosition || ""}`).trim();
      const memberKey = `${memberPosition || 0}-${memberName.toLowerCase()}`;
      if (!bucket.has(memberKey)) {
        bucket.set(memberKey, {
          member_name: memberName || `Player ${memberPosition || ""}`,
          member_position: memberPosition,
          total: 0,
          meals: new Map(),
        });
      }
      const row = bucket.get(memberKey)!;
      row.total += Number(entry?.meals_total || 0);

      const meals = Array.isArray(entry?.meals) ? entry.meals : [];
      for (const meal of meals) {
        const mealName = String(meal?.name || "Item").trim();
        const mealKey = mealName.toLowerCase();
        if (!row.meals.has(mealKey)) {
          row.meals.set(mealKey, { name: mealName, quantity: 0, total: 0 });
        }
        const mealRow = row.meals.get(mealKey)!;
        mealRow.quantity += Number(meal?.quantity || 0);
        mealRow.total += Number(meal?.total_price || 0);
      }
    }

    return Array.from(bucket.values())
      .map((row) => ({
        ...row,
        meals: Array.from(row.meals.values()),
      }))
      .sort((a, b) => (a.member_position || 9999) - (b.member_position || 9999));
  }, [squadDetails?.member_meal_ledger]);

  const mealToMemberLabels = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const member of memberMealSummary) {
      for (const meal of member.meals) {
        const mealKey = String(meal.name || "").trim().toLowerCase();
        if (!mealKey) continue;
        if (!map[mealKey]) map[mealKey] = [];
        map[mealKey].push(`${member.member_name} x${meal.quantity}`);
      }
    }
    return map;
  }, [memberMealSummary]);

  const attributedMealTotal = memberMealSummary.reduce((sum, member) => sum + Number(member.total || 0), 0);
  const unattributedMealTotal = Math.max(0, Number(getTotalMealCost()) - Number(attributedMealTotal));
  const memberConsoleMap = Array.isArray(squadDetails?.member_console_map) ? squadDetails.member_console_map : [];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-2 sm:p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-6xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 flex-shrink-0 gap-3 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-emerald-600 rounded-lg">
                <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">
                  {mode === 'view' ? 'Meal Details' : 'Add More Meals'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {customerName}
                </p>
                {activeTargetMember && (
                  <p className="text-[11px] sm:text-xs text-cyan-600 dark:text-cyan-300">
                    Target: {activeTargetMember.name || `Player ${activeTargetMember.member_position || ""}`}
                  </p>
                )}
              </div>
            </div>
            
            {/* Controls Row - Responsive */}
            <div className="flex items-center justify-between sm:justify-end gap-2">
              {/* Success Message */}
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs sm:text-sm"
                >
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{successMessage}</span>
                  <span className="sm:hidden">Added!</span>
                </motion.div>
              )}

              {/* Mode Toggle Buttons */}
              {(hasExistingMeals || mealDetails.length > 0) && (
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 sm:p-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMode('view')}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                      mode === 'view' 
                        ? 'bg-white dark:bg-gray-600 text-emerald-600 shadow-sm' 
                        : 'text-gray-600 dark:text-gray-300 hover:text-emerald-600'
                    }`}
                  >
                    <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="hidden sm:inline">View</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMode('add')}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                      mode === 'add' 
                        ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' 
                        : 'text-gray-600 dark:text-gray-300 hover:text-blue-600'
                    }`}
                  >
                    <PlusCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="hidden sm:inline">Add</span>
                  </motion.button>
                </div>
              )}
              
              {/* Add Food button for mobile when no existing meals */}
              {!hasExistingMeals && mode === 'view' && mealDetails.length === 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMode('add')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Add Food</span>
                </motion.button>
              )}
              
              <button
                onClick={onClose}
                className="p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content - Responsive */}
          <div className="flex-1 overflow-hidden">
            {mode === 'view' ? (
              /* View Mode - Show existing meals */
              <div className="p-3 sm:p-4 h-full overflow-y-auto">
                {!loading && !error && isSquadBooking && (
                  <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-800 dark:bg-cyan-900/20">
                    <div className="mb-2 flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-semibold">Squad Booking • {squadPlayerCount} Players</span>
                    </div>
                    {squadMembers.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {squadMembers
                          .sort((a, b) => (a.member_position || 0) - (b.member_position || 0))
                          .map((member) => (
                            <div
                              key={`${member.id || member.member_position || 0}-${member.phone_snapshot || member.name_snapshot || ''}`}
                              className="rounded-md border border-cyan-200/80 bg-white/70 p-2 dark:border-cyan-700 dark:bg-slate-900/40"
                            >
                              <div className="flex items-center gap-1 text-xs font-medium text-slate-800 dark:text-slate-100">
                                <User className="h-3.5 w-3.5" />
                                <span>{member.name_snapshot || `Player ${member.member_position || ''}`}</span>
                                {member.is_captain && (
                                  <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200">
                                    Captain
                                  </span>
                                )}
                              </div>
                              {member.phone_snapshot && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                                  <Phone className="h-3.5 w-3.5" />
                                  <span>{member.phone_snapshot}</span>
                                </div>
                              )}
                              {(() => {
                                const mappedConsole = memberConsoleMap.find((entry) => Number(entry?.member_position || 0) === Number(member.member_position || 0));
                                const consoleLabel = String(mappedConsole?.console_label || "").trim();
                                if (!consoleLabel) return null;
                                return (
                                  <div className="mt-1 text-[11px] text-cyan-700 dark:text-cyan-300">
                                    PC: {consoleLabel}
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                      </div>
                    )}
                    {memberMealSummary.length > 0 && (
                      <div className="mt-3 rounded-md border border-cyan-300/60 bg-white/80 p-2 dark:border-cyan-700 dark:bg-slate-900/50">
                        <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                          <span>Who Was Served What</span>
                          <span>Attributed: ₹{attributedMealTotal.toFixed(2)}</span>
                        </div>
                        <div className="space-y-2">
                          {memberMealSummary.map((entry, idx) => (
                            <div key={`ledger-summary-${idx}`} className="rounded border border-cyan-200/70 bg-cyan-50/40 px-2 py-1.5 text-xs dark:border-cyan-700/60 dark:bg-cyan-900/20">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-slate-800 dark:text-slate-100">
                                  {entry.member_name || `Player ${entry.member_position || ""}`}
                                </span>
                                <span className="text-cyan-700 dark:text-cyan-300">₹{Number(entry.total || 0).toFixed(2)}</span>
                              </div>
                              <div className="mt-1 space-y-1 text-[11px] text-slate-700 dark:text-slate-200">
                                {(entry.meals || []).map((meal, mealIdx) => (
                                  <div key={`ledger-summary-${idx}-meal-${mealIdx}`} className="flex items-center justify-between">
                                    <span>{meal.name || "Item"} x{Number(meal.quantity || 0)}</span>
                                    <span>₹{Number(meal.total || 0).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        {unattributedMealTotal > 0.01 && (
                          <div className="mt-2 rounded border border-amber-300/70 bg-amber-50/80 px-2 py-1.5 text-[11px] text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                            Unassigned meals: ₹{unattributedMealTotal.toFixed(2)} (added without selecting a squad member)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {loading && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-emerald-600 mb-3" />
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Loading meal details...</p>
                  </div>
                )}

                {error && (
                  <div className="flex flex-col items-center justify-center py-8 text-red-600">
                    <Package className="w-6 h-6 sm:w-8 sm:h-8 mb-3" />
                    <p className="text-xs sm:text-sm text-center px-4">{error}</p>
                    <button
                      onClick={fetchMealDetails}
                      className="mt-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs sm:text-sm"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!loading && !error && mealDetails.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <UtensilsCrossed className="w-10 h-10 sm:w-12 sm:h-12 mb-3 opacity-50" />
                    <p className="text-base sm:text-lg font-medium mb-2">No meals ordered yet</p>
                    <p className="text-xs sm:text-sm mb-4 text-center px-4">This customer hasn't added any meals to their booking.</p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setMode('add')}
                      className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Meals Now
                    </motion.button>
                  </div>
                )}

                {!loading && !error && mealDetails.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 gap-2">
                      <span>{getTotalItems()} items • Booking ID: {bookingId}</span>
                    </div>

                    {/* Meal Items - Responsive Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                      {mealDetails.map((meal, index) => (
                        <motion.div
                          key={meal.id || index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800"
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-emerald-800 dark:text-emerald-200 text-sm sm:text-base line-clamp-2">
                                {meal.menu_item_name}
                              </h4>
                              <span className="font-bold text-emerald-600 text-sm sm:text-base ml-2">
                                ₹{meal.total_price}
                              </span>
                            </div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              {meal.category_name}
                            </p>
                            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
                              <span>₹{meal.unit_price} × {meal.quantity}</span>
                            </div>
                            {isSquadBooking && (
                              <div className="text-[11px] text-emerald-800 dark:text-emerald-200">
                                <span className="font-medium">Served to:</span>{" "}
                                {(mealToMemberLabels[String(meal.menu_item_name || "").trim().toLowerCase()] || []).join(", ") || "Not tagged"}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="border-t border-emerald-200 dark:border-emerald-600 pt-3 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800 dark:text-white text-sm sm:text-base">Total Meal Cost:</span>
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-lg sm:text-xl text-emerald-600">
                            {getTotalMealCost()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Add More Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setMode('add')}
                      className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <Plus className="w-4 h-4" />
                      Add More Meals
                    </motion.button>
                  </div>
                )}
              </div>
            ) : (
              /* Add Mode - Show available menu items */
              <div className="flex h-full overflow-hidden">
                {/* Sidebar with categories - Hidden on mobile, shown as dropdown */}
                <div className="hidden sm:block">
                  <aside className="w-48 lg:w-56 overflow-auto border-r border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800 h-full">
                    <h3 className="mb-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Categories
                    </h3>
                    {isLoadingMenu && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      </div>
                    )}
                    {categories.length === 0 && !isLoadingMenu && (
                      <p className="text-gray-500 dark:text-gray-400 text-xs">No categories</p>
                    )}
                    <ul className="space-y-1">
                      {categories.map((category) => (
                        <li key={category.id}>
                          <button
                            className={`block w-full rounded-lg p-2 text-left transition-colors duration-200 ${
                              selectedCategory === category.id
                                ? "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : "hover:bg-green-100 dark:hover:bg-green-900/30"
                            }`}
                            onClick={() => setSelectedCategory(category.id)}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-sm">{category.name}</span>
                              <span className="rounded-full bg-gray-300 px-1.5 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-600 dark:text-gray-300">
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
                </div>

                {/* Main content area */}
                <section className="flex-1 overflow-auto p-3 sm:p-4">
                  {/* Mobile Category Selector */}
                  <div className="sm:hidden mb-4">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase">
                      Select Category
                    </label>
                    <select
                      value={selectedCategory || ''}
                      onChange={(e) => setSelectedCategory(Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                    >
                      <option value="">Choose a category...</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name} ({category.menu_count} items)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* New meals summary - Responsive */}
                  {selectedMeals.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800 mb-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <ShoppingCart className="w-4 h-4 text-blue-600" />
                        <h4 className="font-medium text-blue-800 dark:text-blue-200 text-sm sm:text-base">
                          Adding to Order ({totalNewItems} items)
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {selectedMeals.map(meal => (
                          <div key={meal.menu_item_id} className="flex justify-between items-center text-xs sm:text-sm">
                            <span className="text-blue-700 dark:text-blue-300">
                              {meal.name} × {meal.quantity}
                            </span>
                            <span className="font-medium text-blue-800 dark:text-blue-200">
                              ₹{meal.total}
                            </span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-blue-200 dark:border-blue-700 flex justify-between items-center">
                          <span className="font-semibold text-blue-800 dark:text-blue-200 text-sm">
                            Additional Total:
                          </span>
                          <span className="font-bold text-blue-600">₹{totalNewMealsPrice}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {isLoadingMenu && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600 mb-3" />
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Loading menu items...</p>
                    </div>
                  )}

                  {menuError && (
                    <div className="flex flex-col items-center justify-center py-8 text-red-600">
                      <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 mb-3" />
                      <p className="text-xs sm:text-sm text-center px-4">{menuError}</p>
                      <button
                        onClick={fetchAvailableMenuItems}
                        className="mt-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {!isLoadingMenu && !menuError && categories.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                      <UtensilsCrossed className="w-6 h-6 sm:w-8 sm:h-8 mb-3 opacity-50" />
                      <p className="text-xs sm:text-sm">No menu items available</p>
                    </div>
                  )}

                  {/* Menu items grid - Responsive */}
                  {!isLoadingMenu && !menuError && categories.length > 0 && selectedCategory && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                      {categories
                        .find((c) => c.id === selectedCategory)
                        ?.menus?.map((item) => {
                          const quantity = getMealQuantity(item.id);
                          const categoryName = categories.find(c => c.id === selectedCategory)?.name || "";

                          return (
                            <motion.div
                              key={item.id}
                              layout
                              className={`rounded-lg border-2 bg-white shadow-sm dark:bg-gray-700 ${
                                quantity > 0
                                  ? "border-green-500 shadow-green-200"
                                  : "border-gray-200 dark:border-gray-600"
                              }`}
                              whileHover={{ y: -2 }}
                            >
                              {/* Image Container - Responsive */}
                              <div className="relative h-24 sm:h-32 w-full overflow-hidden rounded-t-lg">
                                {item.images.length > 0 ? (
                                  <CachedImage
                                    src={item.images[0].image_url}
                                    alt={item.name}
                                    className="h-full w-full"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                                    <ChefHat className="text-green-500 w-6 h-6 sm:w-8 sm:h-8" />
                                  </div>
                                )}
                                {quantity > 0 && (
                                  <div className="absolute right-1 sm:right-2 top-1 sm:top-2 rounded-lg bg-green-600 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold text-white">
                                    {quantity}
                                  </div>
                                )}
                              </div>

                              {/* Card Content - Responsive */}
                              <div className="p-2 sm:p-3">
                                <h3 className="mb-1 font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-200 line-clamp-2">
                                  {item.name}
                                </h3>
                                {item.description && (
                                  <p className="mb-2 sm:mb-3 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                                
                                {/* Price and Controls - Responsive */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1 text-green-600">
                                    <IndianRupee className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="text-sm sm:text-base font-bold">{item.price}</span>
                                  </div>
                                  <div className="flex items-center space-x-1 sm:space-x-2">
                                    <button
                                      onClick={() => updateMealQuantity(item, quantity - 1, categoryName)}
                                      disabled={quantity === 0}
                                      className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
                                    >
                                      <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    </button>
                                    <span className="min-w-[16px] sm:min-w-[20px] text-center font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                                      {quantity}
                                    </span>
                                    <button
                                      onClick={() => updateMealQuantity(item, quantity + 1, categoryName)}
                                      className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
                                    >
                                      <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Subtotal - Responsive */}
                                {quantity > 0 && (
                                  <motion.p
                                    layout
                                    className="mt-1.5 sm:mt-2 text-right font-semibold text-green-700 text-xs sm:text-sm"
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
            )}
          </div>

          {/* Footer - Submit button for add mode - Responsive */}
          {mode === 'add' && selectedMeals.length > 0 && (
            <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Adding {totalNewItems} item{totalNewItems !== 1 ? 's' : ''} to booking
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-white text-sm sm:text-base">
                    Additional Cost: ₹{totalNewMealsPrice}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMeals([])}
                  className="text-xs text-red-600 hover:text-red-700 underline self-start sm:self-center"
                >
                  Clear All
                </button>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmitAdditionalMeals}
                disabled={isSubmitting}
                className={`w-full py-2.5 sm:py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding to Order...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Add ₹{totalNewMealsPrice} to Order
                  </>
                )}
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MealDetailsModal;
