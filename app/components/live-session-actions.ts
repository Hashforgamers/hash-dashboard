import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const dimensions = "live-session-action h-9 w-28 min-w-28 shrink-0 gap-2 px-3 text-[13px] font-medium leading-none tracking-normal";
export const checkoutButtonClass = cn(buttonVariants({ variant: "soft-warning", size: "sm" }), dimensions, "text-amber-800 dark:text-amber-200");
export const releaseButtonClass = cn(buttonVariants({ variant: "soft-success", size: "sm" }), dimensions, "text-emerald-800 dark:text-emerald-200");
export const retryButtonClass = cn(buttonVariants({ variant: "outline", size: "sm" }), dimensions);
