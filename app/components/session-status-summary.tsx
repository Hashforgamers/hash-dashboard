'use client';
import {useEffect,useState} from 'react';
import {useAccess} from '@/app/context/AccessContext';
import {useSocket} from '@/app/context/SocketContext';
import {cafeCall} from '@/lib/cafe-api';
type State={session_id:string;console_id:number|null;console_number?:number;console_name?:string;customer_name?:string;lifecycle_state:string;device_state:string;allocation_state:string;billing:{amount_due_paise:number;payment_status?:string}};
export default function SessionStatusSummary(){
 const {selectedCafeId,activeStaff}=useAccess();const {socket}=useSocket();
 const [items,setItems]=useState<State[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;let pending=false;setItems([]);setLoading(true);setError('');
 const refresh=async()=>{if(pending||!selectedCafeId||!activeStaff)return;pending=true;try{const data=await cafeCall<{items:State[]}>(`/${selectedCafeId}/session-state`);if(alive){setItems(data.items);setError('');setLoading(false);}}catch(e){if(alive){setError(e instanceof Error?e.message:'Could not load PC status');setLoading(false);}}finally{pending=false;}};
 const update=()=>void refresh();update();const timer=setInterval(update,15000);socket?.on('session.updated',update);socket?.on('connect',update);socket?.on('cafe_session_updated',update);socket?.on('booking_slots_updated',update);
 return()=>{alive=false;clearInterval(timer);socket?.off('session.updated',update);socket?.off('connect',update);socket?.off('cafe_session_updated',update);socket?.off('booking_slots_updated',update);};},[selectedCafeId,activeStaff?.id,socket]);
 const unconfirmed=items.filter(i=>i.allocation_state==='occupied'&&i.device_state!=='confirmed');
 return <div className="mb-3 rounded border border-slate-700 px-3 py-2 text-xs" role="status">
 {error?<span className="text-amber-300">PC status unavailable · {error}</span>:loading?<span className="text-slate-400">Checking PC status…</span>:<>
 <span className="text-slate-300">{items.filter(i=>i.allocation_state==='occupied').length} occupied · {items.filter(i=>i.lifecycle_state==='ready').length} upcoming · {unconfirmed.length} awaiting PC confirmation</span>
 {unconfirmed.length>0&&<p className="mt-1 text-amber-300">{unconfirmed.map(i=>`${i.console_name||'PC'} ${i.console_number||i.console_id}`).join(', ')} · Start is recorded; PC confirmation is pending. Check the kiosk before starting another booking.</p>}
 </>}
 </div>;
}
