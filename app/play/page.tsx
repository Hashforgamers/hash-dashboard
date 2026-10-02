'use client';
import GamerContinuation from '@/app/components/gamer-continuation';
import {useEffect,useState} from 'react';
import {cafeCall,rupees,CafePolicy,CafeApiError} from '@/lib/cafe-api';
import {BOOKING_URL} from '@/src/config/env';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

type Booking={booking_id:number;game_name:string;starts_at:string;ends_at:string;can_start:boolean;reason:string|null};
type Session={kind:string;id:string;state:string;minutes:number;amount:number;deadline:string;ends_at:string|null;checkout:Quote;payment_due?:number;last_continuation?:{id:string;state:string}|null;next_session_id?:string|null;continuation_request?:{id:string;minutes:number;amount:number;state:string}|null};
type Quote={pricing_error?:string;enabled_payment_methods?:string[];bookings?:Booking[];active_session_id?:string;cafe_name:string;console_number:number;available_balance:number;policy:CafePolicy};
export default function PlayPage() {
  const [budgetQuote,setBudgetQuote]=useState<{minutes:number;amount:number}|null>(null);
  const [buyNew,setBuyNew]=useState(false);
  const [qr,setQr]=useState(''); const [token,setToken]=useState('');
  const [email,setEmail]=useState(''); const [code,setCode]=useState(''); const [challenge,setChallenge]=useState('');
  const [quote,setQuote]=useState<Quote|null>(null);const [minutes,setMinutes]=useState(0);
  const [session,setSession]=useState<Session|null>(null);const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);const [now,setNow]=useState(Date.now());
  const [menu,setMenu]=useState<{collector:string;items:{id:number;name:string;amount:number;stock:number|null}[]}|null>(null);
  const [food,setFood]=useState<Record<number,number>>({});const [foodIdem,setFoodIdem]=useState('');
  useEffect(()=>{setQr(new URLSearchParams(window.location.search).get('qr')||'');setToken(sessionStorage.getItem('cafe_gamer_token')||'');},[]);
  async function run(fn:()=>Promise<void>) {setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e instanceof Error?e.message:'Request failed');if(e instanceof CafeApiError&&e.status===401){sessionStorage.removeItem('cafe_gamer_token');setToken('');}if(e instanceof Error&&e.message.includes('Price changed')&&token&&qr){try{setQuote(await cafeCall<Quote>(`/checkout?qr=${encodeURIComponent(qr)}`,undefined,'GET',token));}catch{}}}finally{setBusy(false);}}
  async function login(path:string,body:unknown) {
    const r=await fetch(`${BOOKING_URL}/api/cafe-checkout/login/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await r.json();if(!r.ok)throw new Error(data.error||'Sign-in failed');return data;
  }
  useEffect(()=>{if(!token||!qr)return;void run(async()=>{
    const saved=sessionStorage.getItem(`cafe_session:${qr}`);
    let q:Quote;let restored:Session|null=null;
    if(saved){const previous=await cafeCall<Session>(`/sessions/${saved}`,undefined,'GET',token);setSession(previous);restored=previous;q=previous.checkout;}
    else q=await cafeCall<Quote>(`/checkout?qr=${encodeURIComponent(qr)}`,undefined,'GET',token);
    if(!saved&&q.active_session_id){const active=await cafeCall<Session>(`/sessions/${q.active_session_id}`,undefined,'GET',token);setSession(active);restored=active;sessionStorage.setItem(`cafe_session:${qr}`,active.id);}
    setQuote(q);setMinutes(q.policy.durations[0]?.minutes||0);
    if(q.policy.food_ordering&&(!restored||['reserved','active'].includes(restored.state)))setMenu(await cafeCall(`/food/menu?${restored?`session_id=${restored.id}`:`qr=${encodeURIComponent(qr)}`}`,undefined,'GET',token));
    else setMenu(null);
  });},[token,qr]);
  useEffect(()=>{if(!session||!token||['failed','cancelled'].includes(session.state))return;
    let alive=true,inflight=false;
    const timer=setInterval(()=>{setNow(Date.now());if(inflight)return;inflight=true;
      void cafeCall<Session>(`/sessions/${session.id}`,undefined,'GET',token).then(async s=>{
        if(s.next_session_id)s=await cafeCall<Session>(`/sessions/${s.next_session_id}`,undefined,'GET',token);
        if(!alive)return;
        sessionStorage.setItem(`cafe_session:${qr}`,s.id);setSession(s);setQuote(s.checkout);
      }).catch(e=>{if(alive){setMessage(e.message);if(e instanceof CafeApiError&&e.status===401){sessionStorage.removeItem('cafe_gamer_token');setToken('');}}}).finally(()=>{inflight=false;});
    },2000);
    return()=>{alive=false;clearInterval(timer);};
  },[session?.id,session?.state,token]);
  async function startBooking(booking:Booking){await run(async()=>{
    const storageKey=`cafe_request:${qr}:booking:${booking.booking_id}`;
    const requestKey=sessionStorage.getItem(storageKey)||crypto.randomUUID();sessionStorage.setItem(storageKey,requestKey);
    const s=await cafeCall<Session>('/checkout',{qr,booking_id:booking.booking_id,payment_method:'existing_booking',idempotency_key:requestKey},'POST',token);
    sessionStorage.setItem(`cafe_session:${qr}`,s.id);setSession(s);setQuote(s.checkout);
  });}
  const hasBooking=Boolean(quote?.bookings?.length);
  const selected=budgetQuote&&budgetQuote.minutes===minutes?budgetQuote:quote?.policy.durations.find(d=>d.minutes===minutes);
  const remaining=session?.ends_at?Math.max(0,Math.ceil((new Date(session.ends_at).getTime()-now)/1000)):0;
  return <main className="mx-auto min-h-screen max-w-lg space-y-6 p-6"><header><p className="text-sm text-muted-foreground">HASH FOR GAMERS</p><h1 className="text-3xl font-semibold">Scan. Choose. Play.</h1></header>
    {message&&<p role="status" className="rounded-xl border border-amber-500 p-4">{message}</p>}
    {!qr?<p>Scan the QR displayed on your cafe PC to begin.</p>:!token?<section className="space-y-4 rounded-xl border p-5"><h2 className="text-xl">Sign in to Hash</h2><p>Use the email address registered with your gamer account.</p><label className="block">Email<Input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <Button disabled={busy||!email} onClick={()=>run(async()=>{const r=await login('request',{email});setChallenge(r.challenge_id);setMessage(r.message);})}>{challenge?'Send a new code':'Send sign-in code'}</Button>
      {challenge&&<><label className="block">Six-digit code<Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value)}/></label><Button disabled={busy||code.length!==6} onClick={()=>run(async()=>{const r=await login('verify',{challenge_id:challenge,code});sessionStorage.setItem('cafe_gamer_token',r.token);setToken(r.token);})}>Verify and continue</Button></>}
    </section>:<>
      <Button variant="ghost" onClick={()=>{sessionStorage.removeItem('cafe_gamer_token');sessionStorage.removeItem(`cafe_session:${qr}`);setBuyNew(false);setBudgetQuote(null);setToken('');setQuote(null);setSession(null);setMenu(null);}}>Sign out</Button>
      {quote&&<section className="space-y-4 rounded-xl border p-5"><h2 className="text-xl font-semibold">{quote.cafe_name} · PC {quote.console_number}</h2><p>Cafe balance available: <strong>{rupees(quote.available_balance)}</strong></p>
        {session?<><p role="status" className="text-lg">{session.state==='reserved'?'Waiting for the PC to start…':session.state==='active'&&remaining>0?`Playing · ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')} remaining`:session.state==='failed'?'PC did not start. No payment was taken. Scan the current QR to try again.':session.state==='cancelled'?'Booking cancelled. Please visit the desk.':'Session complete.'}</p><p>Session {session.id}</p>{session.state==='reserved'&&<p>{session.kind==='existing_booking'?'Your booking is already paid. No additional charge will be made.':session.kind==='owner_credit'?'Owner approved. The fixed-duration amount becomes payable after the PC acknowledges startup.':'Your balance is reserved. The charge completes only after the PC acknowledges startup.'}</p>}{session.state==='active'&&remaining<=300&&<p role="status" className="text-amber-600">{session.kind==='owner_credit'?'Approved time is ending. Play stops at the timer. Please settle at the desk.':'Funded time is ending. Play stops at the timer unless the owner approves more time.'}</p>}<GamerContinuation session={session} token={token} onRequested={()=>{void cafeCall<Session>(`/sessions/${session.id}`,undefined,'GET',token).then(setSession).catch(e=>setMessage(e.message));}}/></>:<>
        {quote.pricing_error&&<p role="alert">{quote.pricing_error}. Please visit the cafe desk.</p>}
        {!quote.policy.self_service?<p>Self-service is currently disabled. Please visit the desk.</p>:<>
        {quote.bookings?.map(booking=><article key={booking.booking_id} className="space-y-2 rounded-lg border p-4"><h3 className="font-semibold">Your booking · {booking.game_name}</h3><p>{new Date(booking.starts_at).toLocaleString()} – {new Date(booking.ends_at).toLocaleTimeString()}</p><p>No additional wallet payment.</p>{booking.reason&&<p>{booking.reason}</p>}<Button disabled={busy||!booking.can_start} onClick={()=>startBooking(booking)}>Start my booking</Button></article>)}
        {hasBooking&&<Button variant="outline" onClick={()=>setBuyNew(!buyNew)}>{buyNew?'Back to my bookings':'Buy a new session instead'}</Button>}
        {(!hasBooking||buyNew)&&quote.enabled_payment_methods&&!quote.enabled_payment_methods.includes('cafe_wallet')&&<p>Cafe wallet payments are disabled here. Book through the Hash app using another method accepted by this cafe, or visit the desk.</p>}
        {(!hasBooking||buyNew)&&(!quote.enabled_payment_methods||quote.enabled_payment_methods.includes('cafe_wallet'))&&<><fieldset className="space-y-2"><legend>Choose your time</legend>{quote.policy.durations.map(d=><label key={d.minutes} className="flex justify-between rounded border p-3"><span><input type="radio" name="minutes" disabled={d.amount==null} checked={minutes===d.minutes} onChange={()=>{setBudgetQuote(null);setMinutes(d.minutes);}}/> {d.minutes} minutes</span>{d.amount==null?(d.unavailable_reason||'Unavailable'):rupees(d.amount)}</label>)}</fieldset>
        <Button variant="outline" disabled={busy||quote.available_balance<=0} onClick={()=>run(async()=>{
          const result=await cafeCall<{duration:{minutes:number;amount:number}|null;reason:string|null}>(`/checkout/affordable?qr=${encodeURIComponent(qr)}`,undefined,'GET',token);
          if(!result.duration)throw new Error(result.reason||'No affordable duration is available');
          setBudgetQuote(result.duration);setMinutes(result.duration.minutes);
        })}>Choose time using my available balance</Button>
        {budgetQuote&&<p>{budgetQuote.minutes} minutes for {rupees(budgetQuote.amount)}, within this cafe's duration limit. Any unused balance stays in your wallet.</p>}
        <p>Payment method: Cafe wallet</p><Button className="w-full" disabled={busy||!selected||selected.amount==null||quote.available_balance<(selected.amount ?? Infinity)} onClick={()=>run(async()=>{
          const requestKey=sessionStorage.getItem(`cafe_request:${qr}:wallet:${minutes}:${selected?.amount}`)||crypto.randomUUID();sessionStorage.setItem(`cafe_request:${qr}:wallet:${minutes}:${selected?.amount}`,requestKey);
          const s=await cafeCall<Session>('/checkout',{qr,minutes,use_available_balance:Boolean(budgetQuote&&budgetQuote.minutes===minutes),expected_amount:selected?.amount,payment_method:'cafe_wallet',idempotency_key:requestKey},'POST',token);
          sessionStorage.setItem(`cafe_session:${qr}`,s.id);setSession(s);setQuote(s.checkout);
        })}>{selected?.amount==null?'Choose an available duration':`Pay ${rupees(selected.amount)} and start`}</Button>{selected&&quote.available_balance<(selected.amount ?? Infinity)&&<p>Please top up at the cafe desk to continue.</p>}</>}</>}
        </>}
      </section>}
      {menu&&(!session||['reserved','active'].includes(session.state))&&<section className="space-y-3 rounded-xl border p-5"><h2 className="text-xl">Food & drinks</h2><p>Pay {menu.collector==='vendor'?'the food store directly':'at the cafe desk'}. Food is separate from your gaming balance.</p>{menu.items.map(item=><label key={item.id} className="flex items-center justify-between gap-3"><span>{item.name} · {rupees(item.amount)}</span><Input className="w-20" aria-label={`${item.name} quantity`} type="number" min="0" max={Math.min(50,item.stock??50)} value={food[item.id]||0} onChange={e=>{setFood({...food,[item.id]:Number(e.target.value)});setFoodIdem('');}}/></label>)}<Button disabled={busy||!Object.values(food).some(v=>v>0)} onClick={()=>run(async()=>{const requestKey=foodIdem||crypto.randomUUID();setFoodIdem(requestKey);const o=await cafeCall<{id:string;amount:number}>('/food/orders',{qr,session_id:session?.id,items:Object.entries(food).filter(([,q])=>q>0).map(([id,quantity])=>({id:Number(id),quantity})),idempotency_key:requestKey},'POST',token);setMessage(`Food order ${o.id} placed. Pay ${rupees(o.amount)} ${menu.collector==='vendor'?'at the food store':'at the cafe desk'}.`);setFood({});setFoodIdem('');})}>Place food order</Button></section>}
    </>}
  </main>;
}
