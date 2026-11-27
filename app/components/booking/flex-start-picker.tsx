"use client"
import { useEffect, useRef, useState } from "react"
import { BOOKING_URL } from "@/src/config/env"
import { creditAuthHeaders } from "@/lib/credit-auth"
import { cn } from "@/lib/utils"
import {
  DEFAULT_FLEX_SETTINGS, clockOf, flexDurations, formatMinutes, istClock, istDate, istStartAt, stationLabel,
  type FlexQuote, type FlexQuoteError, type FlexSettings,
} from "@/lib/flex-booking"

const settingsCache = new Map<number, FlexSettings>()

/** Cafe flex settings; off (and silent) when the service or migration is not there yet. */
export function useFlexSettings(vendor: number | null) {
  const [settings, setSettings] = useState<FlexSettings>(() => (vendor && settingsCache.get(vendor)) || DEFAULT_FLEX_SETTINGS)
  useEffect(() => {
    if (!vendor) { setSettings(DEFAULT_FLEX_SETTINGS); return }
    const abort = new AbortController()
    fetch(`${BOOKING_URL}/api/vendor/${vendor}/flex-booking/settings`, { headers: creditAuthHeaders(), signal: abort.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (abort.signal.aborted) return
        const next = data?.success && data.schema_ready !== false ? { ...DEFAULT_FLEX_SETTINGS, ...data.settings } : DEFAULT_FLEX_SETTINGS
        settingsCache.set(vendor, next)
        setSettings(next)
      })
      .catch(() => { if (!abort.signal.aborted) setSettings(DEFAULT_FLEX_SETTINGS) })
    return () => abort.abort()
  }, [vendor])
  return settings
}

type Props = {
  vendor: number | null
  gameId: number
  date: string
  players: number
  squad: boolean
  settings: FlexSettings
  deskProfile?: string
  deskRevision?: number
  pricingGame?: string
  disabled?: boolean
  onChange: (quote: FlexQuote | null, consoleIds: number[] | null) => void
}

