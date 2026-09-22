'use client';
import {useEffect, useRef, useState} from 'react';
import {DashboardLayout} from '../../(layout)/dashboard-layout';
import {useAccess} from '@/app/context/AccessContext';
import {cafeCall, rupees, paise, CafePolicy, LedgerEntry, Shift} from '@/lib/cafe-api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

export default function CafeWalletPage() {
  const {selectedCafeId, activeStaff, can} = useAccess();
  const [policy,setPolicy] = useState<CafePolicy|null>(null);
  const [shifts,setShifts] = useState<Shift[]>([]);
  const [userId,setUserId] = useState('');
  const [loadedUser,setLoadedUser] = useState('');
  const [wallet,setWallet] = useState<{balance:number; reserved:number; ledger:LedgerEntry[]}|null>(null);
  const [amount,setAmount] = useState('');
  const [method,setMethod] = useState('cash');
  const [openingCash,setOpeningCash] = useState('0');
  const [closingCash,setClosingCash] = useState('');
  const cash = shifts.find(s=>!s.closed_at) ? closingCash : openingCash;
  const setCash = shifts.find(s=>!s.closed_at) ? setClosingCash : setOpeningCash;
  const [adjustment,setAdjustment] = useState('');
  const [adjustKey,setAdjustKey] = useState('');
  const [reason,setReason] = useState('');
  const [busy,setBusy] = useState(false);
  const actionLock = useRef(false);
  const currentContext = `${selectedCafeId}:${activeStaff?.id}`;
  const contextRef = useRef(currentContext);
  contextRef.current = currentContext;
  const [message,setMessageState] = useState('');
  const setMessage = (value: string) => { if(contextRef.current===currentContext) setMessageState(value); };
  const [audit,setAudit] = useState<{id:number; actor_name:string; action:string; created_at:string; details:unknown}[]>([]);
  const [totals,setTotals] = useState<Record<string,number>>({});
  const [idem,setIdem] = useState('');
  const [orders,setOrders] = useState<{id:string;user_id:number;collector:string;state:string;amount:number;items:{name:string;quantity:number}[]}[]>([]);
  const prefix = `/${selectedCafeId}`;
  const openShift = shifts.find(s=>!s.closed_at);
  async function refresh() {
    if(contextRef.current !== currentContext) return;
    const [p,s,o,a,r] = await Promise.allSettled([
      cafeCall<CafePolicy>(`${prefix}/policy`), cafeCall<Shift[]>(`${prefix}/shifts`),
      can('store.manage') ? cafeCall<typeof orders>(`${prefix}/food/orders`) : Promise.resolve([]),
      can('transactions.view') ? cafeCall<typeof audit>(`${prefix}/audit`) : Promise.resolve([]),
      can('transactions.view') ? cafeCall<{totals:Record<string,number>}>(`${prefix}/report`) : Promise.resolve({totals:{}}),
    ]);
    if(contextRef.current !== currentContext) return;
    if(p.status==='rejected') throw p.reason;
    if(s.status==='rejected') throw s.reason;
    setPolicy(p.value); setShifts(s.value);
    setMethod(current=>p.value.desk_methods.includes(current)?current:(p.value.desk_methods[0] || ''));
    if(o.status==='fulfilled') setOrders(o.value);
    if(a.status==='fulfilled') setAudit(a.value);
    if(r.status==='fulfilled') setTotals(r.value.totals);
    if([o,a,r].some(result=>result.status==='rejected')) throw new Error('Wallet and shifts loaded; some activity is unavailable.');
  }
  async function action(fn:()=>Promise<void>) {
    if(actionLock.current) return;
    actionLock.current = true;
    setBusy(true); setMessage('');
    try { await fn(); } catch(e) { setMessage(e instanceof Error?e.message:'Request failed'); }
    finally { actionLock.current = false; setBusy(false); }
  }
  useEffect(()=>{
    setWallet(null); setLoadedUser(''); setUserId(''); setShifts([]); setPolicy(null);
    setOrders([]); setAudit([]); setTotals({}); setIdem(''); setAdjustKey('');
    setAmount(''); setAdjustment(''); setReason(''); setClosingCash(''); setOpeningCash('0'); setMessage('');
    if(selectedCafeId && activeStaff) void refresh().catch(e=>{
      if(contextRef.current===currentContext) setMessage(e instanceof Error?e.message:'Unable to load cafe data');
    });
  },[selectedCafeId,activeStaff?.id]);
  useEffect(()=>{setClosingCash('');},[openShift?.id]);
  async function loadWallet(id=userId) {
    if(contextRef.current !== currentContext) return;
    if(!/^\d+$/.test(id)) throw new Error('Enter a gamer ID');
    const result = await cafeCall<{balance:number;reserved:number;ledger:LedgerEntry[]}>(`${prefix}/wallets/${id}`);
    if(contextRef.current !== currentContext) return;
    setWallet(result); setLoadedUser(id); if(id!==loadedUser){setIdem('');setAdjustKey('');}
  }
  async function syncAfterWrite(notice: string, includeWallet = false) {
    setMessage(notice);
    try {
      await Promise.all([refresh(), includeWallet ? loadWallet(loadedUser) : Promise.resolve()]);
    } catch {
      setMessage(`${notice} Latest data could not be loaded. Refresh to verify.`);
    }
  }
  return <DashboardLayout contentScroll="page"><main className="cafe-wallet-workspace mx-auto w-full max-w-6xl space-y-3 p-3">
    <header className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-lg font-semibold">Cafe Wallet & Shifts</h1><span className="text-xs text-muted-foreground">{activeStaff?.name || 'Staff'} · INR</span></header>
    {message && <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"><span>{message}</span><Button variant="ghost" disabled={busy} onClick={()=>action(async()=>{await refresh();if(loadedUser)await loadWallet(loadedUser);})}>Refresh</Button></div>}
    {!selectedCafeId ? <p>Select a cafe first.</p> : <fieldset disabled={busy} className="min-w-0 space-y-3">
    <div className="grid items-start gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
    <section className="space-y-3 rounded-lg border bg-card p-3"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Your shift</h2><span className={`rounded-md px-2 py-1 text-xs ${openShift ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{openShift?"Open":"Closed"}</span></div>
      <p className="text-xs text-muted-foreground">{openShift ? `Opening cash ${rupees(openShift.opening_cash)}` : 'Open a shift to collect payments.'}</p>
      {openShift?.expected_cash != null && <p className="text-sm">Expected cash <strong className="tabular-nums">{rupees(openShift.expected_cash)}</strong></p>}
      <label className="block text-xs font-medium">{openShift?'Counted cash (₹)':'Opening cash (₹)'}<Input type="number" min="0" step="0.01" placeholder={openShift ? "Enter actual cash counted" : "0.00"} value={cash} onChange={e=>setCash(e.target.value)}/></label>
      <Button disabled={busy || !policy || !cash || !can('wallet.topup')} onClick={()=>action(async()=>{
        await cafeCall(openShift?`${prefix}/shifts/${openShift.id}/close`:`${prefix}/shifts/open`, openShift?{counted_cash:paise(cash)}:{opening_cash:paise(cash)}); setClosingCash(''); await syncAfterWrite(openShift?'Shift closed.':'Shift opened.');
      })}>{openShift?'Close and reconcile shift':'Open shift'}</Button>
      {shifts.some(s=>s.closed_at) && <details className="border-t pt-2"><summary className="cursor-pointer text-xs font-medium">Recent shifts</summary><div className="mt-2 space-y-2">{shifts.filter(s=>s.closed_at).slice(0,5).map(s=><div className="rounded-md bg-muted/40 p-2 text-xs" key={s.id}><div className="flex justify-between gap-2"><span>{s.actor_name}</span><time className="text-muted-foreground">{new Date(s.closed_at!).toLocaleDateString()}</time></div><div className="mt-1 grid grid-cols-2 gap-1 text-muted-foreground"><span>Expected {rupees(s.expected_cash??0)}</span><span>Counted {rupees(s.counted_cash??0)}</span><span className={(s.counted_cash??0)!==(s.expected_cash??0)?'text-amber-600 dark:text-amber-300':''}>Difference {rupees((s.counted_cash??0)-(s.expected_cash??0))}</span><span>UPI {rupees(s.upi_receipts??0)}</span></div></div>)}</div></details>}
    </section>
    <section className="space-y-3 rounded-lg border bg-card p-3"><h2 className="text-sm font-semibold">Gamer balance</h2>
      <form className="flex items-end gap-2" onSubmit={e=>{e.preventDefault();void action(()=>loadWallet());}}><label className="block min-w-0 flex-1 text-xs font-medium">Gamer ID<Input inputMode="numeric" placeholder="Enter gamer ID" disabled={busy} value={userId} onChange={e=>{setUserId(e.target.value);setWallet(null);setLoadedUser('');}}/></label><Button type="submit" disabled={busy || !/^\d+$/.test(userId)}>Find wallet</Button></form>
      {wallet && <><div className="grid grid-cols-3 gap-2">{[['Available',wallet.balance-wallet.reserved],['Balance',wallet.balance],['Reserved',wallet.reserved]].map(([label,value])=><div key={label} className="rounded-md bg-muted/40 px-2.5 py-2"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{rupees(Number(value))}</p></div>)}</div>
      <div className="flex flex-wrap items-center gap-1.5">{[100,500,1000].map(value=><button type="button" key={value} disabled={busy} onClick={()=>{setAmount(String(value));setIdem('');}} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">₹{value}</button>)}</div>
      {!openShift && <p className="text-xs text-amber-600 dark:text-amber-300">Open your shift to record payments.</p>}
      <label className="block text-xs font-medium">Top-up amount (₹)<Input type="number" min="0.01" step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);setIdem('');}}/></label>
      <label>Collected by <select className="rounded border bg-background p-2" value={method} onChange={e=>{setMethod(e.target.value);setIdem('');}}>{policy?.desk_methods.map(m=><option key={m} value={m}>{m==='cash'?'Cash':'Cafe UPI'}</option>)}</select></label>
      <Button className="ml-3" disabled={busy || !openShift || !method || !amount || Number(amount)<=0 || !can('wallet.topup')} onClick={()=>action(async()=>{
        const requestKey=idem||crypto.randomUUID();setIdem(requestKey);
        await cafeCall(`${prefix}/wallets/${loadedUser}/topups`,{amount:paise(amount),method,idempotency_key:requestKey});
        setIdem('');setAmount('');await syncAfterWrite('Top-up recorded.',true);
      })}>Record received payment</Button>
      {(can('wallet.refund')||can('wallet.adjust')) && <label className="block">Reason for adjustment / reversal<Input value={reason} onChange={e=>{setReason(e.target.value);setAdjustKey('');}} placeholder="Required when reversing a transaction"/></label>}
      {can('wallet.adjust') && <div className="space-y-2"><label className="block">Balance adjustment (₹; negative to deduct)<Input type="number" step="0.01" value={adjustment} onChange={e=>{setAdjustment(e.target.value);setAdjustKey('');}}/></label><p className="text-sm text-muted-foreground">Use a reason above. Adjustments are not desk collections.</p><Button variant="outline" disabled={busy||!adjustment||!Number(adjustment)||reason.trim().length<3} onClick={()=>action(async()=>{const requestKey=adjustKey||crypto.randomUUID();setAdjustKey(requestKey);const value=adjustment.startsWith('-')?-paise(adjustment.slice(1)):paise(adjustment);await cafeCall(`${prefix}/wallets/${loadedUser}/adjustments`,{amount:value,reason,idempotency_key:requestKey});setAdjustment('');setAdjustKey('');await syncAfterWrite('Balance adjustment recorded.',true);})}>Record adjustment</Button></div>}
      <div className="overflow-auto"><table className="w-full text-left text-xs"><thead><tr>{['Time','Type','Amount','Staff / actor','Reason','Action'].map(h=><th className="p-2 whitespace-nowrap" key={h}>{h}</th>)}</tr></thead><tbody>{wallet.ledger.map(e=><tr className="border-t" key={e.id}><td className="p-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td><td>{e.kind}</td><td>{rupees(e.amount)}</td><td>{e.actor_name}</td><td>{e.reason}</td><td>{can('wallet.refund') && ['topup','capture'].includes(e.kind) && <Button variant="outline" disabled={busy||reason.trim().length<3} onClick={()=>action(async()=>{await cafeCall(`${prefix}/ledger/${e.id}/refund`,{reason,idempotency_key:`refund-${e.id}-${activeStaff?.id}`});await syncAfterWrite('Reversal recorded.',true);})}>Reverse</Button>}</td></tr>)}</tbody></table></div></>}
    </section>
    </div>
    {policy && can('account.manage') && <details className="space-y-3 rounded-lg border bg-card p-3"><summary className="cursor-pointer text-sm font-semibold">Payment settings</summary>
      <p className="text-xs text-muted-foreground">Gaming uses cafe wallet; top-ups are collected at the desk.</p>
      <label className="block"><input type="checkbox" checked={policy.self_service} onChange={e=>setPolicy({...policy,self_service:e.target.checked})}/> Enable QR self-service</label>
      {['cash','cafe_upi'].map(m=><label className="mr-4" key={m}><input type="checkbox" checked={policy.desk_methods.includes(m)} onChange={e=>setPolicy({...policy,desk_methods:e.target.checked?[...policy.desk_methods,m]:policy.desk_methods.filter(x=>x!==m)})}/> {m==='cash'?'Cash':'Cafe UPI'}</label>)}
      <label className="block"><input type="checkbox" checked={policy.food_ordering} onChange={e=>setPolicy({...policy,food_ordering:e.target.checked})}/> Food ordering enabled</label>
      <label className="block">Food payment collected by <select className="rounded border bg-background p-2" value={policy.food_collection} onChange={e=>setPolicy({...policy,food_collection:e.target.value as 'cafe'|'vendor'})}><option value="vendor">Food vendor directly</option><option value="cafe">Cafe</option></select></label>
      <h3>Session durations and prices</h3>{policy.durations.map((d,i)=><div className="flex flex-wrap items-end gap-2" key={i}><label>Minutes<Input type="number" value={d.minutes} onChange={e=>setPolicy({...policy,durations:policy.durations.map((v,j)=>i===j?{...v,minutes:Number(e.target.value)}:v)})}/></label><label>Price ₹<Input type="number" step="0.01" value={d.amount/100} onChange={e=>setPolicy({...policy,durations:policy.durations.map((v,j)=>i===j?{...v,amount:Math.round(Number(e.target.value)*100)}:v)})}/></label><Button variant="outline" onClick={()=>setPolicy({...policy,durations:policy.durations.filter((_,j)=>j!==i)})}>Remove</Button></div>)}
      <Button variant="outline" onClick={()=>setPolicy({...policy,durations:[...policy.durations,{minutes:30,amount:5000}]})}>Add duration</Button>{' '}<Button disabled={busy || policy.desk_methods.length===0 || policy.durations.length===0} onClick={()=>action(async()=>{setPolicy(await cafeCall(`${prefix}/policy`,policy,'PUT'));setMessage('Payment policy saved.');})}>Save policy</Button>
    </details>}
    {can('store.manage') && <section className="space-y-3 rounded-lg border bg-card p-3"><h2 className="text-sm font-semibold">Food orders</h2>{orders.length===0 && <p className="text-xs text-muted-foreground">No orders.</p>}{orders.map(o=><div key={o.id} className="border-t py-2 text-sm"><p>Gamer #{o.user_id} · {o.items.map(i=>`${i.quantity} × ${i.name}`).join(', ')} · {rupees(o.amount)}</p><p>{o.collector==='vendor'?'Food store collects directly':o.state==='paid'?'Paid at cafe':'Awaiting cafe payment'}</p>{o.collector==='cafe'&&o.state!=='paid'&&<Button disabled={busy||!openShift} onClick={()=>action(async()=>{await cafeCall(`${prefix}/food/orders/${o.id}/collect`,{method});await syncAfterWrite('Food payment recorded.');})}>Record {method==='cash'?'cash':'cafe UPI'} payment</Button>}</div>)}</section>}
    {can('transactions.view') && <section className="space-y-3 rounded-lg border bg-card p-3"><h2 className="text-sm font-semibold">Collections and activity</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['Top-ups',totals.topup||0],['Gaming',-(totals.capture||0)],['Reversals',totals.refund||0],['Food',totals.food_collection||0]].map(([label,value])=><div key={label} className="rounded-md bg-muted/40 px-3 py-2"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{rupees(Number(value))}</p></div>)}</div><p className="text-sm text-muted-foreground">Top-ups and gaming consumption are separate totals; do not add them as sales.</p><Button variant="outline" disabled={busy} onClick={()=>action(refresh)}>Refresh activity</Button><div className="max-h-80 overflow-auto">{audit.map(a=><details className="border-t py-2" key={a.id}><summary>{new Date(a.created_at).toLocaleString()} · {a.actor_name} · {a.action}</summary><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(a.details,null,2)}</pre></details>)}</div></section>}
    </fieldset>}
  </main></DashboardLayout>;
}
