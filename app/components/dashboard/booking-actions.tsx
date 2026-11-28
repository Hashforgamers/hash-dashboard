"use client"
// Booking actions for the Dashboard schedule map. Same endpoints, payloads and
// confirmation dialogs as the Upcoming bookings list (upcoming-booking.tsx):
// check-in = POST /api/updateDeviceStatus/... (dashboard service), cancel =
// POST /api/bookings/cancel, no-show = POST /api/bookings/no-show (booking service).
import { useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { creditAuthHeaders } from "@/lib/credit-auth"
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env"
import { useApiClient } from "@/app/hooks/useApiClient"
import { SessionConsoleDialog, type SessionConsole } from "../session-console-dialog"

const refreshDashboard = () => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("refresh-dashboard")) }

/** Check-in: pick the station (the booking's own one preselected) and start the session. */
export function useCheckIn(vendorId: number | null, onStarted: () => void) {
  const api = useApiClient()
  const [state, setState] = useState<{ booking: any; gameId: string; bookingId: string; system: string; need: number; squad: boolean } | null>(null)
  const [consoles, setConsoles] = useState<SessionConsole[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const request = useRef(0)
  const inFlight = useRef(false)

  const load = async (gameId: string, held: number[], pool: number[]) => {
    if (!vendorId) return
    const id = ++request.current
    setLoading(true); setError(""); setSelected([]); setConsoles([])
    try {
      const rows = await api.get<any[]>(`${DASHBOARD_URL}/api/getAllDevice/consoleTypeId/${gameId}/vendor/${vendorId}`, { timeoutMs: 10_000, retries: 2 })
      if (id !== request.current) return
      if (!Array.isArray(rows)) throw new Error("Unexpected console response. Please retry.")
      const available = rows.filter(row => [true, 1, "true", "1"].includes(row?.is_available))
        .map(row => ({ ...row, consoleId: Number(row.consoleId) }))
        .filter(row => Number.isSafeInteger(row.consoleId) && row.consoleId > 0)
      const heldRows = held.length ? available.filter(row => held.includes(row.consoleId)) : []
      const compatible = heldRows.length ? heldRows : pool.length ? available.filter(row => pool.includes(row.consoleId)) : available
      setConsoles(Array.from(new Map(compatible.map(row => [row.consoleId, row])).values()))
      if (heldRows.length) setSelected(heldRows.map(row => row.consoleId))
    } catch (e) {
      if (id === request.current) setError(e instanceof Error ? e.message : "Unable to load consoles. Please retry.")
    } finally {
      if (id === request.current) setLoading(false)
    }
  }

  const open = (booking: any, stationId: number | null) => {
    const gameId = String(booking?.game_id ?? booking?.gameId ?? "").trim()
    const bookingId = String(booking?.bookingId ?? booking?.bookId ?? "").trim()
    if (!gameId || !bookingId || !vendorId) { toast.error("Unable to start session: booking details are incomplete."); return }
    const system = String(booking?.game || booking?.consoleType || "").trim()
    const details = booking?.squadDetails || {}
    const group = String(details.console_group || details.consoleGroup || (system.toLowerCase().includes("pc") ? "pc" : "")).toLowerCase()
    const squad = group === "pc" && (booking?.squadEnabled || Number(booking?.squadPlayerCount || details.player_count || 1) > 1)
    const need = squad ? Math.max(1, Number(booking?.squadPlayerCount || details.player_count || 1)) : 1
    const heldIds = ((details.desk_console_ids?.length ? details.desk_console_ids : details.assigned_console_ids) || []).map(Number).filter((n: number) => n > 0)
    const held = heldIds.length ? heldIds : stationId ? [stationId] : []
    const pool = (details.desk_console_pool || []).map(Number).filter((n: number) => n > 0)
    setState({ booking, gameId, bookingId, system, need, squad })
    void load(gameId, held, pool)
  }

  const submit = async (picked?: number[]) => {
    if (!state) return
    const chosen = (picked || selected).filter(id => consoles.some(c => c.consoleId === id))
    if (inFlight.current || loading || chosen.length !== state.need) return
    inFlight.current = true; setSubmitting(true); setError("")
    const [primary, ...extra] = chosen
    const url = `${DASHBOARD_URL}/api/updateDeviceStatus/consoleTypeId/${state.gameId}/console/${primary}/bookingId/${state.bookingId}/vendor/${vendorId}`
    try {
      await api.post(url, state.squad ? JSON.stringify({ additional_console_ids: extra }) : undefined, { headers: creditAuthHeaders(), timeoutMs: 12_000, retries: 0 })
      setState(null)
      toast.success("Session started")
      onStarted()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start the session. Please retry.")
    } finally {
      refreshDashboard()
      inFlight.current = false; setSubmitting(false)
    }
  }

  const dialog = (
    <SessionConsoleDialog
      open={!!state}
      onClose={() => { setState(null); request.current += 1 }}
      consoles={consoles}
      selectedIds={selected}
      requiredCount={state?.need || 1}
      system={state?.system || ""}
      loading={loading}
      submitting={submitting}
      error={error}
      onSelect={id => {
        if (submitting || loading || !state) return
        setError("")
        if (!state.squad) { setSelected([id]); void submit([id]); return }
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= state.need ? prev : [...prev, id])
      }}
      onRetry={() => { if (state) void load(state.gameId, [], []) }}
      onStart={() => void submit()}
    />
  )
  return { open, dialog }
}

