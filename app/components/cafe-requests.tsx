"use client";
import {useEffect,useState} from 'react';
import {DASHBOARD_URL} from '@/src/config/env';
import {Button} from '@/components/ui/button';
export function CafeRequests({vendorId,onDocuments,notificationsOnly=false}:{notificationsOnly?:boolean;vendorId:number|string|null;onDocuments:()=>void}){
 const [rows,setRows]=useState<any[]>([]),[message,setMessage]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function request(method='GET'){
  const response=await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/requests`,{method,headers:{Authorization:`Bearer ${localStorage.getItem('jwtToken')||''}`,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify({message})}: {})});
  const result=await response.json();if(!response.ok)throw Error(result.message||'Unable to load requests');return result;
 }
 useEffect(()=>{if(!vendorId)return;let active=true;const load=()=>request().then(data=>{if(active)setRows(data.requests||[]);}).catch(()=>{if(active)setNotice('Unable to load support requests. Refresh to retry.');});void load();const timer=setInterval(load,30000);return()=>{active=false;clearInterval(timer);};},[vendorId]);
 if(notificationsOnly&&!rows.some(r=>r.kind==='document_reupload'&&r.document_status==='rejected'))return null;
 return <section className={notificationsOnly?'space-y-2':'account-panel rounded-lg border bg-card p-4 space-y-3'}>
 {!notificationsOnly&&<header><h2 className="account-section-title">Report an issue</h2><p className="text-xs text-muted-foreground mt-1">Contact Hash support and track your reports.</p></header>}
 {rows.filter(r=>r.kind==='document_reupload'&&r.document_status==='rejected').map(r=><div key={r.id} role="status" className="rounded border border-amber-500/40 p-3"><strong>Document re-upload requested · {r.document_type?.replaceAll('_',' ')}</strong><p className="text-sm my-2">{r.message}</p><Button size="sm" variant="outline" onClick={onDocuments}>Preview & re-upload</Button></div>)}
 {!notificationsOnly&&<><form className="max-w-2xl space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);setNotice('');try{const result=await request('POST');setNotice(`Issue #${result.ticket_id} submitted to Hash.`);setMessage('');setRows((await request()).requests||[]);}catch(e){setNotice(e instanceof Error?e.message:'Unable to submit issue');}finally{setBusy(false);}}}><label className="block text-sm">Issue details<textarea rows={4} required minLength={10} maxLength={4000} className="mt-1 w-full rounded border bg-background p-2" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Describe what happened and how to reproduce it."/></label><Button size="sm" disabled={busy||!vendorId}>{busy?'Submitting…':'Submit issue'}</Button></form>{rows.filter(r=>r.kind==='support_issue').map(r=><div key={r.id} className="border-t py-2 mt-2 text-sm"><strong>#{r.id} · {r.status}</strong><p>{r.message}</p></div>)}</>}
 {!notificationsOnly&&notice&&<p role="status" className="text-sm">{notice}</p>}
 </section>;
}
