"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Loader2, RotateCw } from "lucide-react"
import { BOOKING_URL } from "@/src/config/env"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface BookingRecord {
  booking_id: number
  booking_fid: string
  customer_name: string
  customer_phone: string
  booking_date: string | null
  slot_start_time: string | null
  slot_end_time: string | null
  status: string
  amount_paid: number
  meal_selection: string
}
const emptyFilters = { date_from: "", date_to: "", time_from: "", time_to: "" }

export default function BookingRecords({ vendorId, refreshKey = 0 }: { vendorId: number | null; refreshKey?: number }) {
  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [rows, setRows] = useState<BookingRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const invalidDates = Boolean(filters.date_from && filters.date_to && filters.date_from > filters.date_to)

  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener("refresh-dashboard", refresh)
    return () => window.removeEventListener("refresh-dashboard", refresh)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setRows([])
    setTotal(0)
    setError("")
    if (!vendorId) { setLoading(false); return () => controller.abort() }
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    Object.entries(applied).forEach(([key, value]) => { if (value) params.set(key, value) })
    fetch(`${BOOKING_URL}/api/vendor/${vendorId}/booking-records?${params}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json()
        if (!response.ok || !data.success || !Array.isArray(data.bookings)) throw new Error("Unable to load booking records. Please try again.")
        if (!controller.signal.aborted) {
          setRows(data.bookings)
          setTotal(data.total)
          if (page > 1 && data.bookings.length === 0) setPage(1)
        }
      })
      .catch(() => { if (!controller.signal.aborted) setError("Unable to load booking records. Please try again.") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [vendorId, page, applied, revision, refreshKey])

  const pages = Math.max(1, Math.ceil(total / 25))
  return (
    <section className="booking-detail-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border" aria-label="Booking records">
      <div className="shrink-0 border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold"><CalendarDays className="h-4 w-4 text-blue-400" />Booking records</h3>
            <p className="mt-1 text-xs text-muted-foreground">All booking statuses · Filter by booking date and start time (IST).</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Refresh booking records" disabled={loading || !vendorId} onClick={() => setRevision(value => value + 1)}><RotateCw className="h-4 w-4" /></Button>
        </div>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); if (!invalidDates) { setPage(1); setApplied({ ...filters }) } }}>
          {([["date_from", "From date", "date"], ["date_to", "To date", "date"], ["time_from", "Starts after", "time"], ["time_to", "Starts before", "time"]] as const).map(([key, label, type]) => (
            <label key={key} className="min-w-[125px] flex-1 space-y-1.5 text-xs text-muted-foreground">
              <span>{label}</span>
              <Input type={type} aria-label={label} value={filters[key]} onChange={event => setFilters(value => ({ ...value, [key]: event.target.value }))} className="h-9 text-xs text-foreground" />
            </label>
          ))}
          <Button type="submit" size="sm" disabled={invalidDates || !vendorId} className="h-9 bg-blue-600 text-white hover:bg-blue-500">Apply filters</Button>
          <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); setPage(1) }}>Reset</Button>
        </form>
        {invalidDates && <p role="alert" className="mt-2 text-xs text-red-400">The end date must be on or after the start date.</p>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto" aria-busy={loading}>
        {loading ? <div role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading records…</div>
          : error ? <div role="alert" className="p-8 text-center text-sm"><p>{error}</p><Button variant="outline" className="mt-3" onClick={() => setRevision(value => value + 1)}>Retry</Button></div>
          : rows.length === 0 ? <div className="p-10 text-center"><p className="text-sm font-medium">{vendorId ? "No booking records found" : "Select a cafe to view booking records"}</p><p className="mt-1 text-xs text-muted-foreground">{vendorId ? "Try a wider date or time range, or reset the filters to see all records." : "Booking history will appear here once a cafe is selected."}</p></div>
          : <table className="w-full min-w-[740px] text-left text-sm">
            <thead className="sticky top-0 bg-muted text-xs text-muted-foreground"><tr>{["Booking", "Customer", "Date & time", "Status", "Extras", "Amount paid"].map(label => <th key={label} className="px-4 py-3 font-medium last:text-right">{label}</th>)}</tr></thead>
            <tbody>{rows.map(row => <tr key={row.booking_id} className="border-t border-border hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{row.booking_fid || `#BK-${row.booking_id}`}</td>
              <td className="px-4 py-3"><div className="font-medium">{row.customer_name}</div><div className="mt-1 text-xs text-muted-foreground">{row.customer_phone}</div></td>
              <td className="whitespace-nowrap px-4 py-3"><div>{row.booking_date ? new Date(`${row.booking_date.slice(0, 10)}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Date unavailable"}</div><div className="mt-1 text-xs text-muted-foreground">{row.slot_start_time || "—"} – {row.slot_end_time || "—"}</div></td>
              <td className="px-4 py-3"><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs capitalize ${["cancelled", "rejected"].includes(row.status) ? "bg-red-500/10 text-red-400" : ["confirmed", "checked_in"].includes(row.status) ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>{(row.status || "Unknown").replaceAll("_", " ")}</span></td>
              <td className="max-w-[200px] px-4 py-3 text-xs text-muted-foreground">{row.meal_selection || "—"}</td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">{Number(row.amount_paid || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td>
            </tr>)}</tbody>
          </table>}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span aria-live="polite">{loading ? "Loading…" : error ? "Records unavailable" : `${total ? (page - 1) * 25 + 1 : 0}–${Math.min(page * 25, total)} of ${total} records`}</span>
        <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</Button><span>{page} / {pages}</span><Button size="sm" variant="outline" disabled={page >= pages || loading} onClick={() => setPage(value => value + 1)}>Next</Button></div>
      </footer>
    </section>
  )
}
