"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { creditAuthHeaders } from "@/lib/credit-auth";
import { BOOKING_URL } from "@/src/config/env";

// Desk UPI QR: the customer pays HFG's Razorpay account; the server marks the bill paid
// once Razorpay confirms the payment, and keeps the cafe payout as "settlement pending".

export interface UpiQrState {
  collection_id: string;
  booking_id: number;
  status: "creating" | "open" | "paid" | "expired" | "closed" | "failed" | "paid_unapplied";
  amount_paise: number;
  image_url: string | null;
  close_by: string | null;
  cafe_settlement_status: string;
  /** Masked number a payment link was sent to, if any. */
  link_sent_to?: string | null;
  /** Masked mobile number on the customer's profile, when the bill is open. */
  customer_phone?: string | null;
}

export const UPI_QR_POLL_MS = 3000;

export async function upiQrRequest(vendorId: number, path: string, method: "GET" | "POST", body?: unknown): Promise<UpiQrState> {
  const response = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Client-Source": "dashboard", ...creditAuthHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || data?.message || "Payment QR is unavailable. Collect another way.");
  return data as UpiQrState;
}

export function createUpiQr(vendorId: number, bookingId: number, body: { booking_types?: string[]; waive_off_amount?: number; booking_ids?: number[] }) {
  return upiQrRequest(vendorId, `bookings/${bookingId}/upi-qr`, "POST", body);
}

/** Polls an open QR until it is paid, expired or closed, and ticks a clock for the countdown. */
export function useUpiQrPolling(vendorId: number | null, qr: UpiQrState | null, onChange: (state: UpiQrState) => void) {
  const [now, setNow] = useState(() => Date.now());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (!qr || qr.status !== "open" || !vendorId) return;
    let stopped = false;
    const tick = async () => {
      try {
        const state = await upiQrRequest(vendorId, `upi-qr/${qr.collection_id}`, "GET");
        if (!stopped && state.status !== "open") onChangeRef.current(state);
      } catch {
        /* Transient network errors: keep polling. */
      }
    };
    const timer = window.setInterval(tick, UPI_QR_POLL_MS);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { stopped = true; window.clearInterval(timer); window.clearInterval(clock); };
  }, [vendorId, qr?.collection_id, qr?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  return now;
}

export function sendUpiPaymentLink(vendorId: number, qr: UpiQrState, phone?: string) {
  return upiQrRequest(vendorId, `upi-qr/${qr.collection_id}/send-link`, "POST", phone ? { phone } : {});
}

