"use client";
import {useCallback, useEffect, useState} from "react";
import {apiCall, subscriptionApi} from "@/lib/api";
import {useSubscription} from "@/hooks/useSubscription";
import {createRazorpayOptions, openRazorpay} from "@/lib/razorpay";
import {DASHBOARD_URL} from "@/src/config/env";
import {Button} from "@/components/ui/button";
import Link from "next/link";
import {toast} from "sonner";

type Plan={code:string;name:string;pc_limit:number;price:number;features:{plan_features?:string[];entitlements?:string[];extra_pc_monthly?:number}};
type Terms={package_name:string;package_code:string;pc_limit:number;extra_pcs:number;billing_cycle:string;entitlements:string[]};
type Purchase={id:string;state:string;terms:Terms;amount_paise:number;period_start:string;period_end:string;description:string;tax_note:string;key_id?:string;order_id?:string;invoice_number?:string;activation_error?:string};
const money=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(paise/100);
const date=(value:string)=>new Date(value).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const featureLabels:Record<string,string>={kiosk:'PC kiosk',pricing:'Console pricing',cafe_wallet:'Cafe wallet',passes:'Passes',food:'Extra services',analytics:'Reports',tournaments:'Tournaments',staff:'Team access'};
const features=(items:string[])=>items.map(item=>featureLabels[item]||item).join(' · ');

