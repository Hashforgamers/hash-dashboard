import * as React from "react";

import { cn } from "@/lib/utils";

type MobileCompactCardProps = React.HTMLAttributes<HTMLDivElement>;

export function MobileCompactCard({ className, ...props }: MobileCompactCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-cyan-400/15 bg-slate-900/55 p-3",
        className
      )}
      {...props}
    />
  );
}
