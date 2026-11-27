"use client"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BOOKING_URL } from "@/src/config/env"
import { creditAuthHeaders } from "@/lib/credit-auth"
import { cn } from "@/lib/utils"
import { UNUSED_POLICIES, UNUSED_POLICY_LABELS, type UnusedPolicy } from "@/lib/desk-bill"

type Settings = { policy: UnusedPolicy; min_unused_minutes: number }
const DEFAULTS: Settings = { policy: "credit_default", min_unused_minutes: 5 }

/** Settings > Session Timing: what happens to paid time left when a PC is released early. */
export function UnusedTimeSettings({ vendorId, canEdit }: { vendorId: number | null; canEdit: boolean }) {
  const [saved, setSaved] = useState<Settings>(DEFAULTS)
  const [draft, setDraft] = useState<Settings>(DEFAULTS)
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!vendorId) return
    const abort = new AbortController()
    setLoading(true); setError("")
    fetch(`${BOOKING_URL}/api/vendor/${vendorId}/unused-time/settings`, { headers: creditAuthHeaders(), signal: abort.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.success) throw Error(data.message || "Could not load this setting.")
        const next = { ...DEFAULTS, ...data.settings }
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
      const response = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/unused-time/settings`, {
        method: "PUT", headers: creditAuthHeaders(), body: JSON.stringify(draft),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) throw Error(data.message || "Could not save this setting.")
      const next = { ...DEFAULTS, ...data.settings }
      setSaved(next); setDraft(next)
      toast.success("Unused time setting saved")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this setting.")
    } finally {
      setSaving(false)
    }
  }

  const locked = !canEdit || !ready || loading || saving
  const changed = saved.policy !== draft.policy || saved.min_unused_minutes !== draft.min_unused_minutes
  return (
    <Card className="account-panel mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="account-section-title">Ending early</CardTitle>
        <CardDescription>When a gamer frees the PC before the booked end, the unpaid-for minutes are worked out at what they paid.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!ready && <p role="status" className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">Needs a booking database update before it can be changed. Gamer credit is used meanwhile.</p>}
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Unused time">
          {UNUSED_POLICIES.map(policy => (
            <button key={policy} type="button" role="radio" aria-checked={draft.policy === policy} disabled={locked}
              onClick={() => setDraft(current => ({ ...current, policy }))}
              className={cn("rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50",
                draft.policy === policy ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-muted")}>
              {UNUSED_POLICY_LABELS[policy]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Nothing back under</span>
          <input type="number" min={0} max={60} value={draft.min_unused_minutes} disabled={locked || draft.policy === "none"}
            onChange={e => setDraft(current => ({ ...current, min_unused_minutes: Math.max(0, Math.min(60, Number(e.target.value) || 0)) }))}
            className="h-8 w-16 rounded-md border border-border bg-background px-2 text-sm tabular-nums" />
          <span className="text-muted-foreground">min</span>
        </label>
        <Button type="button" size="sm" disabled={locked || !changed} onClick={save}>{saving ? "Saving…" : "Save"}</Button>
      </CardContent>
    </Card>
  )
}
