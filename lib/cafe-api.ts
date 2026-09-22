import { DASHBOARD_URL } from '@/src/config/env';

export async function cafeCall<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', token?: string): Promise<T> {
  const response = await fetch(`${DASHBOARD_URL}/api/cafe${path}`, {
    method, cache: 'no-store', signal: AbortSignal.timeout(15000), headers: {'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? localStorage.getItem('rbac_access_token_v1') ?? ''}`},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}

export const rupees = (paise: number) => new Intl.NumberFormat('en-IN', {style:'currency', currency:'INR'}).format(paise / 100);
export function paise(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Enter a valid amount with at most two decimal places');
  const result = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(result)) throw new Error('Amount is too large');
  return result;
}
export type CafePolicy = {gaming_methods: string[]; topup_channels: string[]; desk_methods: string[];
  hash_online_collection: boolean; self_service: boolean; food_ordering: boolean;
  food_collection: 'cafe'|'vendor'; durations: {minutes:number; amount:number}[]};
export type LedgerEntry = {id:number; kind:string; amount:number; method:string|null; actor_name:string; created_at:string; reason:string};
export type Shift = {id:string; actor_name:string; opening_cash:number; closed_at:string|null; expected_cash:number|null; counted_cash:number|null; upi_receipts:number|null};

export async function endCafeStaffSession() {
  const token=localStorage.getItem('rbac_access_token_v1');
  if(!token)return;
  try {
    const raw=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const claims=JSON.parse(atob(raw));
    if(claims.vendor_id)await cafeCall(`/${claims.vendor_id}/logout`,{},'POST',token);
  } catch {
    // Offline logout is local immediately; server records expiry at the JWT deadline.
  }
}
