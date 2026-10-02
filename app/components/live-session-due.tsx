export function LiveSessionDue({ overtime, amountDue }: { overtime: number; amountDue: number }) {
  const seconds = Math.max(0, Math.floor(overtime));
  const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':');
  return <div className="live-session-due flex flex-col gap-1">
    <span className={seconds > 0 ? 'font-semibold text-red-400' : 'text-emerald-400'}>{time}</span>
    {amountDue > 0 && <span className="font-semibold text-amber-300">To be paid: ₹{amountDue.toFixed(2)}</span>}
  </div>;
}
