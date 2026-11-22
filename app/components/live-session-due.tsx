import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
export function LiveSessionDue({ overtime, starting = false, paymentDue = false }: {
  overtime: number; starting?: boolean; paymentDue?: boolean;
}) {
  const late = overtime > 0;
  if (paymentDue) {
    return <div className="live-session-due flex flex-col items-start gap-1.5">
      <span className={cn(badgeVariants({ variant: "warning" }), "h-6 min-w-[88px] justify-center gap-1.5 whitespace-nowrap px-2 text-xs leading-none")}>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current"/>Payment due
      </span>
    </div>;
  }
  const label = starting ? 'Starting' : late ? 'Extra time' : 'Active';
  return <div className="live-session-due flex flex-col items-start gap-1.5">
    <span className={cn(badgeVariants({ variant: starting ? "warning" : late ? "danger" : "success" }), "h-6 min-w-[88px] justify-center gap-1.5 whitespace-nowrap px-2 text-xs leading-none")}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current"/>{label}
    </span>
  </div>;
}
