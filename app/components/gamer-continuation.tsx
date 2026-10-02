'use client';
import {useEffect,useRef,useState} from 'react';
import {cafeCall,rupees} from '@/lib/cafe-api';
import {Button} from '@/components/ui/button';

type Quote={minutes:number;amount:number|null;unavailable_reason?:string};
export default function GamerContinuation({session,token,onRequested}:{session:{id:string;kind:string;state:string;ends_at:string|null;
  payment_due?:number;last_continuation?:{id:string;state:string}|null;continuation_request?:{id:string;minutes:number;amount:number;state:string}|null};token:string;onRequested:()=>void}) {
  const [offers,setOffers]=useState<Quote[]>([]);const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);const lock=useRef(false);
  const eligible=['active','completed'].includes(session.state)&&session.kind!=='existing_booking'&&!(session.payment_due&&session.payment_due>0);
  useEffect(()=>{
    if(!eligible)return;
    let alive=true;
    void cafeCall<{durations:Quote[]}>(`/sessions/${session.id}/continuation/quote`,undefined,'GET',token)
      .then(r=>{if(alive)setOffers(r.durations);}).catch(e=>{if(alive)setError(e.message);});
    return()=>{alive=false;};
  },[session.id,session.state,eligible,token]);
  if(session.payment_due&&session.payment_due>0)return <p role="status" className="rounded border border-amber-500 p-3">{rupees(session.payment_due)} payable at the desk after play. The owner approved a fixed-duration price.</p>;
  if(!eligible)return null;
  if(session.continuation_request)return <p role="status" className="rounded border border-amber-500 p-3">Your request for {session.continuation_request.minutes} more minutes is waiting for the owner. Play stops at the end of funded time and resumes only after approval and PC acknowledgement.</p>;
  return <section className="space-y-2 border-t pt-3"><h3 className="font-semibold">Ask to continue and pay after play</h3><p className="text-sm">The owner must approve. These are fixed-duration prices. Slots are checked again on approval.</p>
    {session.last_continuation&&['rejected','expired'].includes(session.last_continuation.state)&&<p role="status">Your previous request was {session.last_continuation.state}. Play remains stopped after funded time ends.</p>}
    {error&&<p role="alert">{error}</p>}
    {offers.map(q=><Button key={q.minutes} variant="outline" disabled={busy||q.amount===null} onClick={async()=>{
      if(lock.current)return;lock.current=true;setBusy(true);setError('');
      try {
        const storageKey=`cafe_continue:${session.id}:${q.minutes}:${q.amount}:${session.last_continuation?.id||'initial'}`;
        const key=sessionStorage.getItem(storageKey)||crypto.randomUUID();sessionStorage.setItem(storageKey,key);
        await cafeCall(`/sessions/${session.id}/continuation`,{minutes:q.minutes,expected_amount:q.amount,idempotency_key:key},'POST',token);
        onRequested();
      }catch(e){setError(e instanceof Error?e.message:'Request failed');}
      finally{lock.current=false;setBusy(false);}
    }}>{q.minutes} min · {q.amount===null?'Unavailable':rupees(q.amount)}</Button>)}
  </section>;
}
