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
  IndianRupee
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
    iconColor: "#7c3aed",
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

export default function ConsolePricing() {
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
  const validatePrice = (value: number): boolean => {
    return value >= 0 && value <= 10000;
  };
 useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
      console.log("Setting Vendor Id")
    }
  }, []);


  useEffect(() => {
    const fetchPricing = async () => {
      try {

        if (!vendorId) throw new Error("Vendor ID missing in token");

        const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/console-pricing`);

        if (!res.ok) throw new Error("Failed to fetch pricing");

        const data = await res.json();

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
        console.error("Error fetching prices:", error);
      }
    };

    fetchPricing();
  }, [vendorId]);


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
        [consoleType]: "Price must be between $0 and $10,000",
      }));
    }
  };

  const handleSave = async () => {
    const hasErrors = Object.values(errors).length > 0;
    const hasInvalidPrices = Object.values(prices).some((price) => !price.isValid);

    if (hasErrors || hasInvalidPrices) return;

    setIsLoading(true);

    try {
      const payload = Object.entries(prices).reduce((acc, [key, val]) => {
        acc[key] = val.value;
        return acc;
      }, {} as Record<string, number>);

      console.log(`${DASHBOARD_URL}/api/${vendorId}/console-pricing`);

      const response = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/console-pricing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save pricing");

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
      console.error("Error saving pricing:", error);
      alert("There was an error saving your changes.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = Object.values(prices).some((price) => price.hasChanged);
  const canSave = hasChanges && Object.values(errors).length === 0;

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2">
              <IndianRupee className="w-6 h-6 text-black dark:text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Console Pricing Manager
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage dynamic pricing for your gaming console services
          </p>
        </motion.div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              className="fixed top-4 right-4 z-50 bg-green-500 text-white p-4 rounded-lg shadow-lg flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span className="font-medium">Pricing updated successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
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
                className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
              >
                <div className={`${console.color} p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg bg-white/20 dark:bg-black/20 backdrop-blur-sm"
                        style={{ color: console.iconColor }}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {console.name}
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
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

                <div className="p-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price per Slots
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IndianRupee className="h-4 w-4 text-gray-400 dark:text-gray-500" />
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
                          : "border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      }`}
                      placeholder="0.00"
                      whileFocus={{ scale: 1.02 }}
                    />
                  </div>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 flex items-center gap-1 text-red-600 dark:text-red-400 text-sm"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Current Rate
                      </span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="font-bold text-lg text-gray-900 dark:text-white">
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
                ? "bg-blue-500 text-white shadow-lg hover:shadow-xl"
                : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Pricing Changes</span>
              </>
            )}
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm"
        >
          <p>Changes will be applied immediately to all active gaming sessions</p>
        </motion.div>
      </div>
    </div>
  );
}
