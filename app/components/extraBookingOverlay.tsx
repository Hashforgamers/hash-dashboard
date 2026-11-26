import { buttonVariants } from "@/components/ui/button";
import { cafeCall, rupees } from "@/lib/cafe-api";
import { creditAuthHeaders } from "@/lib/credit-auth";
import { AnimatePresence, motion } from "framer-motion";
import { IndianRupee, CreditCard, Smartphone, X, CheckCircle, Loader2, Gamepad2, Timer, Wallet, Receipt, QrCode } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { BOOKING_URL } from "@/src/config/env";
import CreditAccountModal, { type MonthlyCreditAccountSummary } from "./credit-account-modal";
import { UpiQrPanel, cancelUpiQr, createUpiQr, useUpiQrPolling, type UpiQrState } from "./upi-qr-collect";

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
  booking_id?: number;
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

interface OvertimeQuote {
  overtime_seconds: number;
  rate_per_hour: number;
  gross_amount: number;
  already_recorded: number;
  amount: number;
  scheduled_end: string;
  priced_until: string;
  needs_end_time: boolean;
}

// Kiosk-metered play past the booking, billed by the dashboard session engine.
interface RuntimeBill {
  revision: number;
  ended_at: string | null;
  billing: {
    total_paise: number;
    wallet_funded_paise: number;
    amount_due_paise: number;
    requires_reconciliation?: boolean;
    cafe_policy_credit_paise?: number;
    pricing_error?: string;
  };
}

// Desk payment modes the session engine records for kiosk extra time. Credit and
// Hash UPI QR move the PC time onto the booking bill and collect it there.
const KIOSK_METHODS: Record<string, string> = { cash: "cash", card: "card", upi: "cafe_upi", credit: "booking_bill", upi_qr: "booking_bill" };