/** Cancel booking: the Upcoming list's dialog (repayment choice for paid bookings, reason). */
export function CancelBookingDialog({ booking, paid, onClose, onDone }: { booking: any; paid: boolean; onClose: () => void; onDone: () => void }) {
  const api = useApiClient()
  const [repayment, setRepayment] = useState<"refund" | "credit" | "reschedule">("refund")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const confirm = async () => {
    const ids = Array.isArray(booking?.merged_booking_ids) && booking.merged_booking_ids.length ? booking.merged_booking_ids : [booking.bookingId]
    setLoading(true)
    try {
      const payload = { booking_ids: ids, repayment_type: paid ? repayment : "none", reason: reason || "Cancelled from dashboard" }
      const result = await api.post<any, string>(`${BOOKING_URL}/api/bookings/cancel`, JSON.stringify(payload), { headers: creditAuthHeaders(), timeoutMs: 12_000, retries: 0 })
      if (!result?.success) throw new Error(result?.message || "Failed to cancel booking")
      toast.success(paid ? `Booking cancelled. Repayment: ${repayment.toUpperCase()}` : "Booking cancelled successfully")
      refreshDashboard()
      onDone()
    } catch (e: any) {
      toast.error(e?.message || "Failed to cancel booking")
    } finally {
      setLoading(false)
    }
  }
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Cancel booking">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Cancel Booking</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full border border-border p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-xs text-foreground">{booking?.username || "Guest"} · {booking?.time || ""} · #{booking?.bookingId}</p>
        <p className="mt-2 text-xs text-muted-foreground">{paid ? "This booking is paid. Choose how you will repay the user." : "This booking is unpaid. The slot will be released immediately."}</p>
        {paid && (
          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cancel-repayment">Repayment Method</label>
            <select id="cancel-repayment" value={repayment} onChange={e => setRepayment(e.target.value as any)} className="w-full rounded-md border border-border bg-muted/70 px-3 py-2 text-xs text-foreground">
              <option value="refund">Refund to original payment</option>
              <option value="credit">Credit to wallet/pass</option>
              <option value="reschedule">Reschedule credit</option>
            </select>
          </div>
        )}
        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="cancel-reason">Reason (optional)</label>
          <textarea id="cancel-reason" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Add a short reason..." className="w-full rounded-md border border-border bg-muted/70 px-3 py-2 text-xs text-foreground" />
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted">Keep Booking</button>
          <button type="button" onClick={confirm} disabled={loading} className={cn(buttonVariants({ variant: "soft-danger", size: "sm" }), "disabled:cursor-not-allowed")}>{loading ? "Cancelling…" : "Confirm Cancel"}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Mark no-show: the Upcoming list's dialog. */
export function NoShowDialog({ booking, onClose, onDone }: { booking: any; onClose: () => void; onDone: () => void }) {
  const api = useApiClient()
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const confirm = async () => {
    const ids = Array.isArray(booking?.merged_booking_ids) && booking.merged_booking_ids.length ? booking.merged_booking_ids : [booking.bookingId]
    setLoading(true)
    try {
      const result = await api.post<any, string>(`${BOOKING_URL}/api/bookings/no-show`, JSON.stringify({ booking_ids: ids, reason: reason || "Marked as no-show from dashboard" }), {
        headers: { "Content-Type": "application/json" }, timeoutMs: 12_000, retries: 0,
      })
      if (!result?.success) throw new Error(result?.message || "Failed to mark no-show")
      const fee = Number(result?.no_show_fee_total || 0)
      toast.success(fee > 0 ? `Marked no-show. Fee retained: ₹${fee.toFixed(0)}` : "Marked no-show successfully")
      refreshDashboard()
      onDone()
    } catch (e: any) {
      toast.error(e?.message || "Failed to mark no-show")
    } finally {
      setLoading(false)
    }
  }
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Mark no-show">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Mark Booking As No Show</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full border border-border p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">This marks the booking as no-show, releases the slot, and updates settlement in real time.</p>
        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="noshow-reason">Reason (optional)</label>
          <textarea id="noshow-reason" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="User did not arrive..." className="w-full rounded-md border border-border bg-muted/70 px-3 py-2 text-xs text-foreground" />
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted">Back</button>
          <button type="button" onClick={confirm} disabled={loading} className={cn(buttonVariants({ variant: "soft-warning", size: "sm" }), "disabled:cursor-not-allowed")}>{loading ? "Updating…" : "Confirm No Show"}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** A popover action button that stays visible but disabled with the reason as tooltip. */
export function ActionButton({ rule, onClick, children, tone = "default", className }: {
  rule: { enabled: boolean; reason: string }; onClick: () => void; children: React.ReactNode; tone?: "primary" | "default" | "danger" | "warning"; className?: string
}) {
  return (
    <span title={rule.enabled ? undefined : rule.reason} className={cn("inline-flex", className)}>
      <button type="button" disabled={!rule.enabled} onClick={onClick} aria-describedby={undefined}
        className={cn("inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
          tone === "primary" ? "ui-action-primary border-transparent" : tone === "danger" ? "border-red-500/30 text-red-300 hover:bg-red-500/10" : tone === "warning" ? "border-amber-500/30 text-amber-300 hover:bg-amber-500/10" : "border-border text-foreground hover:bg-muted")}>
        {children}
      </button>
    </span>
  )
}
