"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  Plus,
  Search,
  IndianRupee,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { DASHBOARD_URL } from "@/src/config/env";

// Types
interface Game {
  id: number;
  name: string;
  description?: string;
  genre?: string;
  platform?: string;
  image_url?: string;
  cloudinary_public_id?: string;
  esrb_rating?: string;
  multiplayer?: boolean;
  rawg_rating?: number;
  metacritic?: number;
}

interface VendorGame {
  id: number;
  vendor_id: number;
  game_id: number;
  console_type: string;
  price_per_hour: number;
  is_available: boolean;
  max_slots: number;
  created_at?: string;
}

interface VendorGameWithDetails {
  vendor_game: VendorGame;
  game: Game;
}

// Console types
const CONSOLE_TYPES = [
  { value: "pc", label: "PC", icon: "💻", color: "bg-blue-500" },
  { value: "ps5", label: "PlayStation 5", icon: "🎮", color: "bg-indigo-500" },
  { value: "xbox", label: "Xbox", icon: "🎯", color: "bg-green-500" },
];

export default function GamesManagementPage() {
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [vendorGames, setVendorGames] = useState<VendorGameWithDetails[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedConsoleType, setSelectedConsoleType] = useState<string>("");
  const [pricePerHour, setPricePerHour] = useState<number>(50);
  const [maxSlots, setMaxSlots] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // ✅ NEW - Modal step (1 = console selection, 2 = game selection, 3 = configuration)
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);

  // Extract vendor ID from JWT
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      try {
        const decoded = jwtDecode<{ sub: { id: number } }>(token);
        setVendorId(decoded.sub.id);
      } catch (error) {
        console.error("Error decoding JWT:", error);
        setError("Failed to authenticate. Please login again.");
      }
    }
  }, []);

  // Fetch vendor games
  const fetchVendorGames = async () => {
    if (!vendorId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${DASHBOARD_URL}/vendor/${vendorId}/games`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch vendor games");
      }

      const data = await response.json();
      setVendorGames(data);
    } catch (err) {
      console.error("Error fetching vendor games:", err);
      if (vendorGames.length === 0) {
        setVendorGames([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW - Fetch games with search
  const fetchGames = async (search = "") => {
    try {
      setSearchLoading(true);
      const url = search
        ? `${DASHBOARD_URL}/games?search=${encodeURIComponent(search)}`
        : `${DASHBOARD_URL}/games`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch games");
      }

      const data = await response.json();
      setAllGames(data);
    } catch (err) {
      console.error("Error fetching games:", err);
      setError("Failed to load games.");
    } finally {
      setSearchLoading(false);
    }
  };

  // ✅ NEW - Debounced search
  useEffect(() => {
    if (modalStep === 2) {
      const timer = setTimeout(() => {
        fetchGames(searchTerm);
      }, 300); // 300ms debounce

      return () => clearTimeout(timer);
    }
  }, [searchTerm, modalStep]);

  useEffect(() => {
    if (vendorId) {
      fetchVendorGames();
      fetchGames(); // Initial load
    }
  }, [vendorId]);

  // Add game to vendor
  const handleAddGame = async () => {
    if (!selectedGame || !vendorId || !selectedConsoleType) {
      setError("Please complete all required fields");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(
        `${DASHBOARD_URL}/vendor/${vendorId}/games/${selectedGame.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            console_type: selectedConsoleType,
            price_per_hour: pricePerHour,
            max_slots: maxSlots,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add game");
      }

      setSuccess(`${selectedGame.name} added successfully!`);
      resetModal();
      await fetchVendorGames();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error adding game:", err);
      setError(err.message || "Failed to add game. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ NEW - Reset modal
  const resetModal = () => {
    setShowAddModal(false);
    setModalStep(1);
    setSelectedConsoleType("");
    setSelectedGame(null);
    setSearchTerm("");
    setPricePerHour(50);
    setMaxSlots(1);
    setError(null);
  };

  // Get console info
  const getConsoleInfo = (consoleType: string) => {
    return (
      CONSOLE_TYPES.find((c) => c.value === consoleType.toLowerCase()) ||
      CONSOLE_TYPES[0]
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex-1 p-4 md:p-8 bg-background">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Gamepad2 className="w-8 h-8 text-primary" />
                Games Management
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your available games and pricing
              </p>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Game
            </Button>
          </div>
        </motion.div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-600"
            >
              <CheckCircle2 className="w-5 h-5" />
              {success}
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-600"
            >
              <XCircle className="w-5 h-5" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Games Grid */}
        {vendorGames.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <Gamepad2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Games Added Yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start by adding games to your vendor profile
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Game
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {vendorGames.map((vg, index) => {
              const consoleInfo = getConsoleInfo(vg.vendor_game.console_type);
              return (
                <motion.div
                  key={vg.vendor_game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-card border-border hover:shadow-lg transition-all duration-300 h-full overflow-hidden">
                    {/* Game Image */}
                    <div className="relative w-full h-48 bg-gradient-to-br from-purple-500 to-blue-600 overflow-hidden">
                      {vg.game.image_url ? (
                        <img
                          src={vg.game.image_url}
                          alt={vg.game.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-16 h-16 text-white/50" />
                        </div>
                      )}
                      <div
                        className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                          vg.vendor_game.is_available
                            ? "bg-green-500/80 text-white"
                            : "bg-red-500/80 text-white"
                        }`}
                      >
                        {vg.vendor_game.is_available
                          ? "Available"
                          : "Unavailable"}
                      </div>
                    </div>

                    <CardHeader>
                      <CardTitle className="text-lg text-foreground">
                        {vg.game.name}
                      </CardTitle>
                      {vg.game.genre && (
                        <CardDescription className="mt-1">
                          {vg.game.genre}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent>
                      {vg.game.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {vg.game.description}
                        </p>
                      )}

                      {/* Console Type Badge */}
                      <div
                        className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border ${consoleInfo.color}/10 border-${consoleInfo.color}/20`}
                      >
                        <span className="text-2xl">{consoleInfo.icon}</span>
                        <div className="flex-1">
                          <p
                            className={`text-sm font-medium ${consoleInfo.color.replace(
                              "bg-",
                              "text-"
                            )}`}
                          >
                            {consoleInfo.label}
                          </p>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                          <IndianRupee className="w-4 h-4" />
                          <span className="text-lg">
                            {vg.vendor_game.price_per_hour}
                          </span>
                          <span className="text-sm text-muted-foreground font-normal">
                            / hour
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Slots: {vg.vendor_game.max_slots}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ✅ NEW - Multi-Step Add Game Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={resetModal}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        {modalStep === 1 && "Select Console Type"}
                        {modalStep === 2 && "Select Game"}
                        {modalStep === 3 && "Configure Game"}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Step {modalStep} of 3
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={resetModal}>
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 flex gap-2">
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          step <= modalStep ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
                  {/* ✅ STEP 1: Console Type Selection */}
                  {modalStep === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <p className="text-muted-foreground mb-6 text-center">
                        Choose which platform you want to add games for
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                        {CONSOLE_TYPES.map((console) => (
                          <motion.div
                            key={console.value}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setSelectedConsoleType(console.value);
                              setModalStep(2);
                            }}
                            className={`p-8 rounded-xl border-2 cursor-pointer transition-all text-center ${
                              selectedConsoleType === console.value
                                ? `${console.color} border-current text-white`
                                : "border-border bg-card hover:border-primary hover:shadow-lg"
                            }`}
                          >
                            <div className="text-6xl mb-4">{console.icon}</div>
                            <div className="text-lg font-bold mb-2">
                              {console.label}
                            </div>
                            <div className="text-sm opacity-80">
                              Click to select
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* ✅ STEP 2: Game Selection */}
                  {modalStep === 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      {/* Selected Console Badge */}
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">
                            {getConsoleInfo(selectedConsoleType).icon}
                          </span>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Selected Console
                            </p>
                            <p className="font-semibold">
                              {getConsoleInfo(selectedConsoleType).label}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setModalStep(1);
                            setSelectedConsoleType("");
                          }}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Change
                        </Button>
                      </div>

                      {/* Search */}
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search games (e.g., GTA, Call of Duty)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                            autoFocus
                          />
                          {searchLoading && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          💡 Tip: Type "g" to see all games starting with G,
                          "gta" for all GTA games
                        </p>
                      </div>

                      {/* Games Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {searchLoading ? (
                          <div className="col-span-full text-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                            <p className="text-muted-foreground mt-2">
                              Searching games...
                            </p>
                          </div>
                        ) : allGames.length === 0 ? (
                          <div className="col-span-full text-center py-12">
                            <Gamepad2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground">
                              {searchTerm
                                ? "No games found matching your search"
                                : "No games available"}
                            </p>
                          </div>
                        ) : (
                          allGames.map((game) => (
                            <motion.div
                              key={game.id}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="bg-card border border-border rounded-lg cursor-pointer hover:border-primary transition-all overflow-hidden"
                              onClick={() => {
                                setSelectedGame(game);
                                setModalStep(3);
                              }}
                            >
                              {/* Game Image */}
                              <div className="relative w-full h-32 bg-gradient-to-br from-purple-500 to-blue-600">
                                {game.image_url ? (
                                  <img
                                    src={game.image_url}
                                    alt={game.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-white/50" />
                                  </div>
                                )}
                                {game.rawg_rating && (
                                  <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs font-bold">
                                    ⭐ {game.rawg_rating.toFixed(1)}
                                  </div>
                                )}
                              </div>

                              {/* Game Info */}
                              <div className="p-3">
                                <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                                  {game.name}
                                </h3>
                                {game.genre && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {game.genre}
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>

                      {/* Results count */}
                      {allGames.length > 0 && (
                        <p className="text-sm text-muted-foreground text-center mt-4">
                          Showing {allGames.length} game
                          {allGames.length !== 1 ? "s" : ""}
                          {searchTerm && ` for "${searchTerm}"`}
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* ✅ STEP 3: Configuration */}
                  {modalStep === 3 && selectedGame && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setModalStep(2);
                          setSelectedGame(null);
                        }}
                        className="mb-4"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to games
                      </Button>

                      {/* Selected Game Card */}
                      <Card className="bg-card border-border mb-6 overflow-hidden">
                        <div className="relative w-full h-56 bg-gradient-to-br from-purple-500 to-blue-600">
                          {selectedGame.image_url ? (
                            <img
                              src={selectedGame.image_url}
                              alt={selectedGame.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-16 h-16 text-white/50" />
                            </div>
                          )}
                        </div>

                        <CardHeader>
                          <CardTitle className="text-xl">
                            {selectedGame.name}
                          </CardTitle>
                          {selectedGame.description && (
                            <CardDescription className="text-base line-clamp-2">
                              {selectedGame.description}
                            </CardDescription>
                          )}
                          <div className="flex gap-2 mt-3 flex-wrap">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${getConsoleInfo(
                                selectedConsoleType
                              ).color} text-white`}
                            >
                              {getConsoleInfo(selectedConsoleType).icon}{" "}
                              {getConsoleInfo(selectedConsoleType).label}
                            </span>
                            {selectedGame.genre && (
                              <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                                {selectedGame.genre}
                              </span>
                            )}
                            {selectedGame.multiplayer && (
                              <span className="px-3 py-1 bg-green-500/10 text-green-600 text-sm rounded-full">
                                Multiplayer
                              </span>
                            )}
                          </div>
                        </CardHeader>
                      </Card>

                      {/* Configuration Form */}
                      <div className="space-y-4">
                        {/* Price Input */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Price per Hour (₹) *
                          </label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={pricePerHour}
                              onChange={(e) =>
                                setPricePerHour(Number(e.target.value))
                              }
                              className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Set the hourly rental rate for this game
                          </p>
                        </div>

                        {/* Max Slots Input */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Maximum Slots *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={maxSlots}
                            onChange={(e) => setMaxSlots(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            How many people can play this game simultaneously?
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-border flex justify-between gap-3">
                  <div>
                    {modalStep > 1 && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (modalStep === 3) setModalStep(2);
                          if (modalStep === 2) setModalStep(1);
                        }}
                        disabled={submitting}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={resetModal}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    {modalStep === 3 && (
                      <Button
                        onClick={handleAddGame}
                        disabled={
                          submitting ||
                          !selectedConsoleType ||
                          pricePerHour <= 0 ||
                          maxSlots < 1
                        }
                        className="bg-primary hover:bg-primary/90"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Game
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
