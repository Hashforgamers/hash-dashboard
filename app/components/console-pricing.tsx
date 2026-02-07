"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Tv,
  Gamepad,
  Headset,
  Save,
  Check,
  TrendingUp,
  AlertCircle,
  IndianRupee,
  Plus,
  Calendar,
  Clock,
  Tag,
  Percent,
  Grid3x3,
  List,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  Sparkles,
  Info
} from "lucide-react";
import { DASHBOARD_URL } from "@/src/config/env";
import { jwtDecode } from "jwt-decode";

interface ConsoleType {
  type: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  iconColor: string;
  description: string;
}

const consoleTypes: ConsoleType[] = [
  {
    type: "pc",
    name: "PC",
    icon: Monitor,
    color: "bg-purple-100 dark:bg-purple-950",
    iconColor: "bg-card",
    description: "Gaming PCs and Workstations",
  },
  {
    type: "ps5",
    name: "PS5",
    icon: Tv,
    color: "bg-blue-100 dark:bg-blue-950",
    iconColor: "#2563eb",
    description: "PlayStation 5 Gaming Consoles",
  },
  {
    type: "xbox",
    name: "Xbox",
    icon: Gamepad,
    color: "bg-green-100 dark:bg-green-950",
    iconColor: "#059669",
    description: "Xbox Series Gaming Consoles",
  },
  {
    type: "vr",
    name: "VR",
    icon: Headset,
    color: "bg-orange-100 dark:bg-orange-950",
    iconColor: "#ea580c",
    description: "Virtual Reality Systems",
  },
];

interface PricingState {
  [key: string]: {
    value: number;
    isValid: boolean;
    hasChanged: boolean;
  };
}

interface PricingOffer {
  id: number;
  vendor_id: number;
  available_game_id: number;
  console_type: string;
  default_price: number;
  offered_price: number;
  discount_percentage: number;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  offer_name: string;
  offer_description: string | null;
  is_active: boolean;
  is_currently_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AvailableGame {
  id: number;
  game_name: string;
  single_slot_price: number;
}

export default function ConsolePricing() {
  // ========== EXISTING STATE (Default Pricing) ==========
  const [prices, setPrices] = useState<PricingState>(() => {
    const initialPrices: PricingState = {};
    consoleTypes.forEach((console) => {
      initialPrices[console.type] = {
        value: 0,
        isValid: true,
        hasChanged: false,
      };
    });
    return initialPrices;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vendorId, setVendorId] = useState<number | null>(null);

  // ========== NEW STATE (Promotional Offers) ==========
  const [activeTab, setActiveTab] = useState<"default" | "offers">("default");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [offers, setOffers] = useState<PricingOffer[]>([]);
  const [availableGames, setAvailableGames] = useState<AvailableGame[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<PricingOffer | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Offer form state
  const [offerForm, setOfferForm] = useState({
    available_game_id: "",
    offered_price: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    offer_name: "",
    offer_description: "",
  });

  const validatePrice = (value: number): boolean => {
    return value >= 0 && value <= 10000;
  };

  // ========== EXISTING EFFECTS (Default Pricing) ==========
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
      console.log("✅ Vendor ID set:", decoded_token.sub.id);
    }
  }, []);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        if (!vendorId) throw new Error("Vendor ID missing in token");

        console.log("📡 Fetching pricing for vendor:", vendorId);
        const res = await fetch(
          `${DASHBOARD_URL}/api/vendor/${vendorId}/console-pricing`
        );

        if (!res.ok) throw new Error("Failed to fetch pricing");

        const data = await res.json();
        console.log("✅ Pricing data received:", data);

