"use client"
import { useEffect, useState } from "react"
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
export type DeskCard = { game_id: number; profile: Profile; rates: number[] }

export function useDeskCards(vendor: number | null, revision = 0) {
  const [cards, setCards] = useState<DeskCard[]>([])
  const [error, setError] = useState("")
  useEffect(() => {
    const abort = new AbortController()
    setCards([])
    setError("")
    if (vendor) fetch(BOOKING_URL + "/api/vendor/" + vendor + "/desk-rates", { headers: creditAuthHeaders(), signal: abort.signal })
      .then(async response => {
        if (!response.ok) throw Error("Unable to load desk rates.")
        const data = await response.json()
        if (!abort.signal.aborted) setCards(data)
      }).catch(e => { if (!abort.signal.aborted) setError(e.message) })
    return () => abort.abort()
  }, [vendor, revision])
  return { cards, error }
}

export function deskSubtotal(card: DeskCard, minutes: number, players: number) {
  const {profile, rates} = card
  if (profile === "racing") return players === 1 && [30, 60].includes(minutes) ? rates[minutes === 30 ? 0 : 1] : null
  const hourly = profile === "pc" ? rates[minutes > 180 ? 2 : minutes >= 120 ? 1 : 0] : rates[players - 1]
  return hourly == null ? null : Math.round(hourly * players * minutes / 60 * 100) / 100
}

export default function DeskRateEditor({vendor, games}: {vendor: number|null; games: {id:number;game_name:string}[]}) {
  const [revision, refresh] = useState(0)
  const { cards, error } = useDeskCards(vendor, revision)
  const [game, setGame] = useState("")
  const [profile, setProfile] = useState<Profile>("pc")
  const [draft, setDraft] = useState<string[] | null>(null)
  const [status, setStatus] = useState("")
  const [saving, setSaving] = useState(false)
  const existing = cards.find(card => card.game_id === Number(game) && card.profile === profile)
  const values = draft ?? (existing?.rates ?? profiles[profile][2]).map(String)
  return <details className="rounded border p-3"><summary className="cursor-pointer font-medium">Dashboard rate cards</summary>
    <form className="mt-3 flex flex-wrap items-end gap-3 text-sm" onSubmit={async e => {
      e.preventDefault()
      setSaving(true)
      try {
        const response = await fetch(BOOKING_URL + "/api/vendor/" + vendor + "/desk-rates", {method:"PUT",headers:creditAuthHeaders(),body:JSON.stringify({game_id:Number(game),profile,rates:values})})
        if (!response.ok) throw Error((await response.json()).error || "Could not save rates.")
        setStatus("Rates saved.")
        refresh(n => n + 1)
      } catch(e) { setStatus(e instanceof Error ? e.message : "Could not save rates.") }
      finally { setSaving(false) }
    }}>
    <label>Device<select required className="block rounded border bg-background p-2" value={game} onChange={e => {setGame(e.target.value);setDraft(null);setStatus("")}}>
      <option value="">Choose device</option>{games.map(g => <option key={g.id} value={g.id}>{g.game_name}</option>)}</select></label>
    <label>Rate card<select className="block rounded border bg-background p-2" value={profile} onChange={e => {setProfile(e.target.value as Profile);setDraft(null);setStatus("")}}>
      {Object.entries(profiles).map(([key,[label]]) => <option key={key} value={key}>{label}</option>)}</select></label>
    {profiles[profile][1].map((label,i) => <label key={label}>{label} · ₹{profile === "racing" ? "" : "/hr per player"}
      <input required type="number" min="0" step=".01" className="block w-24 rounded border bg-background p-2" value={values[i]} onChange={e => setDraft(values.map((v,j) => j === i ? e.target.value : v))}/></label>)}
    <button disabled={!vendor || saving || !!error} className="rounded border px-3 py-2">Save rates</button><span role="status">{error || status}</span></form></details>
}
