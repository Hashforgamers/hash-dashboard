import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const base=(process.env.ONBOARD_BACKEND_URL || 'https://hfg-onboard.onrender.com').replace(/\/$/,'');
    const response=await fetch(`${base}/api/kiosk/releases/latest`,{cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!response.ok)return NextResponse.json({data:null},{status:response.status});
    return NextResponse.json(await response.json(),{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({data:null},{status:503});}
}
