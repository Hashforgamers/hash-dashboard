"use client"
// Booking actions + details, shared by the Overview rail and the Schedule map.
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Ban, Copy, Eye, LogIn, Mail, Phone, UserX, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BOOKING_URL } from "@/src/config/env"
import { creditAuthHeaders } from "@/lib/credit-auth"
import { useTimeFormat } from "@/app/hooks/useTimeFormat"
import { istClockOf } from "@/lib/station-map"
import { istDayOf, paymentLabel, upcomingActions, type WindowBooking } from "@/lib/schedule-map"
import { durationLabel, formatRupees } from "@/lib/desk-bill"
import UpcomingSlotManager from "../upcoming-slot-manager"
import { ActionButton, CancelBookingDialog, NoShowDialog, useCheckIn } from "./booking-actions"

export type BookingRef = { booking: WindowBooking; code: string; name: string }

/** Dialogs for the booking actions; mount `host` once per screen. */
export function useBookingActionHost(vendorId: number | null, onAfter: () => void) {
  const [cancelling, setCancelling] = useState<{ row: any; paid: boolean } | null>(null)
  const [noShow, setNoShow] = useState<any | null>(null)
  const [details, setDetails] = useState<(BookingRef & { live?: boolean }) | null>(null)
  const checkIn = useCheckIn(vendorId, onAfter)
  const host = <>
    {checkIn.dialog}
    {cancelling && <CancelBookingDialog booking={cancelling.row} paid={cancelling.paid} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); onAfter() }} />}
    {noShow && <NoShowDialog booking={noShow} onClose={() => setNoShow(null)} onDone={() => { setNoShow(null); onAfter() }} />}
    {details && <BookingDetailsDialog {...details} vendorId={vendorId} onClose={() => setDetails(null)} onAfter={onAfter}
      onCheckIn={() => { const d = details; setDetails(null); checkIn.open(d.booking.raw || {}, d.booking.stationId) }}
      onCancel={(row, paid) => { setDetails(null); setCancelling({ row, paid }) }}
      onNoShow={row => { setDetails(null); setNoShow(row) }} />}
  </>
  return {
    host,
    checkIn: (b: WindowBooking) => checkIn.open(b.raw || {}, b.stationId),
    cancel: (b: WindowBooking, paid: boolean) => setCancelling({ row: b.raw || {}, paid }),
    noShow: (b: WindowBooking) => setNoShow(b.raw || {}),
    details: (ref: BookingRef & { live?: boolean }) => setDetails(ref),
  }
}
export type BookingActionHost = ReturnType<typeof useBookingActionHost>

/** Check in / No-show / Cancel / Copy phone / Details for an upcoming booking. */
export function UpcomingActionGrid({ booking, code, name, now, host, compact, before }: {
  booking: WindowBooking; code: string; name: string; now: number; host: BookingActionHost; compact?: boolean; before?: () => void
}) {
  const { time: showClock } = useTimeFormat()
  const rules = upcomingActions(booking, now, ms => showClock(istClockOf(ms)))
  const go = (fn: () => void) => () => { before?.(); fn() }
  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-2")}>
      <ActionButton rule={rules.checkIn} tone="primary" className={compact ? "" : "col-span-2"} onClick={go(() => host.checkIn(booking))}>
        <LogIn className="h-3.5 w-3.5" />Check in{booking.stationId && code && !compact ? ` on ${code}` : ""}
      </ActionButton>
      <ActionButton rule={rules.noShow} tone="warning" onClick={go(() => host.noShow(booking))}><UserX className="h-3.5 w-3.5" />No-show</ActionButton>
      <ActionButton rule={rules.cancel} tone="danger" onClick={go(() => host.cancel(booking, rules.paid))}><Ban className="h-3.5 w-3.5" />Cancel</ActionButton>
      {!compact && <>
        <ActionButton rule={{ enabled: !!booking.phone, reason: "No phone on this booking" }} onClick={() => copyText(booking.phone, "Phone number copied")}><Copy className="h-3.5 w-3.5" />Copy phone</ActionButton>
        <ActionButton rule={{ enabled: true, reason: "" }} onClick={go(() => host.details({ booking, code, name }))}><Eye className="h-3.5 w-3.5" />Details</ActionButton>
      </>}
    </div>
  )
}

