import { buttonVariants } from "@/components/ui/button";
import { cafeCall, rupees } from "@/lib/cafe-api";
import { creditAuthHeaders } from "@/lib/credit-auth";
import { AnimatePresence, motion } from "framer-motion";
import { IndianRupee, CreditCard, Smartphone, X, CheckCircle, Loader2, Wallet, QrCode } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { BOOKING_URL } from "@/src/config/env";
import CreditAccountModal, { type MonthlyCreditAccountSummary } from "./credit-account-modal";
import { UpiQrPanel, cancelUpiQr, createUpiQr, useUpiQrPolling, type UpiQrState } from "./upi-qr-collect";
import { useTimeFormat } from "@/app/hooks/useTimeFormat";
import { TimeField } from "./time-field";
import { durationLabel, endChoices, formatRupees, istIso } from "@/lib/desk-bill";

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
  // Added when the server priced extra play from the cafe's own rate card.
  pricing_source?: "rate_card" | "slot_rate";
  rate_card?: { name?: string | null; profile?: string | null; revision?: number | null } | null;
  booked_minutes?: number;
  players?: number;
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

// Unused paid time when play ends before the booked end (hfg-booking services/early_release.py).
interface ReleaseQuote {
  booking_ids: number[];
  booked_start: string;
  booked_end: string;
  booked_minutes: number;
  played_minutes: number;
  unused_minutes: number;
  eligible: boolean;
  paid_amount: number;
  pending_amount: number;
  return_amount: number;
  pending_reduction: number;
  policy: string;
  min_unused_minutes: number;
  modes: string[];
  default_mode: string;
  refund_method: string;
  recorded: { mode: string; amount: number } | null;
}

