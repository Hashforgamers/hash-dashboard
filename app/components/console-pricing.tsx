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
  Minus,
  Save,
  Users,
} from "lucide-react";
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env";
import { jwtDecode } from "jwt-decode";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useModuleCache } from "@/app/hooks/useModuleCache";

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

interface ControllerTier {
  id: string;
  quantity: number;
  total_price: number;
}

interface ControllerPricingRule {
  base_price: number;
  tiers: ControllerTier[];
}

type SquadPricingState = Record<string, Record<string, number>>;

interface VendorTaxProfile {
  vendor_id: number;
  gst_registered: boolean;
  gst_enabled: boolean;
  gst_rate: number;
  tax_inclusive: boolean;
  gstin?: string;
  legal_name?: string;
  state_code?: string;
  place_of_supply_state_code?: string;
}

interface MonthlyCreditAccount {
  id: number;
  vendor_id: number;
  user_id: number;
  credit_limit: number;
  outstanding_amount: number;
  billing_cycle_day: number;
  grace_days: number;
  is_active: boolean;
  notes?: string;
}

interface VendorUser {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface MonthlyCreditLedgerEntry {
  id: number;
  entry_type: string;
  amount: number;
  description?: string;
  booked_date?: string | null;
  due_date?: string | null;
  created_at?: string | null;
}

type ControllerPricingState = Record<string, ControllerPricingRule>;

const defaultControllerPricing: ControllerPricingState = {
  ps5: {
    base_price: 0,
    tiers: [],
  },
  xbox: {
    base_price: 0,
    tiers: [],
  },
  pc: {
    base_price: 0,
    tiers: [],
  },
  vr: {
    base_price: 0,
    tiers: [],
  },
};

const controllerPreviewQuantities = [1, 2, 3, 4];
const controllerSupportedConsoleTypes = new Set(["ps5", "xbox"]);
const squadMaxPlayersByConsole: Record<string, number> = {
  pc: 10,
};
const squadGroupLabelByConsoleType: Record<string, string> = {
  pc: "pc",
};
const squadRuleDefaults: SquadPricingState = {
  pc: { "2": 0, "3": 3, "4": 5, "5": 8 },
};

const normalizeSquadPricing = (rawData: unknown): SquadPricingState => {
  const source = (rawData && typeof rawData === "object" ? (rawData as any).pricing || rawData : {}) as Record<string, unknown>;
  const normalized: SquadPricingState = { pc: {} };

  Object.keys(normalized).forEach((group) => {
    const maxPlayers = squadMaxPlayersByConsole[group] || 10;
    const incomingGroup = source?.[group];
    const rules: Record<string, number> = {};

    if (incomingGroup && typeof incomingGroup === "object") {
      Object.entries(incomingGroup as Record<string, unknown>).forEach(([players, discount]) => {
        const playerCount = Number(players);
        if (!Number.isFinite(playerCount) || playerCount < 2 || playerCount > maxPlayers) return;

        const rawDiscount = typeof discount === "object" && discount !== null
          ? Number((discount as any).discount_percent ?? 0)
          : Number(discount ?? 0);
        if (!Number.isFinite(rawDiscount)) return;

        rules[String(playerCount)] = Math.max(0, Math.min(100, round2(rawDiscount)));
      });
    }

    normalized[group] = rules;
  });

  return normalized;
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const discountToFinalUnitAmount = (base: number, discountPercent: number) =>
  round2(Math.max(0, base - (base * Math.max(0, Math.min(90, discountPercent))) / 100));
const discountToFinalTotalAmount = (base: number, discountPercent: number, players: number) =>
  round2(discountToFinalUnitAmount(base, discountPercent) * Math.max(1, players));
const finalTotalAmountToDiscount = (base: number, finalTotalAmount: number, players: number) => {
  if (!base || base <= 0) return 0;
  const safePlayers = Math.max(1, players);
  const maxTotal = base * safePlayers;
  const normalizedFinalTotal = Math.max(0, Math.min(maxTotal, finalTotalAmount));
  return round2(((maxTotal - normalizedFinalTotal) / maxTotal) * 100);
};
const squadRowKey = (group: string, players: number) => `${group}-${players}`;

export default function ConsolePricing() {
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
  const [activeTab, setActiveTab] = useState<"default" | "offers" | "controllers" | "squad" | "gst" | "credit">("default");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [offers, setOffers] = useState<PricingOffer[]>([]);
  const [availableGames, setAvailableGames] = useState<AvailableGame[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<PricingOffer | null>(null);

  // ✅ Separate loading states for create and update
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [isUpdatingOffer, setIsUpdatingOffer] = useState(false);
  const [deletingOfferId, setDeletingOfferId] = useState<number | null>(null);
  const [controllerPricing, setControllerPricing] = useState<ControllerPricingState>(defaultControllerPricing);
  const [isLoadingControllerPricing, setIsLoadingControllerPricing] = useState(false);
  const [isSavingControllerPricing, setIsSavingControllerPricing] = useState(false);
  const [controllerPricingError, setControllerPricingError] = useState<string | null>(null);
  const [controllerPricingChanged, setControllerPricingChanged] = useState(false);
  const [squadPricing, setSquadPricing] = useState<SquadPricingState>(squadRuleDefaults);
  const [isLoadingSquadPricing, setIsLoadingSquadPricing] = useState(false);
  const [isSavingSquadPricing, setIsSavingSquadPricing] = useState(false);
  const [squadPricingChanged, setSquadPricingChanged] = useState(false);
  const [squadPricingError, setSquadPricingError] = useState<string | null>(null);
  const [squadFinalDraft, setSquadFinalDraft] = useState<Record<string, string>>({});
  const [squadRuleWarnings, setSquadRuleWarnings] = useState<Record<string, string>>({});
  const [taxProfile, setTaxProfile] = useState<VendorTaxProfile>({
    vendor_id: 0,
    gst_registered: false,
    gst_enabled: false,
    gst_rate: 18,
    tax_inclusive: false,
    gstin: "",
    legal_name: "",
    state_code: "",
    place_of_supply_state_code: "",
  });
  const [isLoadingTaxProfile, setIsLoadingTaxProfile] = useState(false);
  const [isSavingTaxProfile, setIsSavingTaxProfile] = useState(false);
  const [taxProfileError, setTaxProfileError] = useState<string | null>(null);

  const [vendorUsers, setVendorUsers] = useState<VendorUser[]>([]);
  const [monthlyCreditAccounts, setMonthlyCreditAccounts] = useState<MonthlyCreditAccount[]>([]);
  const [isLoadingCredit, setIsLoadingCredit] = useState(false);
  const [isSavingCredit, setIsSavingCredit] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [creditForm, setCreditForm] = useState({
    user_id: "",
    credit_limit: "",
    billing_cycle_day: "1",
    grace_days: "5",
    is_active: true,
    notes: "",
  });
  const [statementUserId, setStatementUserId] = useState<number | null>(null);
  const [statementRows, setStatementRows] = useState<MonthlyCreditLedgerEntry[]>([]);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);

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

  const basePricingKey = vendorId ? `pricing_base:${vendorId}` : "pricing_base:0";
  const offersKey = vendorId ? `pricing_offers:${vendorId}` : "pricing_offers:0";
  const controllerKey = vendorId ? `pricing_controller:${vendorId}` : "pricing_controller:0";
  const squadKey = vendorId ? `pricing_squad:${vendorId}` : "pricing_squad:0";
  const taxKey = vendorId ? `pricing_tax:${vendorId}` : "pricing_tax:0";
  const gamesKey = vendorId ? `pricing_games:${vendorId}` : "pricing_games:0";
  const pricingVersionKey = vendorId ? `pricing:${vendorId}` : "pricing:0";

  const { data: cachedBasePricing, refresh: refreshBasePricingCache } = useModuleCache<PricingState>(
    basePricingKey,
    async () => {
      if (!vendorId) return {};
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/console-pricing`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const newPrices: PricingState = {};
      consoleTypes.forEach((c) => {
        newPrices[c.type] = { value: data[c.type] ?? 0, isValid: true, hasChanged: false };
      });
      return newPrices;
    },
    120000,
    pricingVersionKey
  );

  const { data: cachedOffers, refresh: refreshOffersCache } = useModuleCache<PricingOffer[]>(
    offersKey,
    async () => {
      if (!vendorId) return [];
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/pricing-offers`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return Array.isArray(data?.offers) ? data.offers : [];
    },
    120000,
    pricingVersionKey
  );

  const { data: cachedControllerPricing, refresh: refreshControllerCache } = useModuleCache<ControllerPricingState>(
    controllerKey,
    async () => {
      if (!vendorId) return defaultControllerPricing;
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/controller-pricing`);
      if (!res.ok) throw new Error("Failed to fetch controller pricing");
      const data = await res.json();
      const pricingData = data?.pricing || {};
      const next: ControllerPricingState = { ...defaultControllerPricing };
      for (const consoleType of controllerSupportedConsoleTypes) {
        const item = pricingData[consoleType];
        next[consoleType] = {
          base_price: Number(item?.base_price ?? 0),
          tiers: Array.isArray(item?.tiers)
            ? item.tiers.map((tier: any) => ({
                id: String(tier?.id ?? `${consoleType}-tier-${Date.now()}-${Math.random()}`),
                quantity: Number(tier?.quantity ?? 2),
                total_price: Number(tier?.total_price ?? 0),
              }))
            : [],
        };
      }
      return next;
    },
    120000,
    pricingVersionKey
  );

  const { data: cachedSquadPricing, refresh: refreshSquadCache } = useModuleCache<SquadPricingState>(
    squadKey,
    async () => {
      if (!vendorId) return squadRuleDefaults;
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/squad-pricing-rules`);
      if (!res.ok) throw new Error("Failed to fetch squad pricing rules");
      const data = await res.json();
      return Array.isArray(data?.rules) ? data.rules : data;
    },
    120000,
    pricingVersionKey
  );

  const { data: cachedTaxProfile, refresh: refreshTaxCache } = useModuleCache<VendorTaxProfile>(
    taxKey,
    async () => {
      if (!vendorId) return taxProfile;
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/tax-profile`);
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to fetch tax profile");
      return data?.profile || data;
    },
    120000,
    pricingVersionKey
  );

  const { data: cachedAvailableGames, refresh: refreshGamesCache } = useModuleCache<AvailableGame[]>(
    gamesKey,
    async () => {
      if (!vendorId) return [];
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/available-games`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return Array.isArray(data)
        ? data
        : data.games || data.available_games || data.data || [];
    },
    120000,
    pricingVersionKey
  );

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
    if (cachedBasePricing && Object.keys(cachedBasePricing).length > 0) {
      setPrices(cachedBasePricing);
      return;
    }
    refreshBasePricingCache(true)
      .then((data) => {
        if (data) setPrices(data);
      })
      .catch((error) => console.error("Error fetching prices:", error));
  }, [vendorId, cachedBasePricing, refreshBasePricingCache]);

  useEffect(() => {
    if (vendorId && activeTab === "offers") {
      if (cachedOffers) {
        setOffers(cachedOffers);
      } else {
        fetchOffers();
      }
      if (cachedAvailableGames) {
        setAvailableGames(cachedAvailableGames);
      } else {
        fetchAvailableGames();
      }
    }
  }, [vendorId, activeTab, cachedOffers, cachedAvailableGames]);

  useEffect(() => {
    if (!vendorId || activeTab !== "controllers") return;
    if (cachedControllerPricing) {
      setControllerPricing(cachedControllerPricing);
      return;
    }
    fetchControllerPricing();
  }, [vendorId, activeTab, cachedControllerPricing]);

  useEffect(() => {
    if (!vendorId || activeTab !== "squad") return;
    if (cachedSquadPricing) {
      setSquadPricing(normalizeSquadPricing(cachedSquadPricing));
      return;
    }
    fetchSquadPricingRules();
  }, [vendorId, activeTab, cachedSquadPricing]);

  useEffect(() => {
    if (!vendorId || activeTab !== "gst") return;
    if (cachedTaxProfile) {
      setTaxProfile(cachedTaxProfile);
      return;
    }
    fetchTaxProfile();
  }, [vendorId, activeTab, cachedTaxProfile]);

  useEffect(() => {
    if (!vendorId || activeTab !== "credit") return;
    fetchVendorUsers();
    fetchMonthlyCreditAccounts();
  }, [vendorId, activeTab]);

  const fetchControllerPricing = async () => {
    if (!vendorId) return;
    setIsLoadingControllerPricing(true);
    setControllerPricingError(null);
    try {
      const data = await refreshControllerCache(true);
      if (data) {
        setControllerPricing(data);
      }
      setControllerPricingChanged(false);
    } catch (error) {
      console.error("Failed to load controller pricing", error);
      setControllerPricingError("Unable to load controller pricing from server.");
    } finally {
      setIsLoadingControllerPricing(false);
    }
  };

  const fetchSquadPricingRules = async () => {
    if (!vendorId) return;
    setIsLoadingSquadPricing(true);
    setSquadPricingError(null);
    try {
      const data = await refreshSquadCache(true);
      setSquadPricing(normalizeSquadPricing(data));
      setSquadFinalDraft({});
      setSquadRuleWarnings({});
      setSquadPricingChanged(false);
    } catch (error) {
      console.error("Failed to load squad pricing rules", error);
      setSquadPricingError("Unable to load squad pricing rules.");
    } finally {
      setIsLoadingSquadPricing(false);
    }
  };

  const fetchOffers = async () => {
    if (!vendorId) return;
    setIsLoadingOffers(true);
    try {
      const data = await refreshOffersCache(true);
      setOffers(data || []);
    } catch (error) {
      console.error("Error:", error);
      setOffers([]);
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const fetchTaxProfile = async () => {
    if (!vendorId) return;
    setIsLoadingTaxProfile(true);
    setTaxProfileError(null);
    try {
      const profile = await refreshTaxCache(true);
      const safeProfile = profile || {};
      setTaxProfile({
        vendor_id: vendorId,
        gst_registered: Boolean(safeProfile.gst_registered),
        gst_enabled: Boolean(safeProfile.gst_enabled),
        gst_rate: Number(safeProfile.gst_rate ?? 18),
        tax_inclusive: Boolean(safeProfile.tax_inclusive),
        gstin: safeProfile.gstin || "",
        legal_name: safeProfile.legal_name || "",
        state_code: safeProfile.state_code || "",
        place_of_supply_state_code: safeProfile.place_of_supply_state_code || "",
      });
    } catch (error) {
      console.error("Failed to fetch GST profile", error);
      setTaxProfileError("Unable to load GST setup.");
    } finally {
      setIsLoadingTaxProfile(false);
    }
  };

  const saveTaxProfile = async () => {
    if (!vendorId) return;
    setIsSavingTaxProfile(true);
    setTaxProfileError(null);
    try {
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/tax-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gst_registered: taxProfile.gst_registered,
          gst_enabled: taxProfile.gst_enabled,
          gst_rate: Number(taxProfile.gst_rate || 0),
          tax_inclusive: taxProfile.tax_inclusive,
          gstin: taxProfile.gstin || null,
          legal_name: taxProfile.legal_name || null,
          state_code: taxProfile.state_code || null,
          place_of_supply_state_code: taxProfile.place_of_supply_state_code || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to save GST setup");
      showToast("GST setup saved successfully.");
      fetchTaxProfile();
    } catch (error) {
      console.error("Failed to save GST setup", error);
      setTaxProfileError(error instanceof Error ? error.message : "Unable to save GST setup.");
    } finally {
      setIsSavingTaxProfile(false);
    }
  };

  const fetchVendorUsers = async () => {
    if (!vendorId) return;
    try {
      const res = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setVendorUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch users", error);
      setVendorUsers([]);
    }
  };

  const fetchMonthlyCreditAccounts = async () => {
    if (!vendorId) return;
    setIsLoadingCredit(true);
    setCreditError(null);
    try {
      const res = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/accounts`);
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setMonthlyCreditAccounts(Array.isArray(data?.accounts) ? data.accounts : []);
    } catch (error) {
      console.error("Failed to fetch monthly credit accounts", error);
      setCreditError("Unable to load monthly credit accounts.");
      setMonthlyCreditAccounts([]);
    } finally {
      setIsLoadingCredit(false);
    }
  };

  const saveMonthlyCreditAccount = async () => {
    if (!vendorId) return;
    if (!creditForm.user_id) {
      setCreditError("Select a known player first.");
      return;
    }

    setIsSavingCredit(true);
    setCreditError(null);
    try {
      const res = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/accounts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(creditForm.user_id),
          credit_limit: Number(creditForm.credit_limit || 0),
          billing_cycle_day: Number(creditForm.billing_cycle_day || 1),
          grace_days: Number(creditForm.grace_days || 5),
          is_active: Boolean(creditForm.is_active),
          notes: creditForm.notes || "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to save account");
      showToast("Known player credit account saved.");
      fetchMonthlyCreditAccounts();
    } catch (error) {
      console.error("Failed to save monthly credit account", error);
      setCreditError(error instanceof Error ? error.message : "Unable to save credit account.");
    } finally {
      setIsSavingCredit(false);
    }
  };

  const fetchCreditStatement = async (userId: number) => {
    if (!vendorId) return;
    setStatementUserId(userId);
    setIsLoadingStatement(true);
    try {
      const res = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/statement/${userId}`);
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to fetch statement");
      setStatementRows(Array.isArray(data?.entries) ? data.entries : []);
    } catch (error) {
      console.error("Failed to fetch monthly credit statement", error);
      setStatementRows([]);
    } finally {
      setIsLoadingStatement(false);
    }
  };

  const fetchAvailableGames = async () => {
    if (!vendorId) return;
    try {
      const gamesArray = await refreshGamesCache(true);
      if (gamesArray) setAvailableGames(gamesArray);
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
    setIsCreatingOffer(true); // ✅ loader on
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
      setIsCreatingOffer(false); // ✅ loader off
    }
  };

  const handleUpdateOffer = async () => {
    if (!vendorId || !editingOffer) return;
    setIsUpdatingOffer(true); // ✅ loader on
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
      setIsUpdatingOffer(false); // ✅ loader off
    }
  };

  const handleDeleteOffer = async (id: number) => {
    if (!vendorId || !confirm("Are you sure you want to delete this offer?")) return;
    setDeletingOfferId(id); // ✅ loader on for this specific row
    try {
      await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/pricing-offers/${id}`, {
        method: "DELETE",
      });
      showToast("Offer deleted!");
      fetchOffers();
    } catch (error) {
      alert("Error deleting offer");
    } finally {
      setDeletingOfferId(null); // ✅ loader off
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

  const updateControllerBasePrice = (consoleType: string, value: string) => {
    const nextValue = Math.max(0, parseFloat(value) || 0);
    setControllerPricing((prev) => ({
      ...prev,
      [consoleType]: {
        ...(prev[consoleType] || { base_price: 0, tiers: [] }),
        base_price: nextValue,
      },
    }));
    setControllerPricingChanged(true);
  };

  const addControllerTier = (consoleType: string) => {
    setControllerPricing((prev) => {
      const current = prev[consoleType] || { base_price: 0, tiers: [] };
      const nextQty = Math.max(2, ...current.tiers.map((t) => t.quantity + 1));
      const newTier: ControllerTier = {
        id: `${consoleType}-tier-${Date.now()}`,
        quantity: nextQty,
        total_price: current.base_price * nextQty,
      };
      return {
        ...prev,
        [consoleType]: {
          ...current,
          tiers: [...current.tiers, newTier],
        },
      };
    });
    setControllerPricingChanged(true);
  };

  const updateControllerTier = (
    consoleType: string,
    tierId: string,
    field: "quantity" | "total_price",
    value: string
  ) => {
    const nextValue = Math.max(0, parseFloat(value) || 0);
    setControllerPricing((prev) => {
      const current = prev[consoleType] || { base_price: 0, tiers: [] };
      return {
        ...prev,
        [consoleType]: {
          ...current,
          tiers: current.tiers.map((tier) =>
            tier.id === tierId
              ? {
                  ...tier,
                  [field]: field === "quantity" ? Math.max(2, Math.round(nextValue)) : nextValue,
                }
              : tier
          ),
        },
      };
    });
    setControllerPricingChanged(true);
  };

  const removeControllerTier = (consoleType: string, tierId: string) => {
    setControllerPricing((prev) => {
      const current = prev[consoleType] || { base_price: 0, tiers: [] };
      return {
        ...prev,
        [consoleType]: {
          ...current,
          tiers: current.tiers.filter((tier) => tier.id !== tierId),
        },
      };
    });
    setControllerPricingChanged(true);
  };

  const calculateControllerTotal = (consoleType: string, quantity: number) => {
    const config = controllerPricing[consoleType];
    if (!config || quantity <= 0) return 0;

    const base = config.base_price;
    const tiers = config.tiers.filter((tier) => tier.quantity > 0).sort((a, b) => a.quantity - b.quantity);
    const dp = Array(quantity + 1).fill(Number.POSITIVE_INFINITY);
    dp[0] = 0;

    for (let i = 1; i <= quantity; i += 1) {
      dp[i] = Math.min(dp[i], dp[i - 1] + base);
      for (const tier of tiers) {
        if (tier.quantity <= i) {
          dp[i] = Math.min(dp[i], dp[i - tier.quantity] + tier.total_price);
        }
      }
    }

    return Number.isFinite(dp[quantity]) ? dp[quantity] : quantity * base;
  };

  const saveControllerPricing = async () => {
    if (!vendorId) return;
    setIsSavingControllerPricing(true);
    setControllerPricingError(null);

    const pricingPayload = Array.from(controllerSupportedConsoleTypes).reduce(
      (acc, consoleType) => {
        const config = controllerPricing[consoleType] || { base_price: 0, tiers: [] };
        const normalizedTiers = config.tiers
          .map((tier) => ({
            quantity: Math.max(2, Math.round(Number(tier.quantity || 0))),
            total_price: Math.max(0, Number(tier.total_price || 0)),
          }))
          .filter((tier, index, arr) => arr.findIndex((t) => t.quantity === tier.quantity) === index)
          .sort((a, b) => a.quantity - b.quantity);

        acc[consoleType] = {
          base_price: Math.max(0, Number(config.base_price || 0)),
          tiers: normalizedTiers,
        };
        return acc;
      },
      {} as Record<string, { base_price: number; tiers: Array<{ quantity: number; total_price: number }> }>
    );

    try {
      const response = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/controller-pricing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricing: pricingPayload }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const backendMessage =
          data?.message || (Array.isArray(data?.errors) ? data.errors.join(", ") : "Unable to save");
        throw new Error(backendMessage);
      }

      showToast("Controller pricing saved successfully.");
      setControllerPricingChanged(false);
      fetchControllerPricing();
    } catch (error) {
      console.error("Failed to save controller pricing", error);
      setControllerPricingError(error instanceof Error ? error.message : "Unable to save controller pricing.");
    } finally {
      setIsSavingControllerPricing(false);
    }
  };

  const updateSquadRule = (group: string, playerCount: number, value: string) => {
    const parsed = Math.max(0, Math.min(90, Number(value) || 0));
    const rowKey = squadRowKey(group, playerCount);
    setSquadPricing((prev) => ({
      ...prev,
      [group]: {
        ...(prev[group] || {}),
        [String(playerCount)]: parsed,
      },
    }));
    setSquadFinalDraft((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
    setSquadRuleWarnings((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
    setSquadPricingChanged(true);
  };

  const updateSquadRuleByFinalAmount = (group: string, playerCount: number, value: string, basePrice: number) => {
    const rowKey = squadRowKey(group, playerCount);
    setSquadFinalDraft((prev) => ({ ...prev, [rowKey]: value }));

    const parsed = Number(value);
    const maxTotal = round2(Math.max(0, basePrice * playerCount));
    if (!Number.isNaN(parsed) && parsed > maxTotal) {
      setSquadRuleWarnings((prev) => ({
        ...prev,
        [rowKey]: `Discounted price is more than base price. Max allowed is ₹${maxTotal}.`,
      }));
    } else {
      setSquadRuleWarnings((prev) => {
        const next = { ...prev };
        delete next[rowKey];
        return next;
      });
    }
  };

  const checkAndApplySquadFinalAmount = (group: string, playerCount: number, basePrice: number) => {
    const rowKey = squadRowKey(group, playerCount);
    const maxTotal = round2(Math.max(0, basePrice * playerCount));
    const draftValue = squadFinalDraft[rowKey];
    const parsed = Number(draftValue);
    const safeFinalTotal = Number.isNaN(parsed) ? maxTotal : Math.max(0, parsed);

    if (safeFinalTotal > maxTotal) {
      // Too high final amount means negative discount; enforce minimum discount = 0%.
      setSquadPricing((prev) => ({
        ...prev,
        [group]: {
          ...(prev[group] || {}),
          [String(playerCount)]: 0,
        },
      }));
      setSquadFinalDraft((prev) => ({ ...prev, [rowKey]: String(maxTotal) }));
      setSquadRuleWarnings((prev) => ({
        ...prev,
        [rowKey]: `Discounted price is more than base price. Auto-set to minimum discount (0%).`,
      }));
      setSquadPricingChanged(true);
      return;
    }

    const discount = finalTotalAmountToDiscount(basePrice, safeFinalTotal, playerCount);
    setSquadPricing((prev) => ({
      ...prev,
      [group]: {
        ...(prev[group] || {}),
        [String(playerCount)]: discount,
      },
    }));
    setSquadFinalDraft((prev) => ({
      ...prev,
      [rowKey]: String(round2(safeFinalTotal)),
    }));
    setSquadRuleWarnings((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
    setSquadPricingChanged(true);
  };

  const changeSquadRulePlayerCount = (group: string, oldPlayerCount: number, nextValue: string) => {
    const maxPlayers = squadMaxPlayersByConsole[group] || 10;
    const parsed = Math.max(2, Math.min(maxPlayers, Math.round(Number(nextValue) || oldPlayerCount)));
    setSquadPricing((prev) => {
      const current = { ...(prev[group] || {}) };
      const oldKey = String(oldPlayerCount);
      const newKey = String(parsed);
      const oldDiscount = Number(current[oldKey] ?? 0);
      delete current[oldKey];
      if (current[newKey] === undefined) {
        current[newKey] = oldDiscount;
      } else {
        current[newKey] = Math.max(0, Math.min(90, Number(current[newKey] || 0)));
      }
      return { ...prev, [group]: current };
    });
    const oldKey = squadRowKey(group, oldPlayerCount);
    const newKey = squadRowKey(group, parsed);
    setSquadFinalDraft((prev) => {
      const next = { ...prev };
      if (prev[oldKey] !== undefined && next[newKey] === undefined) {
        next[newKey] = prev[oldKey];
      }
      delete next[oldKey];
      return next;
    });
    setSquadRuleWarnings((prev) => {
      const next = { ...prev };
      if (prev[oldKey] && !next[newKey]) {
        next[newKey] = prev[oldKey];
      }
      delete next[oldKey];
      return next;
    });
    setSquadPricingChanged(true);
  };

  const removeSquadRule = (group: string, playerCount: number) => {
    setSquadPricing((prev) => {
      const current = { ...(prev[group] || {}) };
      delete current[String(playerCount)];
      return { ...prev, [group]: current };
    });
    const rowKey = squadRowKey(group, playerCount);
    setSquadFinalDraft((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
    setSquadRuleWarnings((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
    setSquadPricingChanged(true);
  };

  const addSquadRule = (group: string) => {
    const maxPlayers = squadMaxPlayersByConsole[group] || 10;
    setSquadPricing((prev) => {
      const current = { ...(prev[group] || {}) };
      let nextPlayerCount: number | null = null;
      for (let p = 2; p <= maxPlayers; p += 1) {
        if (current[String(p)] === undefined) {
          nextPlayerCount = p;
          break;
        }
      }
      if (nextPlayerCount === null) return prev;
      current[String(nextPlayerCount)] = 0;
      return { ...prev, [group]: current };
    });
    setSquadPricingChanged(true);
  };

  const saveSquadPricingRules = async () => {
    if (!vendorId) return;
    setIsSavingSquadPricing(true);
    setSquadPricingError(null);
    try {
      const pricingPayload = Object.entries(squadPricing).reduce((acc, [group, rules]) => {
        const consoleTypeKey =
          group === "ps" ? "ps5" : group === "xbox" ? "xbox" : group === "pc" ? "pc" : "vr";
        const basePrice = Number(prices?.[consoleTypeKey]?.value || 0);
        acc[group] = {};
        Object.entries(rules || {}).forEach(([players, discount]) => {
          const playerCount = Math.max(1, Number(players) || 1);
          const discountPercent = round2(Math.max(0, Math.min(90, Number(discount) || 0)));
          acc[group][players] = {
            discount_percent: discountPercent,
            final_amount: discountToFinalTotalAmount(basePrice, discountPercent, playerCount),
          };
        });
        return acc;
      }, {} as Record<string, Record<string, { discount_percent: number; final_amount: number }>>);

      const response = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/squad-pricing-rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricing: pricingPayload }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const backendMessage =
          data?.message || (Array.isArray(data?.errors) ? data.errors.join(", ") : "Unable to save");
        throw new Error(backendMessage);
      }
      showToast("Squad pricing rules saved.");
      setSquadPricingChanged(false);
      fetchSquadPricingRules();
    } catch (error) {
      console.error("Failed to save squad pricing rules", error);
      setSquadPricingError(error instanceof Error ? error.message : "Unable to save squad pricing rules.");
    } finally {
      setIsSavingSquadPricing(false);
    }
  };

  const canSave =
    Object.values(prices).some((p) => p.hasChanged) &&
    Object.values(errors).length === 0;
  const primaryButtonClass =
    "ui-action-primary inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm";
  const secondaryButtonClass =
    "ui-action-secondary inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm";
  const destructiveIconButtonClass =
    "inline-flex items-center justify-center rounded-lg border border-rose-300/50 bg-rose-50 p-2 text-rose-600 transition-all duration-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20";
  const iconButtonClass =
    "inline-flex items-center justify-center rounded-lg border border-emerald-300/50 bg-emerald-50 p-2 text-emerald-700 transition-all duration-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20";
  const tabButtonBaseClass =
    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all sm:text-sm";
  const activeTabButtonClass =
    "dashboard-module-tab-active border-cyan-400/35 bg-cyan-500/12 text-slate-900 dark:bg-cyan-500/15 dark:text-cyan-100";
  const inactiveTabButtonClass =
    "border-slate-200 bg-white text-slate-700 hover:border-cyan-300/40 hover:bg-slate-50 hover:text-slate-900 dark:border-transparent dark:bg-slate-900/40 dark:text-slate-300 dark:hover:border-cyan-400/25 dark:hover:bg-slate-800/80 dark:hover:text-cyan-100";
  const pricingCardClass =
    "dashboard-module-surface rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10";
  const inputSurfaceClass =
    "dashboard-module-input text-slate-900 placeholder:text-slate-400 focus-visible:ring-cyan-400/60 dark:text-slate-100 dark:placeholder:text-slate-400";
  const selectSurfaceClass =
    "dashboard-module-input h-10 w-full rounded-md px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-400/60 dark:text-slate-100";
  const summaryCardClass = "dashboard-module-surface rounded-lg p-3";
  const squadOverview = (() => {
    const groups = Object.keys(squadPricing || {});
    const allRules = groups.flatMap((group) =>
      Object.entries(squadPricing[group] || {})
        .filter(([players, discount]) => Number.isFinite(Number(players)) && Number.isFinite(Number(discount)))
        .map(([, discount]) => Number(discount || 0))
    );
    const slabCount = allRules.length;
    const avgDiscount = slabCount > 0 ? round2(allRules.reduce((a, b) => a + b, 0) / slabCount) : 0;
    const highestDiscount = slabCount > 0 ? round2(Math.max(...allRules)) : 0;
    return {
      consoleCount: groups.length || 0,
      slabCount,
      avgDiscount,
      highestDiscount,
    };
  })();

  return (
    <div className="console-pricing-page dashboard-module dashboard-typography flex h-full min-h-0 flex-col gap-4 overflow-y-auto overflow-x-hidden px-1 pb-2 sm:px-2">

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

      {/* ✅ Tab Navigation - uses global .tab-container */}
      <div className="gaming-panel dashboard-module-panel mb-2 flex w-full shrink-0 items-center gap-2 rounded-xl p-2">
        <button
          onClick={() => setActiveTab("default")}
          className={`${tabButtonBaseClass} ${
            activeTab === "default"
              ? activeTabButtonClass
              : inactiveTabButtonClass
          }`}
        >
          <IndianRupee className="icon-md" />
          Default Pricing
        </button>
        <button
          onClick={() => setActiveTab("offers")}
          className={`${tabButtonBaseClass} ${
            activeTab === "offers"
              ? activeTabButtonClass
              : inactiveTabButtonClass
          }`}
        >
          <Sparkles className="icon-md" />
          Promotional Offers
        </button>
        <button
          onClick={() => setActiveTab("controllers")}
          className={`${tabButtonBaseClass} ${
            activeTab === "controllers"
              ? activeTabButtonClass
              : inactiveTabButtonClass
          }`}
        >
          <Gamepad className="icon-md" />
          Controller Pricing
        </button>
        <button
          onClick={() => setActiveTab("squad")}
          className={`${tabButtonBaseClass} ${
            activeTab === "squad"
              ? activeTabButtonClass
              : inactiveTabButtonClass
          }`}
        >
          <Users className="icon-md" />
          Squad Pricing
        </button>
      </div>

      {/* ✅ Default Pricing Tab */}
      {activeTab === "default" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-0 flex-1 overflow-y-auto pr-1"
        >
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {consoleTypes.map((console) => (
              <div key={console.type} className={pricingCardClass}>
                {/* Console Type Header */}
                <div className={`${console.color} mb-4 flex items-center gap-3 rounded-lg border border-cyan-400/15 p-3`}>
                  <div className="feature-action-icon p-1.5">
                    <console.icon className="icon-md" style={{ color: console.iconColor }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-cyan-100">{console.name}</p>
                    <p className="premium-subtle text-xs">{console.description}</p>
                  </div>
                </div>

                {/* Price Input */}
                <p className="table-header-text mb-2">Price per Slot</p>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                  <Input
                    type="number"
                    value={prices[console.type]?.value}
                    onChange={(e) => handlePriceChange(console.type, e.target.value)}
                    className={`${inputSurfaceClass} pl-9`}
                  />
                </div>
                {errors[console.type] && (
                  <p className="text-destructive text-xs font-medium mt-1.5">
                    {errors[console.type]}
                  </p>
                )}

                {/* Changed indicator */}
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

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!canSave || isLoading}
            className={`${primaryButtonClass} px-6 py-2.5`}
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
          </button>
        </motion.div>
      )}

      {/* ✅ Promotional Offers Tab */}
      {activeTab === "offers" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden"
        >
          {/* Offers Header Row */}
          <div className="gaming-panel shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <h2 className="section-title">Active Promotions</h2>

              {/* View Toggle */}
              <div className="dashboard-module-tab-group flex items-center gap-1 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === "grid"
                      ? "dashboard-module-tab-active bg-cyan-500/12 text-slate-900 shadow-sm dark:text-cyan-100"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-cyan-100"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="icon-md" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === "table"
                      ? "dashboard-module-tab-active bg-cyan-500/12 text-slate-900 shadow-sm dark:text-cyan-100"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-cyan-100"
                  }`}
                  title="Table View"
                >
                  <TableIcon className="icon-md" />
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowOfferForm(true)}
              className={primaryButtonClass}
            >
              <PlusCircle className="icon-md" />
              New Offer
            </button>
          </div>

          {/* Offers Content */}
          {isLoadingOffers ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
              <p className="body-text-muted">Loading offers...</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="gaming-panel flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-cyan-400/20 py-16">
              <Sparkles className="w-12 h-12 text-muted-foreground/30" />
              <h3 className="section-title text-muted-foreground/60">No active offers yet</h3>
              <p className="body-text-muted">Create your first promotional offer</p>
              <button onClick={() => setShowOfferForm(true)} className={`${secondaryButtonClass} mt-2`}>
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
                  <Card key={offer.id} className="dashboard-module-surface flex flex-col transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10">
                    <CardHeader className="flex flex-row items-start justify-between border-b border-cyan-500/15 p-4">
                      <div className="min-w-0 flex-1 pr-2">
                        <h2 className="card-title truncate">{offer.offer_name}</h2>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Icon className="w-3 h-3 text-blue-400 shrink-0" />
                          <span className="table-header-text text-slate-700 dark:text-cyan-100/80">{offer.console_type}</span>
                          {offer.is_currently_active && (
                            <span className="flex items-center gap-1 rounded border border-emerald-300/40 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                              LIVE
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleEditOffer(offer)}
                          className={iconButtonClass}
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteOffer(offer.id)}
                          disabled={isDeleting}
                          className={destructiveIconButtonClass}
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
                      {/* Pricing */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="stat-value-large text-sky-700 dark:text-blue-400">₹{offer.offered_price}</p>
                          <p className="table-header-text mt-0.5">Offer Rate</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500 line-through dark:text-slate-400">₹{offer.default_price}</p>
                          <span className="mt-1 inline-block rounded-full border border-emerald-300/40 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {offer.discount_percentage}% OFF
                          </span>
                        </div>
                      </div>

                      {/* Date/Time */}
                      <div className="border-t border-dashed border-border pt-3 space-y-1.5">
                        <div className="flex items-center gap-2 body-text-muted">
                          <Calendar className="icon-md text-blue-400/70 shrink-0" />
                          <span>{offer.start_date} → {offer.end_date}</span>
                        </div>
                        <div className="flex items-center gap-2 body-text-muted">
                          <Clock className="icon-md text-blue-400/70 shrink-0" />
                          <span>{offer.start_time} - {offer.end_time}</span>
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

      {activeTab === "controllers" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden"
        >
          <div className="gaming-panel shrink-0 rounded-xl p-4">
            <h2 className="!text-base !font-semibold text-foreground">Extra Controller Pricing</h2>
            <p className="body-text-muted mt-1">
              Configure base and tier rates like 1 controller = ₹50, 2 controllers = ₹80.
              Backend-integrated for PS5 and Xbox.
            </p>
            {controllerPricingError && (
              <p className="mt-2 text-xs font-medium text-rose-300">{controllerPricingError}</p>
            )}
          </div>

          {isLoadingControllerPricing ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
              <p className="body-text-muted">Loading controller pricing...</p>
            </div>
          ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-4">
            {consoleTypes
              .filter((console) => controllerSupportedConsoleTypes.has(console.type))
              .map((console) => {
              const Icon = console.icon;
              const config = controllerPricing[console.type] || { base_price: 0, tiers: [] };
              const sortedTiers = [...config.tiers].sort((a, b) => a.quantity - b.quantity);
              return (
                <Card key={console.type} className="dashboard-module-surface rounded-xl">
                  <CardHeader className="border-b border-cyan-500/15 pb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="icon-md text-cyan-300" />
                      <span className="card-title">{console.name}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="table-header-text">Base Price (1 Controller)</label>
                        <Input
                          type="number"
                          min={0}
                          value={config.base_price}
                          onChange={(e) => updateControllerBasePrice(console.type, e.target.value)}
                          className={inputSurfaceClass}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="table-header-text">Tier Offers</h3>
                        <button
                          onClick={() => addControllerTier(console.type)}
                          className={secondaryButtonClass}
                        >
                          <Plus className="icon-md" />
                          Add Tier
                        </button>
                      </div>

                      {sortedTiers.length === 0 ? (
                        <p className="body-text-muted">No tier offers added.</p>
                      ) : (
                        <div className="space-y-2">
                          {sortedTiers.map((tier) => (
                            <div
                              key={tier.id}
                              className="dashboard-module-surface grid grid-cols-1 gap-2 rounded-lg p-3 sm:grid-cols-[1fr_1fr_auto]"
                            >
                              <div className="space-y-1">
                                <label className="table-header-text">Quantity</label>
                                <Input
                                  type="number"
                                  min={2}
                                  value={tier.quantity}
                                  onChange={(e) =>
                                    updateControllerTier(console.type, tier.id, "quantity", e.target.value)
                                  }
                                  className={inputSurfaceClass}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="table-header-text">Tier Total (₹)</label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={tier.total_price}
                                  onChange={(e) =>
                                    updateControllerTier(console.type, tier.id, "total_price", e.target.value)
                                  }
                                  className={inputSurfaceClass}
                                />
                              </div>
                              <button
                                onClick={() => removeControllerTier(console.type, tier.id)}
                                className={`${destructiveIconButtonClass} self-end`}
                                title="Remove tier"
                              >
                                <Minus className="icon-md" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="dashboard-module-surface rounded-lg p-3">
                      <p className="table-header-text mb-2">Pricing Preview</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {controllerPreviewQuantities.map((qty) => (
                          <div key={`${console.type}-${qty}`} className="dashboard-module-card rounded-md p-2">
                            <p className="body-text-muted">{qty} controller{qty > 1 ? "s" : ""}</p>
                            <p className="stat-value text-slate-900 dark:text-cyan-100">₹{calculateControllerTotal(console.type, qty)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

          </div>
          )}

          <div className="shrink-0">
            <button
              onClick={saveControllerPricing}
              disabled={isSavingControllerPricing || !controllerPricingChanged}
              className={primaryButtonClass}
            >
              {isSavingControllerPricing ? (
                <>
                  <Loader2 className="icon-md animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="icon-md" />
                  Save Controller Pricing
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === "squad" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden"
        >
          <div className="dashboard-module-panel shrink-0 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 !text-base !font-semibold text-foreground">
                  <Users className="icon-md text-cyan-300" />
                  Squad Pricing Rule Engine
                </h2>
                <p className="body-text-muted mt-1">
                  Set PC squad discounts by player count with instant base/discount/final preview.
                </p>
              </div>
              <div className="rounded-lg border border-emerald-300/40 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                Staff Friendly Mode
              </div>
            </div>
            {squadPricingError && (
              <p className="mt-2 text-xs font-medium text-rose-300">{squadPricingError}</p>
            )}
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={summaryCardClass}>
              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Consoles</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-cyan-100">{squadOverview.consoleCount}</p>
            </div>
            <div className={summaryCardClass}>
              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Slabs</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-cyan-100">{squadOverview.slabCount}</p>
            </div>
            <div className={summaryCardClass}>
              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Avg Discount</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-cyan-100">{squadOverview.avgDiscount}%</p>
            </div>
            <div className={summaryCardClass}>
              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Top Discount</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-cyan-100">{squadOverview.highestDiscount}%</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {isLoadingSquadPricing ? (
              <div className="dashboard-module-surface flex h-full items-center justify-center rounded-xl p-6 text-slate-600 dark:text-slate-300">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-cyan-300" />
                Loading squad rules...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {consoleTypes.filter((console) => console.type === "pc").map((console) => {
                  const group = squadGroupLabelByConsoleType[console.type];
                  if (!group) return null;
                  const maxPlayers = squadMaxPlayersByConsole[group] || 6;
                  const basePrice = Number(prices?.[console.type]?.value || 0);
                  const rules = Object.entries(squadPricing?.[group] || {})
                    .map(([players, discount]) => ({ players: Number(players), discount: Number(discount || 0) }))
                    .filter((row) => Number.isFinite(row.players))
                    .sort((a, b) => a.players - b.players);
                  const canAddMore = rules.length < Math.max(0, maxPlayers - 1);
                  const topDiscount = rules.length ? Math.max(...rules.map((r) => r.discount)) : 0;
                  const Icon = console.icon;

                  return (
                    <Card key={`squad-${console.type}`} className="dashboard-module-surface overflow-hidden rounded-xl">
                      <CardHeader className="border-b border-cyan-500/15 bg-slate-50 pb-3 dark:bg-slate-900/55">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="feature-action-icon p-1.5">
                              <Icon className="icon-md text-cyan-300" />
                            </div>
                            <div>
                              <p className="card-title">{console.name}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-300">Base ₹{basePrice} per player</p>
                            </div>
                          </div>
                          <button
                            onClick={() => addSquadRule(group)}
                            disabled={!canAddMore}
                            className={secondaryButtonClass}
                          >
                            <Plus className="icon-md" />
                            Add Slab
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          <span className="rounded-full border border-cyan-300/40 bg-cyan-50 px-2 py-1 text-sky-700 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-200">
                            {rules.length} slabs
                          </span>
                          <span className="rounded-full border border-emerald-300/40 bg-emerald-50 px-2 py-1 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                            max {maxPlayers} players
                          </span>
                          <span className="rounded-full border border-purple-300/40 bg-purple-50 px-2 py-1 text-purple-700 dark:border-purple-400/20 dark:bg-purple-500/10 dark:text-purple-200">
                            top {round2(topDiscount)}%
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 p-4">
                        {rules.length === 0 ? (
                          <div className="dashboard-module-card rounded-lg border border-dashed p-4 text-center text-sm text-slate-600 dark:text-slate-300">
                            No squad slabs configured for {console.name}.
                          </div>
                        ) : (
                          <>
                            <div className="hidden px-1 md:grid md:grid-cols-[110px_120px_180px_1fr_auto] md:gap-2">
                              <span className="table-header-text">Players</span>
                              <span className="table-header-text">Discount</span>
                              <span className="table-header-text">Final Total</span>
                              <span className="table-header-text">Live Preview</span>
                              <span className="table-header-text">Action</span>
                            </div>

                            {rules.map((rule) => {
                              const discountAmount = Number(((basePrice * rule.discount) / 100).toFixed(2));
                              const finalUnitAmount = Number((basePrice - discountAmount).toFixed(2));
                              const finalTotalAmount = Number((finalUnitAmount * rule.players).toFixed(2));
                              const rowKey = squadRowKey(group, rule.players);
                              const maxTotal = Number((basePrice * rule.players).toFixed(2));
                              const finalDraftValue =
                                squadFinalDraft[rowKey] !== undefined
                                  ? squadFinalDraft[rowKey]
                                  : String(finalTotalAmount);
                              const draftNumeric = Number(finalDraftValue);
                              const isDraftHigherThanBase =
                                !Number.isNaN(draftNumeric) && draftNumeric > maxTotal;
                              const warningText =
                                squadRuleWarnings[rowKey] ||
                                (isDraftHigherThanBase
                                  ? `Discounted price is more than base price. Max allowed is ₹${maxTotal}.`
                                  : "");

                              return (
                                <div
                                  key={`${group}-${rule.players}`}
                                  className="dashboard-module-card rounded-lg p-2.5"
                                >
                                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[110px_120px_180px_1fr_auto]">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min={2}
                                        max={maxPlayers}
                                        value={rule.players}
                                        onChange={(e) => changeSquadRulePlayerCount(group, rule.players, e.target.value)}
                                        className={`${inputSurfaceClass} h-8`}
                                      />
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={90}
                                        value={rule.discount}
                                        onChange={(e) => updateSquadRule(group, rule.players, e.target.value)}
                                        className={`${inputSurfaceClass} h-8`}
                                      />
                                      <span className="text-xs text-slate-600 dark:text-slate-300">%</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={basePrice > 0 ? basePrice * rule.players : undefined}
                                        value={finalDraftValue}
                                        onChange={(e) => updateSquadRuleByFinalAmount(group, rule.players, e.target.value, basePrice)}
                                        className={`${inputSurfaceClass} h-8`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => checkAndApplySquadFinalAmount(group, rule.players, basePrice)}
                                        className="rounded border border-cyan-300/40 bg-cyan-50 px-2 py-1 text-[10px] font-semibold text-sky-700 hover:bg-cyan-100 dark:border-cyan-400/35 dark:bg-cyan-500/10 dark:text-cyan-200 dark:hover:bg-cyan-500/20"
                                      >
                                        Check
                                      </button>
                                    </div>

                                    <div className="dashboard-module-surface flex items-center justify-between rounded-md px-2 py-1.5 text-xs">
                                      <span
                                        className={`text-slate-600 dark:text-slate-300 ${warningText ? "inline-flex items-center gap-1 text-amber-600 dark:text-amber-300" : ""}`}
                                        title={warningText || undefined}
                                      >
                                        {warningText ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
                                        {warningText ? "Review" : "OK"}
                                      </span>
                                      <span className="text-slate-900 dark:text-cyan-100">
                                        Unit ₹{finalUnitAmount} x {rule.players} = ₹{finalTotalAmount}
                                      </span>
                                    </div>

                                    <button
                                      onClick={() => removeSquadRule(group, rule.players)}
                                      className={destructiveIconButtonClass}
                                      title="Remove slab"
                                    >
                                      <Minus className="icon-md" />
                                    </button>
                                  </div>
                                  {warningText && (
                                    <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-300">{warningText}</p>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0">
            <button
              onClick={saveSquadPricingRules}
              disabled={isSavingSquadPricing || !squadPricingChanged}
              className={primaryButtonClass}
            >
              {isSavingSquadPricing ? (
                <>
                  <Loader2 className="icon-md animate-spin" />
                  Saving Squad Rules...
                </>
              ) : (
                <>
                  <Users className="icon-md" />
                  Save Squad Pricing
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === "gst" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden"
        >
          <div className="gaming-panel shrink-0 rounded-xl p-4">
            <h2 className="section-title">GST & Tax Setup</h2>
            <p className="body-text-muted mt-1">
              Define your gaming cafe GST profile once. Transactions will use this setup for CGST/SGST/IGST calculations.
            </p>
            {taxProfileError && <p className="mt-2 text-xs font-medium text-rose-300">{taxProfileError}</p>}
          </div>

          {isLoadingTaxProfile ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <Card className="dashboard-module-surface rounded-xl">
                <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={taxProfile.gst_registered}
                      onChange={(e) => setTaxProfile((prev) => ({ ...prev, gst_registered: e.target.checked }))}
                    />
                    GST Registered
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={taxProfile.gst_enabled}
                      onChange={(e) => setTaxProfile((prev) => ({ ...prev, gst_enabled: e.target.checked }))}
                    />
                    Enable GST in Billing
                  </label>

                  <div className="space-y-1.5">
                    <label className="table-header-text">GSTIN</label>
                    <Input
                      value={taxProfile.gstin || ""}
                      onChange={(e) => setTaxProfile((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                      className={inputSurfaceClass}
                      placeholder="29ABCDE1234F1Z5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="table-header-text">Legal Name</label>
                    <Input
                      value={taxProfile.legal_name || ""}
                      onChange={(e) => setTaxProfile((prev) => ({ ...prev, legal_name: e.target.value }))}
                      className={inputSurfaceClass}
                      placeholder="Gaming Cafe Pvt Ltd"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="table-header-text">GST Rate (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={28}
                      value={taxProfile.gst_rate}
                      onChange={(e) =>
                        setTaxProfile((prev) => ({ ...prev, gst_rate: Math.max(0, Number(e.target.value || 0)) }))
                      }
                      className={inputSurfaceClass}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="table-header-text">Cafe State Code</label>
                    <Input
                      value={taxProfile.state_code || ""}
                      onChange={(e) =>
                        setTaxProfile((prev) => ({ ...prev, state_code: e.target.value.replace(/\D/g, "").slice(0, 2) }))
                      }
                      className={inputSurfaceClass}
                      placeholder="29"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="table-header-text">Place of Supply State Code</label>
                    <Input
                      value={taxProfile.place_of_supply_state_code || ""}
                      onChange={(e) =>
                        setTaxProfile((prev) => ({
                          ...prev,
                          place_of_supply_state_code: e.target.value.replace(/\D/g, "").slice(0, 2),
                        }))
                      }
                      className={inputSurfaceClass}
                      placeholder="29"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={taxProfile.tax_inclusive}
                      onChange={(e) => setTaxProfile((prev) => ({ ...prev, tax_inclusive: e.target.checked }))}
                    />
                    Tax Inclusive Pricing (price already includes GST)
                  </label>
                </CardContent>
              </Card>

              <div className="mt-4">
                <button onClick={saveTaxProfile} disabled={isSavingTaxProfile} className={primaryButtonClass}>
                  {isSavingTaxProfile ? (
                    <>
                      <Loader2 className="icon-md animate-spin" />
                      Saving GST...
                    </>
                  ) : (
                    <>
                      <Save className="icon-md" />
                      Save GST Setup
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "credit" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden"
        >
          <div className="gaming-panel shrink-0 rounded-xl p-4">
            <h2 className="section-title">Known Player Monthly Credit</h2>
            <p className="body-text-muted mt-1">
              Allow trusted players to play now and settle at month-end. Configure user credit limit and billing cycle.
            </p>
            {creditError && <p className="mt-2 text-xs font-medium text-rose-300">{creditError}</p>}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-2">
            <Card className="dashboard-module-surface min-h-0 rounded-xl">
              <CardHeader className="border-b border-cyan-500/15 pb-3">
                <h3 className="card-title">Create / Update Credit Account</h3>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div className="space-y-1.5">
                  <label className="table-header-text">Known Player</label>
                  <select
                    value={creditForm.user_id}
                    onChange={(e) => setCreditForm((prev) => ({ ...prev, user_id: e.target.value }))}
                    className={selectSurfaceClass}
                  >
                    <option value="">Select player</option>
                    {vendorUsers.map((user) => (
                      <option key={user.id} value={String(user.id)}>
                        {user.name} {user.phone ? `(${user.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="table-header-text">Credit Limit (₹)</label>
                    <Input
                      type="number"
                      min={0}
                      value={creditForm.credit_limit}
                      onChange={(e) => setCreditForm((prev) => ({ ...prev, credit_limit: e.target.value }))}
                      className={inputSurfaceClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="table-header-text">Billing Day (1-28)</label>
                    <Input
                      type="number"
                      min={1}
                      max={28}
                      value={creditForm.billing_cycle_day}
                      onChange={(e) => setCreditForm((prev) => ({ ...prev, billing_cycle_day: e.target.value }))}
                      className={inputSurfaceClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="table-header-text">Grace Days</label>
                    <Input
                      type="number"
                      min={0}
                      value={creditForm.grace_days}
                      onChange={(e) => setCreditForm((prev) => ({ ...prev, grace_days: e.target.value }))}
                      className={inputSurfaceClass}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={creditForm.is_active}
                      onChange={(e) => setCreditForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    />
                    Account Active
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="table-header-text">Notes</label>
                  <Input
                    value={creditForm.notes}
                    onChange={(e) => setCreditForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className={inputSurfaceClass}
                    placeholder="Trusted player, settles every month-end"
                  />
                </div>

                <button onClick={saveMonthlyCreditAccount} disabled={isSavingCredit} className={primaryButtonClass}>
                  {isSavingCredit ? (
                    <>
                      <Loader2 className="icon-md animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="icon-md" />
                      Save Credit Account
                    </>
                  )}
                </button>
              </CardContent>
            </Card>

            <Card className="dashboard-module-surface min-h-0 rounded-xl">
              <CardHeader className="border-b border-cyan-500/15 pb-3">
                <h3 className="card-title">Configured Accounts</h3>
              </CardHeader>
              <CardContent className="min-h-0 space-y-3 overflow-y-auto p-4">
                {isLoadingCredit ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                  </div>
                ) : monthlyCreditAccounts.length === 0 ? (
                  <p className="body-text-muted">No monthly credit account configured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {monthlyCreditAccounts.map((account) => {
                      const user = vendorUsers.find((u) => u.id === account.user_id);
                      return (
                        <div key={account.id} className="dashboard-module-card rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.name || `User #${account.user_id}`}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                Limit ₹{account.credit_limit} • Outstanding ₹{account.outstanding_amount}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                Cycle Day {account.billing_cycle_day} • Grace {account.grace_days} days
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-semibold ${account.is_active ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                                {account.is_active ? "Active" : "Inactive"}
                              </span>
                              <button
                                onClick={() => fetchCreditStatement(account.user_id)}
                                className={secondaryButtonClass}
                              >
                                View Statement
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {statementUserId && (
                  <div className="dashboard-module-surface rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-cyan-100">Statement for User #{statementUserId}</h4>
                    {isLoadingStatement ? (
                      <div className="py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                      </div>
                    ) : statementRows.length === 0 ? (
                      <p className="body-text-muted mt-2">No ledger entries.</p>
                    ) : (
                      <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
                        {statementRows.map((row) => (
                          <div key={row.id} className="dashboard-module-card flex items-center justify-between rounded px-2 py-1 text-xs">
                            <span className="text-slate-700 dark:text-slate-300">{row.entry_type}</span>
                            <span className="text-slate-900 dark:text-slate-200">₹{Number(row.amount || 0).toFixed(2)}</span>
                            <span className="text-slate-500 dark:text-slate-400">{row.booked_date || "-"}</span>
                            <span className="text-slate-500 dark:text-slate-400">Due: {row.due_date || "-"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
              className="ui-dialog-surface w-full max-w-md overflow-hidden rounded-xl shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-cyan-500/20 px-5 py-4">
                <h2 className="card-title">
                  {editingOffer ? "Edit Promotion" : "Create New Promotion"}
                </h2>
                <button
                  onClick={() => { setShowOfferForm(false); resetOfferForm(); }}
                  className="slot-booking-modal-close inline-flex items-center justify-center rounded-lg p-2"
                >
                  <X className="icon-md" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

                {/* Offer Title */}
                <div className="space-y-1.5">
                  <label className="table-header-text">Offer Title *</label>
                  <Input
                    placeholder="e.g. Weekend Bash 2024"
                    value={offerForm.offer_name}
                    onChange={(e) => setOfferForm({ ...offerForm, offer_name: e.target.value })}
                    className={inputSurfaceClass}
                  />
                </div>

                {/* Console Type */}
                <div className="space-y-1.5">
                  <label className="table-header-text">Console Type *</label>
                  <select
                    className={selectSurfaceClass}
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

                {/* Promo Rate */}
                <div className="space-y-1.5">
                  <label className="table-header-text">Promo Rate (₹) *</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Enter discounted price"
                      value={offerForm.offered_price}
                      onChange={(e) => setOfferForm({ ...offerForm, offered_price: e.target.value })}
                      className={`${inputSurfaceClass} pl-9`}
                    />
                  </div>
                </div>

                {/* Start Date + Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="table-header-text">Start Date</label>
                    <Input
                      type="date"
                      value={offerForm.start_date}
                      onChange={(e) => setOfferForm({ ...offerForm, start_date: e.target.value })}
                      className={inputSurfaceClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="table-header-text">Start Time</label>
                    <Input
                      type="time"
                      value={offerForm.start_time}
                      onChange={(e) => setOfferForm({ ...offerForm, start_time: e.target.value })}
                      className={inputSurfaceClass}
                    />
                  </div>
                </div>

                {/* End Date + Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="table-header-text">End Date</label>
                    <Input
                      type="date"
                      value={offerForm.end_date}
                      onChange={(e) => setOfferForm({ ...offerForm, end_date: e.target.value })}
                      className={inputSurfaceClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="table-header-text">End Time</label>
                    <Input
                      type="time"
                      value={offerForm.end_time}
                      onChange={(e) => setOfferForm({ ...offerForm, end_time: e.target.value })}
                      className={inputSurfaceClass}
                    />
                  </div>
                </div>

                {/* Description (optional) */}
                <div className="space-y-1.5">
                  <label className="table-header-text">Description (Optional)</label>
                  <Input
                    placeholder="Short description..."
                    value={offerForm.offer_description}
                    onChange={(e) => setOfferForm({ ...offerForm, offer_description: e.target.value })}
                    className={inputSurfaceClass}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 border-t border-cyan-500/20 px-5 py-4">
                <button
                  onClick={() => { setShowOfferForm(false); resetOfferForm(); }}
                  className={`${secondaryButtonClass} flex-1`}
                  disabled={isCreatingOffer || isUpdatingOffer}
                >
                  Cancel
                </button>
                <button
                  onClick={editingOffer ? handleUpdateOffer : handleCreateOffer}
                  disabled={isCreatingOffer || isUpdatingOffer}
                  className={`${primaryButtonClass} flex-1`}
                >
                  {/* ✅ Loader in button while creating/updating */}
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
  );
}

// ✅ Table View Component - aligned with global CSS
function OffersTable({ offers, onEdit, onDelete, deletingOfferId, getConsoleIcon }: any) {
  return (
    <div className="dashboard-table-shell">
      <div className="dashboard-table-wrap">
        <table className="dashboard-table text-left">
          <thead className="dashboard-module-table-head sticky top-0 z-10">
            <tr>
              {["Offer Name", "Console", "Pricing", "Validity", "Actions"].map((h) => (
                <th key={h} className="table-cell dashboard-module-table-header text-[11px] font-bold uppercase tracking-wider sm:text-xs">
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
                <tr key={offer.id} className="table-row border-b border-cyan-500/10 last:border-0">
                  <td className="table-cell">
                    <p className="body-text font-semibold">{offer.offer_name}</p>
                    {offer.is_currently_active && (
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse dark:bg-emerald-400" />
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
                      <span className="stat-value text-sky-700 dark:text-blue-400">₹{offer.offered_price}</span>
                      <span className="body-text-muted line-through">₹{offer.default_price}</span>
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
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
                        <span>{offer.start_time} - {offer.end_time}</span>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEdit(offer)}
                        className="inline-flex items-center justify-center rounded-lg border border-emerald-300/50 bg-emerald-50 p-2 text-emerald-700 transition-all duration-200 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </button>
                      <button
                        onClick={() => onDelete(offer.id)}
                        disabled={isDeleting}
                        className="inline-flex items-center justify-center rounded-lg border border-rose-300/50 bg-rose-50 p-2 text-rose-600 transition-all duration-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
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