// "2026-11-22T04:28" in IST, for the datetime-local input.
const istInputValue = (date: Date) =>
  new Date(date.getTime() + 330 * 60 * 1000).toISOString().slice(0, 16);

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
  const [upiQr, setUpiQr] = useState<UpiQrState | null>(null);
  const qrReleaseStarted = useRef(false);
  // Kiosk sessions meter their own extra time; it is billed on this same screen.
  const runtimeId = selectedSlot?.runtime?.runtime_id as string | undefined;
  const meteredByKiosk = Boolean(runtimeId);
  const [runtimeBill, setRuntimeBill] = useState<RuntimeBill | null>(null);
  const [runtimeError, setRuntimeError] = useState("");
  const runtimeLock = useRef(false);
  // A closed session left only its bill: no running clock and no PC to free.
  const sessionClosed = Boolean(selectedSlot?.awaitingPayment);
  const noOvertime = meteredByKiosk || sessionClosed;
  // One bill per gamer: every booking the row stands for (back-to-back slots
  // and earlier unpaid sessions) is totalled and settled together.
  const groupBookingIds: number[] = (() => {
    const raw = [selectedSlot?.bookingId || selectedSlot?.bookId, ...(selectedSlot?.billBookingIds || selectedSlot?.awaitingBookingIds || [])];
    return Array.from(new Set<number>(raw.map(Number).filter((n: number) => Number.isFinite(n) && n > 0)));
  })();
  const isGroupBill = groupBookingIds.length > 1;
  const [overtimeQuote, setOvertimeQuote] = useState<OvertimeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [playedUntil, setPlayedUntil] = useState("");
  const [chargeFullOvertime, setChargeFullOvertime] = useState(false);

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
        const ids = isGroupBill ? groupBookingIds : [bookingId];
        const summaries = await Promise.all(ids.map(async (id) => {
          const response = await fetch(`${BOOKING_URL}/api/booking/${id}/payment-summary`, {
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
          if (!result?.success || !result?.financial_summary) {
            throw new Error("The server did not return a valid payment summary.");
          }
          const summary = result.financial_summary as PaymentSummary;
          return { ...summary, line_items: (summary.line_items || []).map((item) => ({ ...item, booking_id: id })) };
        }));
        if (isMounted) {
          setPaymentSummary({
            total_charged: summaries.reduce((sum, x) => sum + Number(x.total_charged || 0), 0),
            amount_paid: summaries.reduce((sum, x) => sum + Number(x.amount_paid || 0), 0),
            amount_due: summaries.reduce((sum, x) => sum + Number(x.amount_due || 0), 0),
            line_items: summaries.flatMap((x) => x.line_items),
          });
          setSummaryBookingId(bookingId);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOverlay, selectedSlot, summaryVersion]);

  useEffect(() => {
    if (!showOverlay || !selectedSlot) {
      setFrozenExtraSeconds(0);
      setSettlementPausedAt("");
      setOvertimeQuote(null);
      return;
    }
    setSettlementPausedAt(new Date().toLocaleTimeString());
    const bookingId = resolveBookingId(selectedSlot);
    if (noOvertime || !bookingId) {
      setFrozenExtraSeconds(0);
      setOvertimeQuote(null);
      setQuoteError(bookingId ? "" : "Cannot price extra time: booking ID is missing.");
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams();
    const consoleId = selectedSlot.consoleId || selectedSlot.consoleNumber;
    if (consoleId) params.set("console_id", String(consoleId));
    if (playedUntil) params.set("played_until", playedUntil);
    setQuoteLoading(true);
    setQuoteError("");
    fetch(`${BOOKING_URL}/api/booking/${bookingId}/overtime-quote?${params}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...creditAuthHeaders() },
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.quote) throw new Error(data?.message || "Could not price extra time");
        setOvertimeQuote(data.quote as OvertimeQuote);
        setFrozenExtraSeconds(Number(data.quote.overtime_seconds || 0));
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setOvertimeQuote(null);
        setQuoteError(error instanceof Error ? error.message : "Could not price extra time");
      })
      .finally(() => setQuoteLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOverlay, selectedSlot, noOvertime, playedUntil, summaryVersion]);

  useEffect(() => {
    if (!showOverlay || !runtimeId || !vendorId) {
      setRuntimeBill(null);
      setRuntimeError("");
      return;
    }
    let alive = true;
    const refresh = async () => {
      if (runtimeLock.current) return;
      try {
        const bill = await cafeCall<RuntimeBill>(`/${vendorId}/extensions/${runtimeId}`);
        if (alive && !runtimeLock.current) { setRuntimeBill(bill); setRuntimeError(""); }
      } catch (error) {
        if (alive) setRuntimeError(error instanceof Error ? error.message : "Could not load PC extra time");
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 10000);
    return () => { alive = false; clearInterval(timer); };
  }, [showOverlay, runtimeId, vendorId, summaryVersion]);

  // Stops the PC, then records its extra time with the same payment method.
  // Returns false when the final figure moved and staff should look again.
  const settleKioskTime = async (shownDuePaise: number, bookingId: number | string): Promise<boolean> => {
    if (!runtimeId || !vendorId) return true;
    const prefix = `/${vendorId}/extensions/${runtimeId}`;
    runtimeLock.current = true;
    try {
      let bill = await cafeCall<RuntimeBill>(prefix);
      if (!bill.ended_at) {
        bill = await cafeCall<RuntimeBill>(`${prefix}/end`, { mode: "now", revision: bill.revision, idempotency_key: `checkout-${runtimeId}-${bill.revision}-end` });
      }
      setRuntimeBill(bill);
      if (bill.billing.requires_reconciliation) {
        throw new Error(bill.billing.pricing_error || "PC extra time could not be priced. Refresh and try again.");
      }
      const due = bill.billing.amount_due_paise;
      if (due > shownDuePaise + 100) {
        setSettlementError(`The PC is now stopped and its extra time came to ${rupees(due)}. Check the new total and confirm again.`);
        return false;
      }
      if (due > 0) {
        const method = KIOSK_METHODS[paymentMode] || "cash";
        bill = await cafeCall<RuntimeBill>(`${prefix}/settle`, { method, amount_paise: due, revision: bill.revision, idempotency_key: `checkout-${runtimeId}-${bill.revision}-settle-${method}` });
        setRuntimeBill(bill);
      }
      if (KIOSK_METHODS[paymentMode] === "booking_bill" && (due > 0 || bill.billing.amount_due_paise === 0)) {
        // Put the moved PC time on the booking bill so credit / UPI QR collects it.
        await createExtraBooking({
          consoleNumber: selectedSlot.consoleId || selectedSlot.consoleNumber,
          consoleType: selectedSlot.consoleType,
          date: String(selectedSlot.date || "").slice(0, 10),
          booking_id: bookingId,
          slotId: selectedSlot.slotId,
          userId: selectedSlot.userId,
          username: selectedSlot.username,
          gameId: selectedSlot.game_id,
          vendorId,
          modeOfPayment: "pending",
          kiosk_transfer: true,
        }).catch((error: unknown) => {
          // Nothing moved (no extra time) is fine; anything else must stop checkout.
          if (!(error instanceof Error && /No PC extra time was moved/.test(error.message))) throw error;
        });
      }
      return true;
    } finally {
      runtimeLock.current = false;
    }
  };

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

  const qrNow = useUpiQrPolling(vendorId, upiQr, setUpiQr);

  // The server prices the QR from the booking's pending rows; the customer pays HFG's Razorpay account.
  const startUpiQr = async (bookingId: number, waiveOff: number, bookingTypes: string[]) => {
    if (!vendorId) return;
    qrReleaseStarted.current = false;
    setUpiQr(await createUpiQr(vendorId, bookingId, { booking_types: bookingTypes, waive_off_amount: waiveOff }));
  };

  const handleCancelUpiQr = async () => {
    if (!vendorId) return;
    try {
      // A payment can land just before cancelling; keep showing it so the session still ends.
      setUpiQr(await cancelUpiQr(vendorId, upiQr));
    } catch (err) {
      setSettlementError(err instanceof Error ? err.message : "Could not cancel the QR.");
    }
  };

  // Paid: the bill is already marked paid server-side, so free the console automatically.
  useEffect(() => {
    if (upiQr?.status !== "paid" || qrReleaseStarted.current) return;
    qrReleaseStarted.current = true;
    setLoading(true);
    setSettlementError("");
    releaseAndClose()
      .then((released) => { if (released) setUpiQr(null); })
      .catch((err) => {
        setSettlementError(err instanceof Error ? err.message : "Payment received, but the console could not be released. Use Release.");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upiQr?.status]);

  // Frees the console(s) once the bill is settled, by any payment method.
  const releaseAndClose = async (): Promise<boolean> => {
    if (!selectedSlot || !vendorId) return false;
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
    // The PC was already freed when the session closed and may now be someone
    // else's; releasing it again would end their session.
    for (const consoleId of sessionClosed ? [] : releaseConsoleIds) {
      const released = await releaseSlot(
        selectedSlot.consoleType,
        selectedSlot.game_id,
        String(consoleId),
        vendorId,
        setRefreshSlots
      );
      success = success && released.ok;
    }

    if (success) {
      // ✅ CRITICAL: On SUCCESS - Update UI immediately (exactly like release button)
      
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
      
      return true;
    } else {
      // ✅ Release failed - show error, don't close overlay
      setSettlementError("Failed to release slot. Please try again.");
      setLoading(false);
      return false;
    }
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
    if (!noOvertime && (!overtimeQuote || quoteLoading)) {
      setSettlementError(quoteError || "Extra time is still being priced. Try again in a moment.");
      return;
    }
    if (overtimeQuote?.needs_end_time && !playedUntil && !chargeFullOvertime) {
      setSettlementError("This session ran more than 3 hours over. Enter when play ended, or confirm the full time.");
      return;
    }
    if (kioskBlocker) {
      setSettlementError(kioskBlocker);
      return;
    }
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
      played_until: playedUntil || undefined,
      confirm_full_overtime: chargeFullOvertime,
    };

    try {
      if (meteredByKiosk && !(await settleKioskTime(kioskDuePaise, bookingId))) {
        setLoading(false);
        return;
      }
      if (amount > 0) {
        await createExtraBooking(extraBookingPayload);
      } else {
      }
      const pendingTypes = (paymentSummary?.line_items || [])
        .filter((item) => isPendingStatus(item.settlement_status))
        .map((item) => normalizeBookingType(item.booking_type))
        .filter((type) => type && type !== "settlement_waive_off");
      const bookingTypesSet = new Set(pendingTypes);
      if (amount > 0 || (kioskDuePaise > 0 && KIOSK_METHODS[paymentMode] === "booking_bill")) {
        bookingTypesSet.add("extra");
      }
      if (pendingMealsAmount > 0) {
        bookingTypesSet.add("additional_meals");
      }
      const bookingTypesPayload = bookingTypesSet.size > 0
        ? Array.from(bookingTypesSet)
        : ["extra", "additional_meals"];

      const settleMode = paymentMode === "credit" ? "monthly_credit" : paymentMode === "upi_qr" ? "upi" : paymentMode;
      if (isGroupBill) {
        // Settle every unpaid session of this gamer; the discount is used up
        // booking by booking so no single bill goes below zero.
        let waiveLeft = parsedWaiveOff;
        const primaryId = Number(bookingId);
        for (const id of groupBookingIds) {
          const items = (paymentSummary?.line_items || []).filter((item) =>
            item.booking_id === id && isPendingStatus(item.settlement_status)
            && normalizeBookingType(item.booking_type) !== "settlement_waive_off");
          // Extra time just created is recorded on the booking being checked out.
          const overtime = id === primaryId ? amount : 0;
          const due = items.reduce((sum, item) => sum + Number(item.line_total || 0), 0) + overtime;
          if (due <= 0.009) continue;
          const waive = Math.min(waiveLeft, due);
          waiveLeft -= waive;
          const types = new Set(items.map((item) => normalizeBookingType(item.booking_type)).filter(Boolean));
          if (overtime > 0) types.add("extra");
          await settlePendingBookingCharges(id, settleMode, waive, types.size > 0 ? Array.from(types) : bookingTypesPayload);
        }
        await releaseAndClose();
        return;
      }
      if (paymentMode === "upi_qr" && payableAmount > 0) {
        await startUpiQr(bookingId, parsedWaiveOff, bookingTypesPayload);
        setLoading(false);
        return;
      }
      await settlePendingBookingCharges(bookingId, settleMode, parsedWaiveOff, bookingTypesPayload);

      await releaseAndClose();

    } catch (err) {
      console.error('💰 Settle process failed:', err);
      
      // ✅ On ERROR - Show error, don't close overlay (let user retry)
      setSettlementError(err instanceof Error ? err.message : "Could not end the session. Try again.");
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
        setWaiveOffError("Discount cannot be negative");
        setWaiveOffAmount("");
      } else if (parsedValue > maxWaiveOff) {
        setWaiveOffError(`Discount cannot exceed ₹${maxWaiveOff.toFixed(2)}`);
        setWaiveOffAmount(maxWaiveOff.toString());
      } else {
        setWaiveOffError("");
      }
    }
  };

  const computedExtraSeconds = frozenExtraSeconds;
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
  // The server subtracts overtime already recorded on this booking.
  const computedExtraAmount = noOvertime ? 0 : Number(overtimeQuote?.amount || 0);
  const parsedWaiveOff = parseFloat(waiveOffAmount) || 0;
  const dueBeforeWaive = computedExtraAmount + pendingMealsAmount + historicalPendingExtraAmount + pendingBaseAmount;
  const bookingPayable = Math.max(dueBeforeWaive - parsedWaiveOff, 0);
  const kioskDuePaise = meteredByKiosk ? Number(runtimeBill?.billing.amount_due_paise || 0) : 0;
  const kioskDue = kioskDuePaise / 100;
  const payableAmount = bookingPayable + kioskDue;
  // Confirm needs a known PC figure, and a desk method the session engine records.
  const kioskBlocker = !meteredByKiosk ? ""
    : runtimeBill?.billing.requires_reconciliation ? (runtimeBill.billing.pricing_error || "PC extra time could not be priced yet.")
    : !runtimeBill ? (runtimeError || "PC extra time is still loading.")
    : "";

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
            className="fixed inset-0 z-50 flex items-center justify-center max-sm:items-end bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!upiQr) setShowOverlay(false); }}
          >
            <motion.div
            ref={overlayRef}
            className="session-settlement-modal dashboard-module-panel relative w-full max-w-4xl mx-3 sm:mx-4 rounded-lg p-4 shadow-xl max-h-[92vh] overflow-y-auto max-sm:mx-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none max-sm:p-3"
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
                <h2 id="extra-payment-title" className="text-xl font-semibold text-foreground sm:text-2xl">
                  End session
                </h2>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Check the bill before freeing up the console.
                </p>
                {settlementPausedAt ? (
                  <p className="mt-1 text-xs text-primary">Timer paused at {settlementPausedAt}</p>
                ) : null}
              </div>
              <span className="w-fit rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300 sm:px-3 sm:text-xs">
                Live Session
              </span>
            </div>

            {summaryLoading || !paymentSummary || summaryBookingId !== resolveBookingId(selectedSlot) ? <div className="rounded-lg border border-border p-4 text-center" aria-live="polite" aria-busy={summaryLoading}>
              {summaryError ? <><p role="alert" className="text-sm text-red-300">{summaryError}</p><button type="button" className="mt-4 rounded-md border px-4 py-2 text-sm" onClick={()=>{setSummaryLoading(true);setSummaryVersion(v=>v+1);}}>Retry</button></> : <><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-muted-foreground"/><p className="text-sm">Checking the bill…</p></>}
              <button type="button" className="mt-4 ml-2 rounded-md border px-4 py-2 text-sm" onClick={()=>setShowOverlay(false)}>Cancel</button>
            </div> : <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div>
                <div className="relative mb-3 rounded-lg border border-border bg-muted/65 p-3 sm:mb-4 sm:p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-foreground sm:gap-3 sm:text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/70 px-2.5 py-1">
                      <Gamepad2 className="h-4 w-4 text-primary" />
                      {selectedSlot.consoleType} #{selectedSlot.consoleNumber}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/70 px-2.5 py-1">
                      <Receipt className="h-4 w-4 text-emerald-300" />
                      {isGroupBill ? `Bookings ${groupBookingIds.map((id) => `#${id}`).join(", ")}` : `Booking #${resolveBookingId(selectedSlot) || "N/A"}`}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                    Session for <span className="font-semibold text-foreground">{selectedSlot.username}</span>
                    {computedExtraSeconds > 0
                      ? " has played past the booked end time."
                      : ""}
                  </p>
                </div>

                <div className="mb-3 grid grid-cols-1 gap-2 sm:mb-4 sm:grid-cols-2 sm:gap-3">
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 sm:p-3">
                    <p className="text-xs font-medium text-red-200">Extra time</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-base font-semibold text-red-300 sm:text-lg">
                      <Timer className="h-4 w-4" />
                      {meteredByKiosk ? (runtimeBill ? rupees(kioskDuePaise) : runtimeError ? "Unavailable" : "Pricing…") : sessionClosed ? "None (session ended)" : quoteLoading && !overtimeQuote ? "Pricing…" : formatTime(computedExtraSeconds)}
                    </p>
                    {overtimeQuote && overtimeQuote.overtime_seconds > 0 && (
                      <p className="mt-1 text-xs text-red-200/80">
                        ₹{overtimeQuote.rate_per_hour.toFixed(2)}/hour, priced by the server
                        {overtimeQuote.already_recorded > 0 ? ` · ₹${overtimeQuote.already_recorded.toFixed(2)} already recorded` : ""}
                      </p>
                    )}
                    {quoteError && <p role="alert" className="mt-1 text-xs text-amber-300">{quoteError}</p>}
                    {meteredByKiosk && runtimeBill && (
                      <p className="mt-1 text-xs text-red-200/80">
                        Metered by the PC{runtimeBill.ended_at ? "" : ", still running until you confirm"}
                        {runtimeBill.billing.wallet_funded_paise > 0 ? ` · ${rupees(runtimeBill.billing.wallet_funded_paise)} paid from wallet` : ""}
                        {runtimeBill.billing.cafe_policy_credit_paise ? ` · ${rupees(runtimeBill.billing.cafe_policy_credit_paise)} from PC auto-extend` : ""}
                      </p>
                    )}
                    {meteredByKiosk && (runtimeBill?.billing.requires_reconciliation || (!runtimeBill && runtimeError)) && (
                      <p role="alert" className="mt-1 text-xs text-amber-300">
                        {runtimeBill?.billing.pricing_error || runtimeError || "PC extra time could not be priced yet."}{" "}
                        <button type="button" className="underline" onClick={() => setSummaryVersion((v) => v + 1)}>Retry</button>
                      </p>
                    )}
                  </div>
                  {!noOvertime && (overtimeQuote?.needs_end_time || playedUntil) && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 sm:p-3">
                      <label htmlFor="played-until" className="text-xs font-medium text-amber-100">
                        This session ran more than 3 hours over. When did play end?
                      </label>
                      <input
                        id="played-until"
                        type="datetime-local"
                        className="mt-1 w-full rounded-md border border-amber-500/40 bg-card px-2 py-1 text-sm text-foreground"
                        max={istInputValue(new Date())}
                        value={playedUntil}
                        onChange={(e) => { setPlayedUntil(e.target.value); setChargeFullOvertime(false); }}
                      />
                      {!playedUntil && (
                        <label className="mt-2 flex items-center gap-2 text-xs text-amber-100">
                          <input type="checkbox" checked={chargeFullOvertime} onChange={(e) => setChargeFullOvertime(e.target.checked)} />
                          They really played the whole time. Charge it all.
                        </label>
                      )}
                    </div>
                  )}
                </div>
                {(summaryLoading || summaryError) && (
                  <div className="mb-4 rounded-lg border border-border bg-muted/50 px-3 py-2">
                    {summaryLoading && (
                      <p className="text-xs text-muted-foreground">Loading full transaction history…</p>
                    )}
                    {summaryError && (
                      <p className="text-xs text-amber-300">{summaryError}</p>
                    )}
                  </div>
                )}

                <div className="mb-3 grid grid-cols-1 gap-2 sm:mb-4 sm:gap-3 xl:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted/55 p-3 sm:p-3">
                    <p className="mb-2 text-sm font-semibold text-foreground">Charges to collect</p>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Extra time</span>
                        <span className="font-semibold text-foreground">₹{(computedExtraAmount + kioskDue).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Unpaid meals</span>
                        <span className="font-semibold text-foreground">₹{pendingMealsAmount.toFixed(2)}</span>
                      </div>
                      {historicalPendingExtraAmount > 0 ? (
                        <div className="flex items-center justify-between">
                          <span>Earlier extra time</span>
                          <span className="font-semibold text-foreground">₹{historicalPendingExtraAmount.toFixed(2)}</span>
                        </div>
                      ) : null}
                      {pendingBaseAmount > 0 && <div className="flex items-center justify-between"><span>Unpaid booking</span><span className="font-semibold text-foreground">₹{pendingBaseAmount.toFixed(2)}</span></div>}
                      {parsedWaiveOff > 0 && (
                        <div className="flex items-center justify-between">
                          <span>Discount</span>
                          <span className="font-semibold text-amber-300">− ₹{parsedWaiveOff.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/55 p-3 sm:p-3">
                    <p className="mb-2 text-sm font-semibold text-foreground">Payment history</p>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Initial booking paid</span>
                        <span className="font-semibold text-foreground">₹{paidInitialAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Meals paid</span>
                        <span className="font-semibold text-foreground">₹{paidMealsAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Extra time paid</span>
                        <span className="font-semibold text-foreground">₹{paidExtraAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-1.5 text-sm">
                        <span className="font-semibold text-foreground">Total paid amount</span>
                        <span className="font-semibold text-emerald-300">₹{totalPaidAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/55 p-3 sm:p-3 lg:sticky lg:top-2 lg:h-fit">
                {!upiQr && (<>
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="waive-off-amount" className="mb-2 block text-sm font-medium text-foreground">
                    Discount (optional, ₹)
                  </label>
                  <motion.input
                    id="waive-off-amount"
                    type="text"
                    value={waiveOffAmount}
                    onChange={handleWaiveOffChange}
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    className={`w-full rounded-lg border bg-card p-3 text-sm text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary sm:p-3 ${
                      waiveOffError ? "border-red-500 focus:ring-ring/40" : "border-border"
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
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Payment method
                  </label>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment method">
                    {[
                      { key: "cash", label: "Cash", Icon: IndianRupee },
                      { key: "card", label: "Card", Icon: CreditCard },
                      { key: "upi_qr", label: "Hash UPI QR", Icon: QrCode },
                      { key: "upi", label: "Café UPI", Icon: Smartphone },
                      { key: "credit", label: "Gamer credit", Icon: Wallet },
                    ].filter(({ key }) => !(isGroupBill && key === "upi_qr")).map(({ key, label, Icon }) => (
                      <motion.button
                        key={key}
                        disabled={!!upiQr}
                        onClick={() => setPaymentMode(key)}
                        onKeyDown={(e) => handlePaymentModeKeyDown(e, key)}
                        className={`flex min-h-16 flex-col items-center justify-center rounded-lg border p-2 sm:min-h-0 sm:p-3 transition-all duration-200
                          ${
                            paymentMode === key
                              ? "border-primary bg-primary/20 ring-2 ring-primary/30"
                              : "border-border bg-card text-foreground hover:bg-muted"
                          }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-checked={paymentMode === key}
                        role="radio"
                      >
                        <Icon
                          className={`mb-1.5 h-5 w-5 ${paymentMode === key ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <span
                          className={`text-xs font-medium sm:text-sm ${paymentMode === key ? "text-primary" : "text-foreground"}`}
                        >
                          {label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
                </>)}

                {paymentMode === "credit" && (
                  <div className="mb-4 rounded-lg border border-border bg-card p-3 sm:mb-5 sm:p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Credit Account Status</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedUserProfile?.id
                            ? `Matched customer: ${selectedUserProfile.name}`
                            : "No credit-enabled customer matched yet."}
                        </p>
                      </div>
                      {!creditAccount?.is_active && (
                        <button
                          type="button"
                          onClick={() => setShowCreditAccountModal(true)}
                          className={buttonVariants({ variant: "soft-info", size: "sm" })}
                        >
                          Create Credit Account
                        </button>
                      )}
                    </div>
                    {creditAccountLoading ? (
                      <p className="mt-2 text-xs text-muted-foreground">Loading credit account…</p>
                    ) : creditAccount?.is_active ? (
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                          <p className="text-xs uppercase tracking-wide text-emerald-300">Limit</p>
                          <p className="text-sm font-semibold text-emerald-100">₹{Number(creditAccount.credit_limit || 0).toFixed(2)}</p>
                        </div>
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                          <p className="text-xs uppercase tracking-wide text-amber-300">Outstanding</p>
                          <p className="text-sm font-semibold text-amber-100">₹{Number(creditAccount.outstanding_amount || 0).toFixed(2)}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-primary/10 px-3 py-2">
                          <p className="text-xs uppercase tracking-wide text-primary">Available</p>
                          <p className="text-sm font-semibold text-foreground">₹{availableCreditAmount.toFixed(2)}</p>
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
                {upiQr ? (
                  <UpiQrPanel
                    vendorId={vendorId as number}
                    onUpdate={setUpiQr}
                    qr={upiQr}
                    now={qrNow}
                    busy={loading}
                    paidLabel="Ending session…"
                    paidActionLabel="Release console"
                    onCancel={handleCancelUpiQr}
                    onNewQr={() => { setUpiQr(null); void handleSettle(); }}
                    onPaidAction={() => { setLoading(true); void releaseAndClose(); }}
                  />
                ) : (
                <div className="settlement-actions flex flex-col gap-2">
                  <div className="mb-2 flex items-center justify-between border-t border-white/10 pt-3 text-sm"><span className="text-muted-foreground">Collect now</span><strong className="text-lg tabular-nums text-foreground">₹{payableAmount.toFixed(2)}</strong></div>
                  {meteredByKiosk && runtimeBill && !runtimeBill.ended_at && <p className="mb-2 text-xs text-muted-foreground">Confirming stops the PC and finalises its extra time.</p>}
                  {payableAmount > 0 && <p className="mb-2 text-xs text-muted-foreground">{paymentMode === "credit" ? "This amount will be added to the customer’s credit account." : paymentMode === "upi_qr" ? "The customer scans a QR. The bill is marked paid and the session ends automatically once the payment arrives." : "Confirm only after receiving payment."}</p>}
                  <motion.button
                    onClick={handleSettle}
                    className="dashboard-btn-primary w-full rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-50 sm:px-6 sm:py-2"
                    disabled={loading || summaryLoading || !!summaryError || !!waiveOffError || !vendorId || !!kioskBlocker || (paymentMode === "credit" && (!creditAccount?.is_active || availableCreditAmount < payableAmount))}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label="End session"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing…
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          {payableAmount === 0 ? "End session" : paymentMode === "credit" ? "Add to credit & end session" : paymentMode === "upi_qr" ? "Show payment QR" : "Payment received & end session"}
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
                    className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted disabled:opacity-50 sm:px-5 sm:py-2"
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
                )}
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
  // One screen for every checkout: booking, meals, discount and any PC-metered extra time.
  return <SettlementOverlay key={`${props.vendorId}:${props.selectedSlot?.bookingId || props.selectedSlot?.bookId}:${props.showOverlay}`} {...props}/>;
}
