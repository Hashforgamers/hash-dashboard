"use client"

import { useEffect, useState } from "react"
import { Menu, Pin, PinOff, X } from "lucide-react"
import { useTheme } from "next-themes"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MainNav } from "../components/main-nav"
import Image from "next/image"
import { useAccess } from "../context/AccessContext"
import { canAccessPath } from "@/lib/rbac"
import { useSubscription } from "@/hooks/useSubscription"

interface DashboardLayoutProps {
  children: React.ReactNode
  contentScroll?: "page" | "contained"
}

const NAV_PIN_STORAGE_KEY = "dashboard_nav_pinned_v1"

export function DashboardLayout({ children, contentScroll = "page" }: DashboardLayoutProps) {
  const { theme } = useTheme()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isNavPinned, setIsNavPinned] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { activeStaff } = useAccess()
  const { isLocked } = useSubscription()
  const hasAccess = activeStaff ? canAccessPath(pathname, activeStaff.permissions) : true
  const subscriptionExempt = ["/subscription", "/select-cafe"]
  const hasSubscriptionAccess = !isLocked || subscriptionExempt.some((path) => pathname === path || pathname.startsWith(`${path}/`))

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

        <main
          className={`min-h-0 flex-1 px-2 pb-2 pt-2 sm:px-3 sm:pb-3 md:px-4 md:pb-4 md:pt-4 ${
            contentScroll === "contained" ? "overflow-hidden" : "overflow-y-auto"
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
      </div>
    </div>
  )
}
