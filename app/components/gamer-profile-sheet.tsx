"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { CalendarClock, Gamepad2, IndianRupee, Loader2, Mail, Phone, ReceiptText, Timer } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DASHBOARD_URL } from "@/src/config/env"

export interface GamerHistoryEntry {
  transaction_id: number
  booking_id: number | null
  date: string | null
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  console_type: string | null
  status: string | null
  amount: number
  meals_amount: number
  discount: number
  payment_mode: string | null
  booking_type: string | null
  source: string | null
  settlement_status: string | null
  staff_name: string | null
}

export interface GamerProfile {
  id: number
  name: string
  game_username: string | null
  avatar_path: string | null
  phone: string | null
  email: string | null
  membershipTier: string
  summary: {
    sessions: number
    visits: number
    total_amount: number
    total_discount: number
    net_revenue: number
    average_per_session: number
    hours_played: number
    first_visit: string | null
    last_visit: string | null
    favourite_console: string | null
  }
  history: GamerHistoryEntry[]
}

const rupees = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
const dateLabel = (value: string | null) => (value ? format(new Date(value), "dd MMM yyyy") : "-")
const titleCase = (value: string | null) => (value ? value.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "-")

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  completed: "success",
  confirmed: "success",
  checked_in: "info",
  active: "info",
  pending_verified: "warning",
  pending: "warning",
  cancelled: "danger",
  rejected: "danger",
  imported: "neutral",
}

export const tierBadgeVariant = (tier: string): "premium" | "warning" | "neutral" => {
  const normalized = (tier || "").toLowerCase()
  if (normalized === "platinum") return "premium"
  if (normalized === "gold") return "warning"
  return "neutral"
}

export function GamerProfileSheet({ vendorId, gamerId, onOpenChange }: {
  vendorId: number | null
  gamerId: number | null
  onOpenChange: (open: boolean) => void
}) {
  const [profile, setProfile] = useState<GamerProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vendorId || !gamerId) {
      setProfile(null)
      setError(null)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setProfile(null)
    fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/knowYourGamer/${gamerId}`, { signal: controller.signal })
      .then(async res => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body?.message || "Unable to load this gamer.")
        setProfile(body as GamerProfile)
      })
      .catch(err => {
        if (controller.signal.aborted) return
        setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Unable to load this gamer. Try again.")
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [vendorId, gamerId])

  const s = profile?.summary
  const transactionsHref = profile
    ? `/transaction?${new URLSearchParams({ q: profile.name, ...(s?.first_visit ? { from: s.first_visit } : {}) }).toString()}`
    : "/transaction"

  return (
    <Sheet open={Boolean(gamerId)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="dashboard-module flex w-full flex-col gap-4 overflow-hidden sm:max-w-2xl">
        <SheetHeader className="shrink-0 text-left">
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {profile?.name || (loading ? "Loading…" : "Gamer")}
            {profile && <Badge variant={tierBadgeVariant(profile.membershipTier)}>{profile.membershipTier}</Badge>}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {profile?.game_username && <span>@{profile.game_username}</span>}
              {gamerId && <span>ID #{gamerId}</span>}
              {profile?.phone && <a className="inline-flex items-center gap-1 hover:text-foreground" href={`tel:${profile.phone}`}><Phone className="h-3 w-3" />{profile.phone}</a>}
              {profile?.email && <a className="inline-flex items-center gap-1 hover:text-foreground" href={`mailto:${profile.email}`}><Mail className="h-3 w-3" />{profile.email}</a>}
            </div>
          </SheetDescription>
        </SheetHeader>

        {loading && <div className="dashboard-empty-state"><Loader2 className="h-5 w-5 animate-spin" />Loading history…</div>}
        {error && <div role="alert" className="dashboard-error-banner text-sm">{error}</div>}

        {profile && s && (
          <>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat icon={CalendarClock} label="Sessions" value={`${s.sessions}`} hint={`${s.visits} visit day${s.visits === 1 ? "" : "s"}`} />
              <Stat icon={Timer} label="Hours played" value={`${s.hours_played}`} hint={s.favourite_console ? `Mostly ${s.favourite_console}` : undefined} />
              <Stat icon={IndianRupee} label="Net revenue" value={rupees(s.net_revenue)} hint={s.total_discount ? `${rupees(s.total_discount)} discount` : undefined} />
              <Stat icon={Gamepad2} label="Avg / session" value={rupees(s.average_per_session)} hint={`Since ${dateLabel(s.first_visit)}`} />
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Booking & play history</h3>
              <Button asChild variant="outline" size="sm">
                <Link href={transactionsHref}><ReceiptText className="h-4 w-4" />View transactions</Link>
              </Button>
            </div>

            <div className="dashboard-table-shell min-h-0 flex-1">
              <div className="dashboard-table-wrap h-full">
                <table className="dashboard-table min-w-[640px]">
                  <thead>
                    <tr>
                      <th>Date</th><th>Time</th><th>Console</th><th className="text-right">Amount</th><th>Payment</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.history.map(entry => (
                      <tr key={entry.transaction_id}>
                        <td className="whitespace-nowrap">{dateLabel(entry.date)}</td>
                        <td className="whitespace-nowrap">
                          {entry.start_time ? `${entry.start_time}–${entry.end_time}` : "-"}
                          {entry.duration_minutes ? <span className="ml-1 text-xs text-muted-foreground">({entry.duration_minutes}m)</span> : null}
                        </td>
                        <td>{entry.console_type || "-"}</td>
                        <td className="whitespace-nowrap text-right">
                          {rupees(entry.amount)}
                          {entry.discount > 0 && <span className="block text-xs text-muted-foreground">−{rupees(entry.discount)} promo</span>}
                        </td>
                        <td className="whitespace-nowrap">
                          {titleCase(entry.payment_mode)}
                          {entry.source && entry.source !== "app" && <span className="block text-xs text-muted-foreground">{titleCase(entry.source)}</span>}
                        </td>
                        <td>{entry.status ? <Badge variant={STATUS_VARIANT[entry.status] || "neutral"}>{titleCase(entry.status)}</Badge> : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Timer; label: string; value: string; hint?: string }) {
  return (
    <div className="gaming-kpi-card rounded-lg border p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><Icon className="h-3.5 w-3.5" /></div>
      <p className="mt-1 truncate text-lg font-semibold text-foreground">{value}</p>
      {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
