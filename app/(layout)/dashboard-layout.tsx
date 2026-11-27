"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronsLeft, ChevronsRight } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MainNav } from "../components/main-nav"
import Image from "next/image"
import { useAccess } from "../context/AccessContext"
import { useTimeFormat } from "../hooks/useTimeFormat"
import { canAccessPath } from "@/lib/rbac"
import { useSubscription } from "@/hooks/useSubscription"
import { useSocket } from "../context/SocketContext"
import { useDashboardData } from "../context/DashboardDataContext"
import { GamerProfileHost } from "../components/gamer-profile-host"
import { TopBar } from "../components/shell/top-bar"
import { StatusBar } from "../components/shell/status-bar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsMobile } from "@/components/ui/use-mobile"
import { normalizeConsoleSlug, resolveConsoleColor, resolveConsoleIcon } from "../components/console-catalog"

interface DashboardLayoutProps {
  children: React.ReactNode
  contentScroll?: "page" | "contained"
}

const NAV_COLLAPSED_STORAGE_KEY = "dashboard_nav_collapsed_v1"

export function DashboardLayout({ children, contentScroll = "page" }: DashboardLayoutProps) {
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isNavCollapsed, setIsNavCollapsed] = useState(false)
  const [nowISTDateText, setNowISTDateText] = useState<string>("")
  const [nowISTTimeText, setNowISTTimeText] = useState<string>("")
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { activeStaff } = useAccess()
  const { is24h } = useTimeFormat()
  const { isLocked, status: subscriptionStatus, loading: subscriptionLoading, refreshStatus } = useSubscription()
  const { isConnected } = useSocket()
  const { vendorId, consoles, consolesLoading, refreshLanding, refreshConsoles } = useDashboardData()
  const hasAccess = activeStaff ? canAccessPath(pathname, activeStaff.permissions) : true
  const subscriptionExempt = ["/subscription", "/select-cafe"]
  const featurePaths: Record<string,string> = {"/console-pricing":"pricing","/cafe-wallet":"cafe_wallet","/pass":"passes","/manage-extraservice":"food","/transaction":"analytics","/know-your-gamers":"analytics","/tournaments":"tournaments","/employee-access":"staff"}
  const neededFeature = Object.entries(featurePaths).find(([path])=>pathname===path||pathname.startsWith(path+"/"))?.[1]
  const hasPlanFeature = !neededFeature || Boolean(subscriptionStatus?.entitlements?.includes(neededFeature))
  const hasSubscriptionAccess = (!isLocked && hasPlanFeature) || subscriptionExempt.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  const subscriptionPending = !subscriptionStatus && subscriptionLoading && !subscriptionExempt.some(path => pathname === path || pathname.startsWith(`${path}/`))
  const subscriptionUnavailable = subscriptionStatus?.message === "Unable to verify subscription status"
  const isSelectCafeRoute = pathname === "/select-cafe" || pathname.startsWith("/select-cafe/")
  const showSidebar = !isSelectCafeRoute
  const showGlobalRibbon = !isSelectCafeRoute

  useEffect(() => {
    if (!vendorId || !showGlobalRibbon) return
    const refresh = () => { if (document.visibilityState === "visible") void refreshConsoles() }
    refresh()
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener("focus", refresh)
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh) }
  }, [vendorId, showGlobalRibbon, refreshConsoles])

  const platforms = useMemo(() => {
    const source = Array.isArray(consoles) ? consoles : []
    const grouped = new Map<
      string,
      { total: number; used: number; displayName?: string }
    >()

    source.forEach((item: any) => {
      const slug = normalizeConsoleSlug(item?.type || item?.console_type || item?.console_slug || item?.game_name)
      if (!slug) return
      const current = grouped.get(slug) || { total: 0, used: 0, displayName: undefined }
      current.total += 1
      if (item?.status === false) current.used += 1
      current.displayName =
        current.displayName ||
        item?.console_display_name ||
        item?.consoleTypeName ||
        item?.console_name ||
        item?.type
      grouped.set(slug, current)
    })

    const preferredOrder = ["pc", "playstation", "xbox", "vr_headset", "private_room", "vip_room", "bootcamp_room"]
    const allTypes = Array.from(grouped.keys())
    const sortedTypes = [
      ...preferredOrder.filter((slug) => grouped.has(slug)),
      ...allTypes.filter((slug) => !preferredOrder.includes(slug)).sort((a, b) => a.localeCompare(b)),
    ]

    return sortedTypes.map((slug) => {
      const counts = grouped.get(slug)!
      const Icon = resolveConsoleIcon(undefined, slug)
      const fallbackName = slug
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
      return {
        type: slug,
        name: String(counts.displayName || fallbackName),
        icon: Icon,
        color: resolveConsoleColor(slug),
        total: counts.total,
        used: counts.used,
      }
    })
  }, [consoles])

  const handleManualRefresh = useCallback(async () => {
    if (isManualRefreshing) return
    setIsManualRefreshing(true)
    try {
      await Promise.all([refreshStatus(), refreshLanding(true), refreshConsoles(true)])
    } catch (err) {
      console.error("Global ribbon refresh failed:", err)
    } finally {
      setIsManualRefreshing(false)
    }
  }, [isManualRefreshing, refreshStatus, refreshLanding, refreshConsoles])

  useEffect(() => {
    try {
      setIsNavCollapsed(localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY) === "1")
    } catch {
      // noop
    }
  }, [])

  const toggleNavCollapsed = useCallback(() => {
    setIsNavCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, next ? "1" : "0")
      } catch {
        // noop
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!isNavOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setIsNavOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isNavOpen])

  useEffect(() => {
    const dateFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    const timeFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: is24h ? "h23" : "h12",
    })
    const tick = () => {
      const now = new Date()
      setNowISTDateText(dateFormatter.format(now))
      setNowISTTimeText(timeFormatter.format(now))
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [is24h])

  const isMobile = useIsMobile()
  // The mobile drawer always shows labels; the icon rail is a desktop preference.
  const collapsed = isNavCollapsed && !isMobile

  return (
    <TooltipProvider delayDuration={250}>
    <div className="workspace-ui premium-shell dashboard-typography shell-root flex h-dvh overflow-hidden text-foreground">
      {showSidebar && (
        <aside
          aria-label="Sidebar"
          data-collapsed={collapsed || undefined}
          className={`shell-sidebar dashboard-nav ${isNavOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="shell-sidebar-brand">
            <Image
              src="/hash_for_gamer_logo.png"
              alt="Hash For Gamers"
              width={28}
              height={28}
              priority
              className="h-7 w-7 shrink-0 rounded-[7px]"
            />
            {!collapsed && (
              <span className="min-w-0 leading-tight">
                <span className="block text-[14px] font-semibold tracking-[-0.01em] text-foreground">Hash</span>
                <span className="block text-[11px] text-muted-foreground">for Gamers</span>
              </span>
            )}
          </div>

          <MainNav
            className="min-h-0 flex-1"
            collapsed={collapsed}
            onItemClick={() => setIsNavOpen(false)}
          />

          <div className="hidden shrink-0 border-t border-white/[0.06] p-2 md:block">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleNavCollapsed}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  aria-expanded={!collapsed}
                  className={`shell-nav-item w-full ${collapsed ? "shell-nav-item-collapsed" : ""}`}
                >
                  {collapsed ? <ChevronsRight className="shell-nav-icon" /> : <ChevronsLeft className="shell-nav-icon" />}
                  {!collapsed && <span>Collapse</span>}
                </button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right" sideOffset={10}>Expand sidebar</TooltipContent>}
            </Tooltip>
          </div>
        </aside>
      )}

      {showSidebar && isNavOpen && (
        <div
          className="fixed inset-0 z-[20020] bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {showGlobalRibbon && (
            <TopBar
              vendorId={vendorId}
              dateText={nowISTDateText}
              timeText={nowISTTimeText}
              isConnected={isConnected}
              isRefreshing={isManualRefreshing}
              onRefresh={() => void handleManualRefresh()}
              showNavToggle={showSidebar}
              isNavOpen={isNavOpen}
              onToggleNav={() => setIsNavOpen((open) => !open)}
            />
          )}
          <main
            data-dashboard-scroll-root="true"
            className={`relative z-0 min-h-0 h-full flex-1 overflow-y-auto px-2.5 pb-2.5 pt-2.5 sm:px-4 sm:pb-4 md:px-5 md:pb-5 md:pt-5 ${
              contentScroll === "contained" ? "overflow-x-hidden" : ""
            }`}
          >
            {hasAccess && subscriptionPending ? (
              <div role="status" aria-live="polite" className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">Loading your workspace…</div>
            ) : hasAccess && hasSubscriptionAccess ? (
              children
            ) : !hasAccess ? (
              <div className="flex h-full min-h-[220px] items-center justify-center">
                <div className="w-full max-w-xl rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
                  <h2 className="text-xl font-semibold text-red-200">Access Restricted</h2>
                  <p className="mt-2 text-sm text-red-100/80">
                    Your current role does not have permission to access this page.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[220px] items-center justify-center">
                <div className="w-full max-w-xl rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center">
                  <h2 className="text-xl font-semibold text-amber-200">{subscriptionUnavailable ? "Unable to verify subscription" : "Subscription access required"}</h2>
                  <p className="mt-2 text-sm text-amber-100/80">
                    {subscriptionUnavailable ? "Please retry the subscription check." : !hasPlanFeature ? "Upgrade to a plan that includes this feature." : subscriptionStatus?.message || "Renew your subscription to use this module."}
                  </p>
                  {subscriptionStatus?.latest_subscription ? (
                    <p className="mt-2 text-xs text-amber-100/60">
                      Latest: {subscriptionStatus.latest_subscription.status || "unknown"} · {subscriptionStatus.latest_subscription.period_start || "-"} to {subscriptionStatus.latest_subscription.period_end || "-"}
                    </p>
                  ) : null}
                  <Button
                    className="mt-4"
                    onClick={() => subscriptionUnavailable ? void refreshStatus() : router.push("/subscription")}
                  >
                    {subscriptionUnavailable ? "Retry" : "Go To Subscription"}
                  </Button>
                </div>
              </div>
            )}
          </main>
          <GamerProfileHost />

          {showGlobalRibbon && <StatusBar platforms={platforms} loading={consolesLoading} />}
      </div>
    </div>
    </TooltipProvider>
  )
}
