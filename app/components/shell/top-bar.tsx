"use client"

import { Menu, RefreshCw, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CommandPalette } from "../command-palette"
import { BookingShortcuts } from "../booking-shortcuts"
import { NotificationButton } from "../NotificationButton"
import { CafePicker } from "./cafe-picker"
import { ProfileMenu } from "./profile-menu"

interface TopBarProps {
  vendorId: number | null
  dateText: string
  timeText: string
  isConnected: boolean
  isRefreshing: boolean
  onRefresh: () => void
  showNavToggle: boolean
  isNavOpen: boolean
  onToggleNav: () => void
}

export function TopBar({ vendorId, dateText, timeText, isConnected, isRefreshing, onRefresh, showNavToggle, isNavOpen, onToggleNav }: TopBarProps) {
  return (
    <header className="shell-topbar">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {showNavToggle && (
          <button
            type="button"
            aria-label={isNavOpen ? "Close navigation" : "Open navigation"}
            onClick={onToggleNav}
            className="shell-icon-btn shell-nav-toggle"
          >
            {isNavOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </button>
        )}
        <CafePicker />
        {timeText && (
          <div className="hidden items-center gap-2 text-[13px] text-muted-foreground lg:flex" aria-label="Current date and time (IST)">
            <span className="shell-topbar-divider" aria-hidden="true" />
            <span>{dateText}</span>
            <span aria-hidden="true" className="text-white/20">·</span>
            <span className="font-medium tabular-nums text-foreground">{timeText}</span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <CommandPalette onRefresh={onRefresh} />
        <BookingShortcuts />
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              role="status"
              className={`shell-status-pill ${isConnected ? "" : "shell-status-pill-offline"}`}
            >
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "animate-pulse bg-amber-400"}`} />
              <span className="hidden sm:inline">{isConnected ? "Connected" : "Offline"}</span>
              <span className="sr-only sm:hidden">{isConnected ? "Connected" : "Offline"}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">{isConnected ? "Live updates connected" : "Reconnecting to live updates…"}</TooltipContent>
        </Tooltip>
        <NotificationButton vendorId={vendorId} />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onRefresh}
              className="shell-icon-btn shell-hide-xs"
              disabled={isRefreshing}
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{isRefreshing ? "Syncing…" : "Refresh"}</TooltipContent>
        </Tooltip>
        <span className="shell-topbar-divider shell-hide-xs mx-0.5" aria-hidden="true" />
        <ProfileMenu />
      </div>
    </header>
  )
}
