"use client"
import { buttonVariants } from "@/components/ui/button";
import { useEffect, useState, type ReactNode } from "react"
import { ConsoleLinks } from "./desk-console-mapping"
import { BOOKING_URL } from "@/src/config/env"
import { creditAuthHeaders } from "@/lib/credit-auth"

export type PriceRule = { min_minutes: number; max_minutes: number | null; min_players: number; max_players: number; amount: string; unit_minutes: number; per_player: boolean }
export type RateDefinition = { console_ids?: number[]; name: string; model_name: string; screen_size_inches: number | null; game_variant: string; controllers_included: boolean; rules: PriceRule[] }
export type DeskCard = { game_id: number; profile: string; definition: RateDefinition; revision: number; is_active: boolean; archived: boolean; pricing_mode?: "slot" | "variants" }
const blankRule = (): PriceRule => ({ min_minutes: 1, max_minutes: null, min_players: 1, max_players: 1, amount: "", unit_minutes: 60, per_player: false })
const blankDefinition = (): RateDefinition => ({ name: "", model_name: "", screen_size_inches: null, game_variant: "", controllers_included: false, rules: [blankRule()] })
export const rateLabel = (card: DeskCard) => [card.definition.name, card.definition.screen_size_inches ? `${card.definition.screen_size_inches}″ TV` : "", card.definition.game_variant].filter(Boolean).join(" · ")