export function FlexStartPicker({ vendor, gameId, date, players, squad, settings, deskProfile, deskRevision, pricingGame, disabled, onChange }: Props) {
  const today = istDate()
  const [clock, setClock] = useState(() => istClock())
  const [minutes, setMinutes] = useState(() => Math.max(settings.min_minutes, 60))
  const [quote, setQuote] = useState<FlexQuote | null>(null)
  const [problem, setProblem] = useState<FlexQuoteError | null>(null)
  const [loading, setLoading] = useState(false)
  const [chosen, setChosen] = useState<number[] | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const chosenRef = useRef<number[] | null>(null)
  chosenRef.current = chosen
  const day = date || today
  const durations = flexDurations(settings, problem?.max_minutes ?? null)

  useEffect(() => {
    if (!vendor || !gameId || !clock) return
    const abort = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      fetch(`${BOOKING_URL}/api/vendor/${vendor}/flex-booking/quote`, {
        method: "POST", headers: creditAuthHeaders(), signal: abort.signal,
        body: JSON.stringify({
          gameId, startAt: istStartAt(day, clock), durationMinutes: minutes, players,
          squadDetails: { enabled: squad, playerCount: players },
          deskProfile: deskProfile || undefined, deskRevision: deskProfile ? deskRevision : undefined,
          pricingGame: deskProfile ? (pricingGame ?? "") : undefined,
        }),
      })
        .then(async response => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
        .then(({ ok, data }) => {
          if (abort.signal.aborted) return
          if (ok && data?.success) {
            const next = data as FlexQuote
            const current = chosenRef.current
            const free = new Set(next.stations.filter(s => s.available).map(s => s.console_id))
            const keep = current && current.length === next.units && current.every(id => free.has(id)) ? current : null
            const ids = keep || (next.recommended_console_ids.length === next.units ? next.recommended_console_ids : null)
            setQuote(next); setProblem(null); setChosen(ids)
            onChangeRef.current(ids ? next : null, ids)
          } else {
            setQuote(null); setChosen(null)
            setProblem({ success: false, code: data?.code || "error", message: data?.message || "Could not check this time.", ...data })
            onChangeRef.current(null, null)
          }
        })
        .catch(() => { if (!abort.signal.aborted) { setQuote(null); setProblem({ success: false, code: "network", message: "Could not reach the booking service." }); onChangeRef.current(null, null) } })
        .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    }, 250)
    return () => { clearTimeout(timer); abort.abort() }
  }, [vendor, gameId, day, clock, minutes, players, squad, deskProfile, deskRevision, pricingGame])

  function toggle(id: number) {
    if (!quote) return
    const units = quote.units
    const next = units === 1 ? [id] : (chosen || []).includes(id) ? (chosen || []).filter(c => c !== id) : [...(chosen || []), id].slice(-units)
    setChosen(next)
    onChange(next.length === units ? quote : null, next.length === units ? next : null)
  }

  return (
    <div className="space-y-2 text-xs" aria-label="Custom start time">
      <div className="flex flex-wrap items-end gap-2">
        <label>Start
          <input type="time" aria-label="Start time" className="block rounded border border-border bg-background p-1 tabular-nums"
            value={clock} disabled={disabled} onChange={e => setClock(e.target.value)} />
        </label>
        {day === today && <button type="button" className="rounded border border-border px-2 py-1" disabled={disabled}
          onClick={() => setClock(istClock())}>Now</button>}
        <label>Duration
          <select aria-label="Duration" className="block rounded border border-border bg-background p-1" value={minutes} disabled={disabled}
            onChange={e => setMinutes(Number(e.target.value))}>
            {durations.map(m => <option key={m} value={m}>{formatMinutes(m)}</option>)}
          </select>
        </label>
        {loading && <span className="text-muted-foreground" role="status">Checking…</span>}
      </div>

      {quote && <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2" role="status">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong className="text-sm tabular-nums text-foreground">{quote.window.label}{quote.window.crosses_midnight ? " (next day)" : ""}</strong>
          <span className="font-semibold text-foreground">₹{quote.price.net_amount.toLocaleString("en-IN")}</span>
        </div>
        <p className="mt-1 text-muted-foreground">
          {formatMinutes(quote.window.duration_minutes)}
          {quote.price.basis === "slot_prorated" ? ` · billed ${formatMinutes(quote.price.billed_minutes)}` : " · rate card"}
          {quote.live ? " · starts now" : ""}
        </p>
      </div>}

      {problem && <div role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-amber-600 dark:text-amber-300">
        {problem.message}
        {!!problem.max_minutes && problem.max_minutes >= settings.min_minutes && (
          <button type="button" className="ml-2 underline" onClick={() => setMinutes(problem.max_minutes as number)}>
            Use {formatMinutes(problem.max_minutes)}
          </button>
        )}
      </div>}

      {quote && <div className="space-y-1">
        <p className="text-muted-foreground">{quote.units > 1 ? `Choose ${quote.units} stations` : "Station"}</p>
        <div className="flex flex-wrap gap-1.5">
          {quote.stations.map(station => {
            const selected = !!chosen?.includes(station.console_id)
            const fits = station.max_minutes_available
            return <div key={station.console_id} className="flex items-center gap-1">
              <button type="button" aria-pressed={selected} disabled={disabled || !station.available}
                title={stationLabel(station)} onClick={() => toggle(station.console_id)}
                className={cn("rounded-md border px-2 py-1 text-left transition-colors disabled:opacity-60",
                  selected ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-muted/40")}>
                <span className="block font-medium">{station.name || `Station ${station.console_id}`}</span>
                <span className="block text-[11px] text-muted-foreground">{station.available ? "Free" : stationLabel(station)}</span>
              </button>
              {!station.available && fits >= settings.min_minutes && (
                <button type="button" className="underline" onClick={() => setMinutes(fits)}>Use {formatMinutes(fits)}</button>
              )}
            </div>
          })}
        </div>
        {!quote.available && <p role="alert" className="text-amber-600 dark:text-amber-300">
          No station is free for the whole session{quote.max_minutes_available ? `; the longest fit is ${formatMinutes(quote.max_minutes_available)}` : ""}.
        </p>}
        {quote.closes_at && <p className="text-muted-foreground">Slots run until {clockOf(quote.closes_at)}.</p>}
      </div>}
    </div>
  )
}
