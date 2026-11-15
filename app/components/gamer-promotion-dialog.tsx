'use client';

import {useEffect,useRef,useState} from 'react';
import {BOOKING_URL} from '@/src/config/env';
import {creditAuthHeaders} from '@/lib/credit-auth';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';

type Gamer={id:number;name:string;contact:string};
type Template={name:string;language:string;fields:string[]};
type Sender={configured:boolean;credits:number;templates:Template[]};
type ConsentStatus={marketing_consent:boolean;opted_out:boolean};

function normalizeRecipient(value:string){
 let digits=String(value||'').replace(/\D/g,'');
 if(digits.length===10)digits=`91${digits}`;
 else if(digits.length===11&&digits.startsWith('0'))digits=`91${digits.slice(1)}`;
 return digits.length>=8&&digits.length<=15?`+${digits}`:'';
}

async function whatsappCall(vendorId:number,path:string,body?:unknown){
 const response=await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/whatsapp${path}`,{
  method:body?'POST':'GET',cache:'no-store',headers:creditAuthHeaders(),body:body?JSON.stringify(body):undefined,
 });
 const data=await response.json();
 if(!response.ok)throw new Error(data.error||'WhatsApp request failed.');
 return data;
}

export default function GamerPromotionDialog({vendorId,gamer,onOpenChange}:{vendorId:number|null;gamer:Gamer|null;onOpenChange:(open:boolean)=>void}){
 const [sender,setSender]=useState<Sender|null>(null);
 const [promotionsEnabled,setPromotionsEnabled]=useState(false);
 const [consentStatus,setConsentStatus]=useState<ConsentStatus|null>(null);
 const [recipient,setRecipient]=useState('');
 const [templateKey,setTemplateKey]=useState('');
 const [values,setValues]=useState<string[]>([]);
 const [consent,setConsent]=useState(false);
 const [consentNote,setConsentNote]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [notice,setNotice]=useState('');
 const sendKey=useRef<string|null>(null);

 useEffect(()=>{
  if(!vendorId||!gamer)return;
  let alive=true;
  const target=normalizeRecipient(gamer.contact);
  setSender(null);setConsentStatus(null);setRecipient(target);setTemplateKey('');setValues([]);setConsent(false);setConsentNote('');setNotice('');setLoading(true);sendKey.current=null;
  if(!target){setNotice('This gamer does not have a usable phone number.');setLoading(false);return;}
  void Promise.all([
   whatsappCall(vendorId,''),
   whatsappCall(vendorId,'/preferences'),
   whatsappCall(vendorId,`/contacts?recipient=${encodeURIComponent(target)}`),
  ]).then(([status,preferences,contact]:[Sender,{promotions:boolean},ConsentStatus])=>{
   if(!alive)return;setSender(status);setPromotionsEnabled(Boolean(preferences.promotions));setConsentStatus(contact);
  }).catch(error=>{if(alive)setNotice(error instanceof Error?error.message:'Could not load WhatsApp promotion settings.');}).finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[vendorId,gamer?.id,gamer?.contact]);

 const template=sender?.templates.find(item=>`${item.name}:${item.language}`===templateKey);
 async function sendPromotion(){
  if(!vendorId||!gamer||!template)return;
  setBusy(true);setNotice('');
  try{
   sendKey.current ||= crypto.randomUUID();
   await whatsappCall(vendorId,'/messages',{
    idempotency_key:sendKey.current,purpose:'promotions',recipient,template:template.name,language:template.language,
    parameters:values,consent,consent_note:consentNote,
   });
   sendKey.current=null;setNotice(`Promotion queued for ${gamer.name}. One credit was reserved.`);
   setConsent(false);setConsentNote('');
   try{const refreshed=await whatsappCall(vendorId,'');setSender(refreshed);}catch{/* The queued message is confirmed; keep that result visible if balance refresh fails. */}
  }catch(error){setNotice(error instanceof Error?error.message:'Could not queue the promotion.');}
  finally{setBusy(false)}
 }

 return <Dialog open={Boolean(gamer)} onOpenChange={open=>{if(!busy&&!open)onOpenChange(false)}}>
  <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-xl">
   <DialogHeader>
    <DialogTitle>Send a promotion</DialogTitle>
    <DialogDescription>{gamer?`To ${gamer.name} · ${recipient||gamer.contact}`:'Choose a gamer to continue.'} One credit is used if the message is queued.</DialogDescription>
   </DialogHeader>
   {loading?<p role="status" className="text-sm text-muted-foreground">Checking sender, credits and consent…</p>:<div className="space-y-4">
    {notice&&<p role="status" className="rounded-md border p-3 text-sm">{notice}</p>}
    {sender&&<p className="text-sm">{sender.configured?'Sender ready':'Sender setup pending'} · {sender.credits} message credits</p>}
    {!promotionsEnabled&&<p className="rounded-md border border-amber-500/40 p-3 text-sm">Enable Promotions in My Account → Notification Preferences before sending.</p>}
    {consentStatus&&!consentStatus.marketing_consent&&!consentStatus.opted_out&&<p className="rounded-md border border-amber-500/40 p-3 text-sm">Marketing consent is not recorded for this number. Record the gamer’s opt-in under My Account → Notification Preferences first.</p>}
    {consentStatus?.opted_out&&<p role="alert" className="rounded-md border border-red-500/40 p-3 text-sm">This number has opted out of HFG WhatsApp messages and cannot receive a promotion.</p>}
    <label className="block text-sm">Approved marketing template<select className="mt-1 block w-full rounded-md border bg-background p-2" value={templateKey} onChange={event=>{setTemplateKey(event.target.value);setValues([]);sendKey.current=null}}><option value="">Choose a template</option>{sender?.templates.map(item=><option key={`${item.name}:${item.language}`} value={`${item.name}:${item.language}`}>{item.name} ({item.language})</option>)}</select><span className="mt-1 block text-xs text-muted-foreground">Choose a template approved by Meta for marketing messages.</span></label>
    {template?.fields.map((field,index)=><label className="block text-sm" key={index}>{field}<Input className="mt-1" value={values[index]||''} maxLength={500} onChange={event=>{setValues(current=>{const next=[...current];next[index]=event.target.value;return next});sendKey.current=null}}/></label>)}
    <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/>I confirm the gamer has agreed to receive this promotion from Hash for Gamers.</label>
    <label className="block text-sm">Consent record<Input className="mt-1" maxLength={500} value={consentNote} onChange={event=>{setConsentNote(event.target.value);sendKey.current=null}} placeholder="How and when the gamer opted in"/></label>
   </div>}
   <DialogFooter>
    <Button variant="outline" disabled={busy} onClick={()=>onOpenChange(false)}>Close</Button>
    <Button disabled={loading||busy||!sender?.configured||sender.credits<1||!promotionsEnabled||!consentStatus?.marketing_consent||Boolean(consentStatus?.opted_out)||!template||!consent||consentNote.trim().length<3||template.fields.some((_,index)=>!values[index]?.trim())} onClick={()=>void sendPromotion()}>{busy?'Queueing…':'Queue promotion · 1 credit'}</Button>
   </DialogFooter>
  </DialogContent>
 </Dialog>;
}