export function SubscriptionManager(){
 const {vendorId,refreshStatus}=useSubscription();
 const [plans,setPlans]=useState<Plan[]>([]);const [current,setCurrent]=useState<any>(null);
 const [purchases,setPurchases]=useState<Purchase[]>([]);const [preview,setPreview]=useState<Purchase|null>(null);
 const [additionalPCs,setAdditionalPCs]=useState(1);
 const [section,setSection]=useState<'capacity'|'plans'|'invoices'>('capacity');
 const [cycle,setCycle]=useState('monthly');const [extra,setExtra]=useState<Record<string,number>>({});
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 const base=`/api/vendors/${vendorId}/subscription`;
 const load=useCallback(async()=>{
  if(!vendorId)return;
  try{
   const [catalog,subscription,history]=await Promise.all([subscriptionApi.getPackages(),subscriptionApi.getSubscription(vendorId),apiCall<{purchases:Purchase[]}>(`/api/vendors/${vendorId}/subscription/purchases`)]);
   setPlans(catalog.packages||[]);setCurrent(subscription.status==='none'?null:subscription);setPurchases(history.purchases);
   const terms=subscription.commercial_terms;
   if(terms){setCycle(terms.billing_cycle);setExtra(prev=>({...prev,[terms.package_code]:prev[terms.package_code]??terms.extra_pcs}));}
   setError('');
  }catch(e){setError(e instanceof Error?e.message:'Unable to load subscription');}finally{setLoading(false);}
 },[vendorId]);
 useEffect(()=>{void load();},[load]);
 const reconcile=useCallback(async(id:string)=>{
  const result=await apiCall<Purchase>(`/api/vendors/${vendorId}/subscription/purchases/${id}/reconcile`,{method:'POST'});
  if(result.state==='paid'){setPreview(null);await load();await refreshStatus();toast.success('Payment confirmed. Subscription updated.');}
  if(result.state==='ordered'){setPurchases(rows=>rows.map(row=>row.id===result.id?result:row));}
  if(result.state==='paid_unapplied'){await load();setError('Payment received but the subscription changed before activation. Contact Hash with the payment receipt; do not pay again.');}
  return result;
 },[vendorId,load,refreshStatus]);
 useEffect(()=>{
  const pending=purchases.filter(row=>row.state==='ordered');if(!pending.length)return;
  let cancelled=false,running=false;
  const timer=setInterval(async()=>{if(running||cancelled)return;running=true;try{for(const row of pending){if(cancelled)break;await reconcile(row.id);}}catch{/* Manual retry remains visible. */}finally{running=false;}},10000);
  return()=>{cancelled=true;clearInterval(timer);};
 },[purchases,reconcile]);
 async function review(plan:Plan,addToCurrent=false){
  setBusy(true);setError('');
  try{setPreview(await apiCall<Purchase>(`${base}/preview`,{method:'POST',body:JSON.stringify({package_code:plan.code,billing_cycle:cycle,extra_pcs:addToCurrent?additionalPCs:extra[plan.code]||0,...(addToCurrent?{action:'add_pcs'}:{})})}));}
  catch(e){setError(e instanceof Error?e.message:'Unable to preview');}finally{setBusy(false);}
 }
 async function pay(row:Purchase){
  setBusy(true);setError('');
  try{
   const order=await apiCall<Purchase>(`${base}/purchases/${row.id}/pay`,{method:'POST'});
   if(order.state==='paid_unapplied'){await load();throw new Error('Payment received. Contact Hash to resolve activation; do not pay again.');}
   if(order.state==='paid'){setPreview(null);await load();await refreshStatus();toast.success('Payment confirmed. Subscription updated.');return;}
   await load();
   await openRazorpay(createRazorpayOptions(order.order_id!,order.amount_paise/100,order.terms.package_name,order.key_id!,async()=>{try{await reconcile(order.id);}catch(e){setError('Payment confirmation is pending. Use Check payment below; do not pay again.');}},()=>setBusy(false)));
  }catch(e){setError(e instanceof Error?e.message:'Unable to start payment');}finally{setBusy(false);}
 }
 async function invoice(row:Purchase){
  const popup=window.open('','_blank');
  try{
   const token=localStorage.getItem('rbac_access_token_v1')||localStorage.getItem('jwtToken');
   const response=await fetch(`${DASHBOARD_URL}${base}/purchases/${row.id}/invoice`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
   if(!response.ok)throw new Error('Unable to open invoice');
   const blob=new Blob([await response.text()],{type:'text/html'});const url=URL.createObjectURL(blob);
   if(popup){popup.opener=null;popup.location.href=url;}else{const a=document.createElement('a');a.href=url;a.download=`${row.invoice_number||'invoice-preview'}.html`;a.click();}
   setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){popup?.close();setError('Unable to open invoice. Please retry.');}
 }
 if(!vendorId)return <p className="p-6">Select a cafe to manage its subscription. <a className="underline" href="/select-cafe">Select cafe</a></p>;
 if(loading)return <p className="p-6">Loading subscription…</p>;
 const pendingPurchase=purchases.find(row=>row.state==='ordered'||row.state==='paid_unapplied');
 const currentPlan=plans.find(plan=>plan.code===(current?.commercial_terms?.package_code||current?.package?.code));
 return <div className="w-full min-w-0 space-y-4 p-4 text-sm subscription-workspace">
  <header className="flex flex-wrap items-center justify-between gap-2"><div><Link href="/account#subscription" className="text-xs text-muted-foreground hover:underline">← Account settings</Link><h1 className="!!text-lg font-semibold">Subscription</h1></div><Link href="/gaming" className="text-xs underline">Gaming consoles</Link></header>
  {error&&<div role="alert" className="rounded border border-red-400 p-3">{error}<Button variant="outline" className="ml-3" onClick={()=>void load()}>Reload</Button></div>}
  <section className="rounded-lg border p-3"><h2 className="!text-sm font-semibold mb-2">Current plan</h2>
   {current?<><p>{current.commercial_terms?.package_name||current.package?.name} · {current.active_links||0} linked / {current.pc_limit} PC licences</p><p>Valid until {date(current.period_end)}</p><details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Included features</summary><p className="mt-1">{features(current.commercial_terms?.entitlements||[])||'Core dashboard'}</p></details></>:<p>No active plan. Select a package below.</p>}
   <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Billing terms</summary><p className="mt-1">Upgrades are prorated and keep your renewal date. Renewals extend your plan. Payments do not auto-renew. PC licences do not include hardware.</p></details>
  </section>
  <nav aria-label="Subscription sections" className="flex flex-wrap gap-1 border-b pb-2">{([['capacity','Add PCs'],['plans','Plans & renewal'],['invoices','Invoices']] as const).map(([key,label])=><Button key={key} size="sm" variant={section===key?'secondary':'ghost'} aria-pressed={section===key} onClick={()=>{setSection(key);setPreview(null);}}>{label}</Button>)}</nav>
  {pendingPurchase&&<section role="status" className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4"><h2 className="!text-sm font-semibold">{pendingPurchase.state==='paid_unapplied'?'Payment received — activation needs attention':'Finish your pending payment'}</h2><p>{pendingPurchase.terms.package_name} · {money(pendingPurchase.amount_paise)}</p><p className="text-xs text-muted-foreground">{pendingPurchase.state==='paid_unapplied'?'Do not pay again. Share this payment reference with Hash to resolve activation.':'Resume the existing checkout, or check whether payment has already completed before choosing another plan.'}</p><p className="break-all text-xs text-muted-foreground">Reference: {pendingPurchase.invoice_number||pendingPurchase.order_id||pendingPurchase.id}</p><div className="flex flex-wrap gap-2">{pendingPurchase.state==='ordered'?<><Button disabled={busy} onClick={()=>void pay(pendingPurchase)}>Resume payment</Button><Button variant="outline" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const result=await reconcile(pendingPurchase.id);if(result.state==='ordered')toast.info('No completed payment was found. You can resume this checkout.');}catch(e){setError(e instanceof Error?e.message:'Unable to check payment');}finally{setBusy(false);}}}>Check payment</Button></>:<Button variant="outline" disabled={busy} onClick={()=>void invoice(pendingPurchase)}>View payment receipt</Button>}<Button variant="ghost" onClick={()=>{setSection('invoices');setPreview(null);}}>View payments</Button></div></section>}
  {section==='capacity'&&<section className="rounded-lg border p-4 space-y-3"><div className="flex flex-wrap justify-between gap-2"><h2 className="!text-base font-semibold">PC capacity</h2><span className="text-muted-foreground">{Math.max(0,(current?.pc_limit||0)-(current?.active_links||0))} licences available</span></div>
   <p className="text-muted-foreground">Link PCs within your existing limit in <Link href="/gaming" className="underline">Gaming consoles</Link>.</p>
   {current&&currentPlan&&Number(currentPlan.features.extra_pc_monthly)>0?<><div className="flex flex-wrap items-end gap-3"><label className="text-xs">PCs to add<input className="mt-1 block w-24 rounded border bg-background px-3 py-2" type="number" min="1" max="10000" step="1" value={additionalPCs} onChange={e=>{setAdditionalPCs(Number(e.target.value));setPreview(null);}}/></label><Button disabled={busy||!!pendingPurchase||!Number.isInteger(additionalPCs)||additionalPCs<1} onClick={()=>void review(currentPlan,true)}>Review additional PCs</Button></div><p className="text-xs text-muted-foreground">{money(Number(currentPlan.features.extra_pc_monthly)*100)} / PC / month · Prorated until {date(current.period_end)}. Your plan and renewal date stay unchanged.</p></>:<p className="text-muted-foreground">{current?'Additional PC pricing is unavailable for your current plan. Contact Hash or choose a larger plan.':'Choose a plan to enable PC licences.'}</p>}
  </section>}
  {section==='plans'&&<section><h2 className="mb-2 !text-sm font-semibold">Plans & renewal</h2>
   <label>Billing period <select className="ml-2 rounded border bg-background p-2" value={cycle} onChange={e=>{setCycle(e.target.value);setPreview(null);}}>{['monthly','quarterly','yearly'].map(c=><option key={c}>{c}</option>)}</select></label>
   <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{plans.map(plan=><article key={plan.code} className="space-y-3 rounded-lg border p-3">
    <h3 className="!text-base font-semibold">{plan.name}</h3><p>{plan.pc_limit} included PCs / kiosks</p><p>Monthly base {money(plan.price*100)}</p>
    <ul className="list-disc pl-5 text-sm">{(plan.features.plan_features||[]).map((f,i)=><li key={i}>{f}</li>)}</ul>
    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Included features</summary><p className="mt-1">{features(plan.features.entitlements||[])||'Core features'}</p></details>
    {Number(plan.features.extra_pc_monthly)>0&&<label className="block text-sm">Additional PCs ({money(Number(plan.features.extra_pc_monthly)*100)} each / month)<input aria-label={`Additional PCs for ${plan.name}`} className="mt-1 w-full rounded border bg-background p-2" type="number" min="0" max="10000" step="1" value={extra[plan.code]||0} onChange={e=>{setExtra(prev=>({...prev,[plan.code]:Number(e.target.value)}));setPreview(null);}}/></label>}
    <Button disabled={busy||!!pendingPurchase} onClick={()=>void review(plan)}>Review plan</Button>
   </article>)}</div>{!plans.length&&<p>No packages are currently available. Contact Hash.</p>}
  </section>}
  {preview&&<section role="dialog" aria-label="Invoice preview" className="space-y-2 rounded-lg border border-cyan-500 p-3">
   <h2 className="!text-lg font-semibold">Invoice preview — unpaid</h2><p>{preview.terms.package_name} · {preview.terms.pc_limit} PCs / kiosks</p>
   <p>{preview.description}</p><p>{date(preview.period_start)} – {date(preview.period_end)}</p><p className="text-2xl font-semibold">Total payable {money(preview.amount_paise)}</p>
   <p className="text-sm">{preview.tax_note} Preview valid for 15 minutes.</p>
   <div className="flex flex-wrap gap-2"><Button disabled={busy||!!pendingPurchase} onClick={()=>void pay(preview)}>{preview.amount_paise?'Pay and activate':'Activate free plan'}</Button><Button variant="outline" onClick={()=>void invoice(preview)}>Print preview</Button><Button variant="ghost" onClick={()=>setPreview(null)}>Back</Button></div>
  </section>}
  {section==='invoices'&&<section><h2 className="mb-2 !text-sm font-semibold">Payments & invoices</h2>
   {purchases.length===0?<p>No purchases yet.</p>:purchases.map(row=><article key={row.id} className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded border p-3"><div><strong>{row.terms.package_name}</strong><p>{money(row.amount_paise)} · {row.state==='paid'?'Paid':row.state==='paid_unapplied'?'Paid — contact Hash for activation':'Payment pending'} · {row.terms.pc_limit} PCs</p><p className="text-xs">{date(row.period_start)} – {date(row.period_end)}</p></div><div className="flex gap-2">{row.state!=='ordered'?<Button variant="outline" onClick={()=>void invoice(row)}>Invoice</Button>:<><Button disabled={busy} onClick={()=>void pay(row)}>Resume payment</Button><Button variant="outline" disabled={busy} onClick={async()=>{setBusy(true);try{const result=await reconcile(row.id);if(result.state==='ordered')toast.info('No completed payment was found. Resume the existing checkout.');}catch(e){setError(e instanceof Error?e.message:'Unable to check payment');}finally{setBusy(false);}}}>Check payment</Button></>}</div></article>)}
  </section>}
 </div>;
}