        const newPrices: PricingState = {};
        consoleTypes.forEach((console) => {
          newPrices[console.type] = {
            value: data[console.type] ?? 0,
            isValid: true,
            hasChanged: false,
          };
        });
        setPrices(newPrices);
      } catch (error) {
        console.error("❌ Error fetching prices:", error);
      }
    };

    if (vendorId) {
      fetchPricing();
    }
  }, [vendorId]);

  // ========== NEW EFFECTS (Promotional Offers) ==========
  useEffect(() => {
    if (vendorId && activeTab === "offers") {
      fetchOffers();
      fetchAvailableGames();
    }
  }, [vendorId, activeTab]);

  const fetchOffers = async () => {
    if (!vendorId) return;
    setIsLoadingOffers(true);
    try {
      console.log("📡 Fetching offers for vendor:", vendorId);
      const res = await fetch(
        `${DASHBOARD_URL}/api/vendor/${vendorId}/pricing-offers`
      );
      
      console.log("📊 Offers response status:", res.status);
      
      if (!res.ok) throw new Error("Failed to fetch offers");
      
      const data = await res.json();
      console.log("✅ Offers data received:", data);
      
      setOffers(data.offers || []);
    } catch (error) {
      console.error("❌ Error fetching offers:", error);
      setOffers([]);
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const fetchAvailableGames = async () => {
    if (!vendorId) return;
    
    try {
      console.log("🎮 Fetching available games for vendor:", vendorId);
      
      const res = await fetch(
        `${DASHBOARD_URL}/api/vendor/${vendorId}/available-games`
      );
      
      console.log("📊 Available games response status:", res.status);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch available games: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("📦 Raw available games response:", data);
      
      // ✅ Handle multiple possible response structures
      let gamesArray: AvailableGame[] = [];
      
      if (Array.isArray(data)) {
        gamesArray = data;
      } else if (data.games && Array.isArray(data.games)) {
        gamesArray = data.games;
      } else if (data.available_games && Array.isArray(data.available_games)) {
        gamesArray = data.available_games;
      } else if (data.data && Array.isArray(data.data)) {
        gamesArray = data.data;
      } else if (data.success && data.data && Array.isArray(data.data)) {
        gamesArray = data.data;
      }
      
      console.log("✅ Parsed games array:", gamesArray);
      console.log("📊 Games count:", gamesArray.length);
      
      setAvailableGames(gamesArray);
      
      if (gamesArray.length === 0) {
        console.warn("⚠️ No available games found for this vendor");
      }
    } catch (error) {
      console.error("❌ Error fetching available games:", error);
      setAvailableGames([]);
    }
  };

  // ========== EXISTING HANDLERS (Default Pricing) ==========
  const handlePriceChange = (consoleType: string, inputValue: string) => {
    const numericValue = parseFloat(inputValue) || 0;
    const isValid = validatePrice(numericValue);

    setPrices((prev) => ({
      ...prev,
      [consoleType]: {
        value: numericValue,
        isValid,
        hasChanged: true,
      },
    }));

    if (isValid) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[consoleType];
        return newErrors;
      });
    } else {
      setErrors((prev) => ({
        ...prev,
        [consoleType]: "Price must be between ₹0 and ₹10,000",
      }));
    }
  };

  const handleSave = async () => {
    const hasErrors = Object.values(errors).length > 0;
    const hasInvalidPrices = Object.values(prices).some(
      (price) => !price.isValid
    );

    if (hasErrors || hasInvalidPrices) return;

    setIsLoading(true);

    try {
      const payload = Object.entries(prices).reduce((acc, [key, val]) => {
        acc[key] = val.value;
        return acc;
      }, {} as Record<string, number>);

      console.log("💾 Saving pricing:", payload);

      const response = await fetch(
        `${DASHBOARD_URL}/api/vendor/${vendorId}/console-pricing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error("Failed to save pricing");

      setSuccessMessage("Pricing updated successfully!");
      setShowSuccess(true);
      setPrices((prev) => {
        const newPrices = { ...prev };
        Object.keys(newPrices).forEach((key) => {
          newPrices[key].hasChanged = false;
        });
        return newPrices;
      });

      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("❌ Error saving pricing:", error);
      alert("There was an error saving your changes.");
    } finally {
      setIsLoading(false);
    }
  };

  // ========== NEW HANDLERS (Promotional Offers) ==========
  const handleCreateOffer = async () => {
    if (!vendorId) return;

    try {
      console.log("📤 Creating offer:", offerForm);
      
      const response = await fetch(
        `${DASHBOARD_URL}/api/vendor/${vendorId}/pricing-offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            available_game_id: parseInt(offerForm.available_game_id),
            offered_price: parseFloat(offerForm.offered_price),
            start_date: offerForm.start_date,
            start_time: offerForm.start_time,
            end_date: offerForm.end_date,
            end_time: offerForm.end_time,
            offer_name: offerForm.offer_name,
            offer_description: offerForm.offer_description || null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create offer");
      }

      console.log("✅ Offer created successfully");
      setSuccessMessage("Offer created successfully!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setShowOfferForm(false);
      resetOfferForm();
      fetchOffers();
    } catch (error: any) {
      console.error("❌ Error creating offer:", error);
      alert(error.message || "Error creating offer");
    }
  };

  const handleUpdateOffer = async () => {
    if (!vendorId || !editingOffer) return;

    try {
      console.log("📤 Updating offer:", editingOffer.id);
      
      const response = await fetch(
        `${DASHBOARD_URL}/api/vendor/${vendorId}/pricing-offers/${editingOffer.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            offered_price: parseFloat(offerForm.offered_price),
            start_date: offerForm.start_date,
            start_time: offerForm.start_time,
            end_date: offerForm.end_date,
            end_time: offerForm.end_time,
            offer_name: offerForm.offer_name,
            offer_description: offerForm.offer_description || null,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update offer");

      console.log("✅ Offer updated successfully");
      setSuccessMessage("Offer updated successfully!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setShowOfferForm(false);
      setEditingOffer(null);
      resetOfferForm();
      fetchOffers();
    } catch (error) {
      console.error("❌ Error updating offer:", error);
      alert("Error updating offer");
    }
  };

  const handleDeleteOffer = async (offerId: number) => {
    if (!vendorId || !confirm("Are you sure you want to delete this offer?"))
      return;

    try {
      console.log("🗑️ Deleting offer:", offerId);
      
      const response = await fetch(
        `${DASHBOARD_URL}/api/vendor/${vendorId}/pricing-offers/${offerId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete offer");

      console.log("✅ Offer deleted successfully");
      setSuccessMessage("Offer deleted successfully!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchOffers();
    } catch (error) {
      console.error("❌ Error deleting offer:", error);
      alert("Error deleting offer");
    }
  };

  const handleEditOffer = (offer: PricingOffer) => {
    console.log("✏️ Editing offer:", offer);
    setEditingOffer(offer);
    setOfferForm({
      available_game_id: offer.available_game_id.toString(),
      offered_price: offer.offered_price.toString(),
      start_date: offer.start_date,
      start_time: offer.start_time,
      end_date: offer.end_date,
      end_time: offer.end_time,
      offer_name: offer.offer_name,
      offer_description: offer.offer_description || "",
    });
    setShowOfferForm(true);
  };

  const resetOfferForm = () => {
    setOfferForm({
      available_game_id: "",
      offered_price: "",
      start_date: "",
      start_time: "",
      end_date: "",
      end_time: "",
      offer_name: "",
      offer_description: "",
    });
    setEditingOffer(null);
  };

  const getConsoleIcon = (consoleType: string) => {
    const console = consoleTypes.find(
      (c) => c.type === consoleType.toLowerCase()
    );
    return console ? console.icon : Monitor;
  };

  const getConsoleColor = (consoleType: string) => {
    const console = consoleTypes.find(
      (c) => c.type === consoleType.toLowerCase()
    );
    return console ? console.color : "bg-gray-100 dark:bg-gray-950";
  };

  const hasChanges = Object.values(prices).some((price) => price.hasChanged);
  const canSave = hasChanges && Object.values(errors).length === 0;

  // Get selected game's default price
  const selectedGame = availableGames.find(
    (g) => g.id === parseInt(offerForm.available_game_id)
  );

  return (
    <div className="page-container">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="page-header"
        >
          <div className="page-title-section">
            <div className="flex items-center gap-3 mb-2">
              <div className="icon-container bg-blue-100 dark:bg-blue-900/30">
                <IndianRupee className="icon-lg text-blue-600" />
              </div>
              <h1 className="page-title">Console Pricing Manager</h1>
            </div>
            <p className="page-subtitle">
              Manage default pricing and promotional offers for your gaming
              consoles
            </p>
          </div>
        </motion.div>

        {/* Success Toast */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              className="fixed top-4 right-4 z-50 bg-green-500 text-white p-4 rounded-lg shadow-lg flex items-center gap-2"
            >
              <Check className="icon-lg" />
              <span className="body-text font-medium">
                {successMessage || "Changes saved successfully!"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("default")}
              className={`px-6 py-2.5 rounded-md font-medium transition-all ${
                activeTab === "default"
                  ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4" />
                <span>Default Pricing</span>
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("offers")}
              className={`px-6 py-2.5 rounded-md font-medium transition-all ${
                activeTab === "offers"
                  ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Promotional Offers</span>
                {offers.filter((o) => o.is_currently_active).length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                    {offers.filter((o) => o.is_currently_active).length}
                  </span>
                )}
              </div>
            </motion.button>
          </div>

          {/* View Toggle (only for offers tab) */}
          {activeTab === "offers" && (
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-all ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
                title="Grid View"
              >
                <Grid3x3 className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-md transition-all ${
                  viewMode === "table"
                    ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
                title="Table View"
              >
                <List className="w-5 h-5" />
              </motion.button>
            </div>
          )}
        </div>

        {/* ========== DEFAULT PRICING TAB ========== */}
        {activeTab === "default" && (
          <>
            {/* Console Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-compact mb-8">
              {consoleTypes.map((console, index) => {
                const priceData = prices[console.type];
                const error = errors[console.type];
                const IconComponent = console.icon;

                return (
                  <motion.div
                    key={console.type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="content-card shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
                  >
                    {/* Card Header with Icon */}
                    <div className={`${console.color} p-4`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="icon-container bg-white/20 dark:bg-black/20 backdrop-blur-sm"
                            style={{ color: console.iconColor }}
                          >
                            <IconComponent className="icon-lg" />
                          </div>
                          <div>
                            <h3 className="card-title">{console.name}</h3>
                            <p className="body-text-small">
                              {console.description}
                            </p>
                          </div>
                        </div>
                        {priceData?.hasChanged && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 bg-yellow-400 rounded-full"
                          />
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4">
                      <label className="form-label mb-2">Price per Slot</label>

                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <IndianRupee className="icon-md text-gray-400 dark:text-gray-500" />
                        </div>
                        <motion.input
                          type="number"
                          min="0"
                          max="10000"
                          step="0.01"
                          value={priceData?.value ?? ""}
                          onChange={(e) =>
                            handlePriceChange(console.type, e.target.value)
                          }
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border-2 transition-all focus:outline-none focus:ring-0 ${
                            error
                              ? "border-red-300 focus:border-red-500 bg-red-50 dark:bg-red-950"
                              : priceData?.hasChanged
                              ? "border-yellow-300 focus:border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
                              : "input-field"
                          }`}
                          placeholder="0.00"
                          whileFocus={{ scale: 1.02 }}
                        />
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-2 flex items-center gap-1 text-red-600 dark:text-red-400 body-text-small"
                        >
                          <AlertCircle className="icon-sm" />
                          <span>{error}</span>
                        </motion.div>
                      )}

                      {/* Current Rate Display */}
                      <div className="form-card mt-4">
                        <div className="flex items-center justify-between">
                          <span className="body-text-small text-muted-foreground">
                            Current Rate
                          </span>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="icon-sm text-green-500" />
                            <span className="price-small">
                              ₹{priceData?.value.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center"
            >
              <motion.button
                onClick={handleSave}
                disabled={!canSave || isLoading}
                whileHover={canSave ? { scale: 1.05 } : {}}
                whileTap={canSave ? { scale: 0.95 } : {}}
                className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                  canSave
                    ? "btn-primary shadow-lg hover:shadow-xl"
                    : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                }`}
              >
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="icon-lg" />
                    <span>Save Pricing Changes</span>
                  </>
                )}
              </motion.button>
            </motion.div>

            {/* Footer Note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-8 text-center body-text-muted"
            >
              <p>
                Changes will be applied immediately to all active gaming
                sessions
              </p>
            </motion.div>
          </>
        )}

        {/* ========== PROMOTIONAL OFFERS TAB ========== */}
        {activeTab === "offers" && (
          <div className="space-y-6">
            {/* Create Offer Button */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-500" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create time-based promotional offers for your gaming consoles
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  console.log("🆕 Opening offer form, available games:", availableGames);
                  setShowOfferForm(true);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>Create New Offer</span>
              </motion.button>
            </div>

            {/* Debug Info (Remove in production) */}
            {availableGames.length === 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ No console types found. Make sure you have added console types in the system.
                </p>
              </div>
            )}

            {/* Offer Form Modal */}
            <AnimatePresence>
              {showOfferForm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={() => {
                    setShowOfferForm(false);
                    resetOfferForm();
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                  >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-2xl font-bold">
                        {editingOffer ? "Edit Offer" : "Create New Offer"}
                      </h2>
                      <button
                        onClick={() => {
                          setShowOfferForm(false);
                          resetOfferForm();
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 space-y-4">
                      {/* Console Type Selection */}
                      <div>
                        <label className="form-label mb-2">
                          Console Type *
                        </label>
                        <select
                          value={offerForm.available_game_id}
                          onChange={(e) => {
                            console.log("Selected game ID:", e.target.value);
                            setOfferForm({
                              ...offerForm,
                              available_game_id: e.target.value,
                            });
                          }}
                          disabled={!!editingOffer}
                          className="input-field w-full"
                        >
                          <option value="">Select console type...</option>
                          {availableGames.length > 0 ? (
                            availableGames.map((game) => (
                              <option key={game.id} value={game.id}>
                                {game.game_name} (Default: ₹{game.single_slot_price})
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>
                              No console types available
                            </option>
                          )}
                        </select>
                        {availableGames.length === 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            Please add console types in your system first
                          </p>
                        )}
                      </div>

                      {/* Offer Name */}
                      <div>
                        <label className="form-label mb-2">Offer Name *</label>
                        <input
                          type="text"
                          value={offerForm.offer_name}
                          onChange={(e) =>
                            setOfferForm({
                              ...offerForm,
                              offer_name: e.target.value,
                            })
                          }
                          placeholder="e.g., Weekend Special, Happy Hours"
                          className="input-field w-full"
                        />
                      </div>

                      {/* Pricing */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label mb-2">
                            Default Price
                          </label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              value={selectedGame?.single_slot_price || ""}
                              disabled
                              placeholder="Select console first"
                              className="input-field w-full pl-9 bg-gray-100 dark:bg-gray-700"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="form-label mb-2">
                            Offered Price *
                          </label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              value={offerForm.offered_price}
                              onChange={(e) =>
                                setOfferForm({
                                  ...offerForm,
                                  offered_price: e.target.value,
                                })
                              }
                              placeholder="0.00"
                              step="0.01"
                              max={selectedGame?.single_slot_price}
                              className="input-field w-full pl-9"
                            />
                          </div>
                          {selectedGame &&
                            offerForm.offered_price &&
                            parseFloat(offerForm.offered_price) <
                              selectedGame.single_slot_price && (
                              <p className="text-sm text-green-600 mt-1">
                                {(
                                  ((selectedGame.single_slot_price -
                                    parseFloat(offerForm.offered_price)) /
                                    selectedGame.single_slot_price) *
                                  100
                                ).toFixed(1)}
                                % discount
                              </p>
                            )}
                        </div>
                      </div>

                      {/* Date Range */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label mb-2">
                            Start Date *
                          </label>
                          <input
                            type="date"
                            value={offerForm.start_date}
                            onChange={(e) =>
                              setOfferForm({
                                ...offerForm,
                                start_date: e.target.value,
                              })
                            }
                            className="input-field w-full"
                          />
                        </div>
                        <div>
                          <label className="form-label mb-2">
                            Start Time *
                          </label>
                          <input
                            type="time"
                            value={offerForm.start_time}
                            onChange={(e) =>
                              setOfferForm({
                                ...offerForm,
                                start_time: e.target.value,
                              })
                            }
                            className="input-field w-full"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label mb-2">End Date *</label>
                          <input
                            type="date"
                            value={offerForm.end_date}
                            onChange={(e) =>
                              setOfferForm({
                                ...offerForm,
                                end_date: e.target.value,
                              })
                            }
                            min={offerForm.start_date}
                            className="input-field w-full"
                          />
                        </div>
                        <div>
                          <label className="form-label mb-2">End Time *</label>
                          <input
                            type="time"
                            value={offerForm.end_time}
                            onChange={(e) =>
                              setOfferForm({
                                ...offerForm,
                                end_time: e.target.value,
                              })
                            }
                            className="input-field w-full"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="form-label mb-2">
                          Description (Optional)
                        </label>
                        <textarea
                          value={offerForm.offer_description}
                          onChange={(e) =>
                            setOfferForm({
                              ...offerForm,
                              offer_description: e.target.value,
                            })
                          }
                          placeholder="Add offer details..."
                          rows={3}
                          className="input-field w-full resize-none"
                        />
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => {
                          setShowOfferForm(false);
                          resetOfferForm();
                        }}
                        className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={
                          editingOffer ? handleUpdateOffer : handleCreateOffer
                        }
                        disabled={
                          !offerForm.available_game_id ||
                          !offerForm.offered_price ||
                          !offerForm.start_date ||
                          !offerForm.start_time ||
                          !offerForm.end_date ||
                          !offerForm.end_time ||
                          !offerForm.offer_name
                        }
                        className="btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingOffer ? "Update Offer" : "Create Offer"}
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Offers Display */}
            {isLoadingOffers ? (
              <div className="flex items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
                />
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  No offers created yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create your first promotional offer to attract more customers
                </p>
              </div>
            ) : (
              <>
                {/* Grid View */}
                {viewMode === "grid" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {offers.map((offer, index) => {
                      const IconComponent = getConsoleIcon(
                        offer.console_type
                      );
                      const colorClass = getConsoleColor(offer.console_type);

                      return (
                        <motion.div
                          key={offer.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="content-card overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          {/* Card Header */}
                          <div className={`${colorClass} p-4`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <IconComponent className="w-5 h-5" />
                                <span className="font-semibold">
                                  {offer.console_type}
                                </span>
                              </div>
                              {offer.is_currently_active && (
                                <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                  Active
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-lg">
                              {offer.offer_name}
                            </h3>
                          </div>

                          {/* Card Body */}
                          <div className="p-4 space-y-3">
                            {/* Pricing */}
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Default Price
                                </p>
                                <p className="font-semibold line-through text-gray-500">
                                  ₹{offer.default_price}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Offer Price
                                </p>
                                <p className="text-2xl font-bold text-green-600">
                                  ₹{offer.offered_price}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                <Percent className="w-3 h-3 text-green-600" />
                                <span className="text-sm font-semibold text-green-600">
                                  {offer.discount_percentage}% OFF
                                </span>
                              </div>
                            </div>

                            {/* Description */}
                            {offer.offer_description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {offer.offer_description}
                              </p>
                            )}

                            {/* Date & Time */}
                            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>
                                  {offer.start_date} to {offer.end_date}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span>
                                  {offer.start_time} - {offer.end_time}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleEditOffer(offer)}
                                className="flex-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                <span>Edit</span>
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDeleteOffer(offer.id)}
                                className="flex-1 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Table View */}
                {viewMode === "table" && (
                  <div className="content-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                              Console
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                              Offer Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                              Pricing
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                              Validity
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                              Status
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {offers.map((offer) => {
                            const IconComponent = getConsoleIcon(
                              offer.console_type
                            );

                            return (
                              <motion.tr
                                key={offer.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="w-5 h-5" />
                                    <span className="font-medium">
                                      {offer.console_type}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="font-medium">
                                      {offer.offer_name}
                                    </p>
                                    {offer.offer_description && (
                                      <p className="text-sm text-gray-500 line-clamp-1">
                                        {offer.offer_description}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="line-through text-gray-500">
                                      ₹{offer.default_price}
                                    </span>
                                    <span className="font-bold text-green-600">
                                      ₹{offer.offered_price}
                                    </span>
                                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 text-xs rounded-full">
                                      {offer.discount_percentage}% OFF
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-gray-400" />
                                      <span>
                                        {offer.start_date} to {offer.end_date}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-500">
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        {offer.start_time} - {offer.end_time}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {offer.is_currently_active ? (
                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 text-xs rounded-full flex items-center gap-1 w-fit">
                                      <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
                                      Active Now
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 text-xs rounded-full w-fit">
                                      Scheduled
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => handleEditOffer(offer)}
                                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                      title="Edit offer"
                                    >
                                      <Edit2 className="w-4 h-4 text-blue-600" />
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => handleDeleteOffer(offer.id)}
                                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                      title="Delete offer"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </motion.button>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