export function useDeskCards(vendor: number | null, revision = 0) {
  const [cards, setCards] = useState<DeskCard[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(!!vendor)
  useEffect(() => {
    const abort = new AbortController()
    setLoading(!!vendor); setCards([]); setError("")
    if (vendor) fetch(`${BOOKING_URL}/api/vendor/${vendor}/desk-rates`, { headers: creditAuthHeaders(), signal: abort.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw Error(data.error || "Unable to load rates.")
        if (!Array.isArray(data) || data.some(card => !card.definition || !Array.isArray(card.definition.rules))) throw Error("The pricing service needs the custom pricing update. Please reload after deployment.")
        if (!abort.signal.aborted) setCards(data)
      }).catch(e => { if (!abort.signal.aborted) setError(e.message) })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [vendor, revision])
  return { cards, error, loading }
}

export function deskSubtotal(card: DeskCard, minutes: number, players: number) {
  if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isInteger(players) || players < 1) return null
  const matches = card.definition.rules.filter(r => minutes >= r.min_minutes && (r.max_minutes === null || minutes <= r.max_minutes) && players >= r.min_players && players <= r.max_players)
  if (matches.length !== 1) return null
  const rule = matches[0]
  if (!Number.isInteger(rule.unit_minutes) || rule.unit_minutes < 0 || !/^\d+(\.\d{1,2})?$/.test(rule.amount)) return null
  const cents = Math.round(Number(rule.amount) * 100)
  const seconds = Math.round(minutes * 60)
  if (!Number.isSafeInteger(cents) || cents < 0 || !Number.isSafeInteger(seconds) || !rule.amount.trim()) return null
  const numerator = BigInt(cents) * BigInt(rule.per_player ? players : 1) * BigInt(rule.unit_minutes ? seconds : 1)
  const denominator = BigInt(rule.unit_minutes ? rule.unit_minutes * 60 : 1)
  const rounded = (numerator * BigInt(2) + denominator) / (denominator * BigInt(2))
  const total = Number(rounded)
  return Number.isSafeInteger(total) ? total / 100 : null
}

export function resolveSessionRate(cards: DeskCard[], minutes: number, players: number, choice = "") {
  const eligible: DeskCard[] = []
  let defaultCard: DeskCard | undefined
  let lowestSubtotal = Infinity

  for (const card of cards) {
    if (card.is_active === false || card.archived || card.pricing_mode === "slot") continue
    const subtotal = deskSubtotal(card, minutes, players)
    if (subtotal === null) continue

    eligible.push(card)
    if (subtotal < lowestSubtotal) {
      defaultCard = card
      lowestSubtotal = subtotal
    }
  }

  return { eligible, card: eligible.find(card => card.profile === choice) ?? defaultCard }
}

export default function DeskRateEditor({ vendor, games, baseRate, title }: { vendor: number | null; games: { id: number; game_name: string }[]; baseRate?: ReactNode; title?: string }) {
  const [revision, refresh] = useState(0)
  const { cards, error, loading } = useDeskCards(vendor, revision)
  const [game, setGame] = useState(String(games[0]?.id || ""))
  const [modeDraft, setModeDraft] = useState<"slot" | "variants" | null>(null)
  const [draft, setDraft] = useState<RateDefinition | null>(null)
  const [editing, setEditing] = useState<DeskCard | null>(null)
  const [status, setStatus] = useState("")
  const [saving, setSaving] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [previewMinutes, setPreviewMinutes] = useState(60)
  const [previewPlayers, setPreviewPlayers] = useState(1)
  const gameCards = cards.filter(card => card.game_id === Number(game))
  const savedMode = gameCards[0]?.pricing_mode ?? (gameCards.some(card => card.is_active && !card.archived) ? "variants" : "slot")
  const mode = modeDraft ?? savedMode
  const input = "h-9 w-full rounded-md border bg-background px-2 text-sm"
  const button = buttonVariants({ variant: "outline", size: "sm" })
  const busy = loading || saving || !!error
  const endpoint = `${BOOKING_URL}/api/vendor/${vendor}/desk-rates`
  async function write(url: string, method: string, body: unknown) {
    const response = await fetch(url, { method, headers: creditAuthHeaders(), body: JSON.stringify(body) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw Error(result.error || "Could not save pricing.")
    return result
  }
  async function maintain(card: DeskCard, changes: { archived?: boolean; is_active?: boolean }) {
    setSaving(true); setStatus("")
    try {
      await write(endpoint, "PATCH", { game_id: card.game_id, profile: card.profile, revision: card.revision, ...changes })
      if (editing?.profile === card.profile) { setEditing(null); setDraft(null) }
      setModeDraft(null); refresh(n => n + 1); setStatus("Rate updated.")
    } catch (e) { setStatus(e instanceof Error ? e.message : "Could not update rate.") }
    finally { setSaving(false) }
  }
  function edit(card: DeskCard, duplicate = false) {
    setEditing(duplicate ? null : card)
    setDraft({ ...card.definition, name: card.definition.name + (duplicate ? " copy" : ""), rules: card.definition.rules.map(rule => ({ ...rule })) })
    setStatus("")
  }
  function updateRule(index: number, changes: Partial<PriceRule>) {
    setDraft(current => current && ({ ...current, rules: current.rules.map((rule, i) => i === index ? { ...rule, ...changes } : rule) }))
  }
  const quote = draft ? deskSubtotal({ definition: draft } as DeskCard, previewMinutes, previewPlayers) : null
  const models = [...new Set(gameCards.map(card => card.definition.model_name))]
  const variants = [...new Set(gameCards.map(card => card.definition.game_variant).filter(Boolean))]
  const sizes = [...new Set(gameCards.map(card => card.definition.screen_size_inches).filter(Boolean))]
  return <section className="space-y-4 rounded-xl border bg-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{title || games.find(item => String(item.id) === game)?.game_name || "Device pricing"}</h2><span className="text-xs text-muted-foreground">{error ? "Pricing unavailable" : loading ? "Loading…" : savedMode === "variants" ? "Custom dashboard rates" : "Slot pricing"}</span></div>
    {games.length > 1 && <label className="block text-sm">Device<select className={input} value={game} onChange={e => { setGame(e.target.value); setDraft(null); setEditing(null); setModeDraft(null) }}>{games.map(item => <option key={item.id} value={item.id}>{item.game_name}</option>)}</select></label>}
    <label className="block text-sm">Dashboard pricing<select aria-label="Dashboard pricing rule" disabled={busy} className={`${input} mt-1 max-w-sm`} value={mode} onChange={async e => {
      const next = e.target.value as "slot" | "variants"
      if (next === "variants" && !gameCards.some(card => !card.archived)) { setModeDraft(next); setDraft(blankDefinition()); setEditing(null); setStatus("Create a rate to enable custom pricing."); return }
      setSaving(true); setStatus("")
      try { await write(endpoint + "/mode", "PUT", { game_id: Number(game), mode: next }); setModeDraft(null); setDraft(null); setEditing(null); refresh(n => n + 1); setStatus("Pricing rule saved.") }
      catch (e) { setStatus(e instanceof Error ? e.message : "Could not change pricing.") }
      finally { setSaving(false) }
    }}><option value="slot">Same price per slot</option><option value="variants">Custom rate cards</option></select></label>
    {mode === "slot" && baseRate}
    <>
      {mode === "variants" && baseRate && <details className="rounded border p-3"><summary className="cursor-pointer text-xs">Customer app default slot rate</summary><div className="mt-3">{baseRate}</div></details>}
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">Rate cards</span><div className="flex gap-2"><button className={button} disabled={busy} onClick={() => setShowArchived(!showArchived)}>{showArchived ? "Hide archived" : "Show archived"}</button><button className={button} disabled={busy || !game} onClick={() => { setEditing(null); setDraft(blankDefinition()); setStatus("") }}>+ New rate card</button></div></div>
      <div className="space-y-2">{gameCards.filter(card => showArchived || !card.archived).map(card => <div key={card.profile} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
        <div><p className="text-sm font-medium">{rateLabel(card)}</p><p className="text-xs text-muted-foreground">{card.definition.model_name} · {card.definition.rules.length} rules · {card.archived ? "Archived" : card.is_active ? "Enabled" : "Disabled"}</p></div>
        <div className="flex flex-wrap gap-2">{!card.archived && <><button className={button} disabled={busy} onClick={() => edit(card)}>Edit</button><button className={button} disabled={busy} onClick={() => edit(card, true)}>Duplicate</button><button className={button} disabled={busy} onClick={() => maintain(card, { is_active: !card.is_active })}>{card.is_active ? "Disable" : "Enable"}</button></>}
          <button className={button} disabled={busy} onClick={() => maintain(card, { archived: !card.archived })}>{card.archived ? "Restore" : "Archive"}</button></div>
      </div>)}{!gameCards.length && !draft && <p className="text-sm text-muted-foreground">Create a rate card to start custom pricing.</p>}</div>
      {draft && <form className="space-y-4 rounded-lg border p-3" onSubmit={async e => {
        e.preventDefault(); setSaving(true); setStatus("")
        try {
          const profile = editing?.profile || "custom_" + crypto.randomUUID().replaceAll("-", "")
          await write(endpoint, "PUT", { game_id: Number(game), profile, revision: editing?.revision, definition: draft })
          setDraft(null); setEditing(null); setModeDraft(null); refresh(n => n + 1); setStatus(editing ? "Rate saved. Existing bookings keep their price." : "Rate created and enabled.")
        } catch (e) { setStatus(e instanceof Error ? e.message : "Could not save rate.") }
        finally { setSaving(false) }
      }}>
        <h3 className="text-sm font-semibold">{editing ? "Edit rate card" : "New rate card"}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs">Rate name<input required maxLength={120} className={input} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Name shown when booking" /></label>
          <label className="text-xs">Pricing model name<input required maxLength={120} list={`models-${game}`} className={input} value={draft.model_name} onChange={e => setDraft({ ...draft, model_name: e.target.value })} placeholder="Create or reuse a model name" /><datalist id={`models-${game}`}>{models.map(name => <option key={name} value={name} />)}</datalist></label>
          <label className="text-xs">TV size · inches (optional)<input type="number" min={1} max={1000} step={1} list={`screens-${game}`} className={input} value={draft.screen_size_inches ?? ""} onChange={e => setDraft({ ...draft, screen_size_inches: e.target.value ? Number(e.target.value) : null })} placeholder="Any size" /><datalist id={`screens-${game}`}>{sizes.map(size => <option key={size} value={size!} />)}</datalist></label>
          <label className="text-xs">Game variant (optional)<input maxLength={120} list={`variants-${game}`} className={input} value={draft.game_variant} onChange={e => setDraft({ ...draft, game_variant: e.target.value })} placeholder="Any title or edition" /><datalist id={`variants-${game}`}>{variants.map(name => <option key={name} value={name} />)}</datalist></label>
        </div>
        <ConsoleLinks vendor={vendor} game={Number(game)} screen={draft.screen_size_inches} value={draft.console_ids || []} onChange={ids => setDraft({ ...draft, console_ids: ids })} />
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.controllers_included} onChange={e => setDraft({ ...draft, controllers_included: e.target.checked })} />Controllers included in these rates</label>
        <div className="flex items-center justify-between"><h4 className="text-sm font-medium">Price rules</h4><button type="button" disabled={draft.rules.length >= 100 || busy} className={button} onClick={() => setDraft({ ...draft, rules: [...draft.rules, blankRule()] })}>+ Add rule</button></div>
        <p className="text-xs text-muted-foreground">Ranges include both ends. Leave maximum time blank for no limit. Rules must not overlap.</p>
        <div className="space-y-3">{draft.rules.map((rule, index) => <fieldset key={index} className="rounded-lg border p-3"><legend className="px-1 text-xs">Rule {index + 1}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            <label className="text-xs">From · min<input required type="number" min={1} max={10080} step={1} className={input} value={rule.min_minutes} onChange={e => updateRule(index, { min_minutes: Number(e.target.value) })} /></label>
            <label className="text-xs">To · min<input type="number" min={rule.min_minutes} max={10080} step={1} className={input} placeholder="No limit" value={rule.max_minutes ?? ""} onChange={e => updateRule(index, { max_minutes: e.target.value ? Number(e.target.value) : null })} /></label>
            <label className="text-xs">Min players<input required type="number" min={1} max={1000} step={1} className={input} value={rule.min_players} onChange={e => updateRule(index, { min_players: Number(e.target.value) })} /></label>
            <label className="text-xs">Max players<input required type="number" min={rule.min_players} max={1000} step={1} className={input} value={rule.max_players} onChange={e => updateRule(index, { max_players: Number(e.target.value) })} /></label>
            <label className="text-xs">Price · ₹<input required type="number" min={0} max={99999999} step="0.01" className={input} value={rule.amount} onChange={e => updateRule(index, { amount: e.target.value })} /></label>
            <label className="text-xs">Charge for<select className={input} value={rule.per_player ? "player" : "group"} onChange={e => updateRule(index, { per_player: e.target.value === "player" })}><option value="group">Whole group</option><option value="player">Each player</option></select></label>
            <label className="text-xs">Billing<select className={input} value={rule.unit_minutes ? "time" : "session"} onChange={e => updateRule(index, { unit_minutes: e.target.value === "time" ? 60 : 0 })}><option value="time">Per time unit</option><option value="session">Per session</option></select></label>
            <label className="text-xs">Unit · min<input required disabled={!rule.unit_minutes} type="number" min={1} max={10080} step={1} className={input} value={rule.unit_minutes || ""} onChange={e => updateRule(index, { unit_minutes: Number(e.target.value) })} /></label>
          </div><div className="mt-2 text-right"><button type="button" disabled={draft.rules.length === 1 || busy} className={button} onClick={() => setDraft({ ...draft, rules: draft.rules.filter((_, i) => i !== index) })}>Remove rule</button></div>
        </fieldset>)}</div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/30 p-3 text-xs"><strong>Test price</strong><label>Minutes<input type="number" min={1} className={`${input} w-24`} value={previewMinutes} onChange={e => setPreviewMinutes(Number(e.target.value))} /></label><label>Players<input type="number" min={1} max={1000} className={`${input} w-24`} value={previewPlayers} onChange={e => setPreviewPlayers(Number(e.target.value))} /></label><span aria-live="polite">{quote === null ? "No single matching rule" : `Gaming charges ₹${quote.toFixed(2)}`}</span><span className="text-muted-foreground">Before discounts and extras. Time-unit rates are prorated.</span></div>
        <div className="flex justify-end gap-2"><button type="button" className={button} disabled={saving} onClick={() => { setDraft(null); setEditing(null); setModeDraft(null) }}>Cancel</button><button disabled={busy || !game} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : editing ? "Save changes" : "Save & enable"}</button></div>
      </form>}
    </>
    <p role="status" className="text-xs text-muted-foreground">{error || status || (mode === "slot" ? "Slot rate × booked slots. Applicable offers and extras appear in the bill." : "Only enabled cards are available for new bookings. Existing bookings keep their price.")}</p>
    {error && <button className={button} onClick={() => refresh(n => n + 1)}>Reload rates</button>}
  </section>
}
