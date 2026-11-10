"use client"
import { useEffect, useState } from "react"
import { BOOKING_URL } from "@/src/config/env"
import { creditAuthHeaders } from "@/lib/credit-auth"
import { rateLabel, useDeskCards } from "./desk-rate-card"
export type PhysicalConsole = { id: number; name: string; screen_size_inches: number | null }
export function ConsoleLinks({ vendor, game, screen, value, onChange }: {vendor:number|null;game:number;screen:number|null;value:number[];onChange:(ids:number[])=>void}) {
  const [rows,setRows]=useState<PhysicalConsole[]>([]),[error,setError]=useState("")
  useEffect(()=>{const abort=new AbortController();setRows([]);setError("");if(vendor&&game)fetch(`${BOOKING_URL}/api/vendor/${vendor}/desk-consoles/${game}`,{headers:creditAuthHeaders(),signal:abort.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||"Unable to load consoles");if(!abort.signal.aborted)setRows(d)}).catch(e=>{if(!abort.signal.aborted)setError(e.message)});return()=>abort.abort()},[vendor,game])
  return <fieldset className="rounded-md border p-3"><legend className="px-1 text-sm font-medium">Compatible consoles</legend>
    <p className="mb-2 text-xs text-muted-foreground">Link consoles that support this game and player configuration. TV size must match.</p>
    {error&&<p role="alert" className="text-xs text-red-500">{error}</p>}
    <div className="grid gap-2 sm:grid-cols-2">{rows.map(row=>{const mismatch=!!screen&&row.screen_size_inches!==screen;return <label key={row.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.includes(row.id)} disabled={mismatch&&!value.includes(row.id)} onChange={e=>onChange(e.target.checked?[...value,row.id]:value.filter(id=>id!==row.id))}/>{row.name}{row.screen_size_inches?` · ${row.screen_size_inches}″`:""}{mismatch&&<span className="text-xs text-amber-500">TV size differs</span>}</label>})}</div>
    {!error&&!rows.length&&<p className="text-xs text-muted-foreground">Add physical consoles in Console Management first.</p>}
  </fieldset>
}
export function ConsoleRateLinks({vendor,consoleId}:{vendor:number|null;consoleId:number}) {
  const [revision,refresh]=useState(0),[status,setStatus]=useState(""),[busy,setBusy]=useState(false)
  const {cards,error}=useDeskCards(vendor,revision)
  const [games,setGames]=useState<number[]>([])
  useEffect(()=>{const abort=new AbortController();if(vendor)fetch(`${BOOKING_URL}/api/vendor/${vendor}/desk-console-games/${consoleId}`,{headers:creditAuthHeaders(),signal:abort.signal}).then(async r=>{if(!r.ok)throw Error("Unable to load console rates");return r.json()}).then(d=>{if(!abort.signal.aborted)setGames(d)}).catch(e=>{if(!abort.signal.aborted)setStatus(e.message)});return()=>abort.abort()},[vendor,consoleId])
  return <section className="space-y-2 rounded border p-3"><h3 className="text-sm font-medium">Rate cards</h3><p className="text-xs text-muted-foreground">Links save immediately. Save TV size changes before linking a matching card.</p>{cards.filter(c=>games.includes(c.game_id)&&!c.archived).map(card=><label key={`${card.game_id}-${card.profile}`} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={busy} checked={(card.definition.console_ids||[]).includes(consoleId)} onChange={async e=>{const ids=card.definition.console_ids||[];const next=e.target.checked?[...ids,consoleId]:ids.filter(id=>id!==consoleId);setBusy(true);setStatus("");try{const r=await fetch(`${BOOKING_URL}/api/vendor/${vendor}/desk-rates`,{method:"PUT",headers:creditAuthHeaders(),body:JSON.stringify({game_id:card.game_id,profile:card.profile,revision:card.revision,definition:{...card.definition,console_ids:next}})});const d=await r.json();if(!r.ok)throw Error(d.error||"Unable to save link");refresh(n=>n+1);setStatus("Console rate link saved.")}catch(e){setStatus(e instanceof Error?e.message:"Unable to save link")}finally{setBusy(false)}}}/>{rateLabel(card)}</label>)}{(error||status)&&<p role="status" className="text-xs">{error||status}</p>}</section>
}
