'use client';
import { LiveSessionTiming } from './live-session-timing';
import { Monitor, Power } from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useAccess} from '@/app/context/AccessContext';
import {useSocket} from '@/app/context/SocketContext';
import {cafeCall, rupees} from '@/lib/cafe-api';

type Request = {id:string;parent_id:string;minutes:number;amount:number;expires_at:string;email_delivery?:{sent:boolean;error:string|null}};
type Session = {id:string;kind:string;state:string;gamer_name:string;console_number:number;
  started_at:string|null;ends_at:string|null;payment_due:number;amount:number;minutes:number;continuation_request:Request|null};
type Snapshot = {items:Session[];requests:Request[]};

export default function QrLiveSessions({onCount,layout="cards",search=""}:{onCount?:(count:number)=>void;layout?:"cards"|"rows";search?:string}) {
  const {selectedCafeId,activeStaff,can}=useAccess();
  const {socket,isConnected}=useSocket();
  const [data,setData]=useState<Snapshot>({items:[],requests:[]});
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [now,setNow]=useState(Date.now());
  const actionLock=useRef(false);
  const context=`${selectedCafeId}:${activeStaff?.id}`;
  const currentContext=useRef(context);currentContext.current=context;
  const prefix=`/${selectedCafeId}`;
  const refresh=useCallback(async()=>{
    if(!selectedCafeId||!activeStaff)return;
    const token=localStorage.getItem('rbac_access_token_v1')||'';
    const key=`${selectedCafeId}:${activeStaff.id}`;
    const result=await cafeCall<Snapshot>(`/${selectedCafeId}/sessions/live`,undefined,'GET',token);
    if(currentContext.current===key){setData(result);setError('');}
  },[selectedCafeId,activeStaff?.id]);
  useEffect(()=>{
    setData({items:[],requests:[]});setError('');setBusy(false);
    const update=()=>{void refresh().catch(e=>{if(currentContext.current===context)setError(e.message);});};
    update();const poll=setInterval(update,15000);
    const tick=setInterval(()=>setNow(Date.now()),1000);
    const changed=(payload:{vendor_id?:number})=>{if(payload.vendor_id===Number(selectedCafeId))update();};
    socket?.on('cafe_session_updated',changed);socket?.on('connect',update);
    return()=>{clearInterval(poll);clearInterval(tick);socket?.off('cafe_session_updated',changed);socket?.off('connect',update);};
  },[refresh,socket,isConnected,context,selectedCafeId]);
  useEffect(()=>{onCount?.(data.items.filter(s=>s.kind!=='existing_booking'&&`${s.gamer_name} PC ${s.console_number}`.toLowerCase().includes(search.trim().toLowerCase())).length);},[data,onCount,search]);
  async function action(path:string,body:unknown,confirmation?:string) {
    if(actionLock.current||(confirmation&&!window.confirm(confirmation)))return;
    const key=currentContext.current;const token=localStorage.getItem('rbac_access_token_v1')||'';
    actionLock.current=true;setBusy(true);setError('');
    try {await cafeCall(path,body,'POST',token);if(currentContext.current===key)await refresh();}
    catch(e){if(currentContext.current===key)setError(e instanceof Error?e.message:'Request failed');}
    finally{actionLock.current=false;if(currentContext.current===key)setBusy(false);}
  }
  if(!activeStaff||!selectedCafeId)return null;
  const sessions=data.items.filter(s=>s.kind!=='existing_booking'&&`${s.gamer_name} PC ${s.console_number}`.toLowerCase().includes(search.trim().toLowerCase()));
  if(!sessions.length&&!error)return null;
  const notice=<>{error&&<p role="alert" className="text-sm text-red-400">{error}</p>}
    {data.requests.length>0&&<p className="text-xs text-amber-300">{data.requests.length} continuation request(s) awaiting owner approval.</p>}
    {activeStaff.role==='owner'&&data.requests.some(r=>r.email_delivery?.error)&&<p className="text-xs text-amber-300">Owner email delivery is pending. Review requests here.</p>}</>;
  return <>
    {(error||data.requests.length>0)&&(layout==='rows'?<tr><td colSpan={6} className="px-4 py-2">{notice}</td></tr>:<div>{notice}</div>)}

      {sessions.map(s=>{
        const remaining=s.ends_at?Math.max(0,Math.ceil((Date.parse(s.ends_at)-now)/1000)):0;
        const request=s.continuation_request;
        const playing=s.state==='active';
        const start = s.started_at ? Date.parse(s.started_at) : NaN;
        const elapsed = Number.isFinite(start) ? Math.max(0, Math.floor((now-start)/1000)) : 0;
        const progress = s.minutes>0 ? elapsed/(s.minutes*60)*100 : 0;
        const scheduleTime = (value:string|null) => value ? new Date(value).toLocaleTimeString('en-US',{timeZone:'Asia/Kolkata',hour:'numeric',minute:'2-digit'}) : 'Starting…';
        const cells=<>
          <td className="px-3 py-3 md:px-4"><div className="flex items-center gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300">{(s.gamer_name||'Guest').slice(0,2).toUpperCase()}</div><div><p className="live-session-customer-name text-sm font-semibold text-cyan-300">{s.gamer_name}</p><span className="text-xs text-slate-400">Self QR · {s.kind==='owner_credit'?'Owner-approved':'Cafe wallet'}</span></div></div></td>
          <td className="px-3 py-3 md:px-4"><div className="flex items-center gap-2 text-sm"><Monitor className="h-4 w-4 text-cyan-300"/>PC {s.console_number}</div></td>
          <td className="px-3 py-3 md:px-4"><div className="space-y-1 whitespace-nowrap text-xs"><p><span className="text-slate-400">Start:</span> {scheduleTime(s.started_at)}</p><p><span className="text-slate-400">End:</span> {scheduleTime(s.ends_at)}</p></div></td>
          <td className="px-3 py-3 md:px-4">{s.state==='reserved'?<span className="text-xs text-slate-400">Starting…</span>:<LiveSessionTiming elapsed={elapsed} remaining={remaining} progress={progress} overtime={playing&&remaining===0}/>}</td>
          <td className="px-3 py-3 md:px-4"><div className="space-y-1 text-xs"><p className={s.payment_due>0?'font-semibold text-amber-300':'text-emerald-300'}>{s.payment_due>0?`${rupees(s.payment_due)} due`:'Paid'}</p><p className="text-slate-400">{rupees(s.amount)} · {s.minutes} min</p></div></td>
          <td className="px-3 py-3 md:px-4 text-xs">
          {request&&<div className="mt-2 border-t pt-2"><p>Request: {request.minutes} min · {rupees(request.amount)} payable after play</p><p>Expires {new Date(request.expires_at).toLocaleTimeString()}</p>
            {activeStaff.role==='owner'?<div className="mt-1 flex gap-2">
              <button className="rounded border px-2 py-1 disabled:opacity-40" disabled={busy||remaining>0||Date.parse(request.expires_at)<=now}
                onClick={()=>action(`${prefix}/continuations/${request.id}/decision`,{decision:'approve',expected_amount:request.amount},`Approve ${request.minutes} minutes for ${rupees(request.amount)}, payable after play?`)}>Approve {remaining>0?'after timer ends':''}</button>
              <button className="rounded border px-2 py-1 disabled:opacity-40" disabled={busy}
                onClick={()=>action(`${prefix}/continuations/${request.id}/decision`,{decision:'reject'})}>Reject</button>
            </div>:<p>Owner approval required</p>}</div>}
          {['active','reserved'].includes(s.state)&&(activeStaff.role==='owner'||can('booking.manage'))&&<button
            className="inline-flex w-24 items-center justify-center gap-1 rounded-md bg-emerald-500 px-2 py-1 text-xs text-white transition-colors hover:bg-emerald-400 disabled:opacity-50" disabled={busy}
            onClick={()=>action(`${prefix}/sessions/${s.id}/end`,{},'Release this session? Accrued overtime remains payable.')}><Power className="h-3 w-3"/>Release</button>}
          {s.state==='completed'&&s.payment_due>0&&can('wallet.topup')&&<div className="mt-2 flex gap-2">{['cash','cafe_upi'].map(method=><button key={method}
            className="rounded border px-2 py-1 disabled:opacity-40" disabled={busy}
            onClick={()=>action(`${prefix}/sessions/${s.id}/settle`,{method,expected_amount:s.payment_due,idempotency_key:`session-settle-${s.id}-${method}`},`Confirm ${rupees(s.payment_due)} has actually been received via ${method==='cash'?'cash':'cafe UPI'}?`)}>Received {method==='cash'?'cash':'UPI'}</button>)}</div>}
          </td>
        </>;
        return layout==='rows'?<tr key={s.id}>{cells}</tr>:<div key={s.id} className="mb-2 overflow-auto rounded-lg border p-2"><table className="w-full"><tbody><tr className="flex flex-wrap [&>td]:px-2 [&>td]:py-1.5">{cells}</tr></tbody></table></div>;
      })}
  </>;
}
