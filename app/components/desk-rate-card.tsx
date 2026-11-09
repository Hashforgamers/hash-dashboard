"use client"
import { useEffect, useState, type ReactNode } from "react"
import { BOOKING_URL } from "@/src/config/env"
import { creditAuthHeaders } from "@/lib/credit-auth"

export const profiles = {
  pc: ["PC", ["Under 2 hours", "2–3 hours", "Over 3 hours"], [100, 90, 80]],
  ps55: ['PS5 · 55″', ["1 player", "2 players", "3 players", "4 players"], [125, 100, 90, 90]],
  ps65: ['PS5 · 65″', ["1 player", "2 players", "3 players", "4 players"], [150, 125, 100, 100]],
  gta55: ['PS5 GTA6 · 55″', ["1 player"], [180]],
  gta65: ['PS5 GTA6 · 65″', ["1 player"], [200]],
  racing: ["Racing Sim", ["30 minutes total", "60 minutes total"], [100, 150]],
} as const
type Profile = keyof typeof profiles
export type DeskCard = { game_id: number; profile: Profile; rates: number[]; is_active?: boolean }

export function useDeskCards(vendor: number | null, revision = 0) {
  const [cards, setCards] = useState<DeskCard[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(!!vendor)
  useEffect(() => {
    const abort = new AbortController()
    setLoading(!!vendor)
    setCards([])
    setError("")
    if (vendor) fetch(BOOKING_URL + "/api/vendor/" + vendor + "/desk-rates", { headers: creditAuthHeaders(), signal: abort.signal })
      .then(async response => {
        if (!response.ok) { const failure = await response.json().catch(() => ({})); throw Error(failure.error || "Unable to load desk rates.") }
        const data = await response.json()
        if (!abort.signal.aborted) setCards(data)
      }).catch(e => { if (!abort.signal.aborted) setError(e.message) }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [vendor, revision])
  return { cards, error, loading }
}

export function deskSubtotal(card: DeskCard, minutes: number, players: number) {
  const {profile, rates} = card
  if (profile === "racing") return players === 1 && [30, 60].includes(minutes) ? rates[minutes === 30 ? 0 : 1] : null
  const hourly = profile === "pc" ? rates[minutes > 180 ? 2 : minutes >= 120 ? 1 : 0] : rates[players - 1]
  return hourly == null ? null : Math.round(Math.round(hourly * 100) * players * minutes / 60) / 100
}

export default function DeskRateEditor({vendor, games, baseRate}: {vendor: number|null; games: {id:number;game_name:string}[]; baseRate?: ReactNode}) {
  const [revision, refresh] = useState(0)
  const { cards, error, loading } = useDeskCards(vendor, revision)
  const [game, setGame] = useState(games.length ? String(games[0].id) : "")
  const [modeDraft, setModeDraft] = useState<"slot" | "variants" | null>(null)
  const [profile, setProfile] = useState<Profile>(/playstation|ps5/i.test(games[0]?.game_name || "") ? "ps55" : /racing/i.test(games[0]?.game_name || "") ? "racing" : "pc")
  const [draft, setDraft] = useState<string[] | null>(null)
  const [status, setStatus] = useState("")
  const [saving, setSaving] = useState(false)
  const gameCards = cards.filter(card=>card.game_id === Number(game))
  const savedMode = gameCards.some(card=>card.is_active !== false) ? "variants" : "slot"
  const mode = modeDraft ?? savedMode
  const existing = cards.find(card => card.game_id === Number(game) && card.profile === profile)
  const values = draft ?? (existing?.rates ?? profiles[profile][2]).map(String)
  const inputClass = "h-10 w-full rounded-md border bg-background px-3 text-sm"
  const isPS = ["ps55", "ps65", "gta55", "gta65"].includes(profile)
  const changeProfile = (value: Profile) => {setProfile(value);setDraft(null);setStatus("")}
  return <section className="rounded-xl border bg-card p-4 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{games.length === 1 ? games[0].game_name : "Device pricing"}</h2><span className="text-xs text-muted-foreground">{loading ? "Loading…" : savedMode === "variants" ? "Dashboard: variant rates" : "All bookings: slot rate"}</span></div>
    {games.length > 1 && <label className="space-y-1.5"><span className="text-muted-foreground">Device</span><select required className={inputClass} value={game} onChange={e => {setGame(e.target.value);setModeDraft(null);setDraft(null);setStatus("");const name=games.find(g=>String(g.id)===e.target.value)?.game_name.toLowerCase() || "";changeProfile(name.includes("playstation") || name.includes("ps5") ? "ps55" : name.includes("racing") ? "racing" : "pc")}}>
      <option value="">Choose device</option>{games.map(g => <option key={g.id} value={g.id}>{g.game_name}</option>)}</select></label>}
    <label className="block text-sm">Dashboard pricing<select aria-label={(games[0]?.game_name || "Device")+" pricing rule"} disabled={loading || saving || !!error} className={inputClass+" mt-1 max-w-sm"} value={mode} onChange={async e=>{
      const next=e.target.value as "slot" | "variants";
      setStatus("");
      if (!gameCards.length) {setModeDraft(next);return}
      setSaving(true);
      try {
        const response=await fetch(BOOKING_URL+"/api/vendor/"+vendor+"/desk-rates/mode",{method:"PUT",headers:creditAuthHeaders(),body:JSON.stringify({game_id:Number(game),mode:next})});
        if(!response.ok) throw Error("Could not change pricing rule.");
        setModeDraft(next);refresh(n=>n+1);setStatus("Pricing rule saved.");
      } catch(e) {setStatus(e instanceof Error?e.message:"Could not save pricing rule.")} finally {setSaving(false)}
    }}><option value="slot">Same price per slot</option><option value="variants">Duration / screen / player rates</option></select></label>
    {mode === "slot" && baseRate}
    {mode === "variants" && <><p className="text-xs text-muted-foreground">Replaces slot pricing for dashboard bookings. Staff see the rate and total before confirming.</p>
    {baseRate && <details className="rounded border p-3"><summary className="cursor-pointer text-xs">App &amp; kiosk default slot rate</summary><div className="mt-3">{baseRate}</div></details>}

    <form className="space-y-4 text-sm" onSubmit={async e => {
      e.preventDefault()
      setSaving(true)
      try {
        const response = await fetch(BOOKING_URL + "/api/vendor/" + vendor + "/desk-rates", {method:"PUT",headers:creditAuthHeaders(),body:JSON.stringify({game_id:Number(game),profile,rates:values})})
        if (!response.ok) throw Error((await response.json()).error || "Could not save rates.")
        setStatus("Rates saved and active for dashboard bookings.")
        setModeDraft("variants")
        refresh(n => n + 1)
      } catch(e) { setStatus(e instanceof Error ? e.message : "Could not save rates.") }
      finally { setSaving(false) }
    }}>
    <div className="grid gap-3 sm:grid-cols-3">

    <label className="space-y-1.5"><span className="text-muted-foreground">Pricing model</span><select className={inputClass} value={isPS ? "ps" : profile} onChange={e => changeProfile(e.target.value === "ps" ? "ps55" : e.target.value as Profile)}>
      <option value="pc">PC · duration tiers</option><option value="ps">Per-player hourly</option><option value="racing">Racing · session duration</option></select></label>
    {isPS && <><label className="space-y-1.5"><span className="text-muted-foreground">TV size</span><select className={inputClass} value={profile.endsWith("65") ? "65" : "55"} onChange={e=>changeProfile(((profile.startsWith("gta") ? "gta" : "ps")+e.target.value) as Profile)}><option value="55">55 inch</option><option value="65">65 inch</option></select></label>
    <label className="space-y-1.5"><span className="text-muted-foreground">Game variant</span><select className={inputClass} value={profile.startsWith("gta") ? "gta" : "ps"} onChange={e=>changeProfile((e.target.value+(profile.endsWith("65") ? "65" : "55")) as Profile)}><option value="ps">Standard games</option><option value="gta">GTA6</option></select></label></>}
    </div>
    <div className="rounded-lg border overflow-hidden"><div className="flex justify-between bg-muted/40 px-3 py-2 text-xs text-muted-foreground"><span>{profile === "pc" ? "Session duration" : isPS ? "Players" : "Session duration"}</span><span>{profile === "racing" ? "Session price (₹)" : "Per player / hour (₹)"}</span></div>
    {profiles[profile][1].map((label,i) => <label key={label} className="flex items-center justify-between gap-4 border-t px-3 py-2"><span>{label}</span><input required aria-label={label+" rate"} type="number" min="0" max="99999999" step=".01" className="h-9 w-32 rounded-md border bg-background px-3 text-right tabular-nums" value={values[i]} onChange={e => setDraft(values.map((v,j) => j === i ? e.target.value : v))}/></label>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3"><span role="status" className="text-xs text-muted-foreground">{error || (loading ? "Loading saved rates…" : status) || (existing ? "Editing saved rates" : "Suggested rates · save to apply")}</span><button disabled={!vendor || !game || saving || loading || !!error} className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save rates"}</button></div>
    </form>
    {!!gameCards.length && <div className="flex flex-wrap gap-2 border-t pt-3">{gameCards.map(card=><button type="button" key={card.game_id+card.profile} className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted" onClick={()=>{setGame(String(card.game_id));changeProfile(card.profile)}}>{games.find(g=>g.id===card.game_id)?.game_name} · {profiles[card.profile][0]}</button>)}</div>}
    </>}
    {mode === "slot" && <p role="status" className="text-xs text-muted-foreground">{error || status || "Slot rate × booked slots. Applicable offers and extras appear in the bill."}</p>}
    {error && <button type="button" className="text-sm underline" onClick={()=>refresh(n=>n+1)}>Retry loading rates</button>}
    </section>
}
