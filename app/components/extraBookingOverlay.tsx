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
  releaseSlot: (consoleType: string, gameId: string, consoleId: string, vendorId: any, setRefreshSlots: any) => Promise<boolean>;
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

const ExtraBookingOverlay: React.FC<ExtraBookingOverlayProps> = ({
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
  const [frozenExtraSeconds, setFrozenExtraSeconds] = useState(0);
  const [settlementPausedAt, setSettlementPausedAt] = useState<string>("");
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
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

  useEffect(() => {
    if (!showOverlay || !selectedSlot) {
      setSummaryLoading(false);
      return;
    }

    const bookingId = resolveBookingId(selectedSlot);
    if (!bookingId) {
      setSummaryLoading(false);
      setPaymentSummary(null);
      setSummaryError("Booking ID missing. Showing current extra charge only.");
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    const token = localStorage.getItem("jwtToken");

    const fetchPaymentSummary = async () => {
      try {
        setSummaryLoading(true);
        setSummaryError("");
        const response = await fetch(`${BOOKING_URL}/api/booking/${bookingId}/payment-summary`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch payment summary (${response.status})`);
        }

        const result = await response.json();
        if (isMounted && result?.success && result?.financial_summary) {
          setPaymentSummary(result.financial_summary as PaymentSummary);
        }
      } catch (error: any) {
        if (error?.name === "AbortError") return;
        if (isMounted) {
          setPaymentSummary(null);
          setSummaryError("Unable to load full payment summary. Showing current extra charge.");
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
  }, [showOverlay, selectedSlot]);

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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
          Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
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

  const settlePendingBookingCharges = async (bookingId: number, mode: string, waiveOffAmount: number) => {
    const response = await fetch(`${BOOKING_URL}/api/booking/${bookingId}/settle-pending`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
      },
      body: JSON.stringify({
        mode_of_payment: mode,
        waive_off_amount: waiveOffAmount,
        booking_types: ["extra", "additional_meals"],
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
      setWaiveOffError("Invalid slot or vendor information");
      return;
    }
    const bookingId = resolveBookingId(selectedSlot);
    if (!bookingId) {
      setWaiveOffError("Missing booking ID for settlement");
      return;
    }

    setLoading(true);
    const extraTime = frozenExtraSeconds;
    const amount = calculateExtraAmount(extraTime, selectedSlot.slot_price || 100);
    const parsedWaiveOff = parseFloat(waiveOffAmount) || 0;

    const extraBookingPayload = {
      consoleNumber: selectedSlot.consoleId || selectedSlot.consoleNumber,
      consoleType: selectedSlot.consoleType,
      date: new Date().toISOString().split("T")[0],
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
      await settlePendingBookingCharges(bookingId, paymentMode, parsedWaiveOff);
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
        success = success && Boolean(released);
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
        setWaiveOffError("");
        setLoading(false);
        
        console.log('💰 UI updated immediately - settle complete');
        
      } else {
        // ✅ Release failed - show error, don't close overlay
        console.log('💰 Release slot failed');
        setWaiveOffError("Failed to release slot. Please try again.");
        setLoading(false);
      }

    } catch (err) {
      console.error('💰 Settle process failed:', err);
      
      // ✅ On ERROR - Show error, don't close overlay (let user retry)
      setWaiveOffError("Failed to process payment. Please try again.");
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
      const maxWaiveOff = localExtraAmount + localPendingMeals + localPendingExtra;
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
  const computedExtraAmount = selectedSlot
    ? calculateExtraAmount(computedExtraSeconds, selectedSlot.slot_price || 100)
    : 0;
  const pendingMealsAmount = (paymentSummary?.line_items || [])
    .filter((item) => String(item.booking_type || "").toLowerCase() === "additional_meals" && isPendingStatus(item.settlement_status))
    .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const historicalPendingExtraAmount = (paymentSummary?.line_items || [])
    .filter((item) => String(item.booking_type || "").toLowerCase() === "extra" && isPendingStatus(item.settlement_status))
    .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const isSettledStatus = (status?: string) =>
    ["completed", "done", "settled", "paid"].includes(String(status || "").toLowerCase());
  const paidInitialAmount = (paymentSummary?.line_items || [])
    .filter((item) => String(item.booking_type || "").toLowerCase() === "direct" && isSettledStatus(item.settlement_status))
    .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const paidMealsAmount = (paymentSummary?.line_items || [])
    .filter((item) => String(item.booking_type || "").toLowerCase() === "additional_meals" && isSettledStatus(item.settlement_status))
    .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const paidExtraAmount = (paymentSummary?.line_items || [])
    .filter((item) => String(item.booking_type || "").toLowerCase() === "extra" && isSettledStatus(item.settlement_status))
    .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const totalPaidAmount = paidInitialAmount + paidMealsAmount + paidExtraAmount;
  const parsedWaiveOff = parseFloat(waiveOffAmount) || 0;
  const dueBeforeWaive = computedExtraAmount + pendingMealsAmount + historicalPendingExtraAmount;
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowOverlay(false)}
          >
            <motion.div
            ref={overlayRef}
            className="relative w-full max-w-4xl mx-3 sm:mx-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
            initial={{ scale: 0.95, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="extra-payment-title"
            tabIndex={-1}
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

            <div className="relative mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
              <div>
                <h2 id="extra-payment-title" className="text-2xl font-bold text-slate-100">
                  Extra Payment Required
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  Settle extra play time and in-session meals before releasing the console.
                </p>
                {settlementPausedAt ? (
                  <p className="mt-1 text-xs text-cyan-300">Timer paused at {settlementPausedAt}</p>
                ) : null}
              </div>
              <span className="w-fit rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                Live Session
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-4">
              <div>
                <div className="relative mb-4 rounded-xl border border-slate-700/70 bg-slate-800/65 p-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-700/70 px-2.5 py-1">
                      <Gamepad2 className="h-4 w-4 text-cyan-300" />
                      {selectedSlot.consoleType} #{selectedSlot.consoleNumber}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-700/70 px-2.5 py-1">
                      <Receipt className="h-4 w-4 text-emerald-300" />
                      Booking #{resolveBookingId(selectedSlot) || "N/A"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    Session for <span className="font-semibold text-slate-100">{selectedSlot.username}</span>
                    {computedExtraSeconds > 0
                      ? " has crossed allotted time."
                      : " has pending in-session charges to settle."}
                  </p>
                </div>

                <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-xs font-medium text-red-200">Extra Time</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-lg font-bold text-red-300">
                      <Timer className="h-4 w-4" />
                      {formatTime(computedExtraSeconds)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3">
                    <p className="text-xs font-medium text-cyan-200">Extra Charge (Live)</p>
                    <p className="mt-1 text-lg font-bold text-cyan-300">₹{computedExtraAmount.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <p className="text-xs font-medium text-emerald-200">Paid Initially</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-lg font-bold text-emerald-300">
                      <Wallet className="h-4 w-4" />
                      ₹{(paymentSummary?.amount_paid ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-xs font-medium text-amber-200">Collect Now</p>
                    <p className="mt-1 text-lg font-bold text-amber-300">₹{payableAmount.toFixed(2)}</p>
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

                <div className="mb-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-700/70 bg-slate-800/55 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-100">Amount To Collect Breakdown</p>
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span>Extra played amount</span>
                        <span className="font-semibold text-slate-100">₹{computedExtraAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Added meals (pending)</span>
                        <span className="font-semibold text-slate-100">₹{pendingMealsAmount.toFixed(2)}</span>
                      </div>
                      {historicalPendingExtraAmount > 0 ? (
                        <div className="flex items-center justify-between">
                          <span>Previous pending extra</span>
                          <span className="font-semibold text-slate-100">₹{historicalPendingExtraAmount.toFixed(2)}</span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between border-t border-slate-700/70 pt-1.5">
                        <span>Subtotal</span>
                        <span className="font-semibold text-slate-100">₹{dueBeforeWaive.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Discount / Waive-off</span>
                        <span className="font-semibold text-amber-300">- ₹{parsedWaiveOff.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-700/70 pt-1.5 text-sm">
                        <span className="font-semibold text-slate-100">Final collect amount</span>
                        <span className="font-bold text-emerald-300">₹{payableAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700/70 bg-slate-800/55 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-100">Paid Amount Breakdown</p>
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

              <div className="rounded-xl border border-slate-700/70 bg-slate-800/55 p-3 h-fit lg:sticky lg:top-2">
                <div className="mb-4">
                  <label htmlFor="waive-off-amount" className="mb-2 block text-sm font-medium text-slate-200">
                    Waive-Off Amount (₹)
                  </label>
                  <motion.input
                    id="waive-off-amount"
                    type="text"
                    value={waiveOffAmount}
                    onChange={handleWaiveOffChange}
                    pattern="[0-9]*\.?[0-9]*"
                    className={`w-full rounded-lg border bg-slate-900/70 p-3 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 ${
                      waiveOffError ? "border-red-500 focus:ring-red-500" : "border-slate-600"
                    }`}
                    placeholder="Enter waive-off amount (e.g., 50.00)"
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

                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Select Payment Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
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
                        className={`flex flex-col items-center justify-center rounded-lg border p-2.5 sm:p-3 transition-all duration-200
                          ${
                            paymentMode === key
                              ? "border-cyan-400 bg-cyan-500/20 ring-2 ring-cyan-500/30"
                              : "border-slate-600 bg-slate-900/60 text-slate-100 hover:bg-slate-800"
                          }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-pressed={paymentMode === key}
                        role="radio"
                      >
                        <Icon
                          className={`mb-1.5 h-5 w-5 ${paymentMode === key ? "text-cyan-300" : "text-slate-400"}`}
                        />
                        <span
                          className={`text-sm font-medium ${paymentMode === key ? "text-cyan-200" : "text-slate-200"}`}
                        >
                          {label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {paymentMode === "credit" && (
                  <div className="mb-5 rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
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

                <div className="flex flex-col gap-2">
                  <motion.button
                    onClick={handleSettle}
                    className="w-full rounded-md bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50"
                    disabled={loading || !!waiveOffError || !vendorId || (paymentMode === "credit" && (!creditAccount?.is_active || availableCreditAmount < payableAmount))}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label="Settle extra payment"
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
                          Settle
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
                    className="w-full rounded-md border border-slate-600 bg-slate-900/80 px-5 py-2 text-sm font-medium text-slate-200 transition-all duration-200 hover:bg-slate-800 disabled:opacity-50"
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
            </div>
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

export default ExtraBookingOverlay;