const sentence = (text: string) => { const t = text.replace(/_/g, " ").trim(); return t ? t[0].toUpperCase() + t.slice(1) : t }

export function copyText(text: string, done: string) {
  void navigator.clipboard?.writeText(text).then(() => toast.success(done), () => toast.error("Could not copy"))
}

/** Compact booking header used in popovers: name first, then phone. */
export function BookingSummary({ booking, code }: { booking: WindowBooking; code?: string }) {
  const { time: showClock } = useTimeFormat()
  const pay = booking.raw ? paymentLabel(booking.raw) : null
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{booking.name}</p>
        {booking.phone && <a href={`tel:${booking.phone}`} className="mt-0.5 inline-flex items-center gap-1 text-xs tabular-nums text-primary hover:underline"><Phone className="h-3 w-3" />{booking.phone}</a>}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs tabular-nums text-foreground">{showClock(istClockOf(booking.start))} – {showClock(istClockOf(booking.end))}</p>
        <p className="mt-0.5 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
          {code ? <span className="rounded bg-muted px-1.5 py-px font-semibold text-foreground">{code}</span> : <span className="rounded bg-amber-500/15 px-1.5 py-px text-amber-300">No station yet</span>}
          {pay && <PayChip label={pay} />}
        </p>
      </div>
    </div>
  )
}

export function PayChip({ label }: { label: string }) {
  if (label === "Payment unverified") return null
  const tone = label === "Paid" ? "bg-emerald-500/15 text-emerald-300" : label === "Payment due" || label.startsWith("Due") || label.startsWith("Pay later") ? "bg-amber-500/15 text-amber-300" : "bg-muted text-muted-foreground"
  return <span className={cn("rounded px-1.5 py-px", tone)}>{label}</span>
}

type Details = {
  source_label?: string; created_at?: string; created_by?: { name: string; role?: string } | null
  customer?: { name?: string; phone?: string; email?: string }
  payment?: { method_label?: string; label?: string; total?: number; due?: number; status?: string }
  rate_card?: string | null; meals?: { name: string; quantity: number; total: number }[]; status?: string; squad_players?: number
}

/**
 * Booking details card: who, how it was booked, when, where, money and status,
 * with the actions that apply. Rows without a value are left out. Details come
 * from GET /api/vendor/<id>/bookings/<id>/details (hfg-booking, additive); until
 * that is deployed the card shows what the dashboard already knows.
 */
