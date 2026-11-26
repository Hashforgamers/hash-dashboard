import { cn } from "@/lib/utils";

// One quiet status pill per row: neutral outline, colour only on the dot.
export type StatusTone = "ok" | "attention" | "alert" | "muted";

const DOT: Record<StatusTone, string> = {
  ok: "bg-emerald-500",
  attention: "bg-amber-500",
  alert: "bg-red-500",
  muted: "bg-muted",
};

export function StatusPill({ tone, label, title, className }: {
  tone: StatusTone; label: string; title?: string; className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-transparent px-2 text-xs font-medium leading-none text-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[tone])} />
      {label}
    </span>
  );
}

export function LiveSessionDue({ overtime, starting = false, paymentDue = false, stale = false, detail, detailTitle }: {
  overtime: number; starting?: boolean; paymentDue?: boolean; stale?: boolean;
  detail?: string; detailTitle?: string;
}) {
  const late = overtime > 0;
  const [tone, label]: [StatusTone, string] = paymentDue ? ["attention", "Payment due"]
    : stale ? ["alert", "Overdue"]
    : starting ? ["muted", "Starting"]
    : late ? ["attention", "Extra time"]
    : ["ok", "Active"];
  return (
    <div className="live-session-due flex max-w-[200px] flex-col items-start gap-1">
      <StatusPill tone={tone} label={label} />
      {detail ? (
        <p className="text-xs leading-snug text-muted-foreground" title={detailTitle}>{detail}</p>
      ) : null}
    </div>
  );
}
