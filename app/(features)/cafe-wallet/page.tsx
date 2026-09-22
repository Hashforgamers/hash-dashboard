'use client';
import {useEffect, useState} from 'react';
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
  const [cash,setCash] = useState('0');
  const [adjustment,setAdjustment] = useState('');
  const [adjustKey,setAdjustKey] = useState('');
  const [reason,setReason] = useState('');
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [audit,setAudit] = useState<{id:number; actor_name:string; action:string; created_at:string; details:unknown}[]>([]);
  const [totals,setTotals] = useState<Record<string,number>>({});
  const [idem,setIdem] = useState('');
  const [orders,setOrders] = useState<{id:string;user_id:number;collector:string;state:string;amount:number;items:{name:string;quantity:number}[]}[]>([]);
  const prefix = `/${selectedCafeId}`;
  const openShift = shifts.find(s=>!s.closed_at);
  async function refresh() {
    const [p,s] = await Promise.all([cafeCall<CafePolicy>(`${prefix}/policy`),cafeCall<Shift[]>(`${prefix}/shifts`)]);
    setPolicy(p); setShifts(s); setMethod(p.desk_methods[0]);
    if(can("store.manage")) setOrders(await cafeCall(`${prefix}/food/orders`));
    if(can('transactions.view')) {
      const [a,r] = await Promise.all([cafeCall<typeof audit>(`${prefix}/audit`),cafeCall<{totals:Record<string,number>}>(`${prefix}/report`)]);
      setAudit(a); setTotals(r.totals);
    }
  }
  async function action(fn:()=>Promise<void>) {
    if(busy) return;
    setBusy(true); setMessage('');
    try { await fn(); } catch(e) { setMessage(e instanceof Error?e.message:'Request failed'); }
    finally { setBusy(false); }
  }
  useEffect(()=>{setWallet(null); setLoadedUser(''); if(selectedCafeId && activeStaff) void action(refresh);},[selectedCafeId,activeStaff?.id]);
  async function loadWallet(id=userId) {
    if(!/^\d+$/.test(id)) throw new Error('Enter a gamer ID');
    setWallet(await cafeCall(`${prefix}/wallets/${id}`)); setLoadedUser(id); if(id!==loadedUser){setIdem('');setAdjustKey('');}
  }
  return <DashboardLayout contentScroll="page"><main className="mx-auto max-w-5xl space-y-6 p-6">
    <header><h1 className="text-2xl font-semibold">Cafe wallet & shifts</h1><p className="text-muted-foreground">Desk collections recorded as {activeStaff?.name || 'your staff account'}. Amounts below are in INR.</p></header>
    {message && <p role="status" className="rounded border border-amber-500 p-3">{message}</p>}
    {!selectedCafeId ? <p>Select a cafe first.</p> : <>
    <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-semibold">Your shift</h2>
      <p>{openShift ? `Shift open · Opening cash ${rupees(openShift.opening_cash)}` : 'Open a shift before accepting top-ups.'}</p>
      <label className="block">{openShift?'Counted closing cash':'Opening cash'}<Input type="number" min="0" step="0.01" value={cash} onChange={e=>setCash(e.target.value)}/></label>
      <Button disabled={busy || !can('wallet.topup')} onClick={()=>action(async()=>{
        await cafeCall(openShift?`${prefix}/shifts/${openShift.id}/close`:`${prefix}/shifts/open`, openShift?{counted_cash:paise(cash)}:{opening_cash:paise(cash)}); await refresh(); setMessage(openShift?'Shift closed. Reconciliation is below.':'Shift opened.');
      })}>{openShift?'Close and reconcile shift':'Open shift'}</Button>
      {shifts.filter(s=>s.closed_at).slice(0,5).map(s=><p key={s.id}>{s.actor_name} · Expected {rupees(s.expected_cash||0)} · Counted {rupees(s.counted_cash||0)} · Difference {rupees((s.counted_cash||0)-(s.expected_cash||0))} · UPI {rupees(s.upi_receipts||0)}</p>)}
    </section>
    <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-semibold">Gamer balance</h2>
      <label className="block">Gamer ID<Input value={userId} onChange={e=>setUserId(e.target.value)}/></label>
      <Button disabled={busy} onClick={()=>action(()=>loadWallet())}>Find wallet</Button>
      {wallet && <><p>Gamer #{loadedUser} · Balance {rupees(wallet.balance)} · Reserved {rupees(wallet.reserved)} · Available {rupees(wallet.balance-wallet.reserved)}</p>
      <label className="block">Top-up amount<Input type="number" min="0.01" step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);setIdem('');}}/></label>
      <label>Collected by <select className="rounded border bg-background p-2" value={method} onChange={e=>{setMethod(e.target.value);setIdem('');}}>{policy?.desk_methods.map(m=><option key={m} value={m}>{m==='cash'?'Cash':'Cafe UPI'}</option>)}</select></label>
      <Button className="ml-3" disabled={busy || !openShift || !can('wallet.topup')} onClick={()=>action(async()=>{
        const requestKey=idem||crypto.randomUUID();setIdem(requestKey);
        await cafeCall(`${prefix}/wallets/${loadedUser}/topups`,{amount:paise(amount),method,idempotency_key:requestKey});
        setIdem('');setAmount('');await loadWallet(loadedUser); await refresh();setMessage('Top-up recorded.');
      })}>Record received payment</Button>
      {(can('wallet.refund')||can('wallet.adjust')) && <label className="block">Reason for reversal<Input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required when reversing a transaction"/></label>}
      {can('wallet.adjust') && <div className="space-y-2"><label className="block">Balance adjustment (₹; negative to deduct)<Input type="number" step="0.01" value={adjustment} onChange={e=>{setAdjustment(e.target.value);setAdjustKey('');}}/></label><p className="text-sm text-muted-foreground">Use a reason above. Adjustments are not desk collections.</p><Button variant="outline" disabled={busy||!adjustment||reason.trim().length<3} onClick={()=>action(async()=>{const requestKey=adjustKey||crypto.randomUUID();setAdjustKey(requestKey);const value=adjustment.startsWith('-')?-paise(adjustment.slice(1)):paise(adjustment);await cafeCall(`${prefix}/wallets/${loadedUser}/adjustments`,{amount:value,reason,idempotency_key:requestKey});setAdjustment('');setAdjustKey('');await loadWallet(loadedUser);setMessage('Balance adjustment recorded.');})}>Record adjustment</Button></div>}
      <div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr>{['Time','Type','Amount','Staff / actor','Reason','Action'].map(h=><th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{wallet.ledger.map(e=><tr className="border-t" key={e.id}><td className="p-2">{new Date(e.created_at).toLocaleString()}</td><td>{e.kind}</td><td>{rupees(e.amount)}</td><td>{e.actor_name}</td><td>{e.reason}</td><td>{can('wallet.refund') && ['topup','capture'].includes(e.kind) && <Button variant="outline" disabled={busy||reason.trim().length<3} onClick={()=>action(async()=>{await cafeCall(`${prefix}/ledger/${e.id}/refund`,{reason,idempotency_key:`refund-${e.id}-${activeStaff?.id}`});await loadWallet(loadedUser);setMessage('Reversal recorded.');})}>Reverse</Button>}</td></tr>)}</tbody></table></div></>}
    </section>
    {policy && can('account.manage') && <section className="space-y-4 rounded-xl border p-5"><h2 className="text-lg font-semibold">Cafe payment policy</h2>
      <p>Gaming: cafe wallet · Top-ups: staff desk · Hash online collection: disabled</p>
      <label className="block"><input type="checkbox" checked={policy.self_service} onChange={e=>setPolicy({...policy,self_service:e.target.checked})}/> Enable QR self-service</label>
      {['cash','cafe_upi'].map(m=><label className="mr-4" key={m}><input type="checkbox" checked={policy.desk_methods.includes(m)} onChange={e=>setPolicy({...policy,desk_methods:e.target.checked?[...policy.desk_methods,m]:policy.desk_methods.filter(x=>x!==m)})}/> {m==='cash'?'Cash':'Cafe UPI'}</label>)}
      <label className="block"><input type="checkbox" checked={policy.food_ordering} onChange={e=>setPolicy({...policy,food_ordering:e.target.checked})}/> Food ordering enabled</label>
      <label className="block">Food payment collected by <select className="rounded border bg-background p-2" value={policy.food_collection} onChange={e=>setPolicy({...policy,food_collection:e.target.value as 'cafe'|'vendor'})}><option value="vendor">Food vendor directly</option><option value="cafe">Cafe</option></select></label>
      <h3>Session durations and prices</h3>{policy.durations.map((d,i)=><div className="flex gap-3" key={i}><label>Minutes<Input type="number" value={d.minutes} onChange={e=>setPolicy({...policy,durations:policy.durations.map((v,j)=>i===j?{...v,minutes:Number(e.target.value)}:v)})}/></label><label>Price ₹<Input type="number" step="0.01" value={d.amount/100} onChange={e=>setPolicy({...policy,durations:policy.durations.map((v,j)=>i===j?{...v,amount:Math.round(Number(e.target.value)*100)}:v)})}/></label><Button variant="outline" onClick={()=>setPolicy({...policy,durations:policy.durations.filter((_,j)=>j!==i)})}>Remove</Button></div>)}
      <Button variant="outline" onClick={()=>setPolicy({...policy,durations:[...policy.durations,{minutes:30,amount:5000}]})}>Add duration</Button>{' '}<Button disabled={busy} onClick={()=>action(async()=>{setPolicy(await cafeCall(`${prefix}/policy`,policy,'PUT'));setMessage('Payment policy saved.');})}>Save policy</Button>
    </section>}
    {can('store.manage') && <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-semibold">Food orders</h2>{orders.map(o=><div key={o.id} className="border-t py-3"><p>Gamer #{o.user_id} · {o.items.map(i=>`${i.quantity} × ${i.name}`).join(', ')} · {rupees(o.amount)}</p><p>{o.collector==='vendor'?'Food store collects directly':o.state==='paid'?'Paid at cafe':'Awaiting cafe payment'}</p>{o.collector==='cafe'&&o.state!=='paid'&&<Button disabled={busy||!openShift} onClick={()=>action(async()=>{await cafeCall(`${prefix}/food/orders/${o.id}/collect`,{method});await refresh();})}>Record {method==='cash'?'cash':'cafe UPI'} payment</Button>}</div>)}</section>}
    {can('transactions.view') && <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-semibold">Collections and activity</h2><p>Wallet top-ups {rupees(totals.topup||0)} · Gaming consumption {rupees(-(totals.capture||0))} · Net reversals {rupees(totals.refund||0)} · Cafe food collections {rupees(totals.food_collection||0)}</p><p className="text-sm text-muted-foreground">Top-ups and gaming consumption are separate totals; do not add them as sales.</p><Button variant="outline" disabled={busy} onClick={()=>action(refresh)}>Refresh activity</Button><div className="max-h-80 overflow-auto">{audit.map(a=><details className="border-t py-2" key={a.id}><summary>{new Date(a.created_at).toLocaleString()} · {a.actor_name} · {a.action}</summary><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(a.details,null,2)}</pre></details>)}</div></section>}
    </>}
  </main></DashboardLayout>;
}