const istDate = (naive?: string | null) => (naive ? new Date(`${naive.slice(0, 19)}+05:30`) : null);
const clockOfIso = (naive?: string | null) => (naive ? naive.slice(11, 16) : "");

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
  const { time: showClock } = useTimeFormat();
  const [paymentMode, setPaymentMode] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [waiveOffAmount, setWaiveOffAmount] = useState<string>("");
  const [waiveOffError, setWaiveOffError] = useState("");
  const [settlementError,setSettlementError] = useState("");
  const settlementKey = useRef("");
  const [frozenExtraSeconds, setFrozenExtraSeconds] = useState(0);
  const [settlementPausedAt, setSettlementPausedAt] = useState<Date | null>(null);
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
  // "When did play end?" as one tap: now, at the booked end, or a few minutes back.
  const [endKey, setEndKey] = useState("now");
  const [releaseQuote, setReleaseQuote] = useState<ReleaseQuote | null>(null);
  const [returnMode, setReturnMode] = useState("");
  const [discountKey, setDiscountKey] = useState<"none" | "10" | "20" | "custom">("none");

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
      setSettlementPausedAt(null);
      setOvertimeQuote(null);
      return;
    }
    setSettlementPausedAt(new Date());
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
    const bookingId = resolveBookingId(selectedSlot);
    if (!showOverlay || !selectedSlot || noOvertime || !bookingId || !vendorId) {
      setReleaseQuote(null);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams();
    const consoleId = selectedSlot.consoleId || selectedSlot.consoleNumber;
    if (consoleId) params.set("console_id", String(consoleId));
    if (playedUntil) params.set("ended_at", `${playedUntil.slice(0, 16)}:00`);
    fetch(`${BOOKING_URL}/api/vendor/${vendorId}/booking/${bookingId}/release-quote?${params}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...creditAuthHeaders() },
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        // An older booking service has no early release yet: the dialog works as before.
        if (!response.ok || !data?.quote) { setReleaseQuote(null); return; }
        const quote = data.quote as ReleaseQuote;
        setReleaseQuote(quote);
        setReturnMode((mode) => (quote.modes.includes(mode) ? mode : quote.default_mode));
      })
      .catch((error) => { if (error?.name !== "AbortError") setReleaseQuote(null); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOverlay, selectedSlot, noOvertime, playedUntil, summaryVersion, vendorId]);

  const recordEarlyRelease = async (bookingId: number) => {
    const response = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/booking/${bookingId}/early-release`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...creditAuthHeaders() },
      body: JSON.stringify({
        mode: returnAmount > 0 ? returnMode : undefined,
        refund_method: returnMode === "refund" ? releaseQuote?.refund_method : undefined,
        ended_at: playedUntil ? `${playedUntil.slice(0, 16)}:00` : undefined,
        console_id: selectedSlot?.consoleId || selectedSlot?.consoleNumber || undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.message || "Could not record the unused time. Try again.");
    return data;
  };

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
        const method = kioskOnBill ? "booking_bill" : (KIOSK_METHODS[paymentMode] || "cash");
        bill = await cafeCall<RuntimeBill>(`${prefix}/settle`, { method, amount_paise: due, revision: bill.revision, idempotency_key: `checkout-${runtimeId}-${bill.revision}-settle-${method}` });
        setRuntimeBill(bill);
      }
      if (kioskOnBill && (due > 0 || bill.billing.amount_due_paise === 0)) {
        // Put the moved PC time on the booking bill so the discount, credit or UPI QR covers it.
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
      setSettlementError("Played 3h+ over. Pick when play ended, or tap Charge all.");
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
    // Unpaid gaming time not played comes off what is collected (cafe policy decides).
    const parsedWaiveOff = Math.min((parseFloat(waiveOffAmount) || 0) + pendingReduction, dueBeforeWaive + kioskDue);

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
      if (releaseQuote && !releaseQuote.recorded && (returnAmount > 0 || pendingReduction > 0)) {
        await recordEarlyRelease(bookingId);
      }
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
      if (amount > 0 || kioskOnBill) {
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
          // PC time moved to the bill is also on the booking being checked out.
          const overtime = id === primaryId ? amount + (kioskOnBill ? kioskDue : 0) : 0;
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
      if (paymentMode === "upi_qr" && bookingPayable > 0) {
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
      // Extra PC time can be discounted too, so the cap is the whole bill.
      const maxWaiveOff = Math.max(dueBeforeWaive + kioskDue - pendingReduction, 0);
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
  const releaseEligible = Boolean(releaseQuote?.eligible && !releaseQuote?.recorded);
  const returnAmount = releaseEligible ? Number(releaseQuote?.return_amount || 0) : 0;
  const pendingReduction = releaseEligible ? Number(releaseQuote?.pending_reduction || 0) : 0;
  const parsedWaiveOff = (parseFloat(waiveOffAmount) || 0) + pendingReduction;
  const dueBeforeWaive = computedExtraAmount + pendingMealsAmount + historicalPendingExtraAmount + pendingBaseAmount;
  const kioskDuePaise = meteredByKiosk ? Number(runtimeBill?.billing.amount_due_paise || 0) : 0;
  const kioskDue = kioskDuePaise / 100;
  // PC time joins the booking bill when a discount is given (so it can cover the
  // PC time too) or when credit / UPI QR collects it. Otherwise it is paid directly.
  const kioskOnBill = kioskDuePaise > 0 && (parsedWaiveOff > 0 || KIOSK_METHODS[paymentMode] === "booking_bill");
  const bookingPayable = Math.max(dueBeforeWaive + (kioskOnBill ? kioskDue : 0) - parsedWaiveOff, 0);
  const payableAmount = bookingPayable + (kioskOnBill ? 0 : kioskDue);
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

  const pausedAt = settlementPausedAt || new Date();
  const bookedEnd = istDate(releaseQuote?.booked_end || overtimeQuote?.scheduled_end);
  const quickEnds = endChoices(pausedAt, bookedEnd);
  const pickEnd = (key: string) => {
    setEndKey(key);
    setChargeFullOvertime(false);
    if (key === "other") return;
    const choice = quickEnds.find((item) => item.key === key);
    setPlayedUntil(key === "now" || !choice ? "" : istIso(choice.at).slice(0, 16));
  };
  const pickDiscount = (key: "none" | "10" | "20" | "custom") => {
    setDiscountKey(key);
    setWaiveOffError("");
    if (key === "none") setWaiveOffAmount("");
    else if (key !== "custom") setWaiveOffAmount(String(Math.min(Number(key), Math.max(dueBeforeWaive + kioskDue - pendingReduction, 0))));
  };
  const overtimeMinutes = Math.round(computedExtraSeconds / 60);
  const playedMinutes = releaseQuote ? releaseQuote.played_minutes + (releaseQuote.unused_minutes === 0 ? overtimeMinutes : 0) : null;
  const bookedPaid = releaseQuote ? releaseQuote.paid_amount : paidInitialAmount;
  const rowCls = "flex items-baseline justify-between gap-3 py-1.5";
  const chip = (active: boolean) => `rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${active ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-foreground hover:bg-muted"}`;
  const methods = [
    { key: "cash", label: "Cash", Icon: IndianRupee },
    { key: "upi", label: "Café UPI", Icon: Smartphone },
    { key: "card", label: "Card", Icon: CreditCard },
    { key: "upi_qr", label: "UPI QR", Icon: QrCode },
    { key: "credit", label: "Credit a/c", Icon: Wallet },
  ].filter(({ key }) => !(isGroupBill && key === "upi_qr"));
  const returnLabel = returnMode === "refund" ? `Refund ${formatRupees(returnAmount)}${releaseQuote?.refund_method ? ` by ${releaseQuote.refund_method === "upi" ? "UPI" : releaseQuote.refund_method}` : ""}` : `Return ${formatRupees(returnAmount)} as credit`;
  const primaryLabel = payableAmount > 0
    ? (paymentMode === "credit" ? `Add ${formatRupees(payableAmount)} to credit & end` : paymentMode === "upi_qr" ? `Show QR for ${formatRupees(payableAmount)}` : `Collect ${formatRupees(payableAmount)} & end`)
    : returnAmount > 0 ? (returnMode === "refund" ? `End & refund ${formatRupees(returnAmount)}` : `End & credit ${formatRupees(returnAmount)}`)
    : "End session";

  return (
    <AnimatePresence>
      {showOverlay && selectedSlot && (
        <>
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center max-sm:items-end bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!upiQr && !loading) setShowOverlay(false); }}
          >
            <motion.div
              ref={overlayRef}
              className="session-settlement-modal dashboard-module-panel relative mx-3 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-lg shadow-xl max-sm:mx-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none"
              initial={{ scale: 0.97, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.97, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-labelledby="extra-payment-title"
              aria-modal="true"
              tabIndex={-1}
            >
              <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <h2 id="extra-payment-title" className="text-lg font-semibold text-foreground">End session</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedSlot.username} · {selectedSlot.consoleType}{selectedSlot.consoleNumber ? ` #${selectedSlot.consoleNumber}` : ""} · {isGroupBill ? groupBookingIds.map((id) => `#${id}`).join(", ") : `#${resolveBookingId(selectedSlot) || "—"}`}
                  </p>
                </div>
                <button type="button" aria-label="Close" disabled={loading} onClick={() => setShowOverlay(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50"><X className="h-4 w-4" /></button>
              </div>

              {summaryLoading || !paymentSummary || summaryBookingId !== resolveBookingId(selectedSlot) ? (
                <div className="p-6 text-center" aria-live="polite" aria-busy={summaryLoading}>
                  {summaryError
                    ? <><p role="alert" className="text-sm text-red-300">{summaryError}</p><button type="button" className="mt-3 rounded-md border px-4 py-2 text-sm" onClick={() => { setSummaryLoading(true); setSummaryVersion((v) => v + 1); }}>Retry</button></>
                    : <><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-muted-foreground" /><p className="text-sm">Checking the bill…</p></>}
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
                  {!noOvertime && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Play ended</p>
                      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="When did play end">
                        {quickEnds.map((choice) => (
                          <button key={choice.key} type="button" role="radio" aria-checked={endKey === choice.key} disabled={loading || !!upiQr} onClick={() => pickEnd(choice.key)} className={chip(endKey === choice.key)}>{choice.label}</button>
                        ))}
                        <button type="button" role="radio" aria-checked={endKey === "other"} disabled={loading || !!upiQr} onClick={() => pickEnd("other")} className={chip(endKey === "other")}>Other</button>
                      </div>
                      {endKey === "other" && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <input type="date" aria-label="Play ended on" className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
                            max={istInputValue(new Date()).slice(0, 10)} value={playedUntil.slice(0, 10)}
                            onChange={(e) => setPlayedUntil(e.target.value ? `${e.target.value}T${playedUntil.slice(11, 16) || "00:00"}` : "")} />
                          <TimeField aria-label="Play ended at" minuteStep={1} value={playedUntil.slice(11, 16)}
                            onValueChange={(time) => setPlayedUntil(`${playedUntil.slice(0, 10) || istInputValue(new Date()).slice(0, 10)}T${time}`)} />
                        </div>
                      )}
                      {overtimeQuote?.needs_end_time && !playedUntil && (
                        <p role="alert" className="mt-2 text-xs text-amber-300">
                          Played 3h+ over. Pick when play ended, or{" "}
                          <button type="button" className={`underline ${chargeFullOvertime ? "font-semibold" : ""}`} onClick={() => setChargeFullOvertime((v) => !v)}>{chargeFullOvertime ? "charging all ✓" : "charge all"}</button>.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="divide-y divide-border rounded-lg border border-border px-3" aria-label="Bill">
                    <div className={rowCls}>
                      <span className="text-muted-foreground">Booked{releaseQuote ? ` ${clockOfIso(releaseQuote.booked_start)}–${clockOfIso(releaseQuote.booked_end)} · ${durationLabel(releaseQuote.booked_minutes)}` : ""}</span>
                      <span className="tabular-nums text-foreground">paid {formatRupees(bookedPaid)}</span>
                    </div>
                    {playedMinutes !== null && (
                      <div className={rowCls}><span className="text-muted-foreground">Played</span><span className="tabular-nums text-foreground">{durationLabel(playedMinutes)}</span></div>
                    )}
                    {meteredByKiosk ? (
                      <div className={rowCls}>
                        <span className="text-muted-foreground">PC extra time{runtimeBill && !runtimeBill.ended_at ? " (still running)" : ""}</span>
                        <span className="tabular-nums text-foreground">{runtimeBill ? rupees(kioskDuePaise) : runtimeError ? "Unavailable" : "…"}</span>
                      </div>
                    ) : !sessionClosed && (computedExtraAmount > 0 || overtimeMinutes > 0) ? (
                      <div className={rowCls}>
                        <span className="text-muted-foreground">
                          Extra +{durationLabel(overtimeMinutes)}
                          {overtimeQuote ? <span className="block text-xs">₹{overtimeQuote.rate_per_hour.toFixed(0)}/h{overtimeQuote.pricing_source === "rate_card" ? ` · ${overtimeQuote.rate_card?.name || "rate card"}` : ""}{overtimeQuote.already_recorded > 0 ? ` · ₹${overtimeQuote.already_recorded.toFixed(0)} already billed` : ""}</span> : null}
                        </span>
                        <span className="tabular-nums text-foreground">{quoteLoading && !overtimeQuote ? "…" : formatRupees(computedExtraAmount)}</span>
                      </div>
                    ) : null}
                    {releaseQuote && releaseQuote.unused_minutes > 0 && !releaseQuote.recorded && (
                      <div className={rowCls}>
                        <span className="text-muted-foreground">
                          Unused −{durationLabel(releaseQuote.unused_minutes)}
                          {!releaseQuote.eligible && <span className="block text-xs">Under {releaseQuote.min_unused_minutes} min, nothing back</span>}
                          {releaseQuote.eligible && releaseQuote.policy === "none" && <span className="block text-xs">Cafe setting: no return</span>}
                        </span>
                        <span className="tabular-nums text-emerald-400">
                          {returnAmount > 0 ? formatRupees(-returnAmount) : pendingReduction > 0 ? `${formatRupees(-pendingReduction)} off` : "₹0"}
                        </span>
                      </div>
                    )}
                    {releaseQuote?.recorded && (
                      <div className={rowCls}><span className="text-muted-foreground">Unused time</span><span className="text-xs text-muted-foreground">{releaseQuote.recorded.mode === "none" ? "No return recorded" : `${formatRupees(releaseQuote.recorded.amount)} ${releaseQuote.recorded.mode} recorded`}</span></div>
                    )}
                    {historicalPendingExtraAmount > 0 && <div className={rowCls}><span className="text-muted-foreground">Earlier extra time</span><span className="tabular-nums">{formatRupees(historicalPendingExtraAmount)}</span></div>}
                    {pendingMealsAmount > 0 && <div className={rowCls}><span className="text-muted-foreground">Meals unpaid</span><span className="tabular-nums">{formatRupees(pendingMealsAmount)}</span></div>}
                    {pendingBaseAmount > 0 && <div className={rowCls}><span className="text-muted-foreground">Booking unpaid</span><span className="tabular-nums">{formatRupees(pendingBaseAmount)}</span></div>}
                    {!upiQr && dueBeforeWaive + kioskDue - pendingReduction > 0 && (
                      <div className={rowCls}>
                        <span className="text-muted-foreground">Discount</span>
                        <span className="flex flex-wrap items-center justify-end gap-1">
                          {(["none", "10", "20", "custom"] as const).map((key) => (
                            <button key={key} type="button" disabled={loading} onClick={() => pickDiscount(key)} className={`rounded px-2 py-0.5 text-xs ${discountKey === key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                              {key === "none" ? "None" : key === "custom" ? "Custom" : `₹${key}`}
                            </button>
                          ))}
                          {discountKey === "custom" && (
                            <input aria-label="Discount amount" inputMode="decimal" value={waiveOffAmount} onChange={handleWaiveOffChange} placeholder="₹"
                              className="w-16 rounded border border-border bg-card px-1.5 py-0.5 text-right text-xs" />
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  {waiveOffError && <p className="mt-1 text-xs text-red-400">{waiveOffError}</p>}
                  {quoteError && <p role="alert" className="mt-1 text-xs text-amber-300">{quoteError}</p>}
                  {meteredByKiosk && (runtimeBill?.billing.requires_reconciliation || (!runtimeBill && runtimeError)) && (
                    <p role="alert" className="mt-1 text-xs text-amber-300">{runtimeBill?.billing.pricing_error || runtimeError || "PC extra time could not be priced yet."} <button type="button" className="underline" onClick={() => setSummaryVersion((v) => v + 1)}>Retry</button></p>
                  )}

                  <div className="mt-3 space-y-1.5">
                    {(payableAmount > 0 || returnAmount === 0) && (
                      <div className="flex items-baseline justify-between"><span className="text-muted-foreground">Collect</span><strong className="text-2xl tabular-nums text-foreground">{formatRupees(payableAmount)}</strong></div>
                    )}
                    {returnAmount > 0 && (
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-muted-foreground">{returnLabel}</span>
                        <span className="flex items-center gap-2">
                          {releaseQuote && releaseQuote.modes.length > 1 && (
                            <button type="button" disabled={loading} className="text-xs text-primary underline" onClick={() => setReturnMode(returnMode === "refund" ? "credit" : "refund")}>
                              {returnMode === "refund" ? "Give credit instead" : "Refund instead"}
                            </button>
                          )}
                          <strong className="text-2xl tabular-nums text-emerald-400">{formatRupees(returnAmount)}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {!upiQr && payableAmount > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Payment method">
                      {methods.map(({ key, label, Icon }) => (
                        <button key={key} type="button" role="radio" aria-checked={paymentMode === key} disabled={loading}
                          onClick={() => setPaymentMode(key)} onKeyDown={(e) => handlePaymentModeKeyDown(e, key)}
                          className={`${chip(paymentMode === key)} inline-flex items-center gap-1.5`}>
                          <Icon className="h-3.5 w-3.5" />{label}
                        </button>
                      ))}
                    </div>
                  )}

                  {paymentMode === "credit" && payableAmount > 0 && (
                    <div className="mt-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
                      {creditAccountLoading ? <span className="text-muted-foreground">Loading credit account…</span>
                        : creditAccount?.is_active ? <span className="text-muted-foreground">Credit available {formatRupees(availableCreditAmount)}{availableCreditAmount < bookingPayable ? " · not enough" : ""}</span>
                        : <span className="flex items-center justify-between gap-2 text-red-300">{creditAccountError || "No credit account for this gamer."}<button type="button" onClick={() => setShowCreditAccountModal(true)} className={buttonVariants({ variant: "soft-info", size: "sm" })}>Create</button></span>}
                    </div>
                  )}

                  {settlementError && <div role="alert" className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-sm text-red-300">{settlementError}</div>}
                  {upiQr && (
                    <div className="mt-3">
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
                    </div>
                  )}
                </div>
              )}

              {!upiQr && paymentSummary && !summaryLoading && (
                <div className="flex gap-2 border-t border-border px-4 py-3">
                  <button type="button" onClick={() => setShowOverlay(false)} disabled={loading} className="rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50">Cancel</button>
                  <button
                    type="button"
                    onClick={handleSettle}
                    aria-label="End session"
                    className="dashboard-btn-primary flex-1 rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                    disabled={loading || summaryLoading || !!summaryError || !!waiveOffError || !vendorId || !!kioskBlocker || (paymentMode === "credit" && payableAmount > 0 && (!creditAccount?.is_active || availableCreditAmount < bookingPayable))}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Ending…</> : <><CheckCircle className="h-4 w-4" />{primaryLabel}</>}
                    </span>
                  </button>
                </div>
              )}
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
              setSelectedUserProfile({ id: user.userId || undefined, name: user.name, email: user.email || "", phone: user.phone || "" });
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
