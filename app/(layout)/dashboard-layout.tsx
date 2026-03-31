"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Clock01Icon,
  ComputerIcon,
  GameController02Icon,
  GamepadDirectionalIcon,
  Menu01Icon,
  PinIcon,
  PinOffIcon,
  RefreshIcon,
  User,
  VirtualRealityVrIcon,
  Wifi,
  WifiOff,
  X,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MainNav } from "../components/main-nav"
import Image from "next/image"
import { useAccess } from "../context/AccessContext"
import { canAccessPath } from "@/lib/rbac"
import { useSubscription } from "@/hooks/useSubscription"
import { useSocket } from "../context/SocketContext"
import { useDashboardData } from "../context/DashboardDataContext"
import { NotificationButton } from "../components/NotificationButton"
import {
  normalizeConsoleSlug,
  resolveConsoleColor,
  resolveConsoleIcon,
} from "../components/console-catalog"
import { HASH_LOGO_URL } from "@/src/config/branding"

interface DashboardLayoutProps {
  children: React.ReactNode
  contentScroll?: "page" | "contained"
}

const NAV_PIN_STORAGE_KEY = "dashboard_nav_pinned_v1"

export function DashboardLayout({ children, contentScroll = "page" }: DashboardLayoutProps) {
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isNavPinned, setIsNavPinned] = useState(false)
  const [nowISTDateText, setNowISTDateText] = useState<string>("")
  const [nowISTTimeText, setNowISTTimeText] = useState<string>("")
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { activeStaff } = useAccess()
  const { isLocked } = useSubscription()
  const { isConnected } = useSocket()
  const { vendorId, consoles, refreshLanding, refreshConsoles } = useDashboardData()
  const hasAccess = activeStaff ? canAccessPath(pathname, activeStaff.permissions) : true
  const subscriptionExempt = ["/subscription", "/select-cafe"]
  const hasSubscriptionAccess = !isLocked || subscriptionExempt.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  const showGlobalRibbon = true

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
      await Promise.all([refreshLanding(true), refreshConsoles(true)])
    } catch (err) {
      console.error("Global ribbon refresh failed:", err)
    } finally {
      setIsManualRefreshing(false)
    }
  }, [isManualRefreshing, refreshLanding, refreshConsoles])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAV_PIN_STORAGE_KEY)
      if (saved === "1") {
        setIsNavPinned(true)
      }
    } catch {
      // noop
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(NAV_PIN_STORAGE_KEY, isNavPinned ? "1" : "0")
    } catch {
      // noop
    }
  }, [isNavPinned])

  useEffect(() => {
    const dateFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    const timeFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    const tick = () => {
      const now = new Date()
      setNowISTDateText(dateFormatter.format(now))
      setNowISTTimeText(timeFormatter.format(now))
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="premium-shell dashboard-typography flex h-dvh overflow-hidden text-foreground">
      <header className="dashboard-nav dashboard-nav-surface dashboard-nav-divider fixed left-0 right-0 top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center">
          <Image
            src={HASH_LOGO_URL}
            alt="Hash Logo"
            width={36}
            height={36}
            className="shrink-0 rounded-md"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="md:hidden"
        >
          {isNavOpen ? (
            <HugeiconsIcon icon={X} size={24} strokeWidth={1.8} />
          ) : (
            <HugeiconsIcon icon={Menu01Icon} size={24} strokeWidth={1.8} />
          )}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden pt-[58px] md:pt-0">
        <aside
          className={`
            dashboard-nav dashboard-nav-surface dashboard-nav-divider group fixed left-0 top-0 z-30 flex h-full w-[86vw] max-w-72 flex-col overflow-hidden border-r p-3 backdrop-blur-md transition-transform duration-300 ease-out
            md:sticky md:top-0 md:h-dvh md:w-72 md:max-w-none md:translate-x-0 md:shrink-0
            ${isNavPinned ? "xl:w-72" : "xl:w-[68px] xl:px-0 xl:py-3 xl:hover:px-3 xl:hover:w-72"}
            ${isNavOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <button
            type="button"
            aria-label={isNavPinned ? "Unpin sidebar" : "Pin sidebar"}
            title={isNavPinned ? "Unpin sidebar" : "Pin sidebar"}
            onClick={() => setIsNavPinned((prev) => !prev)}
            className={`dashboard-nav-panel absolute right-2 top-2 z-10 hidden rounded-md border p-1.5 text-muted-foreground transition-colors hover:text-foreground md:inline-flex ${
              isNavPinned ? "xl:inline-flex" : "xl:hidden xl:group-hover:inline-flex"
            }`}
          >
            {isNavPinned ? (
              <HugeiconsIcon icon={PinOffIcon} size={16} strokeWidth={1.8} />
            ) : (
              <HugeiconsIcon icon={PinIcon} size={16} strokeWidth={1.8} />
            )}
          </button>

          <div className={`dashboard-nav-brand mb-3 hidden overflow-hidden px-3 py-3 md:mb-4 md:flex ${isNavPinned ? "items-center justify-start gap-3" : "items-center justify-center gap-0 xl:mx-3 xl:group-hover:mx-0 xl:group-hover:items-center xl:group-hover:justify-start xl:group-hover:gap-3"}`}>
            <Image
              src={HASH_LOGO_URL}
              alt="Hash Logo"
              width={36}
              height={36}
              className="dashboard-nav-brand-logo shrink-0 rounded-xl"
            />
            <div className={`${isNavPinned ? "block" : "hidden xl:group-hover:block"}`}>
              <div className="dashboard-nav-brand-title">Hash</div>
              <div className="dashboard-nav-brand-subtitle">Gaming OS</div>
            </div>
          </div>

          <div className={`dashboard-nav-rail min-h-0 flex-1 ${isNavPinned ? "" : "xl:px-0 xl:group-hover:px-0"}`}>
            <MainNav
              className={`dashboard-nav-track min-h-0 flex-1 ${isNavPinned ? "items-start" : "items-start xl:items-center xl:group-hover:items-start"}`}
              onItemClick={() => setIsNavOpen(false)}
              isNavPinned={isNavPinned}
            />
          </div>

          <div
            className={`dashboard-nav-footer mt-3 hidden md:block ${isNavPinned ? "" : "xl:px-0 xl:group-hover:px-0"}`}
          >
            <div className="dashboard-nav-feature-card">
              <div className="dashboard-nav-feature-eyebrow">
                <span className={`dashboard-nav-feature-dot ${isConnected ? "is-live" : ""}`} />
                {isConnected ? "Operator Network" : "Offline Mode"}
              </div>
              <div className={`${isNavPinned ? "block" : "hidden xl:group-hover:block"}`}>
                <div className="dashboard-nav-feature-title">
                  {activeStaff?.name ? activeStaff.name : "Hash Operator"}
                </div>
                <div className="dashboard-nav-feature-copy">
                  {vendorId ? `Cafe #${vendorId}` : "Console floor synced"}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {isNavOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/55 backdrop-blur-[1px] md:hidden"
            onClick={() => setIsNavOpen(false)}
          />
        )}

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <main
            data-dashboard-scroll-root="true"
            className={`min-h-0 h-full flex-1 overflow-y-auto px-2 pb-2 pt-2 sm:px-3 sm:pb-3 md:px-4 md:pb-4 md:pt-4 ${
              contentScroll === "contained" ? "overflow-x-hidden" : ""
            }`}
          >
            {hasAccess && hasSubscriptionAccess ? (
              children
            ) : !hasAccess ? (
              <div className="flex h-full min-h-[220px] items-center justify-center">
                <div className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
                  <h2 className="text-xl font-semibold text-red-200">Access Restricted</h2>
                  <p className="mt-2 text-sm text-red-100/80">
                    Your current role does not have permission to access this page.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[220px] items-center justify-center">
                <div className="w-full max-w-xl rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-center">
                  <h2 className="text-xl font-semibold text-yellow-200">Subscription Inactive</h2>
                  <p className="mt-2 text-sm text-yellow-100/80">
                    This module is locked until your subscription is renewed.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => router.push("/subscription")}
                  >
                    Go To Subscription
                  </Button>
                </div>
              </div>
            )}
          </main>

          {showGlobalRibbon && (
            <div className="dashboard-nav-divider shrink-0 border-t px-2 pb-2 pt-1.5 sm:px-3 md:px-4">
              <div className="dashboard-module-panel flex items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-[11px] md:flex-wrap max-md:flex-nowrap">
                <div className="min-w-0 flex-1 max-md:overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden md:overflow-visible">
                  <div className="flex items-center gap-1.5 text-slate-300 md:flex-wrap max-md:w-max max-md:whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">
                      <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={1.8} />
                      {nowISTTimeText}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5">
                      {nowISTDateText}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5">
                      <HugeiconsIcon icon={User} size={14} strokeWidth={1.8} className="text-cyan-300" />
                      {activeStaff?.name || "Owner"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${
                        isConnected
                          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                          : "border-amber-400/40 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {isConnected ? (
                        <HugeiconsIcon icon={Wifi} size={14} strokeWidth={1.8} />
                      ) : (
                        <HugeiconsIcon icon={WifiOff} size={14} strokeWidth={1.8} />
                      )}
                      {isConnected ? "Live" : "Syncing"}
                    </span>
                    {platforms.map((platform) => {
                      const PlatformIcon = platform.icon
                      return (
                        <span
                          key={`global-ribbon-${platform.type}`}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5"
                          title={`${platform.name}: ${platform.used}/${platform.total}`}
                        >
                          <PlatformIcon className="h-3.5 w-3.5" style={{ color: platform.color }} />
                          <span>{platform.used}/{platform.total}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div className="ml-1 flex shrink-0 items-center gap-1.5">
                  <NotificationButton vendorId={vendorId} />
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    className="inline-flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 text-cyan-200 hover:bg-cyan-500/20"
                    disabled={isManualRefreshing}
                    title="Refresh"
                    aria-label="Refresh dashboard data"
                  >
                    <HugeiconsIcon
                      icon={RefreshIcon}
                      size={14}
                      strokeWidth={1.8}
                      className={isManualRefreshing ? "animate-spin" : ""}
                    />
                    {isManualRefreshing ? "Syncing" : "Refresh"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
