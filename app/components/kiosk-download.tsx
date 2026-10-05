'use client';
import {useEffect,useState} from 'react';
export function KioskDownload(){
 const [release,setRelease]=useState<{version:string;download_url:string}|null>(null);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{const abort=new AbortController();fetch('/api/kiosk-release',{cache:'no-store',signal:abort.signal}).then(r=>r.ok?r.json():null).then(data=>setRelease(data?.data||null)).catch(()=>{}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});return()=>abort.abort();},[]);
 if(loading)return <span className="rounded-md border px-3 py-2 text-muted-foreground">Loading kiosk download…</span>;
 if(!release)return <span className="rounded-md border px-3 py-2 text-muted-foreground">Kiosk download unavailable</span>;
 return <a className="rounded-md border px-3 py-2 hover:bg-muted" href={release.download_url} target="_blank" rel="noopener noreferrer">Download kiosk · Windows · {release.version}</a>;
}
