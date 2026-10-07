import ExtensionSettlement from './session-extension-settlement';
import { creditAuthHeaders } from "@/lib/credit-auth";
import { AnimatePresence, motion } from "framer-motion";
import { IndianRupee, CreditCard, Smartphone, X, CheckCircle, Loader2, Gamepad2, Timer, Wallet, Receipt } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { BOOKING_URL } from "@/src/config/env";
import CreditAccountModal, { type MonthlyCreditAccountSummary } from "./credit-account-modal";

interface ExtraBookingOverlayProps {
  showOverlay: boolean;
  setShowOverlay: (value: boolean) => void;
  selectedSlot: any | null;
  vendorId: number | null;
  setRefreshSlots: (value: boolean | ((prev: boolean) => boolean)) => void;
  setSelectedSlot: (value: any | null) => void;
  calculateExtraTime: (endTime: string, date: string) => number;
  calculateExtraAmount: (extraSeconds: number, ratePerHour: number) => number;
  formatTime: (seconds: number) => string;
  releaseSlot: (consoleType: string, gameId: string, consoleId: string, vendorId: any, setRefreshSlots: any) => Promise<{ok:boolean;partial_release:boolean;payload:unknown}>;
}

interface PaymentSummaryLineItem {
  transaction_id: number;
  payment_use_case?: string;
  booking_type?: string;
  mode_of_payment?: string;
  settlement_status?: string;
  line_total: number;
  components?: {
    base_amount?: number;
    meals_amount?: number;
    controller_amount?: number;
    waive_off_amount?: number;
    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
  };
}

interface PaymentSummary {
  total_charged: number;
  amount_paid: number;
  amount_due: number;
  line_items: PaymentSummaryLineItem[];
}

interface VendorUserSummary {
  id?: number;
  name: string;
  email: string;
  phone: string;
}

