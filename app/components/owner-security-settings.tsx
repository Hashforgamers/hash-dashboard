'use client';
import {useState} from 'react';
import {useAccess} from '@/app/context/AccessContext';
import {apiCall} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

export default function OwnerSecuritySettings(){
 const {activeStaff,selectedCafeId}=useAccess();
 const [kind,setKind]=useState<'password'|'pin'>('password');
 const [current,setCurrent]=useState('');const [value,setValue]=useState('');const [confirm,setConfirm]=useState('');
 const [show,setShow]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 if(activeStaff?.role!=='owner'||!selectedCafeId)return null;
 async function save(e:React.FormEvent){
  e.preventDefault();setMessage('');
  if(value!==confirm){setMessage('Confirmation does not match.');return;}
  if(kind==='pin'&&!/^[0-9]{4}$/.test(value)){setMessage('Use a four-digit PIN.');return;}
  setBusy(true);
  try{await apiCall(`/api/vendor/${selectedCafeId}/access/owner/security`,{method:'POST',body:JSON.stringify({kind,current_password:current,new_value:value,confirm_value:confirm})});setCurrent('');setValue('');setConfirm('');setShow(false);setMessage(`Owner ${kind==='pin'?'PIN':'password'} updated successfully.`);}catch(e){setMessage(e instanceof Error?e.message:'Unable to update credentials');}finally{setBusy(false);}
 }
 return <section className="max-w-xl space-y-4 rounded-lg border bg-card p-5"><div><h2 className="text-base font-semibold">Owner security</h2><p className="mt-1 text-sm text-muted-foreground">Verify your current password to change your login password or cafe owner PIN.</p></div><div className="flex gap-2">{(['password','pin'] as const).map(option=><Button key={option} disabled={busy} variant={kind===option?'secondary':'outline'} onClick={()=>{setKind(option);setCurrent('');setValue('');setConfirm('');setShow(false);setMessage('');}}>Change {option==='pin'?'PIN':'password'}</Button>)}</div><p className="text-xs text-muted-foreground">{kind==='password'?'Your login password applies to all cafes linked to your owner account. Use 8–128 characters.':'The four-digit owner PIN applies to this cafe. Choose a PIN different from your team members.'}</p><form onSubmit={save} className="space-y-4"><label className="block text-sm">Current owner password<Input className="mt-1" type={show?'text':'password'} autoComplete="current-password" required maxLength={128} disabled={busy} value={current} onChange={e=>setCurrent(e.target.value)}/></label><label className="block text-sm">New {kind==='pin'?'PIN':'password'}<Input className="mt-1" type={show?'text':'password'} autoComplete="new-password" inputMode={kind==='pin'?'numeric':undefined} required minLength={kind==='pin'?4:8} maxLength={kind==='pin'?4:128} disabled={busy} value={value} onChange={e=>setValue(e.target.value)}/></label><label className="block text-sm">Confirm new {kind==='pin'?'PIN':'password'}<Input className="mt-1" type={show?'text':'password'} autoComplete="new-password" required disabled={busy} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><div className="flex items-center justify-between gap-3"><Button type="button" variant="ghost" disabled={busy} aria-pressed={show} onClick={()=>setShow(!show)}>{show?'Hide':'Show'} credentials</Button><Button disabled={busy} type="submit">{busy?'Saving…':'Save changes'}</Button></div>{message&&<p role="status" className="text-sm">{message}</p>}</form></section>;
}