/** Sends the same bill as a Razorpay payment link by SMS; paying it marks the bill paid like the QR. */
function SendToPhone({ vendorId, qr, onUpdate }: { vendorId: number; qr: UpiQrState; onUpdate: (state: UpiQrState) => void }) {
  const [editing, setEditing] = useState(!qr.customer_phone);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const send = async (number?: string) => {
    setSending(true);
    setNote("");
    try {
      const state = await sendUpiPaymentLink(vendorId, qr, number);
      onUpdate(state);
      setEditing(false);
      setNote(`Payment link sent by SMS to ${state.link_sent_to}`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not send the link.");
    } finally {
      setSending(false);
    }
  };
  const valid = /^[6-9]\d{9}$/.test(phone.replace(/\D/g, "").slice(-10));
  return (
    <div className="w-full rounded-lg border border-border bg-card p-3 text-left">
      <p className="text-xs font-medium text-foreground">Or send a payment link to the customer’s phone</p>
      {editing ? (
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (valid) void send(phone); }}>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            aria-label="Customer mobile number"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground"
          />
          <button type="submit" disabled={!valid || sending} className="rounded-md border border-primary/50 bg-primary/15 px-3 text-sm text-primary disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
          </button>
        </form>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <button type="button" disabled={sending} onClick={() => void send()} className="flex-1 rounded-md border border-primary/50 bg-primary/15 px-3 py-1.5 text-sm text-primary disabled:opacity-50">
            {sending ? "Sending…" : qr.link_sent_to ? `Resend to ${qr.link_sent_to}` : `Send to ${qr.customer_phone}`}
          </button>
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-muted-foreground underline">Other number</button>
        </div>
      )}
      {note && <p role="status" className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

/** Cancels an open QR. Returns the final state when a payment landed first, otherwise null. */
export async function cancelUpiQr(vendorId: number, qr: UpiQrState | null): Promise<UpiQrState | null> {
  if (!qr || qr.status !== "open") return null;
  const state = await upiQrRequest(vendorId, `upi-qr/${qr.collection_id}/cancel`, "POST", {});
  return state.status === "paid" || state.status === "paid_unapplied" ? state : null;
}

/**
 * Razorpay returns a tall branded poster; show only its scannable QR card so the
 * code stays large without scrolling. Offsets are fractions of the poster layout.
 */
function RazorpayQrImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-full max-w-[240px] rounded-lg bg-white p-3 shadow-lg">
      <div className="w-full overflow-hidden" style={{ aspectRatio: "0.743" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block max-w-none" style={{ width: "152.4%", marginLeft: "-25.9%", marginTop: "-122.9%" }} />
      </div>
      <a href={src} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-muted-foreground underline">Open full QR</a>
    </div>
  );
}

export function UpiQrPanel({ vendorId, qr, now, busy, paidLabel, onCancel, onNewQr, onPaidAction, paidActionLabel, onUpdate }: {
  vendorId: number;
  onUpdate: (state: UpiQrState) => void;
  qr: UpiQrState;
  now: number;
  busy: boolean;
  paidLabel: string;
  onCancel: () => void;
  onNewQr: () => void;
  onPaidAction: () => void;
  paidActionLabel: string;
}) {
  const amount = `₹${(qr.amount_paise / 100).toFixed(2)}`;
  const secondsLeft = qr.close_by ? Math.max(0, Math.floor((Date.parse(qr.close_by) - now) / 1000)) : 0;
  const expired = qr.status === "expired" || qr.status === "closed" || (qr.status === "open" && secondsLeft === 0);
  const primary = "dashboard-btn-primary w-full rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-50";
  const secondary = "w-full rounded-md border border-border px-4 py-2 text-sm text-foreground disabled:opacity-50";
  return (
    <div className="flex flex-col items-center gap-3 text-center" aria-live="polite">
      {qr.status === "paid" ? (
        <>
          <CheckCircle className="h-12 w-12 text-emerald-400" aria-hidden="true" />
          <p className="text-base font-semibold text-emerald-300">{amount} paid by UPI</p>
          <p className="text-xs text-muted-foreground">Collected by Hash. The café payout is pending settlement.</p>
          {busy ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{paidLabel}</p>
          ) : (
            <button type="button" onClick={onPaidAction} className={primary}>{paidActionLabel}</button>
          )}
        </>
      ) : qr.status === "paid_unapplied" ? (
        <>
          <p role="alert" className="text-sm text-amber-300">The customer paid {amount} by QR, but this bill was already settled another way. HFG will review it for a refund.</p>
          <button type="button" onClick={onPaidAction} disabled={busy} className={primary}>{paidActionLabel}</button>
        </>
      ) : expired || qr.status === "failed" ? (
        <>
          <p className="text-sm text-amber-300">{qr.status === "failed" ? "The QR could not be created." : "This QR has expired."}</p>
          <button type="button" onClick={onNewQr} disabled={busy} className={primary}>Show a new QR</button>
          <button type="button" onClick={onCancel} disabled={busy} className={secondary}>Choose another payment method</button>
        </>
      ) : (
        <>
          <p className="text-3xl font-semibold tabular-nums text-foreground">{amount}</p>
          <p className="-mt-2 text-xs text-muted-foreground">Scan with any UPI app · paid to Hash for Gamers</p>
          {qr.image_url ? (
            <RazorpayQrImage src={qr.image_url} alt={`UPI QR for ${amount}`} />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
          )}
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Waiting for payment · {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} left
          </p>
          <SendToPhone vendorId={vendorId} qr={qr} onUpdate={onUpdate} />
          <button type="button" onClick={onCancel} disabled={busy} className={secondary}>Cancel payment request</button>
        </>
      )}
    </div>
  );
}

/**
 * Modal for a booking just created as "pay after session": shows the QR for all of its
 * pending rows and calls onDone once paid or when staff leave it to collect later.
 */
export function UpiQrBookingDialog({ vendorId, bookingIds, onDone }: {
  vendorId: number;
  bookingIds: number[];
  onDone: (paid: boolean) => void;
}) {
  const [qr, setQr] = useState<UpiQrState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const now = useUpiQrPolling(vendorId, qr, setQr);
  const started = useRef(false);

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      setQr(await createUpiQr(vendorId, bookingIds[0], { booking_ids: bookingIds }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the payment QR.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (qr?.status !== "paid") return;
    const timer = window.setTimeout(() => onDone(true), 1500);
    return () => window.clearTimeout(timer);
  }, [qr?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const leave = async () => {
    setBusy(true);
    try {
      const final = await cancelUpiQr(vendorId, qr);
      if (final) { setQr(final); setBusy(false); return; }
      onDone(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel the QR.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="UPI payment">
      <section className="w-full max-w-sm rounded-lg border border-border bg-card p-4">
        <h2 className="mb-1 text-lg font-semibold text-foreground">Collect booking payment</h2>
        <p className="mb-4 text-xs text-muted-foreground">The booking is saved. It is marked paid as soon as the UPI payment arrives.</p>
        {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}
        {qr ? (
          <UpiQrPanel
            vendorId={vendorId}
            onUpdate={setQr}
            qr={qr}
            now={now}
            busy={busy}
            paidLabel="Updating booking…"
            paidActionLabel="Done"
            onPaidAction={() => onDone(qr.status === "paid")}
            onCancel={leave}
            onNewQr={() => { setQr(null); void start(); }}
          />
        ) : busy ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Creating QR…</p>
        ) : (
          <button type="button" onClick={() => void start()} className="dashboard-btn-primary w-full rounded-md px-4 py-2.5 text-sm font-medium">Try again</button>
        )}
        {!qr || qr.status === "open" || qr.status === "expired" || qr.status === "closed" || qr.status === "failed" ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">If you leave, the booking stays as “Pay after session”.</p>
        ) : null}
        {!qr && !busy && (
          <button type="button" onClick={() => onDone(false)} className="mt-2 w-full rounded-md border border-border px-4 py-2 text-sm text-foreground">Collect later</button>
        )}
      </section>
    </div>
  );
}
