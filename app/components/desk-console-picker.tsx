"use client"
import { useEffect, useState } from "react"
import { BOOKING_URL } from "@/src/config/env"
import { creditAuthHeaders } from "@/lib/credit-auth"
import type { PhysicalConsole } from "./desk-console-mapping"
export function DeskConsolePicker({vendor,game,profile,date,slotIds,quantity,onChange}:{vendor:number|null;game:number;profile:string;date:string;slotIds:number[];quantity:number;onChange:(ids:number[]|null)=>void}) {
 const [rows,setRows]=useState<PhysicalConsole[]>([]),[selected,setSelected]=useState<number[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true),[refresh,reload]=useState(0)
 const key=JSON.stringify(slotIds)
 useEffect(()=>{const abort=new AbortController();setLoading(true);setRows([]);setSelected([]);setError("");onChange(null)
 fetch(`${BOOKING_URL}/api/vendor/${vendor}/desk-consoles/${game}/available`,{method:"POST",headers:creditAuthHeaders(),signal:abort.signal,body:JSON.stringify({profile,date,slot_ids:JSON.parse(key)})}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||"Unable to load consoles");if(abort.signal.aborted)return;setRows(d);if(d.length>=quantity){const ids=d.slice(0,quantity).map((c:PhysicalConsole)=>c.id);setSelected(ids);onChange(ids)}else setError(`Not enough compatible consoles for the full session (${quantity} required).`)}).catch(e=>{if(!abort.signal.aborted)setError(e.message)}).finally(()=>{if(!abort.signal.aborted)setLoading(false)})
 return()=>abort.abort()
 // onChange is the parent's stable state setter.
 },[vendor,game,profile,date,key,quantity,refresh,onChange])
 return <div className="space-y-2 rounded-md border p-2.5 text-xs"><div className="flex items-center justify-between"><span className="font-medium">Reserved console{quantity>1?"s":""}</span><button type="button" disabled={loading} onClick={()=>reload(n=>n+1)}>Refresh</button></div>{loading?<span>Checking availability…</span>:error?<p role="alert" className="text-amber-500">{error}</p>:quantity===1?<select aria-label="Physical console" className="h-9 w-full rounded border bg-background px-2" value={selected[0]||""} onChange={e=>{const ids=[Number(e.target.value)];setSelected(ids);onChange(ids)}}>{rows.map(row=><option key={row.id} value={row.id}>{row.name}{row.screen_size_inches?` · ${row.screen_size_inches}″`:""}</option>)}</select>:<div className="flex flex-wrap gap-3">{rows.map(row=><label key={row.id} className="flex items-center gap-1"><input type="checkbox" checked={selected.includes(row.id)} disabled={!selected.includes(row.id)&&selected.length>=quantity} onChange={e=>{const ids=e.target.checked?[...selected,row.id]:selected.filter(id=>id!==row.id);setSelected(ids);onChange(ids.length===quantity?ids:null)}}/>{row.name}</label>)}</div>}</div>
}
