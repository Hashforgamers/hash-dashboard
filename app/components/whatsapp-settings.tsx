'use client';
import WhatsAppPreferences from './whatsapp-preferences';
import {useEffect,useRef,useState} from 'react';
import {useAccess} from '@/app/context/AccessContext';
import {BOOKING_URL} from '@/src/config/env';
import {creditAuthHeaders} from '@/lib/credit-auth';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
type Template={name:string;language:string;fields:string[]};
type State={ledger:{delta:number;reference:string;created_at:string}[];configured:boolean;credits:number;pack_price_paise:number;templates:Template[];messages:{id:string;recipient:string;template:string;status:string;error:string|null}[]};
export default function WhatsAppSettings(){
 const {selectedCafeId,can}=useAccess();const [data,setData]=useState<State|null>(null);const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const [recipient,setRecipient]=useState('');const [choice,setChoice]=useState('');const [values,setValues]=useState<string[]>([]);const [consent,setConsent]=useState(false);const [note,setNote]=useState('');
 const [purpose,setPurpose]=useState('updates');
 const sendKey=useRef<string|null>(null);const orderKey=useRef<string|null>(null);const cafe=useRef(selectedCafeId);cafe.current=selectedCafeId;
 async function call(path='',body?:unknown){const r=await fetch(`${BOOKING_URL}/api/vendor/${selectedCafeId}/whatsapp${path}`,{method:body?'POST':'GET',cache:'no-store',headers:creditAuthHeaders(),body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw new Error(d.error||'WhatsApp request failed');return d}
 async function refresh(){const id=selectedCafeId;const result=await call();if(cafe.current===id)setData(result)}
 useEffect(()=>{setData(null);setNotice('');setRecipient('');setConsent(false);setNote('');sendKey.current=null;orderKey.current=null;if(selectedCafeId&&can('account.manage'))void refresh().catch(e=>setNotice(e.message));},[selectedCafeId]);
 const template=data?.templates.find(t=>`${t.name}:${t.language}`===choice);
 async function buy(){setBusy(true);setNotice('');const vendor=selectedCafeId;try{
   if(!(window as any).Razorpay)await new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.onload=()=>resolve();script.onerror=()=>reject(new Error('Could not load checkout'));document.body.appendChild(script)});
   orderKey.current ||= crypto.randomUUID();const order=await call('/orders',{idempotency_key:orderKey.current});
   if(order.paid){orderKey.current=null;setNotice('This pack payment was already credited. Your balance is refreshed.');await refresh();setBusy(false);return;}
   const checkout=new (window as any).Razorpay({key:order.key_id,order_id:order.order_id,amount:order.amount,currency:'INR',name:'Hash for Gamers',description:'100 WhatsApp message credits',
     handler:async(result:unknown)=>{try{const r=await fetch(`${BOOKING_URL}/api/vendor/${vendor}/whatsapp/payments/verify`,{method:'POST',headers:creditAuthHeaders(),body:JSON.stringify(result)});const d=await r.json();if(!r.ok)throw new Error(d.error);if(cafe.current===vendor){orderKey.current=null;setNotice('Payment verified. 100 message credits activated.');await refresh();}}catch(e){if(cafe.current===vendor)setNotice(e instanceof Error?e.message:'Verification pending')}finally{setBusy(false)}},modal:{ondismiss:()=>setBusy(false)}});
   checkout.on('payment.failed',()=>{setNotice('Payment failed. No credits were added.');setBusy(false)});checkout.open();
 }catch(e){setNotice(e instanceof Error?e.message:'Checkout failed');setBusy(false)}}
 async function send(){if(!template)return;setBusy(true);try{sendKey.current ||= crypto.randomUUID();await call('/messages',{idempotency_key:sendKey.current,purpose,recipient,template:template.name,language:template.language,parameters:values,consent,consent_note:note});sendKey.current=null;setNotice('Message queued. One credit reserved.');await refresh();}catch(e){setNotice(e instanceof Error?e.message:'Send failed')}finally{setBusy(false)}}
 if(!can('account.manage'))return null;
 return <section className="mb-5 rounded-xl border bg-card p-5 space-y-4"><h3 className="text-lg font-semibold">WhatsApp · Hash for Gamers</h3><p className="text-sm text-muted-foreground">Send approved messages from the shared HFG number. One credit per message; confirmed failures return the credit.</p>
 {notice&&<p role="status">{notice}</p>}{data&&<><p>{data.configured?'Sender enabled':'Sender setup pending'} · <strong>{data.credits} credits</strong></p><div className="flex gap-3"><Button disabled={busy||!data.configured||!data.pack_price_paise} onClick={()=>void buy()}>Buy 100 messages · ₹{(data.pack_price_paise/100).toFixed(2)}</Button><Button variant="outline" disabled={busy} onClick={()=>void refresh().catch(e=>setNotice(e.message))}>Refresh balance & history</Button></div>
 {selectedCafeId&&<WhatsAppPreferences key={selectedCafeId} vendorId={selectedCafeId} templates={data.templates}/>}
 <fieldset disabled={busy||!data.configured||data.credits<1} className="space-y-3"><legend className="font-medium">Send a message</legend>
 <label className="block text-sm">Purpose<select className="block w-full rounded border bg-background p-2" value={purpose} onChange={e=>{setPurpose(e.target.value);sendKey.current=null}}><option value="updates">Customer update</option><option value="promotions">Promotion</option></select></label>
 <label className="block text-sm">Recipient with country code<Input value={recipient} onChange={e=>{setRecipient(e.target.value);sendKey.current=null;setConsent(false);setNote('')}} placeholder="+919876543210"/></label>
 <label className="block text-sm">Approved template<select className="block w-full rounded border bg-background p-2" value={choice} onChange={e=>{setChoice(e.target.value);setValues([]);sendKey.current=null}}><option value="">Choose template</option>{data.templates.map(t=><option key={`${t.name}:${t.language}`} value={`${t.name}:${t.language}`}>{t.name} ({t.language})</option>)}</select></label>
 {template?.fields.map((label,i)=><label className="block text-sm" key={i}>{label}<Input value={values[i]||''} maxLength={500} onChange={e=>{setValues(v=>{const next=[...v];next[i]=e.target.value;return next});sendKey.current=null}}/></label>)}
 <label className="flex gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Customer agreed to receive messages from Hash for Gamers</label>
 <label className="block text-sm">Consent record<Input maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="How and when the customer agreed"/></label>
 <Button disabled={!template||!consent||note.trim().length<3||!recipient||template.fields.some((_,i)=>!values[i]?.trim())} onClick={()=>void send()}>Queue message · 1 credit</Button></fieldset>
 <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Recipient</th><th>Template</th><th>Status</th></tr></thead><tbody>{data.messages.map(m=><tr className="border-t" key={m.id}><td className="py-2">{m.recipient}</td><td>{m.template}</td><td>{m.status}{m.error&&<p className="text-xs text-muted-foreground">{m.error}</p>}</td></tr>)}</tbody></table>{!data.messages.length&&<p>No messages sent yet.</p>}</div></>}
 <details><summary className="cursor-pointer text-sm">Credit activity</summary><ul className="mt-2 space-y-2 text-xs">{data?.ledger.map(entry=><li key={entry.reference}>{entry.delta>0?'+':''}{entry.delta} credits · {entry.reference.startsWith('purchase:')?'Pack purchase':entry.reference.startsWith('refund:')?'Message credit returned':'Message queued'} · {new Date(entry.created_at).toLocaleString()}</li>)}</ul></details>
 </section>
}
