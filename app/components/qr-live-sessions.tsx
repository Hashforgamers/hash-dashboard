'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useAccess} from '@/app/context/AccessContext';
import {useSocket} from '@/app/context/SocketContext';
import {cafeCall, rupees} from '@/lib/cafe-api';

type Request = {id:string;parent_id:string;minutes:number;amount:number;expires_at:string;email_delivery?:{sent:boolean;error:string|null}};
type Session = {id:string;kind:string;state:string;gamer_name:string;console_number:number;
  ends_at:string|null;payment_due:number;amount:number;minutes:number;continuation_request:Request|null};
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
        const playing=s.state==='active'&&remaining>0;
        const cells=<>
          <td className="px-3 py-3"><p className="font-semibold text-slate-100">{s.gamer_name}</p><span className="text-xs text-cyan-300">Self QR</span></td>
          <td className="px-3 py-3 text-sm">PC {s.console_number}</td>
          <td className="px-3 py-3 text-xs"><p>{s.minutes} min · {rupees(s.amount)}</p><p className="text-slate-400">{s.kind==='owner_credit'?'Owner-approved':'Cafe wallet'}</p></td>
          <td className="px-3 py-3 text-sm tabular-nums">{s.state==='reserved'?'Starting…':playing?`${Math.floor(remaining/60)}m ${remaining%60}s left`:'Play stopped'}{playing&&remaining<=300&&<p className="text-xs text-amber-300">Time ends soon</p>}</td>
          <td className="px-3 py-3 text-sm">{s.payment_due>0?<span className="text-amber-300">{rupees(s.payment_due)} due</span>:<span className="text-emerald-300">Paid</span>}</td>
          <td className="px-3 py-3 text-xs">
          {request&&<div className="mt-2 border-t pt-2"><p>Request: {request.minutes} min · {rupees(request.amount)} payable after play</p><p>Expires {new Date(request.expires_at).toLocaleTimeString()}</p>
            {activeStaff.role==='owner'?<div className="mt-1 flex gap-2">
              <button className="rounded border px-2 py-1 disabled:opacity-40" disabled={busy||playing||Date.parse(request.expires_at)<=now}
                onClick={()=>action(`${prefix}/continuations/${request.id}/decision`,{decision:'approve',expected_amount:request.amount},`Approve ${request.minutes} minutes for ${rupees(request.amount)}, payable after play?`)}>Approve {playing?'after timer ends':''}</button>
              <button className="rounded border px-2 py-1 disabled:opacity-40" disabled={busy}
                onClick={()=>action(`${prefix}/continuations/${request.id}/decision`,{decision:'reject'})}>Reject</button>
            </div>:<p>Owner approval required</p>}</div>}
          {['active','reserved'].includes(s.state)&&(activeStaff.role==='owner'||can('booking.manage'))&&<button
            className="mt-2 rounded border px-2 py-1 disabled:opacity-40" disabled={busy}
            onClick={()=>action(`${prefix}/sessions/${s.id}/end`,{},s.kind==='owner_credit'?'End play? The approved fixed-duration price remains payable.':'End this paid session? The paid fixed-duration price remains charged.')}>End session</button>}
          {s.state==='completed'&&s.payment_due>0&&can('wallet.topup')&&<div className="mt-2 flex gap-2">{['cash','cafe_upi'].map(method=><button key={method}
            className="rounded border px-2 py-1 disabled:opacity-40" disabled={busy}
            onClick={()=>action(`${prefix}/sessions/${s.id}/settle`,{method,expected_amount:s.payment_due,idempotency_key:`session-settle-${s.id}-${method}`},`Confirm ${rupees(s.payment_due)} has actually been received via ${method==='cash'?'cash':'cafe UPI'}?`)}>Received {method==='cash'?'cash':'UPI'}</button>)}</div>}
          </td>
        </>;
        return layout==='rows'?<tr key={s.id}>{cells}</tr>:<div key={s.id} className="mb-2 overflow-auto rounded-lg border p-2"><table className="w-full"><tbody><tr className="flex flex-wrap [&>td]:px-2 [&>td]:py-1.5">{cells}</tr></tbody></table></div>;
      })}
  </>;
}
