import * as React from "react";

import { cn } from "@/lib/utils";

type MobileCompactCardProps = React.HTMLAttributes<HTMLDivElement>;

export function MobileCompactCard({ className, ...props }: MobileCompactCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3",
        className
      )}
      {...props}
    />
  );
}
