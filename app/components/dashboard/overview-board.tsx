"use client"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  AlarmClock, AlertTriangle, CalendarClock, ChevronRight, Eye, EyeOff, IndianRupee, LayoutGrid, List, MonitorPlay, Plus, Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useDashboardData } from "@/app/context/DashboardDataContext"
import { useTimeFormat } from "@/app/hooks/useTimeFormat"
import { buildStations, istClockOf, phoneTail, remainingLabel } from "@/lib/station-map"
import { bookingWindowOf, needsAttention, overviewKpis, type WindowBooking } from "@/lib/schedule-map"
import { formatRupees } from "@/lib/desk-bill"
import { StationMapView, focusStation, requestStationBooking } from "../station-map/station-map-view"
import { CurrentSlots } from "../current-slot"
import PayAtCafeRequests from "../pay-at-cafe-requests"
import { queueScheduleFocus } from "./schedule-map"

type View = "map" | "list"
const viewKey = (vendorId: number | null) => `hash.dashboard.overviewView.${vendorId || 0}`

function readView(vendorId: number | null): View {
  try { return localStorage.getItem(viewKey(vendorId)) === "list" ? "list" : "map" } catch { return "map" }
}

/**
 * Dashboard Overview: KPIs, the cafe's live floor map (or the Live Sessions
 * table), and a rail with what needs the desk's attention.
 */
