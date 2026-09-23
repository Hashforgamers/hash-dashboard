'use client';
import {useEffect,useState} from 'react';
import {useAccess} from '@/app/context/AccessContext';
import {cafeCall,rupees} from '@/lib/cafe-api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {CafeWalletWorkspace} from './cafe-wallet-workspace';

type Summary={date:string;net:number;methods:Record<string,{received:number;returned:number;net:number}>};
export function CafeCollections(){
 const {selectedCafeId,activeStaff,can}=useAccess();
 const [date,setDate]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date()));
 const [summary,setSummary]=useState<Summary|null>(null);
 const [error,setError]=useState('');const [loading,setLoading]=useState(false);
 const [revision,setRevision]=useState(0);const [shiftOpen,setShiftOpen]=useState(false);
 useEffect(()=>{const refresh=()=>setRevision(value=>value+1);window.addEventListener('cafe-desk-updated',refresh);return()=>window.removeEventListener('cafe-desk-updated',refresh);},[]);
 useEffect(()=>{
  let current=true;setSummary(null);setError('');setLoading(false);
  if(!selectedCafeId||!activeStaff||!can('transactions.view')||!date)return;
  setLoading(true);
  cafeCall<Summary>(`/${selectedCafeId}/collections?date=${date}`).then(result=>{if(current)setSummary(result);})
   .catch(e=>{if(current)setError(e instanceof Error?e.message:'Unable to load collections');})
   .finally(()=>{if(current)setLoading(false);});return()=>{current=false;};
 },[selectedCafeId,activeStaff?.id,date,revision]);
 if(!can('transactions.view')&&!can('wallet.topup'))return null;
 return <section aria-label="Cafe collections" className="gaming-panel shrink-0 space-y-2 rounded-lg px-3 py-2">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Collections</h2><div className="flex flex-wrap items-center gap-2">
   {can('transactions.view')&&<><Input aria-label="Collections date (India time)" title="India time" type="date" value={date} onChange={e=>setDate(e.target.value)} className="h-8 w-36 text-xs"/><Button size="sm" variant="ghost" disabled={loading} onClick={()=>setRevision(value=>value+1)}>Refresh</Button></>}
   {can('wallet.topup')&&<Button size="sm" variant="outline" onClick={()=>setShiftOpen(true)}>Manage shift</Button>}
  </div></div>
  {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
  {loading&&<p role="status" className="text-xs text-muted-foreground">Loading collections…</p>}
  {summary&&<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
   {[["Cash received",summary.methods.cash?.received||0],["UPI received",summary.methods.cafe_upi?.received||0],["Money returned",(summary.methods.cash?.returned||0)+(summary.methods.cafe_upi?.returned||0)],["Net collected",summary.net]].map(([label,value])=><div key={label} className="rounded-md bg-muted/30 px-2.5 py-1.5"><p className="text-[11px] text-muted-foreground">{label}</p><p className="text-sm font-semibold tabular-nums">{rupees(Number(value))}</p></div>)}
  </div>}
  {summary&&<p className="text-[11px] text-muted-foreground">Wallet top-ups + cafe food payments, less money returned. Gaming wallet usage is not counted again.</p>}
  <Dialog open={shiftOpen} onOpenChange={setShiftOpen}><DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto p-0"><DialogHeader className="sr-only"><DialogTitle>Manage your shift</DialogTitle></DialogHeader>{shiftOpen&&<CafeWalletWorkspace key={`${selectedCafeId}:${activeStaff?.id}`} embedded view="shift"/>}</DialogContent></Dialog>
 </section>;
}
