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
  Monitor,
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { DASHBOARD_URL } from "@/src/config/env";

// Types
interface Console {
  id: number;
  console_number: number;
  console_type: string;
  brand: string;
  model_number: string;
  serial_number: string;
  description?: string;
}

interface Game {
  id: number;
  name: string;
  description?: string;
  genre?: string;
  platform?: string;
  image_url?: string;
  rawg_rating?: number;
  metacritic?: number;
  multiplayer?: boolean;
}

interface VendorGame {
  game: Game;
  total_consoles: number;
  consoles: {
    id: number;
    console_number: number;
    console_type: string;
    brand: string;
    model_number: string;
    vendor_game_id: number;
    price_per_hour: number;
  }[];
  avg_price: number;
}

interface PlatformType {
  id: number;
  platform_type: string;
  total_consoles: number;
  consoles: Console[];
}

// Console type configs
const CONSOLE_TYPES = [
  { value: "pc", label: "PC", icon: "💻", color: "bg-blue-500" },
  { value: "ps5", label: "PlayStation 5", icon: "🎮", color: "bg-indigo-500" },
  { value: "xbox", label: "Xbox", icon: "🎯", color: "bg-green-500" },
  { value: "vr", label: "VR", icon: "🥽", color: "bg-purple-500" },
];

