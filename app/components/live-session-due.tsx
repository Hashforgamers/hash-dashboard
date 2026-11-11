import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
export function LiveSessionDue({ overtime, amountDue, paymentStatus, starting = false }: {
  overtime: number; amountDue: number; paymentStatus?: string; starting?: boolean;
}) {
  const late = overtime > 0;
  const label = starting ? 'Starting' : late ? 'Overtime' : 'Active';
  return <div className="live-session-due flex flex-col items-start gap-1.5">
    <span className={cn(badgeVariants({ variant: starting ? "warning" : late ? "danger" : "success" }), "gap-1.5 whitespace-nowrap")}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current"/>{label}
    </span>
    {amountDue > 0 ? <span className="whitespace-nowrap text-xs font-medium tabular-nums text-amber-400">₹{amountDue.toFixed(2)} due</span>
      : paymentStatus === 'extension_reserved' ? <span className="text-xs text-amber-400">Pay after play</span> : null}
  </div>;
}
