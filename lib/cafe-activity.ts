import {rupees} from './cafe-api';
export const activityLabel = (action:string) => ({
  'shift.opened':'Shift started', 'shift.closed':'Shift ended',
  'session.login':'Staff signed in', 'session.logout':'Staff signed out', 'session.expired':'Staff session expired',
  'payment_policy.updated':'Payment settings changed', 'wallet.adjusted':'Wallet balance corrected',
  'food.ordered':'Food order placed', 'food.collected':'Food payment collected',
  topup:'Wallet top-up', capture:'Gaming payment', refund:'Payment reversed', adjustment:'Balance correction',
  reserve:'Amount held for gaming', release:'Hold released', food_collection:'Food payment',
}[action] || action.replaceAll('_',' ').replaceAll('.',' '));
export function activityDetails(value:unknown):string {
  const details=(value&&typeof value==='object'?value:{}) as Record<string,unknown>;
  if(details.before&&details.after) return 'Cafe payment options updated';
  const labels:Record<string,string>={opening_cash:'Starting cash',counted_cash:'Counted cash',expected_cash:'Expected cash',discrepancy:'Cash difference',upi_receipts:'UPI received',amount:'Amount',reason:'Reason',method:'Payment method',minutes:'Minutes',booking_id:'Booking',order_id:'Order',session_id:'Session'};
  return Object.entries(labels).filter(([key])=>details[key]!=null).map(([key,label])=>{
    const value=details[key];
    const money=['opening_cash','counted_cash','expected_cash','discrepancy','upi_receipts','amount'].includes(key);
    return `${label}: ${money&&typeof value==='number'?rupees(value):value==='cafe_upi'?'Cafe UPI':String(value)}`;
  }).join(' · ') || '—';
}
export function downloadActivityCsv(rows:(string|number)[][]) {
  const csv=rows.map(row=>row.map(value=>{
    let text=String(value);if(/^[\s]*[=+@-]/.test(text))text="'"+text;
    return '"'+text.replaceAll('"','""')+'"';
  }).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a');link.href=url;link.download='cafe-activity.csv';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
