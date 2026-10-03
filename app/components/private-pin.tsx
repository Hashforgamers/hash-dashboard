'use client';
import {useEffect, useState} from 'react';
import {Input} from '@/components/ui/input';
import {Eye, EyeOff} from 'lucide-react';

export function PrivatePin({value,onChange,onEnter}:{value:string;onChange?:(value:string)=>void;onEnter?:()=>void}) {
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    setVisible(false);
    const hide=()=>setVisible(false);
    window.addEventListener('blur',hide);
    document.addEventListener('visibilitychange',hide);
    return()=>{window.removeEventListener('blur',hide);document.removeEventListener('visibilitychange',hide);};
  },[]);
  return <div className="flex min-w-0 items-center gap-2">
    {onChange?<Input aria-label="4-digit PIN" type={visible?'text':'password'} inputMode="numeric" autoComplete="off" maxLength={4} value={value} onChange={e=>onChange(e.target.value.replace(/\D/g,''))} onKeyDown={e=>{if(e.key==='Enter')onEnter?.();}} placeholder="Enter 4-digit PIN" className="tracking-[0.2em]"/>:<span className="min-w-12 font-mono text-sm tracking-[0.2em]">{visible?value:'••••'}</span>}
    <button type="button" aria-label={visible?'Hide PIN':'Show PIN'} aria-pressed={visible} onClick={()=>setVisible(v=>!v)} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-100 focus-visible:outline focus-visible:outline-2">
      {visible?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}{visible?'Hide':'Show'}
    </button>
  </div>;
}
