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
  Edit2,
  Trash2,
  X,
  ChevronDown,
  Sparkles,
  Info,
  Pencil,
  BadgeCheck,
  PlusCircle,
  Loader2,
  LayoutGrid,
  Table as TableIcon
} from "lucide-react";
import { DASHBOARD_URL } from "@/src/config/env";
import { jwtDecode } from "jwt-decode";

// UI Components from Shadcn
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const [activeTab, setActiveTab] = useState<"default" | "offers">("default");
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid'); // Added View Mode
  const [offers, setOffers] = useState<PricingOffer[]>([]);
  const [availableGames, setAvailableGames] = useState<AvailableGame[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<PricingOffer | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

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
    const fetchPricing = async () => {
      try {
        if (!vendorId) return;
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
    if (vendorId) fetchPricing();
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
      if (!res.ok) throw new Error("Failed to fetch offers");
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
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      let gamesArray: AvailableGame[] = Array.isArray(data) ? data : (data.games || data.available_games || data.data || []);
      setAvailableGames(gamesArray);
    } catch (error) {
      setAvailableGames([]);
    }
  };

  const handlePriceChange = (consoleType: string, inputValue: string) => {
    const numericValue = parseFloat(inputValue) || 0;
    const isValid = validatePrice(numericValue);
    setPrices(prev => ({
      ...prev,
      [consoleType]: { value: numericValue, isValid, hasChanged: true }
    }));
    if (isValid) {
      setErrors(prev => { const n = { ...prev }; delete n[consoleType]; return n; });
    } else {
      setErrors(prev => ({ ...prev, [consoleType]: "Price must be between ₹0 and ₹10,000" }));
    }
  };

  const handleSave = async () => {
    if (Object.values(errors).length > 0 || Object.values(prices).some(p => !p.isValid)) return;
    setIsLoading(true);
    try {
      const payload = Object.entries(prices).reduce((acc, [key, val]) => { acc[key] = val.value; return acc; }, {} as Record<string, number>);
      const response = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/console-pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed");
      setSuccessMessage("Pricing updated successfully!");
      setShowSuccess(true);
      setPrices(prev => {
        const n = { ...prev };
        Object.keys(n).forEach(k => n[k].hasChanged = false);
        return n;
      });
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      alert("Error saving changes.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!vendorId) return;
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
      setSuccessMessage("Offer created successfully!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setShowOfferForm(false);
      resetOfferForm();
      fetchOffers();
    } catch (error: any) {
      alert(error.message || "Error");
    }
  };

  const handleUpdateOffer = async () => {
    if (!vendorId || !editingOffer) return;
    try {
      const response = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/pricing-offers/${editingOffer.id}`, {
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
      });
      if (!response.ok) throw new Error("Failed");
      setSuccessMessage("Offer updated!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setShowOfferForm(false);
      resetOfferForm();
      fetchOffers();
    } catch (error) {
      alert("Error");
    }
  };

  const handleDeleteOffer = async (id: number) => {
    if (!vendorId || !confirm("Are you sure?")) return;
    try {
      await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/pricing-offers/${id}`, { method: "DELETE" });
      setSuccessMessage("Deleted!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchOffers();
    } catch (error) {
      alert("Error");
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
    setOfferForm({ available_game_id: "", offered_price: "", start_date: "", start_time: "", end_date: "", end_time: "", offer_name: "", offer_description: "" });
    setEditingOffer(null);
  };

  const getConsoleIcon = (type: string) => consoleTypes.find(c => c.type === type.toLowerCase())?.icon || Monitor;
  const canSave = Object.values(prices).some(p => p.hasChanged) && Object.values(errors).length === 0;

  return (
    <div className="w-full text-left p-4">
      <div className="w-full max-w-7xl mx-0">
        {/* Header */}
        <div className="mb-8 w-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
                <IndianRupee className="text-blue-500 w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
               Console Pricing Manager
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">Manage rates and promotional special offers</p>
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 flex items-center gap-2 font-medium">
              <Check className="w-5 h-5" /> <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Container */}
        <div className="flex gap-2 mb-8 bg-muted/50 p-1 rounded-lg w-fit border border-border">
          <button onClick={() => setActiveTab("default")} className={`px-6 py-2 rounded-md transition-all text-sm font-semibold ${activeTab === 'default' ? 'bg-white shadow-sm text-blue-600 border border-border' : 'text-muted-foreground hover:text-foreground'}`}>Default Pricing</button>
          <button onClick={() => setActiveTab("offers")} className={`px-6 py-2 rounded-md transition-all text-sm font-semibold ${activeTab === 'offers' ? 'bg-white shadow-sm text-blue-600 border border-border' : 'text-muted-foreground hover:text-foreground'}`}>Promotional Offers</button>
        </div>

        {activeTab === "default" && (
          <div className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {consoleTypes.map((console) => (
                <div key={console.type} className="bg-card rounded-xl shadow-sm border border-border p-4 hover:shadow-md transition-all">
                  <div className={`p-3 rounded-lg ${console.color} mb-4 flex items-center gap-3 border border-border/20`}>
                    <console.icon className="w-5 h-5" style={{ color: console.iconColor }} />
                    <span className="font-bold text-sm">{console.name}</span>
                  </div>
                  <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">Price per Slot</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={prices[console.type]?.value}
                      onChange={(e) => handlePriceChange(console.type, e.target.value)}
                      className="w-full pl-9 bg-muted/20"
                    />
                  </div>
                  {errors[console.type] && <p className="text-destructive text-[10px] font-bold mt-1 uppercase italic tracking-tighter">{errors[console.type]}</p>}
                </div>
              ))}
            </div>
            <Button onClick={handleSave} disabled={!canSave || isLoading} className="btn-primary px-8 py-6 rounded-lg font-bold shadow-lg transition-all active:scale-95">
              {isLoading ? "Updating..." : "Save Pricing Changes"}
            </Button>
          </div>
        )}

        {/* Offers Content */}
        {activeTab === "offers" && (
          <div className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <h2 className="text-xl font-semibold tracking-tight">Active Promotions</h2>
                </div>
                
                {/* VIEW TOGGLE BAR - NEW */}
                <div className="flex gap-1 bg-muted p-1 rounded-lg border border-border ml-4">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <TableIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Button onClick={() => setShowOfferForm(true)} className="btn-primary gap-2 px-6 shadow-md transition-all active:scale-95">
                <PlusCircle className="w-4 h-4" /> New Offer
              </Button>
            </div>

            {isLoadingOffers ? (
               <div className="w-full text-center py-20 flex flex-col items-center gap-2">
                   <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
                   <p className="text-muted-foreground text-sm font-medium tracking-wide">Loading active offers...</p>
               </div>
            ) : offers.length === 0 ? (
              <div className="w-full py-20 text-center bg-muted/10 rounded-2xl border-2 border-dashed border-border flex flex-col items-center">
                <Sparkles className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <h3 className="font-bold text-lg text-foreground/70">No active offers yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Add your first promotional offer to attract more customers</p>
                <Button variant="outline" onClick={() => setShowOfferForm(true)}>Add New Offer</Button>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {offers.map((offer) => {
                  const Icon = getConsoleIcon(offer.console_type);
                  return (
                    <Card key={offer.id} className="content-card shadow-lg hover:shadow-xl transition-all duration-300 border border-border overflow-hidden flex flex-col">
                      <CardHeader className="flex flex-row items-start justify-between p-4 border-b border-border bg-muted/20">
                        <div className="min-w-0 flex-1 pr-2">
                          <h2 className="card-title truncate text-lg font-bold tracking-tight text-foreground">{offer.offer_name}</h2>
                          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 uppercase font-bold tracking-widest">
                            <Icon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{offer.console_type}</span>
                            {offer.is_currently_active && (
                              <span className="flex items-center gap-1 text-emerald-600 ml-1.5 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                                LIVE
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => handleEditOffer(offer)} className="w-8 h-8 hover:bg-emerald-50 transition-colors">
                            <Pencil className="w-4 h-4 text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteOffer(offer.id)} className="w-8 h-8 hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-black text-blue-600 tracking-tighter leading-none">₹{offer.offered_price}</div>
                            <div className="text-[10px] text-muted-foreground font-black uppercase mt-1 tracking-tight">Offer Rate</div>
                          </div>
                          <div className="text-right">
                             <div className="text-sm font-bold text-red-400/80 line-through leading-none">₹{offer.default_price}</div>
                             <div className="bg-emerald-500/10 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-black mt-1.5 inline-block border border-emerald-500/20">
                                {offer.discount_percentage}% OFF
                             </div>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-dashed border-border space-y-2">
                           <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground/80">
                              <Calendar className="w-3.5 h-3.5 text-blue-500/70" />
                              <span>{offer.start_date} to {offer.end_date}</span>
                           </div>
                           <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground/80">
                              <Clock className="w-3.5 h-3.5 text-blue-500/70" />
                              <span>{offer.start_time} - {offer.end_time}</span>
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW - NEW */
              <OffersTable 
                offers={offers} 
                onEdit={handleEditOffer} 
                onDelete={handleDeleteOffer} 
                getConsoleIcon={getConsoleIcon} 
              />
            )}
          </div>
        )}
      </div>

      {/* Offer Form Modal */}
      <AnimatePresence>
        {showOfferForm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-left">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">{editingOffer ? 'Edit Promotion' : 'Create New Promotion'}</h2>
                    <Button variant="ghost" size="icon" onClick={() => { setShowOfferForm(false); resetOfferForm(); }} className="rounded-full hover:bg-muted/50">
                        <X className="w-5 h-5" />
                    </Button>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="space-y-1.5 text-left">
                      <Label className="text-xs font-bold uppercase text-muted-foreground/80 ml-1 tracking-wider">Offer Title *</Label>
                      <Input placeholder="e.g. Weekend Bash 2024" value={offerForm.offer_name} onChange={e => setOfferForm({...offerForm, offer_name: e.target.value})} className="bg-muted/10 border-border/50 focus:border-blue-500 transition-all" />
                    </div>

                    <div className="space-y-1.5 text-left">
                      <Label className="text-xs font-bold uppercase text-muted-foreground/80 ml-1 tracking-wider">Select Console Type *</Label>
                      <select className="w-full h-10 border border-input rounded-md px-3 text-sm font-medium bg-background focus:ring-2 focus:ring-blue-500 outline-none border-border/50" value={offerForm.available_game_id} onChange={e => setOfferForm({...offerForm, available_game_id: e.target.value})}>
                         <option value="">Choose console type...</option>
                         {availableGames.map(g => <option key={g.id} value={g.id}>{g.game_name} (Base ₹{g.single_slot_price})</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <Label className="text-xs font-bold uppercase text-muted-foreground/80 ml-1 tracking-wider">Promo Rate (₹) *</Label>
                      <Input type="number" placeholder="Enter discounted price" value={offerForm.offered_price} onChange={e => setOfferForm({...offerForm, offered_price: e.target.value})} className="bg-muted/10 border-border/50 focus:border-blue-500 transition-all" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left">
                       <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase text-muted-foreground/80 ml-1 text-[10px]">Start Date</Label>
                          <Input type="date" value={offerForm.start_date} onChange={e => setOfferForm({...offerForm, start_date: e.target.value})} className="bg-muted/10 border-border/50" />
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase text-muted-foreground/80 ml-1 text-[10px]">Start Time</Label>
                          <Input type="time" value={offerForm.start_time} onChange={e => setOfferForm({...offerForm, start_time: e.target.value})} className="bg-muted/10 border-border/50" />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left">
                       <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase text-muted-foreground/80 ml-1 text-[10px]">End Date</Label>
                          <Input type="date" value={offerForm.end_date} onChange={e => setOfferForm({...offerForm, end_date: e.target.value})} className="bg-muted/10 border-border/50" />
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase text-muted-foreground/80 ml-1 text-[10px]">End Time</Label>
                          <Input type="time" value={offerForm.end_time} onChange={e => setOfferForm({...offerForm, end_time: e.target.value})} className="bg-muted/10 border-border/50" />
                       </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                       <Button variant="outline" onClick={() => { setShowOfferForm(false); resetOfferForm(); }} className="flex-1 font-bold rounded-xl border-2 hover:bg-muted/50 transition-colors">Cancel</Button>
                       <Button onClick={editingOffer ? handleUpdateOffer : handleCreateOffer} className="flex-1 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95">
                           {editingOffer ? 'Save Changes' : 'Create Offer'}
                       </Button>
                    </div>
                 </div>
              </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- NEW TABLE VIEW COMPONENT ---
function OffersTable({ offers, onEdit, onDelete, getConsoleIcon }: any) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden w-full text-left">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Offer Name</th>
              <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Console</th>
              <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Pricing</th>
              <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Validity</th>
              <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider text-[10px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {offers.map((offer: any) => {
              const Icon = getConsoleIcon(offer.console_type);
              return (
                <tr key={offer.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="font-bold text-foreground">{offer.offer_name}</div>
                    {offer.is_currently_active && (
                      <span className="text-[9px] font-black text-emerald-500 flex items-center gap-1 mt-1">
                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> LIVE NOW
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                      <Icon className="w-4 h-4 text-blue-500" />
                      {offer.console_type}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-blue-600">₹{offer.offered_price}</span>
                      <span className="text-xs text-muted-foreground line-through opacity-60">₹{offer.default_price}</span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">{offer.discount_percentage}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {offer.start_date}</div>
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {offer.start_time} - {offer.end_time}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(offer)} className="h-8 w-8 hover:bg-emerald-50">
                        <Pencil className="w-4 h-4 text-emerald-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(offer.id)} className="h-8 w-8 hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}