const SettlementOverlay: React.FC<ExtraBookingOverlayProps> = ({
  showOverlay,
  setShowOverlay,
  selectedSlot,
  vendorId,
  setRefreshSlots,
  setSelectedSlot,
  calculateExtraTime,
  calculateExtraAmount,
  formatTime,
  releaseSlot,
}) => {
  const [paymentMode, setPaymentMode] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [waiveOffAmount, setWaiveOffAmount] = useState<string>("");
  const [waiveOffError, setWaiveOffError] = useState("");
  const [settlementError,setSettlementError] = useState("");
  const settlementKey = useRef("");
  const [frozenExtraSeconds, setFrozenExtraSeconds] = useState(0);
  const [settlementPausedAt, setSettlementPausedAt] = useState<string>("");
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryVersion,setSummaryVersion] = useState(0);
  const [summaryBookingId,setSummaryBookingId] = useState<number|null>(null);
  const [summaryError, setSummaryError] = useState("");
  const [creditAccount, setCreditAccount] = useState<MonthlyCreditAccountSummary | null>(null);
  const [creditAccountLoading, setCreditAccountLoading] = useState(false);
  const [creditAccountError, setCreditAccountError] = useState("");
  const [selectedUserProfile, setSelectedUserProfile] = useState<VendorUserSummary | null>(null);
  const [showCreditAccountModal, setShowCreditAccountModal] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus management for accessibility
  useEffect(() => {
    if (showOverlay && overlayRef.current) {
      overlayRef.current.focus();
    }
  }, [showOverlay]);

  const resolveBookingId = (slot: any | null): number | null => {
    if (!slot) return null;
    const rawId = slot.bookingId || slot.bookId;
    const parsed = Number(rawId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const normalizeBookingType = (type?: string) => String(type || "").toLowerCase().trim();
  const isExtraType = (type?: string) => {
    const normalized = normalizeBookingType(type);
    return normalized === "extra" || normalized === "additional_meals";
  };

  useEffect(() => {
    if (!showOverlay || !selectedSlot) {
      setSummaryLoading(false);
      return;
    }

    setPaymentSummary(null);
    setSummaryBookingId(null);
    setSummaryError("");
    const bookingId = resolveBookingId(selectedSlot);
    if (!bookingId) {
      setSummaryLoading(false);
      setPaymentSummary(null);
      setSummaryError("Cannot load settlement: booking ID is missing.");
      return;
    }

    setSettlementError("");
    settlementKey.current = crypto.randomUUID();
    let isMounted = true;
    const controller = new AbortController();
    const token = localStorage.getItem("jwtToken");

    const fetchPaymentSummary = async () => {
      try {
        setSummaryLoading(true);
        setSummaryError("");
        const response = await fetch(`${BOOKING_URL}/api/booking/${bookingId}/payment-summary`, {
          method: "GET",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            ...creditAuthHeaders(),
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch payment summary (${response.status})`);
        }

        const result = await response.json();
        if (isMounted && result?.success && result?.financial_summary) {
          setPaymentSummary(result.financial_summary as PaymentSummary);
          setSummaryBookingId(bookingId);
        } else if (isMounted) {
          throw new Error("The server did not return a valid payment summary.");
        }
      } catch (error: any) {
        if (error?.name === "AbortError") return;
        if (isMounted) {
          setPaymentSummary(null);
          setSummaryError("Unable to verify settlement amounts. Retry to load the latest charges.");
        }
      } finally {
        if (isMounted) {
          setSummaryLoading(false);
        }
      }
    };

    fetchPaymentSummary();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [showOverlay, selectedSlot, summaryVersion]);

  useEffect(() => {
    if (showOverlay && selectedSlot) {
      const snapshotSeconds = calculateExtraTime(selectedSlot.endTime, selectedSlot.date);
      setFrozenExtraSeconds(snapshotSeconds);
      setSettlementPausedAt(new Date().toLocaleTimeString());
      return;
    }
    setFrozenExtraSeconds(0);
    setSettlementPausedAt("");
  }, [showOverlay, selectedSlot, calculateExtraTime]);

  useEffect(() => {
    if (!showOverlay || !selectedSlot || !vendorId || paymentMode !== "credit") return;

    let cancelled = false;
    const token = localStorage.getItem("rbac_access_token_v1") || localStorage.getItem("jwtToken");
    const headers = {
      "Content-Type": "application/json",
      ...creditAuthHeaders(),
    };

    const loadCreditState = async () => {
      setCreditAccountLoading(true);
      setCreditAccountError("");
      try {
        const [usersRes, accountsRes] = await Promise.all([
          fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`, { headers }),
          fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/accounts`, { headers }),
        ]);
        const usersData = await usersRes.json();
        const accountsData = await accountsRes.json();
        if (!usersRes.ok) {
          throw new Error(usersData?.message || usersData?.error || "Unable to load customer details");
        }
        if (!accountsRes.ok) {
          throw new Error(accountsData?.message || accountsData?.error || "Unable to load credit account");
        }
        const users = Array.isArray(usersData) ? usersData : [];
        const matchedUser =
          users.find((row: any) => Number(row.id) === Number(selectedSlot.userId)) ||
          users.find((row: any) => String(row.name || "").trim().toLowerCase() === String(selectedSlot.username || "").trim().toLowerCase()) ||
          null;
        const accounts = Array.isArray(accountsData?.accounts) ? accountsData.accounts : [];
        const matchedAccount = matchedUser?.id
          ? accounts.find((row: any) => Number(row.user_id) === Number(matchedUser.id))
          : null;

        if (!cancelled) {
          setSelectedUserProfile(matchedUser);
          setCreditAccount(matchedAccount || null);
        }
      } catch (error: any) {
        if (!cancelled) {
          setCreditAccount(null);
          setCreditAccountError(error?.message || "Unable to load credit status");
        }
      } finally {
        if (!cancelled) setCreditAccountLoading(false);
      }
    };

    loadCreditState();
    return () => {
      cancelled = true;
    };
  }, [showOverlay, selectedSlot, vendorId, paymentMode]);

  // Create extra booking function
  const createExtraBooking = async (payload: any) => {
    try {
      const response = await fetch(`${BOOKING_URL}/api/extraBooking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...creditAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Failed to create extra booking");
      }
      return data;
    } catch (error) {
      console.error("Error creating extra booking:", error);
      throw error;
    }
  };

  const settlePendingBookingCharges = async (
    bookingId: number,
    mode: string,
    waiveOffAmount: number,
    bookingTypes?: string[]
  ) => {
    const response = await fetch(`${BOOKING_URL}/api/booking/${bookingId}/settle-pending`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...creditAuthHeaders(),
      },
      body: JSON.stringify({
        mode_of_payment: mode,
        waive_off_amount: waiveOffAmount,
        booking_types: bookingTypes && bookingTypes.length > 0 ? bookingTypes : ["extra", "additional_meals"],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || data?.error || "Failed to settle pending charges");
    }
    return data;
  };

  // ✅ FIXED: Handle settle function with IMMEDIATE UI updates (exactly like release button)
  const handleSettle = async () => {
    if (!selectedSlot || !vendorId) {
      setSettlementError("Invalid slot or vendor information");
      return;
    }
    const bookingId = resolveBookingId(selectedSlot);
    if (!bookingId) {
      setSettlementError("Missing booking ID for settlement");
      return;
    }

    if (loading) return;
    setSettlementError("");
    setLoading(true);
    const extraTime = frozenExtraSeconds;
    const amount = computedExtraAmount;
    const parsedWaiveOff = parseFloat(waiveOffAmount) || 0;

    const extraBookingPayload = {
      consoleNumber: selectedSlot.consoleId || selectedSlot.consoleNumber,
      consoleType: selectedSlot.consoleType,
      date: String(selectedSlot.date || "").slice(0,10),
      booking_id: bookingId,
      reference_id: `settlement-${settlementKey.current}`,
      slotId: selectedSlot.slotId,
      userId: selectedSlot.userId,
      username: selectedSlot.username,
      amount: amount,
      gameId: selectedSlot.game_id,
      vendorId: vendorId,
      modeOfPayment: "pending",
      waiveOffAmount: 0,
    };

    try {
      console.log('💰 Starting settle process...');
      if (amount > 0) {
        await createExtraBooking(extraBookingPayload);
        console.log('💰 Extra booking created successfully');
      } else {
        console.log('💰 No overtime charge - skipping extra booking creation');
      }
      const pendingTypes = (paymentSummary?.line_items || [])
        .filter((item) => isPendingStatus(item.settlement_status))
        .map((item) => normalizeBookingType(item.booking_type))
        .filter((type) => type && type !== "settlement_waive_off");
      const bookingTypesSet = new Set(pendingTypes);
      if (amount > 0) {
        bookingTypesSet.add("extra");
      }
      if (pendingMealsAmount > 0) {
        bookingTypesSet.add("additional_meals");
      }
      const bookingTypesPayload = bookingTypesSet.size > 0
        ? Array.from(bookingTypesSet)
        : ["extra", "additional_meals"];

      await settlePendingBookingCharges(bookingId, paymentMode === "credit" ? "monthly_credit" : paymentMode, parsedWaiveOff, bookingTypesPayload);
      console.log('💰 Pending charges settled successfully');

      const squadDetails = (selectedSlot?.squadDetails && typeof selectedSlot.squadDetails === "object")
        ? selectedSlot.squadDetails
        : {};
      const isPcSquad = String(squadDetails?.console_group || "").toLowerCase() === "pc"
        && Number(squadDetails?.player_count || selectedSlot?.squadPlayerCount || 1) > 1;

      const requestedConsoleIds = isPcSquad && Array.isArray(squadDetails?.assigned_console_ids)
        ? squadDetails.assigned_console_ids
        : [selectedSlot.consoleId || selectedSlot.consoleNumber];
      const releaseConsoleIds = Array.from(
        new Set(
          requestedConsoleIds
            .map((id: any) => Number(id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        )
      );

      let success = true;
      for (const consoleId of releaseConsoleIds) {
        const released = await releaseSlot(
          selectedSlot.consoleType,
          selectedSlot.game_id,
          String(consoleId),
          vendorId,
          setRefreshSlots
        );
        success = success && released.ok;
      }
      console.log('💰 Release slot result:', success);

      if (success) {
        // ✅ CRITICAL: On SUCCESS - Update UI immediately (exactly like release button)
        console.log('💰 Settle successful - updating UI immediately');
        
        // ✅ Trigger refresh to update both CurrentSlots and BookingStats
        setRefreshSlots((prev) => !prev);
        
        // ✅ Dispatch global refresh event
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("refresh-dashboard"));
        }
        
        // ✅ Close overlay and reset state IMMEDIATELY (like release button)
        setShowOverlay(false);
        setSelectedSlot(null);
        setWaiveOffAmount("");
        setSettlementError("");
        setLoading(false);
        
        console.log('💰 UI updated immediately - settle complete');
        
      } else {
        // ✅ Release failed - show error, don't close overlay
        console.log('💰 Release slot failed');
        setSettlementError("Failed to release slot. Please try again.");
        setLoading(false);
      }

    } catch (err) {
      console.error('💰 Settle process failed:', err);
      
      // ✅ On ERROR - Show error, don't close overlay (let user retry)
      setSettlementError(err instanceof Error ? err.message : "Unable to settle this session. Please retry.");
      setLoading(false);
      
      // ✅ Don't close overlay on error - let user try again
    }
  };

  const isPendingStatus = (status?: string) =>
    ["pending", "unpaid", "due"].includes(String(status || "").toLowerCase());

  // Handle waive-off amount change with validation
  const handleWaiveOffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSlot) return;
    const value = e.target.value;
    // Allow only numbers and decimals (e.g., "123.45" or "")
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setWaiveOffAmount(value);
      const parsedValue = parseFloat(value) || 0;
      const localExtraAmount = calculateExtraAmount(frozenExtraSeconds, selectedSlot.slot_price || 100);
      const localPendingMeals = (paymentSummary?.line_items || [])
        .filter((item) => String(item.booking_type || "").toLowerCase() === "additional_meals" && isPendingStatus(item.settlement_status))
        .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
      const localPendingExtra = (paymentSummary?.line_items || [])
        .filter((item) => String(item.booking_type || "").toLowerCase() === "extra" && isPendingStatus(item.settlement_status))
        .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
      const localPendingBase = (paymentSummary?.line_items || [])
        .filter((item) => !isExtraType(item.booking_type) && isPendingStatus(item.settlement_status))
        .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
      const maxWaiveOff = dueBeforeWaive;
      if (parsedValue < 0) {
        setWaiveOffError("Waive-off amount cannot be negative");
        setWaiveOffAmount("");
      } else if (parsedValue > maxWaiveOff) {
        setWaiveOffError(`Waive-off amount cannot exceed ₹${maxWaiveOff.toFixed(2)}`);
        setWaiveOffAmount(maxWaiveOff.toString());
      } else {
        setWaiveOffError("");
      }
    }
  };

  const computedExtraSeconds = frozenExtraSeconds;
  const grossExtraAmount = selectedSlot
    ? calculateExtraAmount(computedExtraSeconds, selectedSlot.slot_price || 100)
    : 0;
  const pendingMealsAmount = (paymentSummary?.line_items || [])
    .filter((item) => String(item.booking_type || "").toLowerCase() === "additional_meals" && isPendingStatus(item.settlement_status))
    .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const historicalPendingExtraAmount = (paymentSummary?.line_items || [])
    .filter((item) => String(item.booking_type || "").toLowerCase() === "extra" && isPendingStatus(item.settlement_status))
    .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const pendingBaseAmount = (paymentSummary?.line_items || [])
    .filter((item) => !isExtraType(item.booking_type) && isPendingStatus(item.settlement_status))
    .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const isSettledStatus = (status?: string) =>
    ["completed", "done", "settled", "paid"].includes(String(status || "").toLowerCase());
  const paidInitialAmount = (paymentSummary?.line_items || [])
    .filter((item) => !isExtraType(item.booking_type) && isSettledStatus(item.settlement_status))
    .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const paidMealsAmount = (paymentSummary?.line_items || [])
    .filter((item) => String(item.booking_type || "").toLowerCase() === "additional_meals" && isSettledStatus(item.settlement_status))
    .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const paidExtraAmount = (paymentSummary?.line_items || [])
    .filter((item) => String(item.booking_type || "").toLowerCase() === "extra" && isSettledStatus(item.settlement_status))
    .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const totalPaidAmount = paidInitialAmount + paidMealsAmount + paidExtraAmount;
  const recordedOvertime = (paymentSummary?.line_items || [])
    .filter(item => String(item.booking_type || '').toLowerCase() === 'extra' && (isPendingStatus(item.settlement_status) || isSettledStatus(item.settlement_status)))
    .reduce((sum,item) => sum + Number(item.components?.base_amount ?? item.line_total ?? 0),0);
  const computedExtraAmount = Math.max(0, grossExtraAmount - recordedOvertime);
  const parsedWaiveOff = parseFloat(waiveOffAmount) || 0;
  const dueBeforeWaive = computedExtraAmount + pendingMealsAmount + historicalPendingExtraAmount + pendingBaseAmount;
  const payableAmount = Math.max(dueBeforeWaive - parsedWaiveOff, 0);

  // Handle keyboard navigation for payment mode buttons
  const handlePaymentModeKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setPaymentMode(key);
    }
  };

  const availableCreditAmount = creditAccount
    ? Math.max(Number(creditAccount.credit_limit || 0) - Number(creditAccount.outstanding_amount || 0), 0)
    : 0;

  return (
    <AnimatePresence>
      {showOverlay && selectedSlot && (
        <>
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md max-sm:items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowOverlay(false)}
          >
            <motion.div
            ref={overlayRef}
            className="session-settlement-modal dashboard-module-panel relative w-full max-w-4xl mx-3 sm:mx-4 rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto max-sm:mx-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none max-sm:p-3"
            initial={{ scale: 0.95, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="extra-payment-title"
            aria-modal="true"
            tabIndex={-1}
          >

            <div className="relative mb-3 flex flex-col justify-between gap-2 sm:mb-5 sm:flex-row sm:items-start sm:gap-3">
              <div>
                <h2 id="extra-payment-title" className="text-xl font-bold text-slate-100 sm:text-2xl">
                  Session settlement
                </h2>
                <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                  Review charges and record payment to release the console.
                </p>
                {settlementPausedAt ? (
                  <p className="mt-1 text-xs text-cyan-300">Timer paused at {settlementPausedAt}</p>
                ) : null}
              </div>
              <span className="w-fit rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300 sm:px-3 sm:text-[11px]">
                Live Session
              </span>
            </div>

            {summaryLoading || !paymentSummary || summaryBookingId !== resolveBookingId(selectedSlot) ? <div className="rounded-xl border border-slate-700 p-8 text-center" aria-live="polite" aria-busy={summaryLoading}>
              {summaryError ? <><p role="alert" className="text-sm text-red-300">{summaryError}</p><button type="button" className="mt-4 rounded-md border px-4 py-2 text-sm" onClick={()=>{setSummaryLoading(true);setSummaryVersion(v=>v+1);}}>Retry</button></> : <><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-slate-400"/><p className="text-sm">Verifying settlement amounts…</p><p className="mt-1 text-xs text-slate-400">Loading current payments and outstanding charges.</p></>}
              <button type="button" className="mt-4 ml-2 rounded-md border px-4 py-2 text-sm" onClick={()=>setShowOverlay(false)}>Cancel</button>
            </div> : <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div>
                <div className="relative mb-3 rounded-xl border border-slate-700/70 bg-slate-800/65 p-3 sm:mb-4 sm:p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200 sm:gap-3 sm:text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-700/70 px-2.5 py-1">
                      <Gamepad2 className="h-4 w-4 text-cyan-300" />
                      {selectedSlot.consoleType} #{selectedSlot.consoleNumber}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-700/70 px-2.5 py-1">
                      <Receipt className="h-4 w-4 text-emerald-300" />
                      Booking #{resolveBookingId(selectedSlot) || "N/A"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300 sm:text-sm">
                    Session for <span className="font-semibold text-slate-100">{selectedSlot.username}</span>
                    {computedExtraSeconds > 0
                      ? " has crossed allotted time."
                      : " has pending charges to settle."}
                  </p>
                </div>

                <div className="mb-3 grid grid-cols-1 gap-2 sm:mb-4 sm:grid-cols-2 sm:gap-3">
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 sm:p-3">
                    <p className="text-xs font-medium text-red-200">Overtime</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-base font-bold text-red-300 sm:text-lg">
                      <Timer className="h-4 w-4" />
                      {formatTime(computedExtraSeconds)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5 sm:p-3">
                    <p className="text-xs font-medium text-cyan-200">Overtime charge</p>
                    <p className="mt-1 text-base font-bold text-cyan-300 sm:text-lg">₹{computedExtraAmount.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 sm:p-3">
                    <p className="text-xs font-medium text-emerald-200">Already paid</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-base font-bold text-emerald-300 sm:text-lg">
                      <Wallet className="h-4 w-4" />
                      ₹{totalPaidAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 sm:p-3">
                    <p className="text-xs font-medium text-amber-200">Amount due</p>
                    <p className="mt-1 text-base font-bold text-amber-300 sm:text-lg">₹{payableAmount.toFixed(2)}</p>
                  </div>
                </div>
                {(summaryLoading || summaryError) && (
                  <div className="mb-4 rounded-lg border border-slate-700/70 bg-slate-800/50 px-3 py-2">
                    {summaryLoading && (
                      <p className="text-xs text-slate-300">Loading full transaction history...</p>
                    )}
                    {summaryError && (
                      <p className="text-xs text-amber-300">{summaryError}</p>
                    )}
                  </div>
                )}

                <div className="mb-3 grid grid-cols-1 gap-2 sm:mb-4 sm:gap-3 xl:grid-cols-2">
                  <div className="rounded-xl border border-slate-700/70 bg-slate-800/55 p-2.5 sm:p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-100">Charges to collect</p>
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span>Overtime</span>
                        <span className="font-semibold text-slate-100">₹{computedExtraAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Unpaid meals</span>
                        <span className="font-semibold text-slate-100">₹{pendingMealsAmount.toFixed(2)}</span>
                      </div>
                      {historicalPendingExtraAmount > 0 ? (
                        <div className="flex items-center justify-between">
                          <span>Previous overtime</span>
                          <span className="font-semibold text-slate-100">₹{historicalPendingExtraAmount.toFixed(2)}</span>
                        </div>
                      ) : null}
                      {pendingBaseAmount > 0 && <div className="flex items-center justify-between"><span>Unpaid booking</span><span className="font-semibold text-slate-100">₹{pendingBaseAmount.toFixed(2)}</span></div>}
                      <div className="flex items-center justify-between border-t border-slate-700/70 pt-1.5">
                        <span>Subtotal</span>
                        <span className="font-semibold text-slate-100">₹{dueBeforeWaive.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Waiver</span>
                        <span className="font-semibold text-amber-300">- ₹{parsedWaiveOff.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-700/70 pt-1.5 text-sm">
                        <span className="font-semibold text-slate-100">Amount due</span>
                        <span className="font-bold text-emerald-300">₹{payableAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700/70 bg-slate-800/55 p-2.5 sm:p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-100">Payment history</p>
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span>Initial booking paid</span>
                        <span className="font-semibold text-slate-100">₹{paidInitialAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Meals paid</span>
                        <span className="font-semibold text-slate-100">₹{paidMealsAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Extra time paid</span>
                        <span className="font-semibold text-slate-100">₹{paidExtraAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-700/70 pt-1.5 text-sm">
                        <span className="font-semibold text-slate-100">Total paid amount</span>
                        <span className="font-bold text-emerald-300">₹{totalPaidAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700/70 bg-slate-800/55 p-2.5 sm:p-3 lg:sticky lg:top-2 lg:h-fit">
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="waive-off-amount" className="mb-2 block text-sm font-medium text-slate-200">
                    Waiver (₹)
                  </label>
                  <motion.input
                    id="waive-off-amount"
                    type="text"
                    value={waiveOffAmount}
                    onChange={handleWaiveOffChange}
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    className={`w-full rounded-lg border bg-slate-900/70 p-2.5 text-sm text-slate-100 transition-all duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 sm:p-3 ${
                      waiveOffError ? "border-red-500 focus:ring-red-500" : "border-slate-600"
                    }`}
                    placeholder="0.00"
                    aria-invalid={waiveOffError ? "true" : "false"}
                    aria-describedby={waiveOffError ? "waive-off-error" : undefined}
                    whileFocus={{ scale: 1.02 }}
                  />
                  {waiveOffError && (
                    <p id="waive-off-error" className="mt-1 text-sm text-red-400">
                      {waiveOffError}
                    </p>
                  )}
                </div>

                <div className="mb-4 sm:mb-5">
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Payment method
                  </label>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment method">
                    {[
                      { key: "cash", label: "Cash", Icon: IndianRupee },
                      { key: "card", label: "Card", Icon: CreditCard },
                      { key: "upi", label: "UPI", Icon: Smartphone },
                      { key: "credit", label: "Credit", Icon: Wallet },
                    ].map(({ key, label, Icon }) => (
                      <motion.button
                        key={key}
                        onClick={() => setPaymentMode(key)}
                        onKeyDown={(e) => handlePaymentModeKeyDown(e, key)}
                        className={`flex min-h-16 flex-col items-center justify-center rounded-lg border p-2 sm:min-h-0 sm:p-3 transition-all duration-200
                          ${
                            paymentMode === key
                              ? "border-cyan-400 bg-cyan-500/20 ring-2 ring-cyan-500/30"
                              : "border-slate-600 bg-slate-900/60 text-slate-100 hover:bg-slate-800"
                          }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-checked={paymentMode === key}
                        role="radio"
                      >
                        <Icon
                          className={`mb-1.5 h-5 w-5 ${paymentMode === key ? "text-cyan-300" : "text-slate-400"}`}
                        />
                        <span
                          className={`text-xs font-medium sm:text-sm ${paymentMode === key ? "text-cyan-200" : "text-slate-200"}`}
                        >
                          {label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {paymentMode === "credit" && (
                  <div className="mb-4 rounded-xl border border-slate-700/70 bg-slate-900/60 p-2.5 sm:mb-5 sm:p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">Credit Account Status</p>
                        <p className="text-xs text-slate-400">
                          {selectedUserProfile?.id
                            ? `Matched customer: ${selectedUserProfile.name}`
                            : "No credit-enabled customer matched yet."}
                        </p>
                      </div>
                      {!creditAccount?.is_active && (
                        <button
                          type="button"
                          onClick={() => setShowCreditAccountModal(true)}
                          className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200"
                        >
                          Create Credit Account
                        </button>
                      )}
                    </div>
                    {creditAccountLoading ? (
                      <p className="mt-2 text-xs text-slate-400">Loading credit account...</p>
                    ) : creditAccount?.is_active ? (
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-emerald-300">Limit</p>
                          <p className="text-sm font-semibold text-emerald-100">₹{Number(creditAccount.credit_limit || 0).toFixed(2)}</p>
                        </div>
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-amber-300">Outstanding</p>
                          <p className="text-sm font-semibold text-amber-100">₹{Number(creditAccount.outstanding_amount || 0).toFixed(2)}</p>
                        </div>
                        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-cyan-300">Available</p>
                          <p className="text-sm font-semibold text-cyan-100">₹{availableCreditAmount.toFixed(2)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                        {creditAccountError || "No credit account configured for this customer."}
                      </div>
                    )}
                  </div>
                )}

                {settlementError && <div role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{settlementError}</div>}
                <div className="settlement-actions flex flex-col gap-2">
                  <div className="mb-2 flex items-center justify-between border-t border-white/10 pt-3 text-sm"><span className="text-slate-400">Amount due</span><strong className="text-lg tabular-nums text-slate-100">₹{payableAmount.toFixed(2)}</strong></div>
                  <p className="mb-2 text-xs text-slate-400">{paymentMode === "credit" ? "This amount will be added to the customer’s credit account." : "Confirm only after receiving payment."}</p>
                  <motion.button
                    onClick={handleSettle}
                    className="dashboard-btn-primary w-full rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-50 sm:px-6 sm:py-2"
                    disabled={loading || summaryLoading || !!summaryError || !!waiveOffError || !vendorId || (paymentMode === "credit" && (!creditAccount?.is_active || availableCreditAmount < payableAmount))}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label="Confirm settlement and release console"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          {paymentMode === "credit" ? "Record credit & release" : "Confirm payment & release"}
                        </>
                      )}
                    </span>
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setShowOverlay(false);
                      setWaiveOffAmount("");
                      setWaiveOffError("");
                      setPaymentSummary(null);
                      setSummaryError("");
                    }}
                    className="w-full rounded-md border border-slate-600 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all duration-200 hover:bg-slate-800 disabled:opacity-50 sm:px-5 sm:py-2"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label="Cancel extra payment"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <X className="w-4 h-4" />
                      Cancel
                    </span>
                  </motion.button>
                </div>
              </div>
            </div>}
            </motion.div>
          </motion.div>
          <CreditAccountModal
            open={showCreditAccountModal}
            vendorId={vendorId}
            customer={{
              userId: selectedUserProfile?.id ?? selectedSlot?.userId ?? null,
              name: selectedUserProfile?.name || selectedSlot?.username || "",
              email: selectedUserProfile?.email || "",
              phone: selectedUserProfile?.phone || "",
            }}
            onClose={() => setShowCreditAccountModal(false)}
            onCreated={({ account, user }) => {
              setCreditAccount(account);
              setSelectedUserProfile({
                id: user.userId || undefined,
                name: user.name,
                email: user.email || "",
                phone: user.phone || "",
              });
              setShowCreditAccountModal(false);
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default function ExtraBookingOverlay(props:ExtraBookingOverlayProps) {
  if(props.showOverlay&&props.selectedSlot?.runtime?.runtime_id&&props.vendorId)return <ExtensionSettlement runtimeId={props.selectedSlot.runtime.runtime_id} vendorId={props.vendorId} onClose={()=>props.setShowOverlay(false)} onUpdated={()=>props.setRefreshSlots(prev=>!prev)}/>;
  return <SettlementOverlay key={`${props.vendorId}:${props.selectedSlot?.bookingId || props.selectedSlot?.bookId}:${props.showOverlay}`} {...props}/>;
}
