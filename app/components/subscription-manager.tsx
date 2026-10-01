"use client";
import {useCallback, useEffect, useState} from "react";
import {apiCall, subscriptionApi} from "@/lib/api";
import {useSubscription} from "@/hooks/useSubscription";
import {createRazorpayOptions, openRazorpay} from "@/lib/razorpay";
import {DASHBOARD_URL} from "@/src/config/env";
import {Button} from "@/components/ui/button";
import {toast} from "sonner";

type Plan={code:string;name:string;pc_limit:number;price:number;features:{plan_features?:string[];entitlements?:string[];extra_pc_monthly?:number}};
type Terms={package_name:string;package_code:string;pc_limit:number;extra_pcs:number;billing_cycle:string;entitlements:string[]};
type Purchase={id:string;state:string;terms:Terms;amount_paise:number;period_start:string;period_end:string;description:string;tax_note:string;key_id?:string;order_id?:string;invoice_number?:string;activation_error?:string};
const money=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(paise/100);
const date=(value:string)=>new Date(value).toLocaleDateString('en-IN');

export function SubscriptionManager(){
 const {vendorId,refreshStatus}=useSubscription();
 const [plans,setPlans]=useState<Plan[]>([]);const [current,setCurrent]=useState<any>(null);
 const [purchases,setPurchases]=useState<Purchase[]>([]);const [preview,setPreview]=useState<Purchase|null>(null);
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
  if(result.state==='paid_unapplied'){await load();setError('Payment received but the subscription changed before activation. Contact Hash with the payment receipt; do not pay again.');}
  return result;
 },[vendorId,load,refreshStatus]);
 useEffect(()=>{
  const pending=purchases.filter(row=>row.state==='ordered');if(!pending.length)return;
  let cancelled=false,running=false;
  const timer=setInterval(async()=>{if(running||cancelled)return;running=true;try{for(const row of pending){if(cancelled)break;await reconcile(row.id);}}catch{/* Manual retry remains visible. */}finally{running=false;}},10000);
  return()=>{cancelled=true;clearInterval(timer);};
 },[purchases,reconcile]);
 async function review(plan:Plan){
  setBusy(true);setError('');
  try{setPreview(await apiCall<Purchase>(`${base}/preview`,{method:'POST',body:JSON.stringify({package_code:plan.code,billing_cycle:cycle,extra_pcs:extra[plan.code]||0})}));}
  catch(e){setError(e instanceof Error?e.message:'Unable to preview');}finally{setBusy(false);}
 }
 async function pay(row:Purchase){
  setBusy(true);setError('');
  try{
   const order=await apiCall<Purchase>(`${base}/purchases/${row.id}/pay`,{method:'POST'});
   if(order.state==='paid_unapplied'){await load();throw new Error('Payment received. Contact Hash to resolve activation; do not pay again.');}
   if(order.state==='paid'){setPreview(null);await load();await refreshStatus();return;}
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
 return <div className="space-y-6 p-4 md:p-6">
  <header><h1 className="text-2xl font-semibold">Subscription & PCs</h1><p className="text-sm text-muted-foreground">Review your plan, add kiosk capacity, and manage invoices.</p></header>
  {error&&<div role="alert" className="rounded border border-red-400 p-3">{error}<Button variant="outline" className="ml-3" onClick={()=>void load()}>Reload</Button></div>}
  <section className="rounded-xl border p-5"><h2 className="font-semibold">Current subscription</h2>
   {current?<><p>{current.commercial_terms?.package_name||current.package?.name} · {current.active_links||0} linked / {current.pc_limit} PC licences</p><p>Valid until {date(current.period_end)}</p><p className="text-sm text-muted-foreground">Included: {(current.commercial_terms?.entitlements||[]).join(', ')||'Core dashboard'}</p></>:<p>No active plan. Select a package below.</p>}
   <p className="mt-2 text-sm text-muted-foreground">Upgrades charge the remaining-period difference and keep your renewal date. Renewals extend your existing period. Payments do not auto-renew. Adding hardware is separate from buying kiosk licences.</p>
  </section>
  <section><h2 className="mb-3 text-lg font-semibold">Upgrade, renew or add PCs</h2>
   <label>Billing period <select className="ml-2 rounded border bg-background p-2" value={cycle} onChange={e=>{setCycle(e.target.value);setPreview(null);}}>{['monthly','quarterly','yearly'].map(c=><option key={c}>{c}</option>)}</select></label>
   <div className="mt-4 grid gap-4 md:grid-cols-3">{plans.map(plan=><article key={plan.code} className="space-y-3 rounded-xl border p-5">
    <h3 className="text-lg font-semibold">{plan.name}</h3><p>{plan.pc_limit} included PCs / kiosks</p><p>Monthly base {money(plan.price*100)}</p>
    <ul className="list-disc pl-5 text-sm">{(plan.features.plan_features||[]).map((f,i)=><li key={i}>{f}</li>)}</ul>
    <p className="text-sm">Dashboard: {(plan.features.entitlements||[]).join(', ')||'Core features'}</p>
    {Number(plan.features.extra_pc_monthly)>0&&<label className="block text-sm">Additional PCs ({money(Number(plan.features.extra_pc_monthly)*100)} each / month)<input aria-label={`Additional PCs for ${plan.name}`} className="mt-1 w-full rounded border bg-background p-2" type="number" min="0" max="10000" step="1" value={extra[plan.code]||0} onChange={e=>{setExtra(prev=>({...prev,[plan.code]:Number(e.target.value)}));setPreview(null);}}/></label>}
    <Button disabled={busy} onClick={()=>void review(plan)}>Review invoice preview</Button>
   </article>)}</div>{!plans.length&&<p>No packages are currently available. Contact Hash.</p>}
  </section>
  {preview&&<section role="dialog" aria-label="Invoice preview" className="space-y-3 rounded-xl border border-cyan-500 p-5">
   <h2 className="text-xl font-semibold">Invoice preview — unpaid</h2><p>{preview.terms.package_name} · {preview.terms.pc_limit} PCs / kiosks</p>
   <p>{preview.description}</p><p>{date(preview.period_start)} – {date(preview.period_end)}</p><p className="text-2xl font-semibold">Total payable {money(preview.amount_paise)}</p>
   <p className="text-sm">{preview.tax_note} Preview valid for 15 minutes.</p>
   <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>void pay(preview)}>{preview.amount_paise?'Pay and activate':'Activate free plan'}</Button><Button variant="outline" onClick={()=>void invoice(preview)}>Open printable preview</Button><Button variant="ghost" onClick={()=>setPreview(null)}>Back</Button></div>
  </section>}
  <section><h2 className="mb-3 text-lg font-semibold">Payments & invoices</h2>
   {purchases.length===0?<p>No purchases yet.</p>:purchases.map(row=><article key={row.id} className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded border p-4"><div><strong>{row.terms.package_name}</strong><p>{money(row.amount_paise)} · {row.state==='paid'?'Paid':row.state==='paid_unapplied'?'Paid — contact Hash for activation':'Payment pending'} · {row.terms.pc_limit} PCs</p><p className="text-xs">{date(row.period_start)} – {date(row.period_end)}</p></div><div className="flex gap-2">{row.state!=='ordered'?<Button variant="outline" onClick={()=>void invoice(row)}>Open invoice / print</Button>:<><Button disabled={busy} onClick={()=>void pay(row)}>Resume payment</Button><Button variant="outline" onClick={()=>void reconcile(row.id).catch(e=>setError(e.message))}>Check payment</Button></>}</div></article>)}
  </section>
 </div>;
}
