import { AnimatePresence, motion } from "framer-motion";
import { IndianRupee, CreditCard, Smartphone, X, CheckCircle, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { BOOKING_URL } from "@/src/config/env";

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
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
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
      if (!response.ok) {
        throw new Error("Failed to create extra booking");
      }
      return await response.json();
    } catch (error) {
      console.error("Error creating extra booking:", error);
      throw error;
    }
  };

  // ✅ FIXED: Handle settle function with IMMEDIATE UI updates (exactly like release button)
  const handleSettle = async () => {
    if (!selectedSlot || !vendorId) {
      setWaiveOffError("Invalid slot or vendor information");
      return;
    }

    setLoading(true);
    const extraTime = calculateExtraTime(selectedSlot.endTime, selectedSlot.date);
    const amount = calculateExtraAmount(extraTime, selectedSlot.slot_price || 100);
    const parsedWaiveOff = parseFloat(waiveOffAmount) || 0;

    const extraBookingPayload = {
      consoleNumber: selectedSlot.consoleNumber,
      consoleType: selectedSlot.consoleType,
      date: new Date().toISOString().split("T")[0],
      slotId: selectedSlot.slotId,
      userId: selectedSlot.userId,
      username: selectedSlot.username,
      amount: amount,
      gameId: selectedSlot.game_id,
      vendorId: vendorId,
      modeOfPayment: paymentMode,
      waiveOffAmount: parsedWaiveOff,
    };

    try {
      console.log('💰 Starting settle process...');
      await createExtraBooking(extraBookingPayload);
      console.log('💰 Extra booking created successfully');

      const success = await releaseSlot(
        selectedSlot.consoleType,
        selectedSlot.game_id,
        selectedSlot.consoleNumber,
        vendorId,
        setRefreshSlots
      );
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

  // Handle waive-off amount change with validation
  const handleWaiveOffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSlot) return;
    const value = e.target.value;
    // Allow only numbers and decimals (e.g., "123.45" or "")
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setWaiveOffAmount(value);
      const parsedValue = parseFloat(value) || 0;
      const maxWaiveOff = calculateExtraAmount(
        calculateExtraTime(selectedSlot.endTime, selectedSlot.date),
        selectedSlot.slot_price || 100
      );
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

  const computedExtraSeconds = selectedSlot
    ? calculateExtraTime(selectedSlot.endTime, selectedSlot.date)
    : 0;
  const computedExtraAmount = selectedSlot
    ? calculateExtraAmount(computedExtraSeconds, selectedSlot.slot_price || 100)
    : 0;
  const parsedWaiveOff = parseFloat(waiveOffAmount) || 0;
  const dueBeforeWaive = paymentSummary?.amount_due ?? computedExtraAmount;
  const payableAmount = Math.max(dueBeforeWaive - parsedWaiveOff, 0);

  // Handle keyboard navigation for payment mode buttons
  const handlePaymentModeKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setPaymentMode(key);
    }
  };

  return (
    <AnimatePresence>
      {showOverlay && selectedSlot && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowOverlay(false)}
        >
          <motion.div
            ref={overlayRef}
            className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 w-full max-w-lg sm:max-w-md mx-4"
            initial={{ scale: 0.95, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="extra-payment-title"
            tabIndex={-1}
          >
            <div className="text-center mb-6">
              <h2 id="extra-payment-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Extra Payment Required
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                The session for {selectedSlot.username} on {selectedSlot.consoleType} #{selectedSlot.consoleNumber} has exceeded the allotted time.
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Extra Time</p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">{formatTime(computedExtraSeconds)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Charged</p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">₹{(paymentSummary?.total_charged ?? computedExtraAmount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount Paid</p>
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">₹{(paymentSummary?.amount_paid ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount Due</p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">₹{payableAmount.toFixed(2)}</p>
                </div>
              </div>
              {summaryLoading && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Loading full payment summary...</p>
              )}
              {summaryError && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{summaryError}</p>
              )}
            </div>

            {paymentSummary?.line_items?.length ? (
              <div className="mb-6 border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-zinc-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">Transaction Breakdown</p>
                </div>
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-zinc-900/70 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Mode</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                      {paymentSummary.line_items.map((item) => {
                        const status = String(item.settlement_status || "pending").toLowerCase();
                        const isSettled = ["completed", "paid", "settled", "done"].includes(status);
                        return (
                          <tr key={item.transaction_id} className="align-top">
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                              {(item.payment_use_case || item.booking_type || "direct").replace(/_/g, " ")}
                            </td>
                            <td className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                              ₹{Number(item.line_total || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                              {item.mode_of_payment ? `Mode: ${item.mode_of_payment}` : "Mode: pending"}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full ${isSettled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                                {isSettled ? "Paid" : "Pending"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 min-w-[260px]">
                              Base ₹{Number(item.components?.base_amount || 0).toFixed(2)} | Meals ₹{Number(item.components?.meals_amount || 0).toFixed(2)} | Extra ₹{Number(item.components?.controller_amount || 0).toFixed(2)} | GST ₹{Number((item.components?.cgst_amount || 0) + (item.components?.sgst_amount || 0) + (item.components?.igst_amount || 0)).toFixed(2)} | Waive ₹{Number(item.components?.waive_off_amount || 0).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="mb-6">
              <label htmlFor="waive-off-amount" className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                Waive-Off Amount (₹)
              </label>
              <motion.input
                id="waive-off-amount"
                type="text"
                value={waiveOffAmount}
                onChange={handleWaiveOffChange}
                pattern="[0-9]*\.?[0-9]*"
                className={`w-full p-3 border rounded-lg bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${
                  waiveOffError ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="Enter waive-off amount (e.g., 50.00)"
                aria-invalid={waiveOffError ? "true" : "false"}
                aria-describedby={waiveOffError ? "waive-off-error" : undefined}
                whileFocus={{ scale: 1.02 }}
              />
              {waiveOffError && (
                <p id="waive-off-error" className="text-sm text-red-500 mt-1">
                  {waiveOffError}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                Select Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "cash", label: "Cash", Icon: IndianRupee },
                  { key: "card", label: "Card", Icon: CreditCard },
                  { key: "upi", label: "UPI", Icon: Smartphone },
                ].map(({ key, label, Icon }) => (
                  <motion.button
                    key={key}
                    onClick={() => setPaymentMode(key)}
                    onKeyDown={(e) => handlePaymentModeKeyDown(e, key)}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all duration-200
                      ${
                        paymentMode === key
                          ? "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-500 ring-2 ring-emerald-500/30"
                          : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
                      }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-pressed={paymentMode === key}
                    role="radio"
                  >
                    <Icon
                      className={`w-6 h-6 mb-2 ${paymentMode === key ? "text-emerald-600" : "text-gray-500 dark:text-gray-400"}`}
                    />
                    <span
                      className={`text-sm font-medium ${paymentMode === key ? "text-emerald-700 dark:text-emerald-300" : "text-gray-700 dark:text-gray-300"}`}
                    >
                      {label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <motion.button
                onClick={() => {
                  setShowOverlay(false);
                  setWaiveOffAmount("");
                  setWaiveOffError("");
                  setPaymentSummary(null);
                  setSummaryError("");
                }}
                className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all duration-200 disabled:opacity-50"
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Cancel extra payment"
              >
                <span className="flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Cancel
                </span>
              </motion.button>

              <motion.button
                onClick={handleSettle}
                className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 rounded-md shadow-sm transition-all duration-200 disabled:opacity-50"
                disabled={loading || !!waiveOffError || !vendorId}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Settle extra payment"
              >
                <span className="flex items-center gap-2">
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExtraBookingOverlay;
