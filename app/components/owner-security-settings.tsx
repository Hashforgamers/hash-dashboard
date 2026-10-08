'use client';
import {FormEvent,useEffect,useRef,useState} from 'react';
import {Eye,EyeOff,KeyRound,LockKeyhole,ShieldCheck,CheckCircle2,AlertCircle} from 'lucide-react';
import {useAccess} from '@/app/context/AccessContext';
import {apiCall} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';

type Field='current'|'value'|'confirm';
type Kind='password'|'pin';
type Draft=Record<Field,string>;
const emptyDraft=():Draft=>({current:'',value:'',confirm:''});
export default function OwnerSecuritySettings(){
 const {activeStaff,selectedCafeId}=useAccess();
 const [kind,setKind]=useState<Kind>('password');
 const [drafts,setDrafts]=useState<Record<Kind,Draft>>({password:emptyDraft(),pin:emptyDraft()});
 const fields=drafts[kind];
 const setFields=(update:Draft|((previous:Draft)=>Draft))=>setDrafts(previous=>({...previous,[kind]:typeof update==='function'?update(previous[kind]):update}));
 const [visible,setVisible]=useState<Partial<Record<Field,boolean>>>({});
 const [errors,setErrors]=useState<Partial<Record<Field,string>>>({});
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [success,setSuccess]=useState(false);
 const lock=useRef(false);const context=useRef('');const activeContext=`${selectedCafeId}:${activeStaff?.id}:${activeStaff?.role}`;context.current=activeContext;
 function reset(){setFields({current:'',value:'',confirm:''});setVisible({});setErrors({});setMessage('');setSuccess(false);}
 useEffect(()=>{setDrafts({password:emptyDraft(),pin:emptyDraft()});setVisible({});setErrors({});setMessage('');setSuccess(false);setBusy(false);lock.current=false;},[activeContext]);
 if(activeStaff?.role!=='owner'||!selectedCafeId)return null;
 const isPin=kind==='pin';
 async function save(e:FormEvent){
  e.preventDefault();if(lock.current)return;
  const invalid:Partial<Record<Field,string>>={};
  if(!fields.current)invalid.current='Enter your current owner password.';
  if(isPin&&!/^[0-9]{4}$/.test(fields.value))invalid.value='Enter exactly four digits.';
  if(!isPin&&(fields.value.length<8||fields.value.length>128))invalid.value='Use 8–128 characters.';
  if(!isPin&&fields.value===fields.current)invalid.value='Choose a password different from your current password.';
  if(!fields.confirm||fields.value!==fields.confirm)invalid.confirm=`The ${isPin?'PINs':'passwords'} do not match.`;
  setErrors(invalid);setMessage('');setSuccess(false);if(Object.keys(invalid).length){document.getElementById(`security-${Object.keys(invalid)[0]}`)?.focus();return;}
  const requestContext=activeContext;lock.current=true;setBusy(true);setVisible({});
  try{
   await apiCall(`/api/vendor/${selectedCafeId}/access/owner/security`,{method:'POST',body:JSON.stringify({kind,current_password:fields.current,new_value:fields.value,confirm_value:fields.confirm})});
   if(context.current!==requestContext)return;
   setFields({current:'',value:'',confirm:''});setSuccess(true);setMessage(isPin?'Owner PIN updated. Use the new PIN on this cafe’s kiosks.':'Password updated for your owner account. Use it the next time you sign in.');
  }catch(e){if(context.current===requestContext){const detail=e instanceof Error?e.message:'Unable to save changes. Please retry.';
    if(/current owner password/i.test(detail)){setErrors({current:'Current password is incorrect.'});document.getElementById('security-current')?.focus();}
    setMessage(/timeout|network|failed to fetch/i.test(detail)?`The result could not be confirmed. ${isPin?'Check the new PIN on this cafe’s kiosk':'Try the new password when signing in'} before repeating the change.`:detail);setSuccess(false);}}
  finally{if(context.current===requestContext){lock.current=false;setBusy(false);}}
 }
 const labels:Record<Field,string>={current:'Current password',value:isPin?'New owner PIN':'New password',confirm:isPin?'Confirm owner PIN':'Confirm password'};
 return <section className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="owner-security-title">
  <header className="flex items-start gap-3 border-b p-5 sm:p-6"><div className="rounded-lg bg-primary/10 p-2.5 text-primary"><ShieldCheck className="h-5 w-5"/></div><div><h2 id="owner-security-title" className="!text-base font-semibold">Owner security</h2><p className="mt-1 text-sm text-muted-foreground">Manage your account password and cafe access PIN.</p></div></header>
  <Tabs value={kind} onValueChange={next=>{if(busy)return;setKind(next as Kind);setVisible({});setErrors({});setMessage('');setSuccess(false);}} activationMode="manual" className="space-y-5 p-5 sm:p-6">
  <TabsList aria-label="Security settings" className="h-auto w-full justify-start gap-5 rounded-none border-b bg-transparent p-0 text-muted-foreground">
   <TabsTrigger type="button" value="password" disabled={busy} id="owner-password-tab" aria-controls="owner-password-panel" className="gap-2 rounded-none border-b-2 border-transparent px-1 pb-3 pt-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"><LockKeyhole className="h-4 w-4"/>Password</TabsTrigger>
   <TabsTrigger type="button" value="pin" disabled={busy} id="owner-pin-tab" aria-controls="owner-pin-panel" className="gap-2 rounded-none border-b-2 border-transparent px-1 pb-3 pt-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"><KeyRound className="h-4 w-4"/>Owner PIN</TabsTrigger>
  </TabsList>
  <div role="tabpanel" id={`owner-${kind}-panel`} aria-labelledby={`owner-${kind}-tab`} className="space-y-5">

  <div className="rounded-lg border bg-muted/20 p-3"><p className="text-sm font-medium">{isPin?'Access for this cafe':'Sign-in for your owner account'}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{isPin?'Use a four-digit PIN to authorize kiosk exit at this cafe. Team member PINs cannot authorize owner actions.':'Your password applies to all cafes linked to this owner account. Use 8–128 characters.'}</p></div>
  <p className="text-xs text-muted-foreground">Changes are saved only when you select {isPin?'Update owner PIN':'Update password'}. Switching tabs keeps your unsaved entries.</p>
  <form onSubmit={save} noValidate className="space-y-4">
   {(['current','value','confirm'] as Field[]).map(field=><div key={`${kind}-${field}`}><label htmlFor={`security-${field}`} className="mb-1.5 block text-sm font-medium">{labels[field]}</label><div className="relative"><Input id={`security-${field}`} className={`h-11 pr-11 ${isPin&&field!=='current'?'tracking-[0.3em]':''}`} type={visible[field]?'text':'password'} autoComplete={field==='current'?'current-password':isPin?'off':'new-password'} inputMode={isPin&&field!=='current'?'numeric':undefined} maxLength={field==='current'?undefined:isPin?4:128} disabled={busy} value={fields[field]} aria-invalid={!!errors[field]} aria-describedby={errors[field]?`security-${field}-error`:field==='current'?'security-verification':undefined} onChange={e=>{setFields(previous=>({...previous,[field]:e.target.value}));setErrors(previous=>({...previous,[field]:undefined}));setMessage('');}}/><button type="button" disabled={busy} aria-label={`${visible[field]?'Hide':'Show'} ${labels[field].toLowerCase()}`} aria-pressed={!!visible[field]} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={()=>setVisible(previous=>({...previous,[field]:!previous[field]}))}>{visible[field]?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></div>{errors[field]&&<p id={`security-${field}-error`} className="mt-1 text-xs text-destructive">{errors[field]}</p>}{field==='current'&&<p id="security-verification" className="mt-1 text-xs text-muted-foreground">Required to verify this change.</p>}</div>)}
   {message&&<div role={success?'status':'alert'} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${success?'border-emerald-500/30 bg-emerald-500/5':'border-destructive/30 bg-destructive/5'}`}>{success?<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"/>:<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive"/>}<span>{message}</span></div>}
   <footer className="flex flex-wrap items-center justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={busy} onClick={reset}>Clear</Button><Button disabled={busy} type="submit" className="min-w-36">{busy?'Saving…':isPin?'Update owner PIN':'Update password'}</Button></footer>
  </form></div></Tabs></section>;
}
