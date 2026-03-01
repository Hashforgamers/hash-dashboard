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
  Sparkles,
  Monitor,
  Tag,
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
    is_offer: boolean;
    default_price: number;
    offer_name?: string;
    discount_percentage?: number;
    valid_until?: string;
  }[];
  avg_price: number;
}

interface PlatformType {
  id: number;
  platform_type: string;
  total_consoles: number;
  single_slot_price: number;
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

  // Modal state
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [selectedPlatformPrice, setSelectedPlatformPrice] = useState<number>(0); // ✅ auto price
  const [availableConsoles, setAvailableConsoles] = useState<Console[]>([]);
  const [selectedConsoleIds, setSelectedConsoleIds] = useState<number[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Modal steps: 1 = game, 2 = platform + consoles
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

  // Handle platform selection — ✅ also sets price from platformTypes
  const handlePlatformSelect = async (platformType: string) => {
    setSelectedPlatform(platformType);
    setSelectedConsoleIds([]);

    // ✅ Auto-set price from the selected platform's single_slot_price
    const platform = platformTypes.find(
      (p) => p.platform_type === platformType
    );
    setSelectedPlatformPrice(platform?.single_slot_price ?? 0);

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

  // Add game to consoles — ✅ no price_per_hour sent
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: selectedGame.id,
            console_ids: selectedConsoleIds,
            // ✅ price_per_hour removed — backend derives it from AvailableGame
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
  const handleDeleteVendorGame = async (
    vendorGameId: number,
    gameName: string,
    consoleNumber: number
  ) => {
    if (!confirm(`Remove ${gameName} from Console #${consoleNumber}?`)) return;

    try {
      const response = await fetch(
        `${DASHBOARD_URL}/vendor/${vendorId}/vendor-games/${vendorGameId}`,
        { method: "DELETE" }
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
    setSelectedPlatformPrice(0);
    setAvailableConsoles([]);
    setSelectedConsoleIds([]);
    setSearchTerm("");
    setError(null);
  };

  // Get console info
  const getConsoleInfo = (consoleType: string) => {
    return (
      CONSOLE_TYPES.find((c) => c.value === consoleType.toLowerCase()) ||
      CONSOLE_TYPES[0]
    );
  };
  const primaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-gradient-to-r from-cyan-500/90 to-emerald-500/90 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-900/40 transition-all duration-200 hover:from-cyan-400 hover:to-emerald-400 hover:shadow-lg hover:shadow-cyan-600/25 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm";
  const secondaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition-all duration-200 hover:border-cyan-300/45 hover:bg-slate-800/80 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm";

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
      <div className="flex-1 space-y-3 sm:space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gaming-panel rounded-xl p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="premium-heading !text-xl sm:!text-2xl md:!text-3xl flex items-center gap-2">
                Games Management
                <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
              </h1>
              <p className="premium-subtle mt-1">Manage games on your consoles</p>
            </div>
            <button onClick={() => setShowAddModal(true)} className={primaryButtonClass}>
              <Plus className="w-4 h-4" />
              Add Game
            </button>
          </div>
        </motion.div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="gaming-panel mb-4 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-300"
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
              className="gaming-panel mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-300"
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
            className="gaming-panel text-center py-16 rounded-xl border border-cyan-400/20 bg-slate-950/40"
          >
            <Gamepad2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Games Added Yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start by adding games to your consoles
            </p>
            <button onClick={() => setShowAddModal(true)} className={primaryButtonClass}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Game
            </button>
          </motion.div>
        ) : (
          <Card className="gaming-panel overflow-hidden rounded-xl border-cyan-400/20 bg-slate-950/45">
            <CardHeader className="border-b border-cyan-500/15">
              <CardTitle className="text-cyan-100">Your Games</CardTitle>
              <CardDescription className="text-slate-300/70">
                {vendorGames.length} game{vendorGames.length !== 1 ? "s" : ""}{" "}
                configured across your consoles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-cyan-100/80">
                        Game
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-cyan-100/80">
                        Genre
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-cyan-100/80">
                        Available On
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-cyan-100/80">
                        Avg Price
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider text-cyan-100/80">
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
                        className="border-b border-cyan-500/10 transition-colors hover:bg-cyan-500/5"
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
                              const consoleInfo = getConsoleInfo(
                                console.console_type
                              );
                              return (
                                <div
                                  key={console.vendor_game_id}
                                  className="group relative inline-flex items-center gap-1 rounded border border-cyan-400/20 bg-slate-900/60 px-2 py-1 text-xs"
                                >
                                  <span>{consoleInfo.icon}</span>
                                  <span className="font-medium">
                                    #{console.console_number}
                                  </span>
                                  {/* ✅ Show offer price in orange, normal in default */}
                                  <span
                                    className={
                                      console.is_offer
                                        ? "text-orange-500 font-semibold"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    (₹{console.price_per_hour}/hr
                                    {console.is_offer && (
                                      <Tag className="w-3 h-3 inline ml-1" />
                                    )}
                                    )
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
                              {vg.total_consoles} console
                              {vg.total_consoles !== 1 ? "s" : ""}
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

        {/* Add Game Modal */}
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
                className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl border border-cyan-400/25 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="border-b border-cyan-500/20 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="flex items-center gap-2 text-xl font-bold text-cyan-100 sm:text-2xl">
                        Add New Game
                        <Gamepad2 className="h-5 w-5 text-cyan-300" />
                      </h2>
                      <p className="mt-1 text-sm text-slate-300/75">
                        {modalStep === 1 && "Step 1: Select a game"}
                        {modalStep === 2 &&
                          "Step 2: Choose platform & consoles"}
                      </p>
                    </div>
                    <button className={secondaryButtonClass} onClick={resetModal}>
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 flex gap-2">
                    {[1, 2].map((step) => (
                      <div
                        key={step}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          step <= modalStep ? "bg-cyan-400" : "bg-slate-700"
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
                      <div className="mb-4 rounded-lg border border-cyan-400/15 bg-slate-900/40 p-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search games (e.g., GTA, Call of Duty)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-lg border border-cyan-400/25 bg-slate-900/70 py-3 pl-10 pr-4 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
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
                              whileHover={{ scale: 1.03, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              className="cursor-pointer overflow-hidden rounded-lg border border-cyan-400/20 bg-gradient-to-b from-slate-900/70 to-slate-950/70 transition-all hover:border-cyan-300/40 hover:shadow-lg hover:shadow-cyan-500/10"
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

                  {/* STEP 2: Platform + Console Selection */}
                  {modalStep === 2 && selectedGame && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <button
                        onClick={() => {
                          setModalStep(1);
                          setSelectedGame(null);
                          setSelectedPlatform("");
                          setSelectedPlatformPrice(0);
                          setAvailableConsoles([]);
                          setSelectedConsoleIds([]);
                        }}
                        className={`${secondaryButtonClass} mb-2`}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to games
                      </button>

                      {/* Selected Game Banner */}
                      <Card className="border-cyan-400/25 bg-gradient-to-r from-cyan-500/10 to-emerald-500/5 shadow-sm">
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
                                <span className="rounded border border-cyan-400/25 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">
                                  {selectedGame.genre}
                                </span>
                              )}
                              {selectedGame.rawg_rating && (
                                <span className="rounded border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                                  ⭐ {selectedGame.rawg_rating.toFixed(1)}
                                </span>
                              )}
                              {selectedGame.multiplayer && (
                                <span className="rounded border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                                  Multiplayer
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Platform Selection */}
                      <div>
                        <label className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">
                          1. Select Platform
                        </label>
                        {platformTypes.length === 0 ? (
                          <div className="text-center py-8 bg-muted/30 rounded-lg">
                            <Monitor className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No platforms configured. Please add consoles
                              first.
                            </p>
                          </div>
                        ) : (
                          <div className="flex gap-3 flex-wrap">
                            {platformTypes.map((platform) => {
                              const info = getConsoleInfo(
                                platform.platform_type
                              );
                              const isSelected =
                                selectedPlatform === platform.platform_type;
                              return (
                                <motion.button
                                  key={platform.id}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() =>
                                    handlePlatformSelect(platform.platform_type)
                                  }
                                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                                    isSelected
                                      ? "border-cyan-400/60 bg-cyan-500/10 shadow-md shadow-cyan-500/10"
                                      : "border-cyan-400/20 bg-slate-900/60 hover:border-cyan-300/45"
                                  }`}
                                >
                                  <span className="text-2xl">{info.icon}</span>
                                  <div className="text-left">
                                    <div className="font-semibold text-sm">
                                      {info.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {platform.total_consoles} console
                                      {platform.total_consoles !== 1 ? "s" : ""}
                                    </div>
                                    {/* ✅ Show platform price on button */}
                                    <div className="mt-0.5 text-xs font-semibold text-cyan-300">
                                      ₹{platform.single_slot_price}/slot
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <CheckCircle2 className="ml-2 h-5 w-5 text-cyan-300" />
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* ✅ Auto Price Display — read-only, no input */}
                      {selectedPlatform && selectedPlatformPrice > 0 && (
                        <div className="flex items-center gap-3 rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-4">
                          <IndianRupee className="h-5 w-5 text-cyan-300" />
                          <div>
                            <p className="text-sm font-semibold text-slate-100">
                              Price per slot:{" "}
                              <span className="text-cyan-300">
                                ₹{selectedPlatformPrice}
                              </span>
                            </p>
                            <p className="mt-0.5 text-xs text-slate-300/70">
                              Automatically set from{" "}
                              {getConsoleInfo(selectedPlatform).label} platform
                              pricing. To change it, update the platform price
                              in Console Pricing.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Console Selection */}
                      {selectedPlatform && availableConsoles.length > 0 && (
                        <div>
                          <label className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">
                            2. Select Consoles
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {availableConsoles.map((console) => {
                              const isSelected = selectedConsoleIds.includes(
                                console.id
                              );
                              const info = getConsoleInfo(console.console_type);
                              return (
                                <motion.div
                                  key={console.id}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => toggleConsole(console.id)}
                                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                    isSelected
                                      ? "border-cyan-400/60 bg-cyan-500/10"
                                      : "border-cyan-400/20 bg-slate-900/60 hover:border-cyan-300/40"
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
                                        <span className="text-xl">
                                          {info.icon}
                                        </span>
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
                            <p className="mt-3 text-center text-sm font-medium text-cyan-300">
                              ✓ {selectedConsoleIds.length} console
                              {selectedConsoleIds.length !== 1 ? "s" : ""}{" "}
                              selected
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-cyan-500/20 p-6">
                  <div>
                    {modalStep === 2 && (
                      <div className="text-sm text-slate-300/75">
                        {selectedPlatform && (
                          <span className="inline-flex items-center gap-1">
                            {getConsoleInfo(selectedPlatform).icon}{" "}
                            {getConsoleInfo(selectedPlatform).label}
                            {selectedConsoleIds.length > 0 && (
                              <>
                                {" "}
                                • {selectedConsoleIds.length} console
                                {selectedConsoleIds.length !== 1 ? "s" : ""}
                              </>
                            )}
                            {selectedPlatformPrice > 0 &&
                              selectedConsoleIds.length > 0 && (
                                <> • ₹{selectedPlatformPrice}/slot</>
                              )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={resetModal} disabled={submitting} className={secondaryButtonClass}>
                      Cancel
                    </button>
                    {modalStep === 2 && (
                      <button
                        onClick={handleAddGame}
                        disabled={
                          submitting || selectedConsoleIds.length === 0
                        }
                        className={primaryButtonClass}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Game to {selectedConsoleIds.length} Console
                            {selectedConsoleIds.length !== 1 ? "s" : ""}
                          </>
                        )}
                      </button>
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
