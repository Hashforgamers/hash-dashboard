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
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import {  DASHBOARD_URL } from "@/src/config/env";

// Types
interface Game {
  id: number;
  name: string;
  description?: string;
  category?: string;
  image_url?: string;
}

interface VendorGame {
  id: number;
  vendor_id: number;
  game_id: number;
  price_per_hour: number;
  is_available: boolean;
  created_at?: string;
}

interface VendorGameWithDetails {
  vendor_game: VendorGame;
  game: Game;
}

export default function GamesManagementPage() {
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [vendorGames, setVendorGames] = useState<VendorGameWithDetails[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [pricePerHour, setPricePerHour] = useState<number>(50);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setError("Failed to load your games. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all available games
  const fetchAllGames = async () => {
    try {
      const response = await fetch(`${DASHBOARD_URL}/games`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch games");
      }

      const data = await response.json();
      setAllGames(data);
    } catch (err) {
      console.error("Error fetching all games:", err);
    }
  };

  useEffect(() => {
    if (vendorId) {
      fetchVendorGames();
      fetchAllGames();
    }
  }, [vendorId]);

  // Add game to vendor
  const handleAddGame = async () => {
    if (!selectedGame || !vendorId) return;

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
            price_per_hour: pricePerHour,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add game");
      }

      setSuccess(`${selectedGame.name} added successfully!`);
      setShowAddModal(false);
      setSelectedGame(null);
      setPricePerHour(50);
      
      // Refresh vendor games list
      await fetchVendorGames();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error adding game:", err);
      setError("Failed to add game. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter games that are not already added
  const availableGames = allGames.filter(
    (game) => !vendorGames.some((vg) => vg.game.id === game.id)
  );

  // Filter games based on search
  const filteredAvailableGames = availableGames.filter((game) =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            {vendorGames.map((vg, index) => (
              <motion.div
                key={vg.vendor_game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-card border-border hover:shadow-lg transition-all duration-300 h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-foreground">
                          {vg.game.name}
                        </CardTitle>
                        {vg.game.category && (
                          <CardDescription className="mt-1">
                            {vg.game.category}
                          </CardDescription>
                        )}
                      </div>
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          vg.vendor_game.is_available
                            ? "bg-green-500/20 text-green-600"
                            : "bg-red-500/20 text-red-600"
                        }`}
                      >
                        {vg.vendor_game.is_available ? "Available" : "Unavailable"}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {vg.game.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {vg.game.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <IndianRupee className="w-4 h-4" />
                      <span className="text-lg">
                        {vg.vendor_game.price_per_hour}
                      </span>
                      <span className="text-sm text-muted-foreground font-normal">
                        / hour
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add Game Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowAddModal(false);
                setSelectedGame(null);
                setSearchTerm("");
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground">
                      Add New Game
                    </h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setShowAddModal(false);
                        setSelectedGame(null);
                        setSearchTerm("");
                      }}
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
                  {!selectedGame ? (
                    <>
                      {/* Search */}
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search games..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                          />
                        </div>
                      </div>

                      {/* Available Games List */}
                      <div className="space-y-2">
                        {filteredAvailableGames.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            No games available to add
                          </p>
                        ) : (
                          filteredAvailableGames.map((game) => (
                            <motion.div
                              key={game.id}
                              whileHover={{ scale: 1.02 }}
                              className="p-4 bg-card border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => setSelectedGame(game)}
                            >
                              <h3 className="font-semibold text-foreground">
                                {game.name}
                              </h3>
                              {game.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                  {game.description}
                                </p>
                              )}
                              {game.category && (
                                <span className="inline-block mt-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                                  {game.category}
                                </span>
                              )}
                            </motion.div>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Selected Game Details */}
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedGame(null)}
                        className="mb-4"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to games
                      </Button>

                      <Card className="bg-card border-border mb-6">
                        <CardHeader>
                          <CardTitle>{selectedGame.name}</CardTitle>
                          {selectedGame.description && (
                            <CardDescription>
                              {selectedGame.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                      </Card>

                      {/* Price Input */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Price per Hour (₹)
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
                            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Set the hourly rate for this game
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Modal Footer */}
                {selectedGame && (
                  <div className="p-6 border-t border-border flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedGame(null);
                        setPricePerHour(50);
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddGame}
                      disabled={submitting || pricePerHour <= 0}
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
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
