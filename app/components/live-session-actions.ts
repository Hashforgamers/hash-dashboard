import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const dimensions = "live-session-action h-9 w-28 min-w-28 shrink-0 gap-2 px-3 text-[13px] font-medium leading-none tracking-normal";
// Plain outline buttons: the status pill carries the colour, not the action.
export const checkoutButtonClass = cn(buttonVariants({ variant: "outline", size: "sm" }), dimensions);
export const releaseButtonClass = cn(buttonVariants({ variant: "outline", size: "sm" }), dimensions);
export const retryButtonClass = cn(buttonVariants({ variant: "outline", size: "sm" }), dimensions);
