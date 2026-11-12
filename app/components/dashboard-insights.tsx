"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Clock, TrendingUp, UserRoundX } from "lucide-react"
import { httpJson } from "@/lib/http-client"
import { DASHBOARD_URL } from "@/src/config/env"
import { busiestHours, dailyTrend, hourLabel, isoDay, lapsedRegulars, type GamerRow, type TxRow } from "@/lib/insights"
import { RowsSkeleton } from "@/app/components/ui/page-skeleton"

const RANGES = [7, 30] as const
const SERIES = "#3b82f6" // blue-500: validated against the #1c1c1e card (dark), single series
const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-white/10 bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-xl">
      <p className="font-medium text-foreground">{p.label}</p>
      <p className="tabular-nums text-foreground">{rupees(p.earnings)}</p>
      <p className="tabular-nums text-muted-foreground">{p.bookings} {p.bookings === 1 ? "booking" : "bookings"}</p>
    </div>
  )
}

export function DashboardInsights({ vendorId }: { vendorId: number | null }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(7)
  const [rows, setRows] = useState<TxRow[] | null>(null)
  const [gamers, setGamers] = useState<GamerRow[]>([])
  const [error, setError] = useState("")

  // Load the last 30 days once; the 7-day view is a slice of the same data.
  useEffect(() => {
    if (!vendorId) return
    const controller = new AbortController()
    const to = new Date()
    const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 29)
    const compact = (d: Date) => isoDay(d).replaceAll("-", "")
    httpJson<TxRow[]>(`${DASHBOARD_URL}/api/transactionReport/${vendorId}/${compact(to)}/${compact(from)}`, { signal: controller.signal })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => { if (!controller.signal.aborted) { setRows([]); setError("Couldn't load transactions for the trend.") } })
    fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/knowYourGamer`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setGamers(Array.isArray(data) ? data : []))
      .catch(() => undefined)
    return () => controller.abort()
  }, [vendorId])

  const trend = useMemo(() => dailyTrend(rows ?? [], range), [rows, range])
  const totals = useMemo(() => {
    const earnings = trend.reduce((s, p) => s + p.earnings, 0)
    const bookings = trend.reduce((s, p) => s + p.bookings, 0)
    return { earnings, bookings, perDay: earnings / range }
  }, [trend, range])
  const hours = useMemo(() => {
    const keep = new Set(trend.map((p) => p.date))
    return busiestHours((rows ?? []).filter((r) => keep.has(String(r.slotDate || "").slice(0, 10))))
  }, [rows, trend])
  const regulars = useMemo(() => lapsedRegulars(gamers), [gamers])
  const maxHour = Math.max(1, ...hours.map((h) => h.bookings))

  if (rows === null) return <RowsSkeleton rows={6} label="Loading insights" />

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <section className="dashboard-module-panel border p-4" aria-labelledby="insights-trend">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="insights-trend" className="section-title flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />Earnings</h2>
            <p className="mt-1 text-xs text-muted-foreground">Gross earnings per day, last {range} days</p>
          </div>
          <div className="ui-segmented" role="group" aria-label="Date range">
            {RANGES.map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r} days</button>)}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3">
          {[["Earnings", rupees(totals.earnings)], ["Bookings", totals.bookings.toLocaleString("en-IN")], ["Per day", rupees(totals.perDay)]].map(([label, value]) => (
            <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-xl font-semibold tabular-nums tracking-tight">{value}</dd></div>
          ))}
        </dl>

        {error ? <p className="mt-4 text-sm text-amber-300">{error}</p> : (
          <div className="mt-4 h-[200px] w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="insightsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: "#98989f", fontSize: 11 }} />
                <YAxis hide domain={[0, "auto"]} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="earnings" stroke={SERIES} strokeWidth={2} fill="url(#insightsFill)" activeDot={{ r: 4, stroke: "#1c1c1e", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* the same numbers as a table for screen readers */}
        <table className="sr-only">
          <caption>Earnings and bookings per day, last {range} days</caption>
          <thead><tr><th>Day</th><th>Earnings</th><th>Bookings</th></tr></thead>
          <tbody>{trend.map((p) => <tr key={p.date}><td>{p.label}</td><td>{rupees(p.earnings)}</td><td>{p.bookings}</td></tr>)}</tbody>
        </table>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="dashboard-module-panel border p-4" aria-labelledby="insights-hours">
          <h2 id="insights-hours" className="section-title flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />Busiest hours</h2>
          <p className="mt-1 text-xs text-muted-foreground">By bookings started, last {range} days</p>
          {hours.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No bookings in this range yet.</p> : (
            <ul className="mt-4 flex flex-col gap-3">
              {hours.map((h) => (
                <li key={h.hour} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                  <span className="tabular-nums">{hourLabel(h.hour)}</span>
                  <span className="h-2 rounded-full bg-white/[0.06]"><span className="block h-2 rounded-full" style={{ width: `${(h.bookings / maxHour) * 100}%`, background: SERIES }} /></span>
                  <span className="tabular-nums text-muted-foreground">{h.bookings}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-module-panel border p-4" aria-labelledby="insights-regulars">
          <h2 id="insights-regulars" className="section-title flex items-center gap-2"><UserRoundX className="h-4 w-4 text-muted-foreground" aria-hidden="true" />Regulars to win back</h2>
          <p className="mt-1 text-xs text-muted-foreground">Gold and Platinum gamers who haven&apos;t visited in 14+ days</p>
          {regulars.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">All your regulars have visited recently.</p> : (
            <ul className="mt-3 divide-y divide-white/[0.06]">
              {regulars.map((g) => (
                <li key={String(g.id)}>
                  <Link href={`/know-your-gamers?q=${encodeURIComponent(g.name)}`} className="flex items-center justify-between gap-3 rounded-md px-1 py-2.5 text-sm transition-colors hover:bg-white/[0.04]">
                    <span className="min-w-0 truncate">{g.name}<span className="ml-2 text-xs text-muted-foreground">{g.membershipTier}</span></span>
                    <span className="shrink-0 text-xs tabular-nums text-amber-300">{g.daysAway} days away</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
