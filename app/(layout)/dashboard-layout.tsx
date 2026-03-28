"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Clock, Gamepad, Gamepad2, Headphones, Menu, Monitor, Pin, PinOff, RefreshCw, User, Wifi, WifiOff, X } from "lucide-react"
import { useTheme } from "next-themes"
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

interface DashboardLayoutProps {
  children: React.ReactNode
  contentScroll?: "page" | "contained"
}

const NAV_PIN_STORAGE_KEY = "dashboard_nav_pinned_v1"

export function DashboardLayout({ children, contentScroll = "page" }: DashboardLayoutProps) {
  const { theme } = useTheme()
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
    const platformMap = [
      { name: "PC", type: "pc", icon: Monitor, color: "#3b82f6" },
      { name: "PS5", type: "ps5", icon: Gamepad2, color: "#a855f7" },
      { name: "Xbox", type: "xbox", icon: Gamepad, color: "#10b981" },
      { name: "VR", type: "vr", icon: Headphones, color: "#f59e0b" },
    ]
    return platformMap.map((platform) => {
      const source = Array.isArray(consoles) ? consoles.filter((item: any) => item?.type === platform.type) : []
      const total = source.length
      const used = source.filter((item: any) => item?.status === false).length
      return { ...platform, total, used }
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
        <div className="flex items-center space-x-2">
          <Image
            src={theme === "dark" ? "/whitehashlogo.png" : "/blackhashlogo.png"}
            alt="Hash Logo"
            width={36}
            height={36}
            className="shrink-0"
          />
          <span className="premium-heading text-base font-semibold">Hash Gaming</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="md:hidden"
        >
          {isNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden pt-[58px] md:pt-0">
        <aside
          className={`
            dashboard-nav dashboard-nav-surface dashboard-nav-divider group fixed left-0 top-0 z-30 flex h-full w-[86vw] max-w-72 flex-col overflow-hidden border-r p-3 backdrop-blur-md transition-transform duration-300 ease-out
            md:sticky md:top-0 md:h-dvh md:w-72 md:max-w-none md:translate-x-0 md:shrink-0
            ${isNavPinned ? "xl:w-72" : "xl:w-[76px] xl:hover:w-72"}
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
            {isNavPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>

          <div className="mb-3 hidden items-end space-x-2 overflow-hidden md:mb-4 md:flex">
            <Image
              src="/whitehashlogo.png"
              alt="Hash Logo - Dark Mode"
              width={36}
              height={36}
              className="shrink-0 hidden dark:block"
            />
            <Image
              src="/blackhashlogo.png"
              alt="Hash Logo - Light Mode"
              width={36}
              height={36}
              className="shrink-0 dark:hidden"
            />
            <span className={`premium-heading ml-1 hidden whitespace-nowrap text-sm font-semibold text-foreground md:block ${isNavPinned ? "xl:block" : "xl:hidden xl:group-hover:block"}`}>
              Hash Gaming
            </span>
          </div>

          <MainNav
            className="min-h-0 flex-1 items-start"
            onItemClick={() => setIsNavOpen(false)}
            isNavPinned={isNavPinned}
          />
        </aside>

        {isNavOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/55 backdrop-blur-[1px] md:hidden"
            onClick={() => setIsNavOpen(false)}
          />
        )}

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <main
            data-dashboard-scroll-root="true"
            className={`min-h-0 h-full flex-1 overflow-y-auto px-2 pb-2 pt-2 sm:px-3 sm:pb-3 md:px-4 md:pb-4 md:pt-4 ${
              showGlobalRibbon ? "md:pb-16" : ""
            } ${
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
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30">
              <div className="dashboard-module-panel pointer-events-auto mx-2 mb-2 flex flex-wrap items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-[11px] sm:mx-3 md:mx-4">
                <div className="flex flex-wrap items-center gap-1.5 text-slate-300">
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">
                    <Clock className="h-3.5 w-3.5" />
                    {nowISTTimeText}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5">
                    {nowISTDateText}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5">
                    <User className="h-3.5 w-3.5 text-cyan-300" />
                    {activeStaff?.name || "Owner"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${
                      isConnected
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                        : "border-amber-400/40 bg-amber-500/10 text-amber-200"
                    }`}
                  >
                    {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
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
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    className="inline-flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 text-cyan-200 hover:bg-cyan-500/20"
                    disabled={isManualRefreshing}
                    title="Refresh"
                    aria-label="Refresh dashboard data"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isManualRefreshing ? "animate-spin" : ""}`} />
                    {isManualRefreshing ? "Syncing" : "Refresh"}
                  </button>
                  <NotificationButton vendorId={vendorId} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
