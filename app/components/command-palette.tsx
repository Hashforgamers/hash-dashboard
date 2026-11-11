"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Keyboard, RefreshCw, Search, Settings, Shield, Store, User } from "lucide-react"
import { DialogTitle } from "@/components/ui/dialog"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useAccess } from "@/app/context/AccessContext"
import { useDashboardData } from "@/app/context/DashboardDataContext"
import { DASHBOARD_URL } from "@/src/config/env"
import { SHORTCUTS, isTypingTarget, type ShortcutAction } from "@/lib/shortcuts"
import { navItems } from "./main-nav"

type Gamer = { id: number | string; name: string; contact?: string }
type BookingHit = { key: string; name: string; detail: string; href: string }

const MAX_HITS = 8

/** Focus the page's own search box, if it has one. */
function focusPageSearch() {
  const box = document.querySelector<HTMLInputElement>(
    'main input[data-search-input], main input[type="search"], main input[placeholder*="Search" i]'
  )
  box?.focus()
  box?.select()
}

export function CommandPalette({ onRefresh }: { onRefresh: () => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [gamers, setGamers] = useState<Gamer[] | null>(null)
  const router = useRouter()
  const { can, activeStaff } = useAccess()
  const { vendorId, landingData } = useDashboardData()
  const pendingG = useRef<number | null>(null)
  const canSee = (permission: Parameters<typeof can>[0]) => !activeStaff || can(permission)

  const runAction = (action: ShortcutAction) => {
    if (action.type === "palette") setOpen((prev) => !prev)
    else if (action.type === "search") focusPageSearch()
    else if (action.type === "refresh") onRefresh()
    else router.push(action.href)
  }

  // Global keyboard shortcuts, driven by the shared list in lib/shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
        return
      }
      // a popup that is still animating closed (data-state="closed") must not swallow the next key
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || document.querySelector('[role="dialog"]:not([data-state="closed"])')) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current)
        pendingG.current = null
        const hit = SHORTCUTS.find((s) => s.sequence?.[1] === key)
        if (hit?.action) { e.preventDefault(); runAction(hit.action) }
        return
      }
      if (key === "g") {
        pendingG.current = window.setTimeout(() => { pendingG.current = null }, 1200)
        return
      }
      const hit = SHORTCUTS.find((s) => s.key === key || (s.key === "?" && e.key === "?"))
      if (hit?.action) { e.preventDefault(); runAction(hit.action) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // runAction only closes over stable router/onRefresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRefresh, router])

  // Load the gamer list the first time the palette opens; reuse it afterwards.
  useEffect(() => {
    if (!open || gamers !== null || !vendorId || !canSee("gamers.view")) return
    let cancelled = false
    fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/knowYourGamer`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => { if (!cancelled) setGamers(Array.isArray(rows) ? rows : []) })
      .catch(() => { if (!cancelled) setGamers([]) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vendorId])

  useEffect(() => { if (!open) setQuery("") }, [open])

  const q = query.trim().toLowerCase()
  const gamerHits = useMemo(() => {
    if (q.length < 2 || !gamers) return []
    return gamers.filter((g) => `${g.name ?? ""} ${g.contact ?? ""}`.toLowerCase().includes(q)).slice(0, MAX_HITS)
  }, [gamers, q])

  const bookingHits = useMemo<BookingHit[]>(() => {
    if (q.length < 2 || !canSee("booking.manage")) return []
    const live = Array.isArray(landingData?.currentSlots) ? landingData.currentSlots : []
    const upcoming = Array.isArray(landingData?.upcomingBookings) ? landingData.upcomingBookings : []
    const rows = [
      ...live.map((b: any) => ({ b, when: "Live now" })),
      ...upcoming.map((b: any) => ({ b, when: "Upcoming" })),
    ]
    return rows
      .map(({ b, when }, i) => {
        const name = String(b?.username || b?.customer_name || b?.name || "Guest")
        const station = String(b?.consoleName || b?.console_name || b?.consoleNumber || b?.consoleType || "")
        const time = [b?.startTime, b?.endTime].filter(Boolean).join("–")
        return { key: `${when}-${b?.bookingId ?? b?.book_id ?? i}`, name, detail: [when, station, time].filter(Boolean).join(" · "), href: "/dashboard" }
      })
      .filter((hit) => `${hit.name} ${hit.detail}`.toLowerCase().includes(q))
      .slice(0, MAX_HITS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingData, q])

  const run = (action: () => void) => () => { setOpen(false); action() }
  const go = (href: string) => run(() => router.push(href))
  // same rule as the sidebar: before a staff profile is active, show everything
  const pages = navItems.filter((item) => canSee(item.permission))
  const sections = Array.from(new Set(pages.map((item) => item.section)))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search pages, gamers and bookings"
        title="Search pages, gamers and bookings (Ctrl/⌘ K)"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-white/[0.06] hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <kbd className="hidden font-sans text-[10px] text-muted-foreground md:inline">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Search pages, gamers and bookings</DialogTitle>
        <CommandInput placeholder="Search pages, gamers or bookings…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>{q.length >= 2 && gamers === null && canSee("gamers.view") ? "Searching…" : "No results found."}</CommandEmpty>
          {gamerHits.length > 0 && (
            <CommandGroup heading="Gamers">
              {gamerHits.map((g) => (
                <CommandItem key={`gamer-${g.id}`} value={`gamer ${g.name} ${g.contact ?? ""} ${g.id}`} onSelect={go(`/know-your-gamers?q=${encodeURIComponent(g.name)}`)}>
                  <User className="mr-2" />
                  <span className="truncate">{g.name}</span>
                  {g.contact && <span className="ml-auto text-xs text-muted-foreground tabular-nums">{g.contact}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {bookingHits.length > 0 && (
            <CommandGroup heading="Today's bookings">
              {bookingHits.map((hit) => (
                <CommandItem key={hit.key} value={`booking ${hit.name} ${hit.detail} ${hit.key}`} onSelect={go(hit.href)}>
                  <CalendarClock className="mr-2" />
                  <span className="truncate">{hit.name}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">{hit.detail}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
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
            <CommandItem onSelect={go("/select-cafe")}><Store className="mr-2" />Switch café</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={run(onRefresh)}><RefreshCw className="mr-2" />Refresh dashboard data</CommandItem>
            <CommandItem onSelect={go("/shortcuts")}><Keyboard className="mr-2" />Keyboard shortcuts</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
