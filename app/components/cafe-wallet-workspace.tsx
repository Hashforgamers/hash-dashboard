'use client';
import {useEffect, useRef, useState} from 'react';
import {useAccess} from '@/app/context/AccessContext';
import {cafeCall, rupees, paise, CafePolicy, LedgerEntry, Shift} from '@/lib/cafe-api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {CafeGamerSearch, CafeGamer} from './cafe-gamer-search';
import {activityLabel, activityDetails, downloadActivityCsv} from '@/lib/cafe-activity';

export function CafeWalletWorkspace({embedded = false, view = "wallet"}: {embedded?: boolean; view?: "wallet"|"settings"|"activity"|"shift"}) {
  const {selectedCafeId, activeStaff, can} = useAccess();
  const [showShift,setShowShift] = useState(false);
  const [selectedGamer,setSelectedGamer] = useState<CafeGamer|null>(null);
  const [activitySearch,setActivitySearch] = useState('');
  const [policy,setPolicy] = useState<CafePolicy|null>(null);
  const [shifts,setShifts] = useState<Shift[]>([]);
  const [userId,setUserId] = useState('');
  const [loadedUser,setLoadedUser] = useState('');
  const [wallet,setWallet] = useState<{balance:number; reserved:number; ledger:LedgerEntry[]}|null>(null);
  const [amount,setAmount] = useState('');
  const [paymentReceived,setPaymentReceived] = useState(false);
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
  const currentContext = `${selectedCafeId}:${activeStaff?.id}:${view}`;
  const contextRef = useRef(currentContext);
  contextRef.current = currentContext;
  const [message,setMessageState] = useState('');
  const setMessage = (value: string) => { if(contextRef.current===currentContext) setMessageState(value); };
  const [audit,setAudit] = useState<{id:number|string; actor_name:string; action:string; created_at:string; details:unknown}[]>([]);
  const [idem,setIdem] = useState('');
  const [orders,setOrders] = useState<{id:string;user_id:number;collector:string;state:string;amount:number;items:{name:string;quantity:number}[]}[]>([]);
  const prefix = `/${selectedCafeId}`;
  const openShift = shifts.find(s=>!s.closed_at);
  async function refresh() {
    if(contextRef.current !== currentContext) return;
    const [p,s,o,a] = await Promise.allSettled([
      view!=='activity' ? cafeCall<CafePolicy>(`${prefix}/policy`) : Promise.resolve(null),
      view!=='settings' && can('wallet.topup') ? cafeCall<Shift[]>(`${prefix}/shifts`) : Promise.resolve([]),
      view==='wallet' && can('store.manage') ? cafeCall<typeof orders>(`${prefix}/food/orders`) : Promise.resolve([]),
      view==='activity' && can('transactions.view') ? cafeCall<typeof audit>(`${prefix}/activity`) : Promise.resolve([]),
    ]);
    if(contextRef.current !== currentContext) return;
    if(p.status==='rejected') throw p.reason;
    if(s.status==='rejected') throw s.reason;
    setPolicy(p.value); setShifts(s.value);
    if(p.value) {const methods=p.value.desk_methods;setMethod(current=>methods.includes(current)?current:(methods[0]||''));}
    if(o.status==='fulfilled') setOrders(o.value);
    if(a.status==='fulfilled') setAudit(a.value);
    if([o,a].some(result=>result.status==='rejected')) throw new Error('Wallet and shifts loaded; some activity is unavailable.');
  }
  async function action(fn:()=>Promise<void>) {
    if(actionLock.current) return;
    actionLock.current = true;
    setBusy(true); setMessage('');
    try { await fn(); } catch(e) { setMessage(e instanceof Error?e.message:'Request failed'); }
    finally { actionLock.current = false; setBusy(false); }
  }
  useEffect(()=>{
    setWallet(null); setLoadedUser(''); setUserId(''); setSelectedGamer(null); setShifts([]); setPolicy(null);
    setOrders([]); setAudit([]); setIdem(''); setAdjustKey('');
    setAmount(''); setPaymentReceived(false); setAdjustment(''); setReason(''); setClosingCash(''); setOpeningCash('0'); setMessage('');
    if(selectedCafeId && activeStaff) void refresh().catch(e=>{
      if(contextRef.current===currentContext) setMessage(e instanceof Error?e.message:'Unable to load cafe data');
    });
  },[selectedCafeId,activeStaff?.id,view]);
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
    window.dispatchEvent(new CustomEvent('cafe-desk-updated',{detail:{source:view}}));
    try {
      await Promise.all([refresh(), includeWallet ? loadWallet(loadedUser) : Promise.resolve()]);
    } catch {
      setMessage(`${notice} Latest data could not be loaded. Refresh to verify.`);
    }
  }
  useEffect(()=>{
    if(view!=='wallet') return;
    const reload=(event:Event)=>{if((event as CustomEvent).detail?.source==='wallet') return;void refresh().catch(e=>setMessage(e instanceof Error?e.message:'Unable to refresh'));};
    window.addEventListener('cafe-desk-updated',reload);
    return ()=>window.removeEventListener('cafe-desk-updated',reload);
  },[selectedCafeId,activeStaff?.id,view]);
  const filteredAudit=audit.filter(row=>`${row.actor_name} ${activityLabel(row.action)} ${activityDetails(row.details)}`.toLowerCase().includes(activitySearch.toLowerCase()));
  return <section aria-label="Cafe wallet and shifts" className={`cafe-wallet-workspace mx-auto w-full space-y-3 p-3 ${embedded ? "" : "max-w-6xl"}`}>
    <header className="flex flex-wrap items-center justify-between gap-2"><h2 className={embedded ? "text-sm font-semibold" : "text-lg font-semibold"}>{view==="settings"?"Cafe wallet payment settings":view==="activity"?"Staff activity":view==="shift"?"Manage shift":"Wallet top-up"}</h2><span className="text-xs text-muted-foreground">{activeStaff?.name || 'Staff'} · INR</span>{view==='wallet'&&<Button variant="outline" onClick={()=>setShowShift(true)}>{openShift?'End shift':'Start shift'}</Button>}</header>
    {message && <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"><span>{message}</span><Button variant="ghost" disabled={busy} onClick={()=>action(async()=>{await refresh();if(loadedUser)await loadWallet(loadedUser);})}>Refresh</Button></div>}
    {!selectedCafeId ? <p>Select a cafe first.</p> : <fieldset disabled={busy} className="min-w-0 space-y-3">
    <div className="space-y-3">
    {view==='shift' && (
    <section className="space-y-3 rounded-lg border bg-card p-3"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Your shift</h2><span className={`rounded-md px-2 py-1 text-xs ${openShift ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{openShift?"Open":"Closed"}</span></div>
      <p className="text-xs text-muted-foreground">{openShift ? `Opening cash ${rupees(openShift.opening_cash)}` : 'Open a shift to collect payments.'}</p>
      {openShift?.expected_cash != null && <p className="text-sm">Expected cash <strong className="tabular-nums">{rupees(openShift.expected_cash)}</strong></p>}
      <label className="block text-xs font-medium">{openShift?'Cash counted at shift end (₹)':'Cash in drawer at shift start (₹)'}<Input type="number" min="0" step="0.01" placeholder={openShift ? "Enter actual cash counted" : "0.00"} value={cash} onChange={e=>setCash(e.target.value)}/></label>
      <Button disabled={busy || !policy || !cash || !can('wallet.topup')} onClick={()=>action(async()=>{
        await cafeCall(openShift?`${prefix}/shifts/${openShift.id}/close`:`${prefix}/shifts/open`, openShift?{counted_cash:paise(cash)}:{opening_cash:paise(cash)}); setClosingCash(''); await syncAfterWrite(openShift?'Shift closed.':'Shift opened.');
      })}>{openShift?'End shift & check cash':'Start shift'}</Button>

    </section>)}
    {view==='wallet' && <section className="mx-auto w-full max-w-4xl space-y-3 rounded-lg border bg-card p-3 sm:p-4">
      {!selectedGamer ? <CafeGamerSearch key={currentContext} cafeId={selectedCafeId!} disabled={busy} onSelect={gamer=>{void action(async()=>{await loadWallet(String(gamer.id));if(contextRef.current===currentContext){setSelectedGamer(gamer);setAmount('');setPaymentReceived(false);setReason('');setAdjustment('');}});}} /> :
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div><h3 className="text-sm font-semibold">{selectedGamer.name || 'Gamer'}</h3><p className="text-xs text-muted-foreground">{selectedGamer.game_username || `#${selectedGamer.id}`} · {selectedGamer.phone || selectedGamer.email || `Hash ID ${selectedGamer.id}`}</p></div>
          <Button size="sm" variant="ghost" disabled={busy} onClick={()=>{setSelectedGamer(null);setWallet(null);setLoadedUser('');setAmount('');setPaymentReceived(false);setIdem('');setMessage('');}}>Change gamer</Button>
        </div>}
      {wallet && selectedGamer && <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <label className="block space-y-1 text-xs font-medium">Amount to add (₹)<Input autoFocus inputMode="decimal" type="number" min="0.01" step="0.01" placeholder="Enter amount" value={amount} onChange={e=>{setAmount(e.target.value);setIdem('');setPaymentReceived(false);}}/></label>
          <div className="flex flex-wrap gap-1.5">{[100,500,1000].map(value=><Button size="sm" variant={amount===String(value)?'secondary':'outline'} key={value} onClick={()=>{setAmount(String(value));setIdem('');setPaymentReceived(false);}}>₹{value}</Button>)}</div>
          <div className="space-y-1.5"><p className="text-xs font-medium">Payment method</p><div className="flex gap-2" role="group" aria-label="Payment method">{policy?.desk_methods.map(m=><Button key={m} size="sm" aria-pressed={method===m} variant={method===m?'secondary':'outline'} onClick={()=>{setMethod(m);setIdem('');setPaymentReceived(false);}}>{m==='cash'?'Cash':'UPI'}</Button>)}</div>{policy?.desk_methods.length===0&&<p className="text-xs text-muted-foreground">Enable a payment method in Settings.</p>}</div>
        </div>
        <div className="space-y-3 rounded-md bg-muted/30 p-3">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Current balance</span><span className="font-medium tabular-nums">{rupees(wallet.balance)}</span></div>
          {wallet.reserved>0&&<div className="flex justify-between text-xs"><span className="text-muted-foreground">Held for gaming</span><span className="tabular-nums">{rupees(wallet.reserved)}</span></div>}
          <div className="flex justify-between border-t pt-2 text-sm font-semibold"><span>Balance after top-up</span><span className="tabular-nums">{rupees(wallet.balance+(Number.isFinite(Number(amount))&&Number(amount)>0?Math.round(Number(amount)*100):0))}</span></div>
          <p className="text-xs text-muted-foreground">Usable at this cafe only.</p>
          {!openShift ? <Button size="sm" variant="outline" disabled={!policy} onClick={()=>setShowShift(true)}>Start shift to accept payment</Button> : <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={paymentReceived} onChange={e=>setPaymentReceived(e.target.checked)}/>{method==='cash'?'Cash received from gamer':'UPI payment verified in cafe account'}</label>}
          <Button className="w-full" disabled={busy || !openShift || !paymentReceived || !policy?.desk_methods.includes(method) || !/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount)<=0 || !can('wallet.topup')} onClick={()=>action(async()=>{
            const requestKey=idem||crypto.randomUUID();setIdem(requestKey);
            const added=paise(amount);
            await cafeCall(`${prefix}/wallets/${loadedUser}/topups`,{amount:added,method,idempotency_key:requestKey});
            setIdem('');setAmount('');setPaymentReceived(false);await syncAfterWrite(`${rupees(added)} added to ${selectedGamer.name || 'gamer'}’s wallet.`,true);
          })}>{busy?'Saving…':'Add money'}</Button>
        </div>
      </div>
      <details className="border-t pt-3"><summary className="cursor-pointer text-xs font-medium">Transaction history & corrections</summary><div className="space-y-3 pt-3">
      {(can('wallet.refund')||can('wallet.adjust')) && <label className="block">Reason for correction or refund<Input value={reason} onChange={e=>{setReason(e.target.value);setAdjustKey('');}} placeholder="Explain why this correction is needed"/></label>}
      {can('wallet.adjust') && <div className="space-y-2"><label className="block">Balance correction (₹; use − to deduct)<Input type="number" step="0.01" value={adjustment} onChange={e=>{setAdjustment(e.target.value);setAdjustKey('');}}/></label><p className="text-sm text-muted-foreground">Use a reason above. Adjustments are not desk collections.</p><Button variant="outline" disabled={busy||!adjustment||!Number(adjustment)||reason.trim().length<3} onClick={()=>action(async()=>{const requestKey=adjustKey||crypto.randomUUID();setAdjustKey(requestKey);const value=adjustment.startsWith('-')?-paise(adjustment.slice(1)):paise(adjustment);await cafeCall(`${prefix}/wallets/${loadedUser}/adjustments`,{amount:value,reason,idempotency_key:requestKey});setAdjustment('');setAdjustKey('');await syncAfterWrite('Balance adjustment recorded.',true);})}>Save correction</Button></div>}
      <div className="overflow-auto"><table className="w-full text-left text-xs [&_th]:bg-muted/40 [&_td]:px-2 [&_td]:py-2 [&_td]:align-top"><thead><tr>{['Date & time','Transaction','Amount','Staff member','Reason','Action'].map(h=><th className="p-2 whitespace-nowrap" key={h}>{h}</th>)}</tr></thead><tbody>{wallet.ledger.map(e=><tr className="border-t" key={e.id}><td className="p-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td><td>{activityLabel(e.kind)}</td><td>{rupees(e.amount)}</td><td>{e.actor_name}</td><td>{e.reason}</td><td>{can('wallet.refund') && ['topup','capture'].includes(e.kind) && <Button variant="outline" disabled={busy||reason.trim().length<3} onClick={()=>action(async()=>{await cafeCall(`${prefix}/ledger/${e.id}/refund`,{reason,idempotency_key:`refund-${e.id}-${activeStaff?.id}`});await syncAfterWrite('Reversal recorded.',true);})}>Refund</Button>}</td></tr>)}</tbody></table></div>{wallet.ledger.length===0&&<p className="text-xs text-muted-foreground">No transactions yet.</p>}</div></details></>}
    </section>}
    </div>
    {view==='settings' && policy && can('account.manage') && <details className="space-y-3 rounded-lg border bg-card p-3"><summary className="cursor-pointer text-sm font-semibold">Payment settings</summary>
      <p className="text-xs text-muted-foreground">Gaming uses cafe wallet; top-ups are collected at the desk.</p>
      <label className="block"><input type="checkbox" checked={policy.self_service} onChange={e=>setPolicy({...policy,self_service:e.target.checked})}/> Enable QR self-service</label>
      {['cash','cafe_upi'].map(m=><label className="mr-4" key={m}><input type="checkbox" checked={policy.desk_methods.includes(m)} onChange={e=>setPolicy({...policy,desk_methods:e.target.checked?[...policy.desk_methods,m]:policy.desk_methods.filter(x=>x!==m)})}/> {m==='cash'?'Cash':'Cafe UPI'}</label>)}
      <label className="block"><input type="checkbox" checked={policy.food_ordering} onChange={e=>setPolicy({...policy,food_ordering:e.target.checked})}/> Food ordering enabled</label>
      <label className="block">Food payment collected by <select className="rounded border bg-background p-2" value={policy.food_collection} onChange={e=>setPolicy({...policy,food_collection:e.target.value as 'cafe'|'vendor'})}><option value="vendor">Food vendor directly</option><option value="cafe">Cafe</option></select></label>
      <h3>Session durations and prices</h3>{policy.durations.map((d,i)=><div className="flex flex-wrap items-end gap-2" key={i}><label>Minutes<Input type="number" value={d.minutes} onChange={e=>setPolicy({...policy,durations:policy.durations.map((v,j)=>i===j?{...v,minutes:Number(e.target.value)}:v)})}/></label><label>Price ₹<Input type="number" step="0.01" value={d.amount/100} onChange={e=>setPolicy({...policy,durations:policy.durations.map((v,j)=>i===j?{...v,amount:Math.round(Number(e.target.value)*100)}:v)})}/></label><Button variant="outline" onClick={()=>setPolicy({...policy,durations:policy.durations.filter((_,j)=>j!==i)})}>Remove</Button></div>)}
      <Button variant="outline" onClick={()=>setPolicy({...policy,durations:[...policy.durations,{minutes:30,amount:5000}]})}>Add duration</Button>{' '}<Button disabled={busy || policy.desk_methods.length===0 || policy.durations.length===0} onClick={()=>action(async()=>{setPolicy(await cafeCall(`${prefix}/policy`,policy,'PUT'));setMessage('Payment policy saved.');})}>Save policy</Button>
    </details>}
    {view==='wallet' && can('store.manage') && orders.length>0 && <details className="rounded-lg border bg-card p-3"><summary className="cursor-pointer text-xs font-medium">Food payments</summary>{orders.length===0 && <p className="text-xs text-muted-foreground">No orders.</p>}{orders.map(o=><div key={o.id} className="border-t py-2 text-sm"><p>Gamer #{o.user_id} · {o.items.map(i=>`${i.quantity} × ${i.name}`).join(', ')} · {rupees(o.amount)}</p><p>{o.collector==='vendor'?'Food store collects directly':o.state==='paid'?'Paid at cafe':'Awaiting cafe payment'}</p>{o.collector==='cafe'&&o.state!=='paid'&&<Button disabled={busy||!openShift} onClick={()=>action(async()=>{await cafeCall(`${prefix}/food/orders/${o.id}/collect`,{method});await syncAfterWrite('Food payment recorded.');})}>Record {method==='cash'?'cash':'cafe UPI'} payment</Button>}</div>)}</details>}
    {view==='activity' && can('transactions.view') && <section className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><Input aria-label="Search activity" placeholder="Search staff or activity" value={activitySearch} onChange={e=>setActivitySearch(e.target.value)} className="max-w-xs" /><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={()=>action(refresh)}>Refresh</Button><Button variant="outline" disabled={!filteredAudit.length} onClick={()=>downloadActivityCsv([['Date & time','Staff member','Activity','Gamer ID','Details'],...filteredAudit.map(row=>[new Date(row.created_at).toLocaleString(),row.actor_name,activityLabel(row.action),String((row.details as any)?.user_id||'—'),activityDetails(row.details)])])}>Export CSV</Button></div></div>
      <div className="overflow-auto"><table className="w-full text-left text-xs [&_th]:bg-muted/40 [&_td]:px-2 [&_td]:py-2 [&_td]:align-top"><thead><tr>{['Date & time','Staff member','Activity','Gamer ID','Details'].map(label=><th className="p-2 whitespace-nowrap" key={label}>{label}</th>)}</tr></thead><tbody>{filteredAudit.map(row=><tr className="border-t" key={row.id}><td className="whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td><td>{row.actor_name}</td><td>{activityLabel(row.action)}</td><td>{String((row.details as any)?.user_id||'—')}</td><td className="min-w-48">{activityDetails(row.details)}</td></tr>)}</tbody></table></div>
      {!filteredAudit.length&&<p className="text-xs text-muted-foreground">No matching activity.</p>}
      <p className="text-xs text-muted-foreground">Latest {audit.length} records</p>
      {shifts.length>0&&<><h3 className="text-sm font-semibold">Your shift history</h3><div className="overflow-auto"><table className="w-full text-left text-xs [&_th]:bg-muted/40 [&_td]:px-2 [&_td]:py-2 [&_td]:align-top"><thead><tr>{['Shift ended','Staff member','Starting cash','Expected cash','Counted cash','Difference','UPI received'].map(label=><th key={label} className="p-2 whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{shifts.filter(shift=>shift.closed_at).map(shift=><tr className="border-t" key={shift.id}><td>{new Date(shift.closed_at!).toLocaleString()}</td><td>{shift.actor_name}</td><td>{rupees(shift.opening_cash)}</td><td>{rupees(shift.expected_cash??0)}</td><td>{rupees(shift.counted_cash??0)}</td><td>{rupees((shift.counted_cash??0)-(shift.expected_cash??0))}</td><td>{rupees(shift.upi_receipts??0)}</td></tr>)}</tbody></table></div></>}
    </section>}

    </fieldset>}
    {view==='wallet'&&<Dialog open={showShift} onOpenChange={setShowShift}><DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto p-0"><DialogHeader className="sr-only"><DialogTitle>Manage your shift</DialogTitle></DialogHeader>{showShift&&<CafeWalletWorkspace embedded view="shift" />}</DialogContent></Dialog>}
  </section>;
}
