"use client"

import { useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export interface PlatformCount {
  type: string
  name: string
  icon: any
  color: string
  total: number
  used: number
}

/** Quiet 28px bar with per-platform station counts; each chip opens Gaming Stations for that type. */
export function StatusBar({ platforms, loading }: { platforms: PlatformCount[]; loading: boolean }) {
  const router = useRouter()
  const totals = platforms.reduce((acc, p) => ({ total: acc.total + p.total, used: acc.used + p.used }), { total: 0, used: 0 })

  return (
    <footer className="shell-statusbar" aria-label="Station status">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="shell-statusbar-label">Stations</span>
        {loading && platforms.length === 0 && <span role="status" className="px-1.5">Loading consoles…</span>}
        {platforms.map((platform) => {
          const PlatformIcon = platform.icon
          const free = Math.max(0, platform.total - platform.used)
          return (
            <Tooltip key={`status-${platform.type}`}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => router.push(`/gaming?type=${encodeURIComponent(platform.type)}`)}
                  className="shell-status-chip"
                  aria-label={`${platform.name}: ${free} available, ${platform.used} in use, ${platform.total} total. Open Gaming Stations`}
                >
                  <PlatformIcon className="h-3 w-3" style={{ color: platform.color }} aria-hidden="true" />
                  <span className="text-foreground/90">{platform.name}</span>
                  <span className="tabular-nums"><span className="text-emerald-300">{free}</span><span className="text-muted-foreground">/{platform.total}</span></span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {platform.name}: {free} available · {platform.used} in use · {platform.total} total
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      {platforms.length > 0 && (
        <div className="hidden shrink-0 items-center gap-3 tabular-nums sm:flex">
          <span><span className="text-emerald-300">{totals.total - totals.used}</span> available</span>
          <span><span className="text-foreground/90">{totals.used}</span> in use</span>
        </div>
      )}
    </footer>
  )
}
