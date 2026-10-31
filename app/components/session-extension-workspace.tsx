'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useAccess} from '@/app/context/AccessContext';
import {useSocket} from '@/app/context/SocketContext';
import {cafeCall,rupees} from '@/lib/cafe-api';
import {Button} from '@/components/ui/button';
import {Check, Clock3, MonitorOff, CircleCheck, Bell, Loader2, ChevronDown, ChevronUp, Activity} from 'lucide-react';
import styles from './notification-panel.module.css';
type Session={runtime_id:string;revision:number;state:string;ended_at:string|null;request_id:string|null;gamer_name:string;console_name:string;extension:{reason_code:string|null;requested_price_paise:number|null};billing:{amount_due_paise:number}};
type Notice={id:string;runtime_id:string;kind:string;created_at?:string};
const noticeStyles:Record<string,{label:string;icon:typeof Bell;color:string}>={
 session_ended:{label:'Session ended',icon:CircleCheck,color:'text-slate-400'},
 kiosk_offline:{label:'Kiosk offline',icon:MonitorOff,color:'text-rose-300'},
 time_low:{label:'Session ending soon',icon:Clock3,color:'text-amber-300'},
 approval_required:{label:'Extension needs approval',icon:Clock3,color:'text-amber-300'},
 extension_granted:{label:'Session extended',icon:CircleCheck,color:'text-emerald-300'},
};
function noticeTime(value?:string){
 if(!value)return '';
 const time=new Date(value);if(Number.isNaN(time.getTime()))return '';
 return time.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}
