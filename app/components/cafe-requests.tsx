"use client";
import {useEffect,useState} from 'react';
import {DASHBOARD_URL} from '@/src/config/env';
import {Button} from '@/components/ui/button';
export function CafeRequests({vendorId,onDocuments}:{vendorId:number|string|null;onDocuments:()=>void}){
 const [rows,setRows]=useState<any[]>([]),[message,setMessage]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function request(method='GET'){
  const response=await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/requests`,{method,headers:{Authorization:`Bearer ${localStorage.getItem('jwtToken')||''}`,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify({message})}: {})});
  const result=await response.json();if(!response.ok)throw Error(result.message||'Unable to load requests');return result;
 }
 useEffect(()=>{if(!vendorId)return;let active=true;const load=()=>request().then(data=>{if(active)setRows(data.requests||[]);}).catch(()=>{if(active)setNotice('Unable to load support requests. Refresh to retry.');});void load();const timer=setInterval(load,30000);return()=>{active=false;clearInterval(timer);};},[vendorId]);
 return <section className="rounded-lg border p-3 space-y-3">
 {rows.filter(r=>r.kind==='document_reupload'&&r.document_status==='rejected').map(r=><div key={r.id} role="status" className="rounded border border-amber-500/40 p-3"><strong>Document re-upload requested · {r.document_type?.replaceAll('_',' ')}</strong><p className="text-sm my-2">{r.message}</p><Button size="sm" variant="outline" onClick={onDocuments}>Preview & re-upload</Button></div>)}
 <details><summary className="cursor-pointer font-medium">Report an issue</summary><form className="mt-3 space-y-2" onSubmit={async e=>{e.preventDefault();setBusy(true);setNotice('');try{const result=await request('POST');setNotice(`Issue #${result.ticket_id} submitted to Hash.`);setMessage('');setRows((await request()).requests||[]);}catch(e){setNotice(e instanceof Error?e.message:'Unable to submit issue');}finally{setBusy(false);}}}><label className="block text-sm">What went wrong?<textarea required minLength={10} maxLength={4000} className="mt-1 w-full rounded border bg-background p-2" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Describe the problem and the steps to reproduce it. Do not include passwords or payment details."/></label><Button size="sm" disabled={busy||!vendorId}>{busy?'Submitting…':'Submit issue'}</Button></form>{rows.filter(r=>r.kind==='support_issue').map(r=><div key={r.id} className="border-t py-2 mt-2 text-sm"><strong>#{r.id} · {r.status}</strong><p>{r.message}</p></div>)}</details>
 {notice&&<p role="status" className="text-sm">{notice}</p>}
 </section>;
}
