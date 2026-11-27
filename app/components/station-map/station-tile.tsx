"use client"
import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { resolveConsoleIcon } from "../console-catalog"
import { STATION_STATE_LABEL, type StationState } from "@/lib/station-map"

// One look for station status everywhere (map, popover, New session picker).
// Colours follow the dashboard's soft status badges: emerald free, primary in
// session, amber ending, purple booked, muted offline.
export const STATE_STYLE: Record<StationState, { tile: string; dot: string; bar: string; text: string }> = {
  free: { tile: "border-emerald-500/35 hover:border-emerald-400/70", dot: "bg-emerald-400", bar: "bg-emerald-400", text: "text-emerald-300" },
  busy: { tile: "border-primary/45 bg-primary/[0.07] hover:border-primary/80", dot: "bg-primary", bar: "bg-primary", text: "text-primary" },
  ending: { tile: "border-amber-400/60 bg-amber-500/[0.08] hover:border-amber-300", dot: "bg-amber-400", bar: "bg-amber-400", text: "text-amber-300" },
  booked: { tile: "station-booked-tile", dot: "station-booked-dot", bar: "station-booked-dot", text: "station-booked-text" },
  offline: { tile: "border-dashed border-border bg-muted/20 opacity-60", dot: "bg-muted-foreground/60", bar: "bg-muted-foreground", text: "text-muted-foreground" },
}

export function StateDot({ state, className }: { state: StationState; className?: string }) {
  return <span aria-hidden className={cn("inline-block h-2 w-2 shrink-0 rounded-full", STATE_STYLE[state].dot, className)} />
}

type TileProps = {
  code: string
  title: string // full name + status, shown as tooltip
  icon: string
  consoleType: string
  state: StationState
  progress?: number
  caption?: string // amount due / paid, or "Next 4:30 PM"
  selected?: boolean
  disabled?: boolean
  size?: "md" | "sm"
  dragging?: boolean
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title" | "type">

/** Compact station tile: big short code, console icon, status accent, time-used bar. */
export const StationTile = forwardRef<HTMLButtonElement, TileProps>(function StationTile(
  { code, title, icon, consoleType, state, progress = 0, caption, selected, disabled, size = "md", dragging, className, ...rest },
  ref,
) {
  const Icon = resolveConsoleIcon(icon, consoleType)
  const style = STATE_STYLE[state]
  const live = state === "busy" || state === "ending"
  const small = size === "sm"
  return (
    <button
      ref={ref}
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={selected}
      disabled={disabled}
      data-station-state={state}
      className={cn(
        "group relative flex w-full flex-col justify-between overflow-hidden rounded-lg border bg-card text-left transition-[border-color,box-shadow,transform,background-color] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        small ? "h-[58px] px-2 pb-1.5 pt-1.5" : "h-[68px] px-2.5 pb-2 pt-2",
        style.tile,
        selected && "border-primary bg-primary/15 ring-2 ring-primary/50",
        disabled && "cursor-not-allowed opacity-45 hover:border-border",
        dragging && "scale-[0.97] opacity-60",
        className,
      )}
      {...rest}
    >
      <span className="flex items-start justify-between gap-1">
        <span className={cn("font-semibold leading-none tracking-tight text-foreground tabular-nums", small ? "text-[13px]" : "text-base")}>{code}</span>
        <Icon aria-hidden className={cn("shrink-0 text-muted-foreground", small ? "h-3.5 w-3.5" : "h-4 w-4")} />
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <StateDot state={state} className={cn(live && "animate-pulse", small && "h-1.5 w-1.5")} />
        <span className={cn("truncate text-muted-foreground", small ? "text-[10px]" : "text-[11px]")}>
          {caption ?? STATION_STATE_LABEL[state]}
        </span>
      </span>
      {live && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-foreground/5">
          <span className={cn("block h-full transition-[width] duration-1000", style.bar)} style={{ width: `${Math.round(progress * 100)}%` }} />
        </span>
      )}
    </button>
  )
})