export default function GamesManagementPage() {
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [vendorGames, setVendorGames] = useState<VendorGame[]>([]);
  const [platformTypes, setPlatformTypes] = useState<PlatformType[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal state - 2 STEPS: Game → Console Selection + Price
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [availableConsoles, setAvailableConsoles] = useState<Console[]>([]);
  const [selectedConsoleIds, setSelectedConsoleIds] = useState<number[]>([]);
  const [pricePerHour, setPricePerHour] = useState<number>(50);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Modal steps: 1 = game, 2 = platform + consoles + price
  const [modalStep, setModalStep] = useState<1 | 2>(1);

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

  // Fetch platform types
  const fetchPlatformTypes = async () => {
    if (!vendorId) return;

    try {
      const response = await fetch(
        `${DASHBOARD_URL}/vendor/${vendorId}/available-games`
      );

      if (!response.ok) throw new Error("Failed to fetch platforms");

      const data = await response.json();
      setPlatformTypes(data);
    } catch (err) {
      console.error("Error fetching platforms:", err);
    }
  };

  // Fetch vendor games
  const fetchVendorGames = async () => {
    if (!vendorId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${DASHBOARD_URL}/vendor/${vendorId}/vendor-games`
      );

      if (!response.ok) throw new Error("Failed to fetch vendor games");

      const data = await response.json();
      setVendorGames(data);
    } catch (err) {
      console.error("Error fetching vendor games:", err);
      setVendorGames([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch consoles for selected platform
  const fetchConsolesForPlatform = async (platformType: string) => {
    if (!vendorId) return;

    try {
      const response = await fetch(
        `${DASHBOARD_URL}/vendor/${vendorId}/platforms/${platformType}/consoles`
      );

      if (!response.ok) throw new Error("Failed to fetch consoles");

      const data = await response.json();
      setAvailableConsoles(data);
    } catch (err) {
      console.error("Error fetching consoles:", err);
      setError("Failed to load consoles for this platform");
      setAvailableConsoles([]);
    }
  };

  // Fetch all games with search
  const fetchGames = async (search = "") => {
    try {
      setSearchLoading(true);
      const url = search
        ? `${DASHBOARD_URL}/games?search=${encodeURIComponent(search)}`
        : `${DASHBOARD_URL}/games`;

      const response = await fetch(url);

      if (!response.ok) throw new Error("Failed to fetch games");

      const data = await response.json();
      setAllGames(data);
    } catch (err) {
      console.error("Error fetching games:", err);
      setError("Failed to load games.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (modalStep === 1) {
      const timer = setTimeout(() => {
        fetchGames(searchTerm);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchTerm, modalStep]);

  useEffect(() => {
    if (vendorId) {
      fetchPlatformTypes();
      fetchVendorGames();
      fetchGames();
    }
  }, [vendorId]);

  // Handle platform selection
  const handlePlatformSelect = async (platformType: string) => {
    setSelectedPlatform(platformType);
    setSelectedConsoleIds([]);
    await fetchConsolesForPlatform(platformType.toLowerCase());
  };

  // Toggle console selection
  const toggleConsole = (consoleId: number) => {
    setSelectedConsoleIds((prev) =>
      prev.includes(consoleId)
        ? prev.filter((id) => id !== consoleId)
        : [...prev, consoleId]
    );
  };

  // Add game to consoles
  const handleAddGame = async () => {
    if (!selectedGame || !vendorId || selectedConsoleIds.length === 0) {
      setError("Please select at least one console");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(
        `${DASHBOARD_URL}/vendor/${vendorId}/vendor-games`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            game_id: selectedGame.id,
            console_ids: selectedConsoleIds,
            price_per_hour: pricePerHour,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add game");
      }

      const result = await response.json();
      setSuccess(result.message);
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

  // Delete vendor game
  const handleDeleteVendorGame = async (vendorGameId: number, gameName: string, consoleNumber: number) => {
    if (!confirm(`Remove ${gameName} from Console #${consoleNumber}?`)) return;

    try {
      const response = await fetch(
        `${DASHBOARD_URL}/vendor/${vendorId}/vendor-games/${vendorGameId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete game");

      setSuccess(`Game removed successfully!`);
      await fetchVendorGames();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting game:", err);
      setError("Failed to delete game");
    }
  };

  // Reset modal
  const resetModal = () => {
    setShowAddModal(false);
    setModalStep(1);
    setSelectedGame(null);
    setSelectedPlatform("");
    setAvailableConsoles([]);
    setSelectedConsoleIds([]);
    setSearchTerm("");
    setPricePerHour(50);
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
                Manage games on your consoles
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

        {/* Games Table */}
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
              Start by adding games to your consoles
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
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Your Games</CardTitle>
              <CardDescription>
                {vendorGames.length} game{vendorGames.length !== 1 ? "s" : ""} configured across your consoles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                        Game
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                        Genre
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                        Available On
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                        Avg Price
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorGames.map((vg, index) => (
                      <motion.tr
                        key={vg.game.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                              {vg.game.image_url ? (
                                <img
                                  src={vg.game.image_url}
                                  alt={vg.game.name}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <Gamepad2 className="w-6 h-6 text-white" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {vg.game.name}
                              </p>
                              {vg.game.rawg_rating && (
                                <p className="text-xs text-muted-foreground">
                                  ⭐ {vg.game.rawg_rating.toFixed(1)}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">
                            {vg.game.genre || "N/A"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {vg.consoles.map((console) => {
                              const consoleInfo = getConsoleInfo(console.console_type);
                              return (
                                <div
                                  key={console.vendor_game_id}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted border border-border group relative"
                                >
                                  <span>{consoleInfo.icon}</span>
                                  <span className="font-medium">#{console.console_number}</span>
                                  <span className="text-muted-foreground">
                                    (₹{console.price_per_hour}/hr)
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleDeleteVendorGame(
                                        console.vendor_game_id,
                                        vg.game.name,
                                        console.console_number
                                      )
                                    }
                                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <XCircle className="w-3 h-3 text-red-500 hover:text-red-600" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-primary font-semibold">
                            <IndianRupee className="w-4 h-4" />
                            <span>{vg.avg_price.toFixed(0)}/hr</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {vg.total_consoles} console{vg.total_consoles !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Game Modal - 2 STEPS ONLY */}
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
                className="bg-background rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Add New Game
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {modalStep === 1 && "Step 1: Select a game"}
                        {modalStep === 2 && "Step 2: Choose platform & consoles, set price"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={resetModal}>
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 flex gap-2">
                    {[1, 2].map((step) => (
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
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  {/* STEP 1: Game Selection */}
                  {modalStep === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
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
                      </div>

                      {/* Games Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {searchLoading ? (
                          <div className="col-span-full text-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                          </div>
                        ) : allGames.length === 0 ? (
                          <div className="col-span-full text-center py-12">
                            <Gamepad2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground">
                              {searchTerm
                                ? "No games found"
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
                                setModalStep(2);
                              }}
                            >
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
                    </motion.div>
                  )}

                  {/* STEP 2: Platform Selection + Console Selection + Price (ALL IN ONE) */}
                  {modalStep === 2 && selectedGame && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setModalStep(1);
                          setSelectedGame(null);
                          setSelectedPlatform("");
                          setAvailableConsoles([]);
                          setSelectedConsoleIds([]);
                        }}
                        className="mb-2"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to games
                      </Button>

                      {/* Selected Game Banner */}
                      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                        <div className="flex items-center gap-4 p-4">
                          <div className="w-16 h-16 rounded bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                            {selectedGame.image_url ? (
                              <img
                                src={selectedGame.image_url}
                                alt={selectedGame.name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <Gamepad2 className="w-8 h-8 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-foreground">
                              {selectedGame.name}
                            </h3>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {selectedGame.genre && (
                                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                                  {selectedGame.genre}
                                </span>
                              )}
                              {selectedGame.rawg_rating && (
                                <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-600 rounded">
                                  ⭐ {selectedGame.rawg_rating.toFixed(1)}
                                </span>
                              )}
                              {selectedGame.multiplayer && (
                                <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 rounded">
                                  Multiplayer
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Platform Selection - Small Icons */}
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-3">
                          1. Select Platform
                        </label>
                        {platformTypes.length === 0 ? (
                          <div className="text-center py-8 bg-muted/30 rounded-lg">
                            <Monitor className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No platforms configured. Please add consoles first.
                            </p>
                          </div>
                        ) : (
                          <div className="flex gap-3 flex-wrap">
                            {platformTypes.map((platform) => {
                              const info = getConsoleInfo(platform.platform_type);
                              const isSelected = selectedPlatform === platform.platform_type;
                              return (
                                <motion.button
                                  key={platform.id}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handlePlatformSelect(platform.platform_type)}
                                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                                    isSelected
                                      ? "border-primary bg-primary/10 shadow-md"
                                      : "border-border bg-card hover:border-primary/50"
                                  }`}
                                >
                                  <span className="text-2xl">{info.icon}</span>
                                  <div className="text-left">
                                    <div className="font-semibold text-sm">{info.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {platform.total_consoles} console{platform.total_consoles !== 1 ? "s" : ""}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <CheckCircle2 className="w-5 h-5 text-primary ml-2" />
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Console Selection */}
                      {selectedPlatform && availableConsoles.length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-3">
                            2. Select Consoles
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {availableConsoles.map((console) => {
                              const isSelected = selectedConsoleIds.includes(console.id);
                              const info = getConsoleInfo(console.console_type);
                              return (
                                <motion.div
                                  key={console.id}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => toggleConsole(console.id)}
                                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                    isSelected
                                      ? "border-primary bg-primary/5"
                                      : "border-border bg-card hover:border-primary/30"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleConsole(console.id)}
                                      className="w-5 h-5 mt-1 cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{info.icon}</span>
                                        <span className="font-bold text-foreground">
                                          Console #{console.console_number}
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {console.brand} {console.model_number}
                                      </div>
                                      <div className="text-xs text-muted-foreground font-mono mt-1">
                                        SN: {console.serial_number}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                          {selectedConsoleIds.length > 0 && (
                            <p className="text-sm text-primary font-medium mt-3 text-center">
                              ✓ {selectedConsoleIds.length} console{selectedConsoleIds.length !== 1 ? "s" : ""} selected
                            </p>
                          )}
                        </div>
                      )}

                      {/* Price Input */}
                      {selectedConsoleIds.length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-3">
                            3. Set Price per Hour
                          </label>
                          <div className="relative max-w-xs">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={pricePerHour}
                              onChange={(e) =>
                                setPricePerHour(Number(e.target.value))
                              }
                              className="w-full pl-11 pr-4 py-3 bg-muted border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-lg font-semibold"
                              autoFocus
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            This price will apply to all selected consoles
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex justify-between items-center">
                  <div>
                    {modalStep === 2 && (
                      <div className="text-sm text-muted-foreground">
                        {selectedPlatform && (
                          <span className="inline-flex items-center gap-1">
                            {getConsoleInfo(selectedPlatform).icon} {getConsoleInfo(selectedPlatform).label}
                            {selectedConsoleIds.length > 0 && (
                              <> • {selectedConsoleIds.length} console{selectedConsoleIds.length !== 1 ? "s" : ""}</>
                            )}
                            {pricePerHour > 0 && selectedConsoleIds.length > 0 && (
                              <> • ₹{pricePerHour}/hr</>
                            )}
                          </span>
                        )}
                      </div>
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
                    {modalStep === 2 && (
                      <Button
                        onClick={handleAddGame}
                        disabled={submitting || selectedConsoleIds.length === 0 || pricePerHour <= 0}
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
                            Add Game to {selectedConsoleIds.length} Console{selectedConsoleIds.length !== 1 ? "s" : ""}
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