export default function SessionExtensionWorkspace(){
 const [showAll,setShowAll]=useState(false);
 const [readingId,setReadingId]=useState<string|null>(null);
 const {selectedCafeId,activeStaff,can}=useAccess();const {socket}=useSocket();const [items,setItems]=useState<Session[]>([]);const [notices,setNotices]=useState<Notice[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const lock=useRef(false);const context=useRef('');context.current=`${selectedCafeId}:${activeStaff?.id}`;
 const refresh=useCallback(async()=>{if(!selectedCafeId)return;const key=`${selectedCafeId}:${activeStaff?.id}`;const data=await cafeCall<{items:Session[];notices:Notice[]}>(`/${selectedCafeId}/extensions`);if(context.current!==key)return;setItems(data.items);setNotices(data.notices);setError('');setLoading(false);},[selectedCafeId,activeStaff?.id]);
 useEffect(()=>{let alive=true;setLoading(true);setItems([]);setNotices([]);setShowAll(false);const update=()=>{if(alive)void refresh().catch(e=>{if(alive){setError(e.message);setLoading(false);}})};update();const poll=setInterval(update,15000);socket?.on('session.updated',update);socket?.on('connect',update);return()=>{alive=false;clearInterval(poll);socket?.off('session.updated',update);socket?.off('connect',update)}},[refresh,socket]);
 async function action(row:Session,kind:string,data:Record<string,unknown>){if(lock.current)return;lock.current=true;setBusy(true);try{await cafeCall(`/${selectedCafeId}/extensions/${row.runtime_id}/${kind}`,{...data,revision:row.revision,idempotency_key:`extension-${kind}-${row.runtime_id}-${row.revision}-${String(data.method||data.decision||'')}`});await refresh();}catch(e){setError(e instanceof Error?e.message:'Request failed');}finally{lock.current=false;setBusy(false);}}
 async function markRead(notice:Notice){
  if(lock.current)return;lock.current=true;setBusy(true);setReadingId(notice.id);
  try{await cafeCall(`/${selectedCafeId}/extension-notices/${notice.id}/read`,{});await refresh();}
  catch(e){setError(e instanceof Error?e.message:'Unable to mark notification as read');}
  finally{lock.current=false;setBusy(false);setReadingId(null);}
 }
 if(!activeStaff)return null;
 const relevant=items.filter(s=>s.request_id||s.billing.amount_due_paise>0);
 return <section className={styles.activity} aria-label="Session activity">
  <div className={styles.sectionHead}>
   <h4 className={styles.activityTitle}><Activity size={14}/> Session activity</h4>
   {notices.length>0&&<span className={styles.count} aria-label={`${notices.length} unread session alerts`}>{notices.length}</span>}
  </div>
  {loading?<p className={styles.empty}>Loading session activity…</p>:<>
   {error&&<p role="alert" className="mb-2 rounded-md bg-rose-500/10 p-2 text-xs text-rose-300">{error}</p>}
   {relevant.map(s=><div key={s.runtime_id} className={styles.session}><p className="text-xs font-medium">{s.gamer_name} · {s.console_name}</p><p className="mt-1 text-xs text-muted-foreground">{s.state.replaceAll('_',' ')} · Due {rupees(s.billing.amount_due_paise)}{s.request_id&&s.extension.requested_price_paise!=null&&` · Requested extension ${rupees(s.extension.requested_price_paise)}`}</p><div className="mt-2 flex flex-wrap gap-2">{s.request_id&&can('booking.manage')&&<>{activeStaff.role==='owner'&&<Button size="sm" disabled={busy} onClick={()=>action(s,'decision',{request_id:s.request_id,decision:'approve'})}>Approve</Button>}{s.state==='conflict_pending'&&<Button size="sm" disabled={busy} onClick={()=>action(s,'decision',{request_id:s.request_id,decision:'retry'})}>Retry extension</Button>}{activeStaff.role==='owner'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>action(s,'decision',{request_id:s.request_id,decision:'reject'})}>Reject</Button>}</>}{!s.ended_at&&can('booking.manage')&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>action(s,'end',{mode:'now'})}>End session</Button>}{s.ended_at&&s.billing.amount_due_paise>0&&can('wallet.topup')&&['cash','cafe_upi'].map(method=><Button key={method} size="sm" disabled={busy} onClick={()=>{if(window.confirm(`Confirm ${rupees(s.billing.amount_due_paise)} was actually received via ${method==='cash'?'cash':'UPI'}?`))void action(s,'settle',{method,amount_paise:s.billing.amount_due_paise});}}>Received {method==='cash'?'cash':'UPI'}</Button>)}</div>{s.state==='conflict_pending'&&<p className="mt-2 text-xs text-amber-400">Resolve the other booking in Schedule first. This action cannot displace it.</p>}</div>)}
   <ul className={styles.noticeList}>
    {(showAll?notices:notices.slice(0,4)).map(n=>{
     const presentation=noticeStyles[n.kind]||{label:n.kind.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase()),icon:Bell,color:'text-cyan-300'};
     const Icon=presentation.icon;
     const session=items.find(item=>item.runtime_id===n.runtime_id);
     const contextLabel=[session?.console_name,session?.gamer_name].filter(Boolean).join(' · ');
     return <li key={n.id} className={styles.notice}>
      <span className={`${styles.noticeIcon} ${presentation.color}`}><Icon size={15} aria-hidden="true"/></span>
      <div className={styles.noticeContent}>
       <p className={styles.noticeTitle}>{presentation.label}</p>
       <div className={styles.noticeMeta}>
        {contextLabel&&<span className={styles.noticeContext} title={contextLabel}>{contextLabel}</span>}
        {n.created_at&&<time dateTime={n.created_at}>{noticeTime(n.created_at)}</time>}
       </div>
      </div>
      <button type="button" disabled={busy} className={styles.readButton} aria-label={`Mark ${presentation.label.toLowerCase()} as read${contextLabel?` for ${contextLabel}`:''}`} title="Mark as read" onClick={()=>void markRead(n)}>
       {readingId===n.id?<Loader2 size={15} className="animate-spin"/>:<Check size={15}/>}
      </button>
     </li>;
    })}
   </ul>
   {notices.length>4&&<button type="button" className={styles.showMore} aria-expanded={showAll} onClick={()=>setShowAll(!showAll)}>
    {showAll?'Show less':`Show ${notices.length-4} more alerts`} {showAll?<ChevronUp size={13} className="inline"/>:<ChevronDown size={13} className="inline"/>}
   </button>}
   {!notices.length&&!relevant.length&&!error&&<p className={styles.empty}>No session alerts. Everything is up to date.</p>}
  </>}
 </section>;
}
