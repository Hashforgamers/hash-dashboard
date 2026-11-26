"use client"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BOOKING_URL } from "@/src/config/env"
import { creditAuthHeaders } from "@/lib/credit-auth"
import { DEFAULT_FLEX_SETTINGS, type FlexSettings } from "@/lib/flex-booking"

/** Settings > Session Timing: lets a cafe start desk sessions at any minute. */
export function FlexBookingSettings({ vendorId, canEdit }: { vendorId: number | null; canEdit: boolean }) {
  const [saved, setSaved] = useState<FlexSettings>(DEFAULT_FLEX_SETTINGS)
  const [draft, setDraft] = useState<FlexSettings>(DEFAULT_FLEX_SETTINGS)
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!vendorId) return
    const abort = new AbortController()
    setLoading(true); setError("")
    fetch(`${BOOKING_URL}/api/vendor/${vendorId}/flex-booking/settings`, { headers: creditAuthHeaders(), signal: abort.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.success) throw Error(data.message || data.error || "Could not load session timing.")
        const next = { ...DEFAULT_FLEX_SETTINGS, ...data.settings }
        setSaved(next); setDraft(next); setReady(data.schema_ready !== false)
      })
      .catch(e => { if (!abort.signal.aborted) setError(e.message) })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [vendorId])

  async function save() {
    if (!vendorId) return
    setSaving(true); setError("")
    try {
      const response = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/flex-booking/settings`, {
        method: "PUT", headers: creditAuthHeaders(), body: JSON.stringify(draft),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) throw Error(data.message || data.error || "Could not save session timing.")
      const next = { ...DEFAULT_FLEX_SETTINGS, ...data.settings }
      setSaved(next); setDraft(next)
      toast.success("Session timing saved")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save session timing.")
    } finally {
      setSaving(false)
    }
  }

  const set = <K extends keyof FlexSettings>(key: K, value: FlexSettings[K]) => setDraft(current => ({ ...current, [key]: value }))
  const changed = JSON.stringify(saved) !== JSON.stringify(draft)
  const locked = !canEdit || !ready || loading || saving
  const number = (key: "min_minutes" | "step_minutes" | "partial_slot_grace_minutes", label: string, min: number, max: number, hint: string) => (
    <label className="block text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input type="number" min={min} max={max} value={draft[key]} disabled={locked || !draft.flex_enabled}
        onChange={e => set(key, Number(e.target.value))}
        className="mt-1 block h-9 w-28 rounded-md border border-border bg-background px-2 text-sm tabular-nums" />
      <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
    </label>
  )

  return (
    <Card className="account-panel">
      <CardHeader className="pb-3">
        <CardTitle className="account-section-title">Session Timing</CardTitle>
        <CardDescription>Start desk sessions at any minute (a 10:12 walk-in for 2 hours plays until 12:12). App and website bookings keep using slots.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ready && <p role="status" className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">Custom start times need a booking database update before they can be turned on.</p>}
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.flex_enabled} disabled={locked} onChange={e => set("flex_enabled", e.target.checked)} />
          <span className="font-medium text-foreground">Allow custom start times at the desk</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          {number("min_minutes", "Shortest session (min)", 5, 720, "Durations start here.")}
          {number("step_minutes", "Duration step (min)", 1, 60, "Picker and billing step.")}
          {number("partial_slot_grace_minutes", "Slot overlap grace (min)", 0, 30, "0 = any overlap holds the slot.")}
        </div>
        <label className="block text-sm">
          <span className="font-medium text-foreground">Late arrival for a booked slot</span>
          <select value={draft.late_arrival_policy} disabled={locked || !draft.flex_enabled}
            onChange={e => set("late_arrival_policy", e.target.value as FlexSettings["late_arrival_policy"])}
            className="mt-1 block h-9 rounded-md border border-border bg-background px-2 text-sm">
            <option value="keep_end">Keep the booked end time (same price)</option>
            <option value="shift_if_free">Shift the session if the station is free</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.allow_past_closing} disabled={locked || !draft.flex_enabled}
            onChange={e => set("allow_past_closing", e.target.checked)} />
          <span className="text-foreground">Allow sessions to run past the last slot of the day</span>
        </label>
        {canEdit ? (
          <div className="flex gap-2">
            <Button type="button" onClick={save} disabled={!changed || locked}>{saving ? "Saving…" : "Save"}</Button>
            {changed && <Button type="button" variant="outline" onClick={() => setDraft(saved)} disabled={saving}>Reset</Button>}
          </div>
        ) : <p className="text-xs text-muted-foreground">Only the cafe owner or managers with account access can change this.</p>}
      </CardContent>
    </Card>
  )
}
