export function LiveSessionDue({ overtime, amountDue, paymentStatus, starting = false }: {
  overtime: number; amountDue: number; paymentStatus?: string; starting?: boolean;
}) {
  const late = overtime > 0;
  const label = starting ? 'Starting' : late ? 'Overtime' : 'Active';
  return <div className="live-session-due flex flex-col items-start gap-1.5">
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${starting ? 'bg-amber-500/10 text-amber-400' : late ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current"/>{label}
    </span>
    {amountDue > 0 ? <span className="whitespace-nowrap text-xs font-medium tabular-nums text-amber-400">₹{amountDue.toFixed(2)} due</span>
      : paymentStatus === 'extension_reserved' ? <span className="text-xs text-amber-400">Pay after play</span> : null}
  </div>;
}