export function BookingDetailsDialog({ booking, code, name, live, vendorId, onClose, onAfter, onCheckIn, onCancel, onNoShow }: BookingRef & {
  live?: boolean; vendorId: number | null; onClose: () => void; onAfter: () => void
  onCheckIn: () => void; onCancel: (row: any, paid: boolean) => void; onNoShow: (row: any) => void
}) {
  const { time: showClock } = useTimeFormat()
  const [data, setData] = useState<Details | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading")
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    if (!vendorId || !booking.bookingId) { setState("fallback"); return }
    const abort = new AbortController()
    fetch(`${BOOKING_URL}/api/vendor/${vendorId}/bookings/${booking.bookingId}/details`, { headers: creditAuthHeaders(), signal: abort.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(json => { if (!abort.signal.aborted) { if (json?.success) { setData(json.booking); setState("ready") } else setState("fallback") } })
      .catch(() => { if (!abort.signal.aborted) setState("fallback") })
    return () => abort.abort()
  }, [vendorId, booking.bookingId])

  const raw = booking.raw || {}
  const now = Date.now()
  const rules = upcomingActions(booking, now, ms => showClock(istClockOf(ms)))
  const minutes = Math.round((booking.end - booking.start) / 60000)
  const meals = data?.meals?.length ? data.meals.map(m => `${m.quantity}× ${m.name}`).join(", ") : raw.hasMeals ? "Meals added" : null
  const payStatus = data?.payment?.label || (raw ? paymentLabel(raw) : null)
  const created = data?.created_at ? new Date(data.created_at) : null
  const rows: [string, React.ReactNode][] = ([
    ["Phone", (data?.customer?.phone || booking.phone) ? <span className="inline-flex items-center gap-2"><a className="inline-flex items-center gap-1 text-primary hover:underline" href={`tel:${data?.customer?.phone || booking.phone}`}><Phone className="h-3 w-3" />{data?.customer?.phone || booking.phone}</a><button type="button" aria-label="Copy phone" className="text-muted-foreground hover:text-foreground" onClick={() => copyText(String(data?.customer?.phone || booking.phone), "Phone number copied")}><Copy className="h-3 w-3" /></button></span> : null],
    ["Email", (data?.customer?.email || raw.customer_email) ? <a className="inline-flex min-w-0 items-center gap-1 break-all text-primary hover:underline" href={`mailto:${data?.customer?.email || raw.customer_email}`}><Mail className="h-3 w-3 shrink-0" />{data?.customer?.email || raw.customer_email}</a> : null],
    ["Booked via", data?.source_label || null],
    ["Booked by", data?.created_by?.name ? `${data.created_by.name}${data.created_by.role ? ` (${data.created_by.role})` : ""}` : null],
    ["Booked at", created && !Number.isNaN(created.getTime()) ? created.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : null],
    ["Station", code ? `${code}${name ? ` · ${name}` : ""}` : "No station yet (assigned at check-in)"],
    ["When", `${new Date(`${istDayOf(booking.start)}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" })} · ${showClock(istClockOf(booking.start))} – ${showClock(istClockOf(booking.end))} · ${durationLabel(minutes)}`],
    ["Rate", data?.rate_card || null],
    ["Players", Number(data?.squad_players || raw.squadPlayerCount || 1) > 1 ? `Squad of ${data?.squad_players || raw.squadPlayerCount}` : null],
    ["Amount", data?.payment?.total ? formatRupees(data.payment.total) : raw.slot_price ? `${formatRupees(Number(raw.slot_price))} / slot` : null],
    ["Payment", [data?.payment?.method_label, payStatus].filter(Boolean).join(" · ") || null],
    ["Extras", meals],
    ["Status", live ? "In session" : sentence(String(data?.status || raw.bookingRecordStatus || raw.status || "Confirmed"))],
  ] as [string, React.ReactNode][]).filter(([, value]) => value !== null && value !== undefined && value !== "")

  return (
    <Dialog open onOpenChange={next => { if (!next) onClose() }}>
      <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{booking.name && booking.name !== "Guest" ? booking.name : data?.customer?.name || booking.name}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            {booking.bookingId && (
              <button type="button" onClick={() => copyText(String(booking.bookingId), `Booking #${booking.bookingId} copied`)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs tabular-nums text-foreground hover:bg-muted" title="Copy booking number">
                #{booking.bookingId}<Copy className="h-3 w-3" />
              </button>
            )}
            {payStatus && <span className="text-xs"><PayChip label={payStatus} /></span>}
            {state === "loading" && <span className="text-xs text-muted-foreground">Loading details…</span>}
          </DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-border rounded-lg border border-border text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 px-3 py-2">
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="min-w-0 text-right text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        {state === "fallback" && <p className="text-xs text-muted-foreground">How it was booked and payment method show here once the booking service is updated.</p>}
        {!live && (
          <div className="grid grid-cols-3 gap-2">
            <ActionButton rule={rules.checkIn} tone="primary" onClick={onCheckIn}><LogIn className="h-3.5 w-3.5" />Check in</ActionButton>
            <ActionButton rule={rules.noShow} tone="warning" onClick={() => onNoShow(raw)}><UserX className="h-3.5 w-3.5" />No-show</ActionButton>
            <ActionButton rule={rules.cancel} tone="danger" onClick={() => onCancel(raw, rules.paid)}><Ban className="h-3.5 w-3.5" />Cancel</ActionButton>
          </div>
        )}
        {!live && rules.cancel.enabled && (
          <div className="rounded-lg border border-border">
            <button type="button" aria-expanded={editing} onClick={() => setEditing(v => !v)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-foreground">
              Change time{editing ? <X className="h-4 w-4 text-muted-foreground" /> : <span className="text-xs text-muted-foreground">Move or add slots</span>}
            </button>
            {editing && <div className="border-t border-border p-3"><UpcomingSlotManager booking={raw} vendorId={String(vendorId || "")} onChanged={onAfter} onRemove={row => onCancel(row, paymentLabel(row) === "Paid")} /></div>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
