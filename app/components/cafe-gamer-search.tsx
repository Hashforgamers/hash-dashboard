'use client';
import {useEffect, useState} from 'react';
import {cafeCall} from '@/lib/cafe-api';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';

export type CafeGamer = {id:number; name:string; game_username:string; phone:string|null; email:string|null};
export function CafeGamerSearch({cafeId, disabled, onSelect}: {cafeId:string|number; disabled:boolean; onSelect:(gamer:CafeGamer)=>void}) {
  const [query,setQuery]=useState('');
  const [rows,setRows]=useState<CafeGamer[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    setRows([]);setError('');
    const q=query.trim();
    if(q.length<2&&!/^\d+$/.test(q)){setLoading(false);return;}
    setLoading(true);
    const timer=setTimeout(()=>{
      cafeCall<CafeGamer[]>(`/${cafeId}/gamers?q=${encodeURIComponent(q)}`)
        .then(data=>{if(active)setRows(data);})
        .catch(e=>{if(active)setError(e instanceof Error?e.message:'Search failed');})
        .finally(()=>{if(active)setLoading(false);});
    },300);
    return ()=>{active=false;clearTimeout(timer);};
  },[query,cafeId]);
  return <div className="space-y-2">
    <label className="block space-y-1.5 text-xs font-medium">Gamer
      <Input disabled={disabled} value={query} onChange={e=>setQuery(e.target.value)} className="h-10 text-sm" placeholder="Search name, phone, email or Hash ID" autoComplete="off" />
    </label>
    {loading && <p role="status" className="text-xs text-muted-foreground">Searching…</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    {!loading&&!error&&(query.trim().length>=2||/^\d+$/.test(query.trim()))&&rows.length===0&&<p className="text-xs text-muted-foreground">No gamer found. Try a phone number or Hash ID.</p>}
    {rows.length>0&&<div className="max-h-80 overflow-auto rounded-md border"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-background"><tr><th className="p-2">Gamer</th><th className="p-2">Phone / email</th><th className="p-2">Hash ID</th><th className="p-2"><span className="sr-only">Select</span></th></tr></thead><tbody>{rows.map(row=><tr className="border-t" key={row.id}><td className="p-2 font-medium">{row.name}</td><td className="p-2"><div>{row.phone||'—'}</div><div className="text-muted-foreground">{row.email||'—'}</div></td><td className="p-2">{row.game_username}<span className="block text-muted-foreground">#{row.id}</span></td><td className="p-2"><Button variant="outline" size="sm" disabled={disabled} onClick={()=>{onSelect(row);setQuery('');}}>Top up</Button></td></tr>)}</tbody></table></div>}
  </div>;
}