export function OverviewBoard({ vendorId, landing, stats, isOwner, isConnected, refreshSlots, setRefreshSlots, onOpenSchedule }: {
  vendorId: number | null
  landing: any
  stats: { netEarnings: number; netPendingAmount: number; todayBookings: number }
  isOwner: boolean
  isConnected: boolean
  refreshSlots: boolean
  setRefreshSlots: React.Dispatch<React.SetStateAction<boolean>>
  onOpenSchedule: () => void
}) {
  const { consoles } = useDashboardData()
  const { time: showClock } = useTimeFormat()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 15_000); return () => window.clearInterval(t) }, [])
  const [view, setView] = useState<View>("map")
  useEffect(() => setView(readView(vendorId)), [vendorId])
  const pickView = (next: View) => { setView(next); try { localStorage.setItem(viewKey(vendorId), next) } catch { /* ignore */ } }
  const [showMoney, setShowMoney] = useState(false)
  const [payAtCafe, setPayAtCafe] = useState<number | null>(null)

  const stations = useMemo(() => buildStations(consoles, landing, now), [consoles, landing, now])
  const upcoming = useMemo<WindowBooking[]>(() => {
    const rows: any[] = Array.isArray(landing?.upcomingBookings) ? landing.upcomingBookings : []
    return rows.map(bookingWindowOf).filter((b): b is WindowBooking => !!b && b.end > now).sort((a, b) => a.start - b.start)
  }, [landing, now])
  const kpis = useMemo(() => overviewKpis(stations, upcoming, now), [stations, upcoming, now])
  const attention = useMemo(() => needsAttention(stations), [stations])
  const soon = upcoming.filter(b => b.start <= now + 3 * 3600_000).slice(0, 6)
  const stationCode = (id: number | null) => stations.find(s => s.id === id)?.code

  const openStation = (id: number | null) => {
    if (!id) { onOpenSchedule(); return }
    if (view !== "map") pickView("map")
    window.setTimeout(() => focusStation(id), view === "map" ? 0 : 120)
  }
  const newSession = () => {
    const free = stations.find(s => s.state === "free") || stations[0]
    if (!free) { toast.info("Add a station in Gaming Stations first."); return }
    if (!requestStationBooking({ type: free.type, gameId: free.gameId ?? undefined })) toast.info("Booking form is still loading. Try again in a moment.")
  }
  const occupancy = kpis.total ? kpis.occupied / kpis.total : 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto xl:overflow-hidden">
      {/* KPI row */}
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6 sm:gap-3" aria-label="Today at a glance">
        <Kpi icon={MonitorPlay} tone="primary" label="Occupancy" value={`${kpis.occupied}/${kpis.total}`}
          foot={<span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round(occupancy * 100)}%` }} /></span>} />
        <Kpi icon={CalendarClock} tone="primary" label="Live sessions" value={String(kpis.live)}
          foot={<span className={kpis.overtime ? "text-red-300" : ""}>{kpis.overtime ? `${kpis.overtime} overtime` : isConnected ? "Live" : "Syncing"}</span>} />
        <Kpi icon={AlarmClock} tone="amber" label="Ending ≤ 10 min" value={String(kpis.endingSoon)} foot="Ready to extend or end" />
        <Kpi icon={CalendarClock} tone="violet" label="Next hour" value={String(kpis.upcomingHour)} foot="Bookings starting" />
        {isOwner ? (
          <Kpi icon={IndianRupee} tone="emerald" label="Today (net)"
            value={showMoney ? formatRupees(stats.netEarnings) : "₹•••••"}
            foot={showMoney ? `${formatRupees(stats.netPendingAmount)} pending` : `${stats.todayBookings} bookings`}
            action={<button type="button" aria-label={showMoney ? "Hide amounts" : "Show amounts"} onClick={() => setShowMoney(v => !v)} className="text-muted-foreground hover:text-foreground">{showMoney ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>} />
        ) : (
          <Kpi icon={CalendarClock} tone="emerald" label="Bookings today" value={String(stats.todayBookings)} foot="All consoles" />
        )}
        <Kpi icon={Wallet} tone="amber" label="Pay at Cafe" value={payAtCafe === null ? "–" : String(payAtCafe)} foot={payAtCafe ? "Waiting for approval" : "No requests"} />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-12">
        {/* Floor / Live sessions */}
        <section className="gaming-panel flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-xl border border-border p-4 xl:col-span-8 xl:min-h-0 2xl:col-span-9" aria-label="Floor">
          <header className="mb-3 flex flex-wrap items-center gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">{view === "map" ? "Floor" : "Live sessions"}</h2>
              <p className="text-xs text-muted-foreground">{view === "map" ? "Tap a station to start, extend or end a session" : "Release, add meals and settle from the table"}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1" role="radiogroup" aria-label="Floor view">
                {([["map", LayoutGrid, "Map"], ["list", List, "List"]] as const).map(([key, Icon, label]) => (
                  <button key={key} type="button" role="radio" aria-checked={view === key} onClick={() => pickView(key)}
                    className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                      view === key ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/40" : "text-muted-foreground hover:text-foreground")}>
                    <Icon className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>
              <Button type="button" size="sm" className="ui-action-primary h-9 gap-1.5 px-4" onClick={newSession}><Plus className="h-4 w-4" />New session</Button>
            </div>
          </header>
          <div className="min-h-0 flex-1">
            {view === "map" ? <StationMapView embedded /> : (
              <div className="relative h-full overflow-hidden">
                <CurrentSlots currentSlots={landing?.currentSlots} historyBookings={landing?.historyBookings || []} refreshSlots={refreshSlots} setRefreshSlots={setRefreshSlots} />
              </div>
            )}
          </div>
        </section>

        {/* Rail */}
        <aside className="flex min-h-0 min-w-0 flex-col gap-3 xl:col-span-4 xl:overflow-y-auto 2xl:col-span-3" aria-label="Needs attention and upcoming">
          <RailCard title="Needs attention" count={attention.length} icon={AlertTriangle}>
            {attention.length === 0 ? <Empty text="All sessions on track" /> : attention.slice(0, 6).map(item => (
              <RailRow key={`${item.kind}-${item.stationId}`} onClick={() => openStation(item.stationId)}
                lead={<span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  item.kind === "overtime" ? "bg-red-500/15 text-red-300" : item.kind === "ending" ? "bg-amber-500/15 text-amber-300" : "bg-muted text-muted-foreground")}>{item.code}</span>}
                title={item.player}
                meta={item.kind === "unpaid" ? `${formatRupees(item.amountDue)} due · ${remainingLabel(item.remainingMs)}` : `${remainingLabel(item.remainingMs)}${item.amountDue > 0 ? ` · ${formatRupees(item.amountDue)} due` : ""}`}
                tone={item.kind === "overtime" ? "text-red-300" : item.kind === "ending" ? "text-amber-300" : "text-muted-foreground"} />
            ))}
          </RailCard>

          <div className="shrink-0"><PayAtCafeRequests vendorId={vendorId} onCount={setPayAtCafe} /></div>

          <RailCard title="Coming up" count={soon.length} icon={CalendarClock} action={<button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={onOpenSchedule}>Schedule</button>}>
            {soon.length === 0 ? <Empty text="Nothing in the next 3 hours" /> : soon.map(b => (
              <RailRow key={`${b.bookingId}-${b.stationId}-${b.start}`} onClick={() => { queueScheduleFocus(b); onOpenSchedule() }}
                lead={<span className="w-[4.25rem] shrink-0 text-xs font-semibold tabular-nums text-foreground">{showClock(istClockOf(b.start))}</span>}
                title={b.name}
                meta={[stationCode(b.stationId) || "Station at check-in", phoneTail(b.phone) ? `··${phoneTail(b.phone)}` : null, `${Math.round((b.end - b.start) / 60000)}m`].filter(Boolean).join(" · ")}
                tone="text-muted-foreground" />
            ))}
          </RailCard>
        </aside>
      </div>
    </div>
  )
}

const TONES = {
  primary: "bg-primary/12 text-primary",
  amber: "bg-amber-500/12 text-amber-400",
  emerald: "bg-emerald-500/12 text-emerald-400",
  violet: "bg-muted station-booked-text",
}

function Kpi({ icon: Icon, tone, label, value, foot, action }: {
  icon: React.ComponentType<{ className?: string }>; tone: keyof typeof TONES; label: string; value: string; foot?: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="gaming-kpi-card flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={cn("grid h-7 w-7 place-items-center rounded-md", TONES[tone])}><Icon className="h-3.5 w-3.5" /></span>
        <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      <p className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground">{value}</p>
      {foot && <div className="truncate text-[11px] text-muted-foreground">{foot}</div>}
    </div>
  )
}

function RailCard({ title, count, icon: Icon, action, children }: {
  title: string; count: number; icon: React.ComponentType<{ className?: string }>; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <section className="gaming-panel shrink-0 rounded-xl border border-border p-3" aria-label={title}>
      <header className="mb-2 flex items-center gap-2 px-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {count > 0 && <span className="rounded-full bg-muted px-2 text-[11px] font-semibold tabular-nums text-foreground">{count}</span>}
        <span className="ml-auto">{action}</span>
      </header>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

function RailRow({ lead, title, meta, tone, onClick }: { lead: React.ReactNode; title: string; meta: string; tone: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60">
      {lead}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        <span className={cn("block truncate text-xs tabular-nums", tone)}>{meta}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="px-2 py-3 text-xs text-muted-foreground">{text}</p>
}
