"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Gamepad2, KeyRound, RefreshCw, Search, Settings, Shield, ShoppingBag, Store, Wallet } from "lucide-react"
import { DialogTitle } from "@/components/ui/dialog"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useAccess } from "@/app/context/AccessContext"
import { navItems } from "./main-nav"
import { useDashboardData } from "@/app/context/DashboardDataContext"
import { consoleTypesFromConsoles, formatShortcut, readCafeShortcuts, type CafeShortcutMap } from "@/app/lib/cafe-shortcuts"
import { requestConsoleBooking } from "./booking-shortcuts"

export function CommandPalette({ onRefresh }: { onRefresh: () => void }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { can, activeStaff, selectedCafeId } = useAccess()
  const { consoles } = useDashboardData()
  const consoleTypes = useMemo(() => consoleTypesFromConsoles(consoles), [consoles])
  const [bookingKeys, setBookingKeys] = useState<CafeShortcutMap>({})
  useEffect(() => {
    if (open) setBookingKeys(readCafeShortcuts(selectedCafeId, consoleTypes))
  }, [open, selectedCafeId, consoleTypes])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const run = (action: () => void) => () => { setOpen(false); action() }
  const go = (href: string) => run(() => router.push(href))
  // same rule as the sidebar: before a staff profile is active, show everything
  const pages = navItems.filter((item) => !activeStaff || can(item.permission))
  const sections = Array.from(new Set(pages.map((item) => item.section)))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search pages and actions"
        title="Search pages and actions (Ctrl/⌘ K)"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-white/[0.06] hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <kbd className="hidden font-sans text-xs text-muted-foreground md:inline">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Search pages and actions</DialogTitle>
        <CommandInput placeholder="Go to a page or run an action…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {sections.map((section) => (
            <CommandGroup key={section} heading={section}>
              {pages.filter((item) => item.section === section).map(({ href, icon: Icon, label }) => (
                <CommandItem key={href} value={label} onSelect={go(href)}>
                  <Icon className="mr-2" />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandGroup heading="Administration">
            {can("staff.manage") && <CommandItem onSelect={go("/employee-access")}><Shield className="mr-2" />Team Access</CommandItem>}
            {can("account.manage") && <CommandItem onSelect={go("/account")}><Settings className="mr-2" />Settings</CommandItem>}
            {can("account.manage") && [["Payment methods", "payment-methods"], ["Self QR, wallet & auto-extend", "self-qr-wallet"], ["Notification preferences", "notification-preferences"], ["Operating hours", "operating-hours"], ["Subscription", "subscription-details"]].map(([label, slug]) => (
              <CommandItem key={slug} value={`settings ${label}`} onSelect={go(`/account?section=${slug}`)}><Settings className="mr-2" />Settings · {label}</CommandItem>
            ))}
            <CommandItem onSelect={go("/select-cafe")}><Store className="mr-2" />Switch café</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Actions">
            {(!activeStaff || can("booking.manage")) && <CommandItem value="new booking bookings sessions" onSelect={go("/dashboard?tab=booking")}><Gamepad2 className="mr-2" />Open bookings &amp; sessions</CommandItem>}
            {(!activeStaff || can("booking.manage")) && consoleTypes.map(({ type, name }) => (
              <CommandItem key={`book-${type}`} value={`book new booking ${name} ${type}`} onSelect={run(() => requestConsoleBooking(type, router.push))}>
                <Gamepad2 className="mr-2" />Book {name}
                {bookingKeys[type] && <kbd className="ml-auto font-sans text-xs text-muted-foreground">{formatShortcut(bookingKeys[type]!)}</kbd>}
              </CommandItem>
            ))}
            <CommandItem value="notifications alerts" onSelect={run(() => window.dispatchEvent(new Event("hash:open-notifications")))}><Bell className="mr-2" />Open notifications</CommandItem>
            <CommandItem value="payment queue pay at cafe requests" onSelect={run(() => window.dispatchEvent(new Event("hash:open-payment-queue")))}><Wallet className="mr-2" />Open payment queue</CommandItem>
            {can("store.manage") && <CommandItem value="shop marketplace orders store" onSelect={go("/store?view=orders")}><ShoppingBag className="mr-2" />Shop orders</CommandItem>}
            <CommandItem onSelect={run(onRefresh)}><RefreshCw className="mr-2" />Refresh dashboard data</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
