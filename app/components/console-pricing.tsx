"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Tv,
  Gamepad,
  Headset,
  Check,
  IndianRupee,
  Plus,
  Calendar,
  Clock,
  Pencil,
  Trash2,
  X,
  Sparkles,
  PlusCircle,
  Loader2,
  LayoutGrid,
  Table as TableIcon,
  Lock,
} from "lucide-react";
import { DASHBOARD_URL } from "@/src/config/env";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    color: "bg-purple-500/10",
    iconColor: "#a855f7",
    description: "Gaming PCs and Workstations",
  },
  {
    type: "ps5",
    name: "PS5",
    icon: Tv,
    color: "bg-blue-500/10",
    iconColor: "#3b82f6",
    description: "PlayStation 5 Gaming Consoles",
  },
  {
    type: "xbox",
    name: "Xbox",
    icon: Gamepad,
    color: "bg-emerald-500/10",
    iconColor: "#10b981",
    description: "Xbox Series Gaming Consoles",
  },
  {
    type: "vr",
    name: "VR",
    icon: Headset,
    color: "bg-yellow-500/10",
    iconColor: "#f59e0b",
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

/* ------------------------------------------------------------------ */
/*                         LOCKED OVERLAY                              */
/* ------------------------------------------------------------------ */
function LockedOverlay() {
  const router = useRouter()
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/70 backdrop-blur-md rounded-xl pointer-events-auto">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="p-4 bg-destructive/10 rounded-full shadow-sm">
          <Lock className="w-10 h-10 text-destructive" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-foreground">Subscription Required</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
            Subscribe to manage console pricing and promotions.
          </p>
        </div>
        <button
          onClick={() => router.push("/subscription")}
          className="mt-2 px-8 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-md"
        >
          Subscribe Now
        </button>
      </div>
    </div>
  )
}

