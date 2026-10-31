'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {Check, ChevronLeft, ChevronRight, Clock3, Loader2, RefreshCw, Wallet, X} from 'lucide-react';
import {useAccess} from '@/app/context/AccessContext';
import {useSocket} from '@/app/context/SocketContext';
import {BOOKING_URL} from '@/src/config/env';
import {creditAuthHeaders} from '@/lib/credit-auth';
import styles from './pay-at-cafe-requests.module.css';

type Request = {
  bookingId:number; vendorId?:number; batch_id?:string; username?:string;
  consoleType?:string; game?:{game_name?:string}; date?:string; time?:string;
  total_amount?:number; slot_count?:number; slot_price?:{single_slot_price?:number};
};
export function uniqueCafeRequests(rows:Request[], vendorId:number):Request[]{
  const seen=new Set<string>();
  return rows.filter(row=>{
    if(!Number.isFinite(Number(row.bookingId)) || Number(row.bookingId)<=0 || (row.vendorId!=null&&Number(row.vendorId)!==vendorId))return false;
    const key=row.batch_id?`batch:${row.batch_id}`:`booking:${row.bookingId}`;
    if(seen.has(key))return false;seen.add(key);return true;
  });
}
function bookingDate(value?:string){
  if(!value)return 'Date unavailable';
  const date=new Date(`${value.slice(0,10)}T12:00:00`);
  return Number.isNaN(date.getTime())?value:date.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
}

