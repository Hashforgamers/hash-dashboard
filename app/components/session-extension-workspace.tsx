'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useAccess} from '@/app/context/AccessContext';
import {useSocket} from '@/app/context/SocketContext';
import {cafeCall,rupees} from '@/lib/cafe-api';
import {Button} from '@/components/ui/button';
import styles from './notification-panel.module.css';
type Session={runtime_id:string;revision:number;state:string;ended_at:string|null;request_id:string|null;gamer_name:string;console_name:string;extension:{reason_code:string|null;requested_price_paise:number|null};billing:{amount_due_paise:number}};
export default function SessionExtensionWorkspace(){
 const {selectedCafeId,activeStaff,can}=useAccess();const {socket}=useSocket();const [items,setItems]=useState<Session[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const lock=useRef(false);const context=useRef('');context.current=`${selectedCafeId}:${activeStaff?.id}`;
 const refresh=useCallback(async()=>{if(!selectedCafeId)return;const key=`${selectedCafeId}:${activeStaff?.id}`;const data=await cafeCall<{items:Session[]}>(`/${selectedCafeId}/extensions`);if(context.current!==key)return;setItems(data.items);setError('');setLoading(false);},[selectedCafeId,activeStaff?.id]);
 useEffect(()=>{let alive=true;setLoading(true);setItems([]);const update=()=>{if(alive)void refresh().catch(e=>{if(alive){setError(e.message);setLoading(false);}})};update();const poll=setInterval(update,15000);socket?.on('session.updated',update);socket?.on('connect',update);return()=>{alive=false;clearInterval(poll);socket?.off('session.updated',update);socket?.off('connect',update)}},[refresh,socket]);
 async function action(row:Session,kind:string,data:Record<string,unknown>){if(lock.current)return;lock.current=true;setBusy(true);try{await cafeCall(`/${selectedCafeId}/extensions/${row.runtime_id}/${kind}`,{...data,revision:row.revision,idempotency_key:`extension-${kind}-${row.runtime_id}-${row.revision}-${String(data.method||data.decision||'')}`});await refresh();}catch(e){setError(e instanceof Error?e.message:'Request failed');}finally{lock.current=false;setBusy(false);}}
 if(!activeStaff)return null;
 const relevant=items.filter(s=>s.request_id||(s.ended_at&&s.billing.amount_due_paise>0));
 if(loading||(!relevant.length&&!error))return null;
 return <section className={styles.activity} aria-label="Session requests">
  <h4 className={styles.activityTitle}>Session requests</h4>
  {error&&<p role="alert" className="text-xs text-rose-300">{error}</p>}
   {relevant.map(s=><div key={s.runtime_id} className={styles.session}><p className="text-xs font-medium">{s.gamer_name} · {s.console_name}</p><p className="mt-1 text-xs text-muted-foreground">{s.state.replaceAll('_',' ')} · Due {rupees(s.billing.amount_due_paise)}{s.request_id&&s.extension.requested_price_paise!=null&&` · Requested extension ${rupees(s.extension.requested_price_paise)}`}</p><div className="mt-2 flex flex-wrap gap-2">{s.request_id&&can('booking.manage')&&<>{activeStaff.role==='owner'&&<Button size="sm" disabled={busy} onClick={()=>action(s,'decision',{request_id:s.request_id,decision:'approve'})}>Approve</Button>}{s.state==='conflict_pending'&&<Button size="sm" disabled={busy} onClick={()=>action(s,'decision',{request_id:s.request_id,decision:'retry'})}>Retry extension</Button>}{activeStaff.role==='owner'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>action(s,'decision',{request_id:s.request_id,decision:'reject'})}>Reject</Button>}</>}{!s.ended_at&&can('booking.manage')&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>action(s,'end',{mode:'now'})}>End session</Button>}{s.ended_at&&s.billing.amount_due_paise>0&&can('wallet.topup')&&['cash','cafe_upi'].map(method=><Button key={method} size="sm" disabled={busy} onClick={()=>{if(window.confirm(`Confirm ${rupees(s.billing.amount_due_paise)} was actually received via ${method==='cash'?'cash':'UPI'}?`))void action(s,'settle',{method,amount_paise:s.billing.amount_due_paise});}}>Received {method==='cash'?'cash':'UPI'}</Button>)}</div>{s.state==='conflict_pending'&&<p className="mt-2 text-xs text-amber-400">Resolve the other booking in Schedule first. This action cannot displace it.</p>}</div>)}
 </section>;
}