export default function ConsolePricing() {
  const { isLocked } = useSubscription()

  const [prices, setPrices] = useState<PricingState>(() => {
    const initialPrices: PricingState = {};
    consoleTypes.forEach((c) => {
      initialPrices[c.type] = { value: 0, isValid: true, hasChanged: false };
    });
    return initialPrices;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"default" | "offers">("default");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [offers, setOffers] = useState<PricingOffer[]>([]);
  const [availableGames, setAvailableGames] = useState<AvailableGame[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<PricingOffer | null>(null);

  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [isUpdatingOffer, setIsUpdatingOffer] = useState(false);
  const [deletingOfferId, setDeletingOfferId] = useState<number | null>(null);

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

  const validatePrice = (value: number) => value >= 0 && value <= 10000;

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      try {
        const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
        setVendorId(decoded_token.sub.id);
      } catch (e) {
        console.error("Token decode error", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!vendorId) return;
    const fetchPricing = async () => {
      try {
        const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/console-pricing`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        const newPrices: PricingState = {};
        consoleTypes.forEach((c) => {
          newPrices[c.type] = { value: data[c.type] ?? 0, isValid: true, hasChanged: false };
        });
        setPrices(newPrices);
      } catch (error) {
        console.error("Error fetching prices:", error);
      }
    };
    fetchPricing();
  }, [vendorId]);

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
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/pricing-offers`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setOffers(data.offers || []);
    } catch (error) {
      console.error("Error:", error);
      setOffers([]);
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const fetchAvailableGames = async () => {
    if (!vendorId) return;
    try {
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/available-games`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const gamesArray: AvailableGame[] = Array.isArray(data)
        ? data
        : data.games || data.available_games || data.data || [];
      setAvailableGames(gamesArray);
    } catch (error) {
      setAvailableGames([]);
    }
  };

  const showToast = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handlePriceChange = (consoleType: string, inputValue: string) => {
    const numericValue = parseFloat(inputValue) || 0;
    const isValid = validatePrice(numericValue);
    setPrices((prev) => ({
      ...prev,
      [consoleType]: { value: numericValue, isValid, hasChanged: true },
    }));
    if (isValid) {
      setErrors((prev) => { const n = { ...prev }; delete n[consoleType]; return n; });
    } else {
      setErrors((prev) => ({ ...prev, [consoleType]: "Price must be between ₹0 and ₹10,000" }));
    }
  };

  const handleSave = async () => {
    if (Object.values(errors).length > 0 || Object.values(prices).some((p) => !p.isValid)) return;
    setIsLoading(true);
    try {
      const payload = Object.entries(prices).reduce(
        (acc, [key, val]) => { acc[key] = val.value; return acc; },
        {} as Record<string, number>
      );
      const response = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/console-pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed");
      showToast("Pricing updated successfully!");
      setPrices((prev) => {
        const n = { ...prev };
        Object.keys(n).forEach((k) => (n[k].hasChanged = false));
        return n;
      });
    } catch (error) {
      alert("Error saving changes.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!vendorId) return;
    setIsCreatingOffer(true);
    try {
      const response = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/pricing-offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      });
      if (!response.ok) throw new Error("Failed");
      showToast("Offer created successfully!");
      setShowOfferForm(false);
      resetOfferForm();
      fetchOffers();
    } catch (error: any) {
      alert(error.message || "Error creating offer");
    } finally {
      setIsCreatingOffer(false);
    }
  };

  const handleUpdateOffer = async () => {
    if (!vendorId || !editingOffer) return;
    setIsUpdatingOffer(true);
    try {
      const response = await fetch(
        `${DASHBOARD_URL}/api/vendor/${vendorId}/pricing-offers/${editingOffer.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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
      if (!response.ok) throw new Error("Failed");
      showToast("Offer updated successfully!");
      setShowOfferForm(false);
      resetOfferForm();
      fetchOffers();
    } catch (error) {
      alert("Error updating offer");
    } finally {
      setIsUpdatingOffer(false);
    }
  };

  const handleDeleteOffer = async (id: number) => {
    if (!vendorId || !confirm("Are you sure you want to delete this offer?")) return;
    setDeletingOfferId(id);
    try {
      await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/pricing-offers/${id}`, {
        method: "DELETE",
      });
      showToast("Offer deleted!");
      fetchOffers();
    } catch (error) {
      alert("Error deleting offer");
    } finally {
      setDeletingOfferId(null);
    }
  };

  const handleEditOffer = (offer: PricingOffer) => {
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

  const getConsoleIcon = (type: string) =>
    consoleTypes.find((c) => c.type === type.toLowerCase())?.icon || Monitor;

  const canSave =
    Object.values(prices).some((p) => p.hasChanged) &&
    Object.values(errors).length === 0;

  return (
    // ── KEY: relative so LockedOverlay (absolute inset-0) is scoped here ──
    <div className="relative w-full min-h-full">

      {/* LockedOverlay: absolute → only covers this div, NOT the sidebar */}
      {isLocked && <LockedOverlay />}

      {/* Content: blurred + non-interactive when locked */}
      <div className={cn("page-container", isLocked && "pointer-events-none select-none blur-sm")}>

        {/* ✅ Success Toast */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-xl font-medium text-sm"
            >
              <Check className="w-4 h-4" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ✅ Page Header */}
        <div className="page-header">
          <div className="page-title-section">
            <div className="flex items-center gap-3 mb-1">
              <div className="icon-blue p-2 rounded-lg">
                <IndianRupee className="icon-lg text-blue-400" />
              </div>
              <h1 className="page-title">Console Pricing</h1>
            </div>
            <p className="page-subtitle">Manage base rates and promotional offers</p>
          </div>
        </div>

        {/* ✅ Tab Navigation */}
        <div className="tab-container mb-6">
          <button
            onClick={() => setActiveTab("default")}
            className={activeTab === "default" ? "tab-active" : "tab-inactive"}
          >
            <IndianRupee className="icon-md" />
            Default Pricing
          </button>
          <button
            onClick={() => setActiveTab("offers")}
            className={activeTab === "offers" ? "tab-active" : "tab-inactive"}
          >
            <Sparkles className="icon-md" />
            Promotional Offers
          </button>
        </div>

        {/* ✅ Default Pricing Tab */}
        {activeTab === "default" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1"
          >
            <div className="four-col-grid mb-6">
              {consoleTypes.map((console) => (
                <div
                  key={console.type}
                  className="content-card rounded-lg p-4 hover:shadow-md transition-all duration-200"
                >
                  <div className={`${console.color} rounded-lg p-3 mb-4 flex items-center gap-3`}>
                    <div className="icon-container p-1.5 rounded-md bg-card/50">
                      <console.icon className="icon-md" style={{ color: console.iconColor }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{console.name}</p>
                      <p className="text-xs text-muted-foreground">{console.description}</p>
                    </div>
                  </div>

                  <p className="table-header-text mb-2">Price per Slot</p>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                    <Input
                      type="number"
                      value={prices[console.type]?.value}
                      onChange={(e) => handlePriceChange(console.type, e.target.value)}
                      className="pl-9 bg-muted/20 border-border focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {errors[console.type] && (
                    <p className="text-destructive text-xs font-medium mt-1.5">
                      {errors[console.type]}
                    </p>
                  )}
                  {prices[console.type]?.hasChanged && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-blue-400 mt-1.5 font-medium"
                    >
                      ● Unsaved change
                    </motion.p>
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={handleSave}
              disabled={!canSave || isLoading}
              className="btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="icon-md animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="icon-md" />
                  Save Pricing Changes
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* ✅ Promotional Offers Tab */}
        {activeTab === "offers" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col gap-4 min-h-0"
          >
            <div className="page-actions justify-between flex-wrap">
              <div className="flex items-center gap-3">
                <h2 className="section-title">Active Promotions</h2>
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "grid"
                        ? "bg-background shadow-sm text-blue-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="icon-md" />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "table"
                        ? "bg-background shadow-sm text-blue-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Table View"
                  >
                    <TableIcon className="icon-md" />
                  </button>
                </div>
              </div>

              <button onClick={() => setShowOfferForm(true)} className="btn-primary">
                <PlusCircle className="icon-md" />
                New Offer
              </button>
            </div>

            {isLoadingOffers ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
                <p className="body-text-muted">Loading offers...</p>
              </div>
            ) : offers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-lg py-16">
                <Sparkles className="w-12 h-12 text-muted-foreground/30" />
                <h3 className="section-title text-muted-foreground/60">No active offers yet</h3>
                <p className="body-text-muted">Create your first promotional offer</p>
                <button onClick={() => setShowOfferForm(true)} className="btn-secondary mt-2">
                  <Plus className="icon-md" />
                  Add New Offer
                </button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 overflow-y-auto pb-4">
                {offers.map((offer) => {
                  const Icon = getConsoleIcon(offer.console_type);
                  const isDeleting = deletingOfferId === offer.id;
                  return (
                    <Card
                      key={offer.id}
                      className="content-card flex flex-col border-border hover:shadow-lg transition-all duration-200"
                    >
                      <CardHeader className="flex flex-row items-start justify-between p-4 border-b border-border">
                        <div className="min-w-0 flex-1 pr-2">
                          <h2 className="card-title truncate">{offer.offer_name}</h2>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Icon className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="table-header-text">{offer.console_type}</span>
                            {offer.is_currently_active && (
                              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[9px] font-bold border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                LIVE
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleEditOffer(offer)}
                            className="btn-icon hover:bg-emerald-500/10"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteOffer(offer.id)}
                            disabled={isDeleting}
                            className="btn-icon hover:bg-destructive/10 disabled:opacity-50"
                            title="Delete"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 text-destructive animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            )}
                          </button>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="stat-value-large text-blue-400">₹{offer.offered_price}</p>
                            <p className="table-header-text mt-0.5">Offer Rate</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground line-through">
                              ₹{offer.default_price}
                            </p>
                            <span className="inline-block mt-1 bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">
                              {offer.discount_percentage}% OFF
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-dashed border-border pt-3 space-y-1.5">
                          <div className="flex items-center gap-2 body-text-muted">
                            <Calendar className="icon-md text-blue-400/70 shrink-0" />
                            <span>
                              {offer.start_date} → {offer.end_date}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 body-text-muted">
                            <Clock className="icon-md text-blue-400/70 shrink-0" />
                            <span>
                              {offer.start_time} - {offer.end_time}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <OffersTable
                offers={offers}
                onEdit={handleEditOffer}
                onDelete={handleDeleteOffer}
                deletingOfferId={deletingOfferId}
                getConsoleIcon={getConsoleIcon}
              />
            )}
          </motion.div>
        )}

        {/* ✅ Offer Form Modal */}
        <AnimatePresence>
          {showOfferForm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h2 className="card-title">
                    {editingOffer ? "Edit Promotion" : "Create New Promotion"}
                  </h2>
                  <button
                    onClick={() => { setShowOfferForm(false); resetOfferForm(); }}
                    className="btn-icon"
                  >
                    <X className="icon-md" />
                  </button>
                </div>

                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-1.5">
                    <label className="table-header-text">Offer Title *</label>
                    <Input
                      placeholder="e.g. Weekend Bash 2024"
                      value={offerForm.offer_name}
                      onChange={(e) => setOfferForm({ ...offerForm, offer_name: e.target.value })}
                      className="bg-muted/20 border-border focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="table-header-text">Console Type *</label>
                    <select
                      className="w-full h-10 border border-border rounded-md px-3 text-sm bg-card text-foreground focus:ring-2 focus:ring-primary outline-none"
                      value={offerForm.available_game_id}
                      onChange={(e) => setOfferForm({ ...offerForm, available_game_id: e.target.value })}
                      disabled={!!editingOffer}
                    >
                      <option value="">Choose console type...</option>
                      {availableGames.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.game_name} (Base ₹{g.single_slot_price})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="table-header-text">Promo Rate (₹) *</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Enter discounted price"
                        value={offerForm.offered_price}
                        onChange={(e) => setOfferForm({ ...offerForm, offered_price: e.target.value })}
                        className="pl-9 bg-muted/20 border-border focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="table-header-text">Start Date</label>
                      <Input
                        type="date"
                        value={offerForm.start_date}
                        onChange={(e) => setOfferForm({ ...offerForm, start_date: e.target.value })}
                        className="bg-muted/20 border-border"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="table-header-text">Start Time</label>
                      <Input
                        type="time"
                        value={offerForm.start_time}
                        onChange={(e) => setOfferForm({ ...offerForm, start_time: e.target.value })}
                        className="bg-muted/20 border-border"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="table-header-text">End Date</label>
                      <Input
                        type="date"
                        value={offerForm.end_date}
                        onChange={(e) => setOfferForm({ ...offerForm, end_date: e.target.value })}
                        className="bg-muted/20 border-border"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="table-header-text">End Time</label>
                      <Input
                        type="time"
                        value={offerForm.end_time}
                        onChange={(e) => setOfferForm({ ...offerForm, end_time: e.target.value })}
                        className="bg-muted/20 border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="table-header-text">Description (Optional)</label>
                    <Input
                      placeholder="Short description..."
                      value={offerForm.offer_description}
                      onChange={(e) => setOfferForm({ ...offerForm, offer_description: e.target.value })}
                      className="bg-muted/20 border-border"
                    />
                  </div>
                </div>

                <div className="flex gap-3 px-5 py-4 border-t border-border">
                  <button
                    onClick={() => { setShowOfferForm(false); resetOfferForm(); }}
                    className="btn-secondary flex-1 justify-center"
                    disabled={isCreatingOffer || isUpdatingOffer}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingOffer ? handleUpdateOffer : handleCreateOffer}
                    disabled={isCreatingOffer || isUpdatingOffer}
                    className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingOffer || isUpdatingOffer ? (
                      <>
                        <Loader2 className="icon-md animate-spin" />
                        {editingOffer ? "Saving..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <Check className="icon-md" />
                        {editingOffer ? "Save Changes" : "Create Offer"}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

// ✅ Table View Component
function OffersTable({ offers, onEdit, onDelete, deletingOfferId, getConsoleIcon }: any) {
  return (
    <div className="table-container flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <table className="w-full text-left">
          <thead className="table-header sticky top-0 z-10">
            <tr>
              {["Offer Name", "Console", "Pricing", "Validity", "Actions"].map((h) => (
                <th key={h} className="table-cell table-header-text">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {offers.map((offer: any) => {
              const Icon = getConsoleIcon(offer.console_type);
              const isDeleting = deletingOfferId === offer.id;
              return (
                <tr key={offer.id} className="table-row">
                  <td className="table-cell">
                    <p className="body-text font-semibold">{offer.offer_name}</p>
                    {offer.is_currently_active && (
                      <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold mt-0.5">
                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                        LIVE NOW
                      </span>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2 body-text-muted">
                      <Icon className="icon-md text-blue-400" />
                      <span>{offer.console_type}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <span className="stat-value text-blue-400">₹{offer.offered_price}</span>
                      <span className="body-text-muted line-through">₹{offer.default_price}</span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {offer.discount_percentage}%
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="space-y-0.5 body-text-muted">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="icon-md shrink-0" />
                        <span>{offer.start_date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="icon-md shrink-0" />
                        <span>
                          {offer.start_time} - {offer.end_time}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEdit(offer)}
                        className="btn-icon hover:bg-emerald-500/10"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                      <button
                        onClick={() => onDelete(offer.id)}
                        disabled={isDeleting}
                        className="btn-icon hover:bg-destructive/10 disabled:opacity-50"
                        title="Delete"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 text-destructive animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}