export default function PayAtCafeRequests({vendorId}:{vendorId:number|null}){
  const {activeStaff,can}=useAccess();
  const {socket,isConnected}=useSocket();
  const [requests,setRequests]=useState<Request[]>([]);
  const [page,setPage]=useState(0);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState<'accept'|'reject'|null>(null);
  const controller=useRef<AbortController|null>(null);
  const actionLock=useRef(false);
  const selectedRequest=useRef<number|null>(null);
  const context=useRef('');
  context.current=`${vendorId}:${activeStaff?.id}`;
  const refresh=useCallback(async()=>{
    if(!vendorId||!activeStaff)return;
    const key=`${vendorId}:${activeStaff.id}`;
    controller.current?.abort();const request=new AbortController();controller.current=request;
    setRefreshing(true);
    try{
      const response=await fetch(`${BOOKING_URL}/api/pay-at-cafe/pending/${vendorId}`,{headers:creditAuthHeaders(),signal:request.signal,cache:'no-store'});
      const data=await response.json();
      if(!response.ok||!data.success||!Array.isArray(data.notifications))throw new Error(data.message||'Unable to load requests. Retry to get the latest status.');
      if(request.signal.aborted||context.current!==key)return;
      const next=uniqueCafeRequests(data.notifications,Number(vendorId));
      const selected=next.findIndex(item=>item.bookingId===selectedRequest.current);
      setRequests(next);setPage(previous=>selected>=0?selected:Math.min(previous,Math.max(0,next.length-1)));setError('');
    }catch(e){if(!request.signal.aborted&&context.current===key)setError(e instanceof Error?e.message:'Unable to load requests');}
    finally{if(!request.signal.aborted&&context.current===key){setLoading(false);setRefreshing(false);}}
  },[vendorId,activeStaff?.id]);
  useEffect(()=>{
    context.current=`${vendorId}:${activeStaff?.id}`;
    setRequests([]);setPage(0);setLoading(true);setError('');setMessage('');
    if(!vendorId||!activeStaff){setLoading(false);return;}
    const update=()=>void refresh();update();
    const events=['connect','booking','pay_at_cafe_accepted','pay_at_cafe_rejected','booking_payment_update'];
    events.forEach(event=>socket?.on(event,update));
    const timer=setInterval(update,15000);
    window.addEventListener('refresh-dashboard',update);
    return()=>{context.current='';controller.current?.abort();clearInterval(timer);events.forEach(event=>socket?.off(event,update));window.removeEventListener('refresh-dashboard',update);};
  },[refresh,socket,vendorId,activeStaff?.id]);
  useEffect(()=>{
    if(!message)return;
    const timer=setTimeout(()=>setMessage(''),3000);
    return ()=>clearTimeout(timer);
  },[message]);
  const index=Math.min(page,Math.max(0,requests.length-1));
  const row=requests[index];
  selectedRequest.current=row?.bookingId??null;
  async function decide(decision:'accept'|'reject'){
    if(!row||!vendorId||!can('booking.manage')||actionLock.current)return;
    const key=context.current;
    actionLock.current=true;setBusy(decision);setError('');setMessage('');
    try{
      const response=await fetch(`${BOOKING_URL}/api/pay-at-cafe/${decision}`,{method:'POST',headers:creditAuthHeaders(),body:JSON.stringify({booking_id:row.bookingId,vendor_id:vendorId,action_source:'manual_dashboard',...(decision==='reject'?{rejection_reason:'Rejected by vendor'}:{})})});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.message||`Unable to ${decision} this request. Refresh and retry.`);
      if(context.current!==key)return;
      setRequests(previous=>previous.filter(item=>row.batch_id?item.batch_id!==row.batch_id:item.bookingId!==row.bookingId));
      setMessage(decision==='accept'?'Booking accepted.':'Request rejected.');
      window.dispatchEvent(new CustomEvent('pay-at-cafe-requests-updated'));
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      await refresh();
    }catch(e){if(context.current===key)setError(e instanceof Error?e.message:'Unable to update request');}
    finally{actionLock.current=false;setBusy(null);}
  }
  return <section className={styles.panel} aria-label="Pay at Cafe requests">
    <header className={styles.header}>
      <div className={styles.heading}><Wallet size={15}/><h2>Pay at Cafe</h2>{requests.length>0&&<span className={styles.count}>{requests.length}</span>}</div>
      <div className={styles.tools}><span className={styles.connection}><i className={isConnected?styles.live:styles.polling}/>{message || (isConnected?'Live':'Auto-refresh')}</span><button type="button" title="Refresh requests" aria-label="Refresh payment requests" disabled={refreshing||!!busy} onClick={()=>void refresh()}><RefreshCw size={13} className={refreshing?'animate-spin':''}/></button></div>
    </header>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {loading?<div className={styles.empty}><Loader2 size={18} className="animate-spin"/><span>Loading requests…</span></div>:row?<>
      <div className={styles.customer}><div><p className={styles.name}>{row.username||'Player'}</p><p className={styles.meta}>{row.game?.game_name||row.consoleType||'Gaming session'}{Number(row.slot_count)>1?` · ${row.slot_count} slots`:''}</p></div><div className={styles.amount}>₹{Number(row.total_amount??row.slot_price?.single_slot_price??0).toLocaleString('en-IN')}</div></div>
      <p className={styles.schedule}><Clock3 size={12}/><span>{bookingDate(row.date)} · {row.time||'Time unavailable'}</span></p>
      <footer className={styles.footer}>
        <div className={styles.pager}><button type="button" aria-label="Previous request" disabled={index===0||!!busy} onClick={()=>setPage(index-1)}><ChevronLeft size={14}/></button><span>{index+1} / {requests.length}</span><button type="button" aria-label="Next request" disabled={index>=requests.length-1||!!busy} onClick={()=>setPage(index+1)}><ChevronRight size={14}/></button></div>
        {can('booking.manage')?<div className={styles.actions}><button type="button" className={styles.reject} disabled={!!busy||refreshing||!!error} onClick={()=>void decide('reject')}>{busy==='reject'?<Loader2 size={13} className="animate-spin"/>:<X size={13}/>}Reject</button><button type="button" className={styles.accept} disabled={!!busy||refreshing||!!error} onClick={()=>void decide('accept')}>{busy==='accept'?<Loader2 size={13} className="animate-spin"/>:<Check size={13}/>}Accept</button></div>:<span className={styles.meta}>Manager approval required</span>}
      </footer>
    </>:!error?<div className={styles.empty}><span className={styles.emptyIcon}><Check size={17}/></span><p>No pending requests</p></div>:null}
    {message&&<p role="status" className="sr-only">{message}</p>}
  </section>;
}
