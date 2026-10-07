'use client';
import {useEffect,useState} from 'react';
import {useAccess} from '@/app/context/AccessContext';
import {cafeCall,paise} from '@/lib/cafe-api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
type Policy={self_qr_credit_mode:'automatic'|'owner_approval';credit_limit_paise:number|null};
export default function SessionExtensionSettings(){
 const {selectedCafeId,activeStaff}=useAccess();const [policy,setPolicy]=useState<Policy|null>(null);
 const [limit,setLimit]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 useEffect(()=>{let alive=true;setPolicy(null);setMessage('');if(selectedCafeId)cafeCall<Policy>(`/${selectedCafeId}/extension-policy`).then(p=>{if(alive){setPolicy(p);setLimit(p.credit_limit_paise===null?'':String(p.credit_limit_paise/100));}}).catch(e=>{if(alive)setMessage(e.message);});return()=>{alive=false};},[selectedCafeId,activeStaff?.id]);
 if(activeStaff?.role!=='owner')return null;
 return <section className="mt-4 rounded-xl border bg-card p-5"><h3 className="font-semibold">Session extensions</h3><p className="mt-1 text-sm text-muted-foreground">Self QR uses this cafe wallet first. Choose what happens when it runs out. Existing bookings must be resolved before extending into their time.</p>
 {message&&<p role="status" className="mt-3 text-sm">{message}</p>}{policy&&<><label className="mt-4 block text-sm">Credit continuation<select className="mt-2 w-full rounded-md border bg-background p-2" value={policy.self_qr_credit_mode} onChange={e=>setPolicy({...policy,self_qr_credit_mode:e.target.value as Policy['self_qr_credit_mode']})}><option value="automatic">Automatic credit with dashboard notification</option><option value="owner_approval">Owner approval required</option></select></label><label className="mt-4 block text-sm">Self QR credit limit per gamer at this cafe (₹)<Input className="mt-2" inputMode="decimal" value={limit} onChange={e=>setLimit(e.target.value)} placeholder="No configured limit"/><span className="text-xs text-muted-foreground">Leave blank for no limit. Set 0 to disable credit play.</span></label><Button className="mt-4" disabled={busy} onClick={async()=>{setBusy(true);setMessage('');try{const value=limit.trim()?paise(limit):null;setPolicy(await cafeCall(`/${selectedCafeId}/extension-policy`,{...policy,credit_limit_paise:value},'PUT'));setMessage('Extension policy saved. Applies to the next authorization.');}catch(e){setMessage(e instanceof Error?e.message:'Could not save');}finally{setBusy(false);}}}>Save extension policy</Button></>}
 </section>;
}
