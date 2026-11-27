import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-medium leading-5 ring-offset-background transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-white/[0.08] bg-white/[0.03] text-foreground hover:border-white/[0.12] hover:bg-white/[0.07]",
        secondary:
          "bg-white/[0.07] text-foreground hover:bg-white/[0.11]",
        ghost: "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // solid status actions (e.g. Settle, Confirm payment)
        success: "bg-emerald-600 text-white hover:bg-emerald-500",
        warning: "bg-amber-500 text-zinc-950 hover:bg-amber-400",
        // soft status actions: same tints as the matching Badge variants
        "soft-success": "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20",
        "soft-warning": "border border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20",
        "soft-danger": "border border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20",
        "soft-info": "border border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20",
      },
      // one height scale for the dashboard (px, html is 14px): 34px default, 28px compact, 40px prominent.
      // Inputs use the same 34px so a button sits flush beside a field.
      size: {
        default: "h-[34px] px-3.5",
        sm: "h-7 px-2.5 text-xs",
        lg: "h-10 px-5 text-sm",
        icon: "h-[34px] w-[34px]",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
