"use client"

import { useEffect, useMemo, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAccess } from "@/app/context/AccessContext"
import { useDashboardData } from "@/app/context/DashboardDataContext"
import {
  BOOK_CONSOLE_EVENT,
  consoleTypesFromConsoles,
  readCafeShortcuts,
  setPendingConsoleBooking,
  shortcutKeyFromEvent,
  type BookConsoleEventDetail,
} from "@/app/lib/cafe-shortcuts"

/** Opens the booking form for a console type, going to the Bookings tab if no booking workspace is on screen. */
export function requestConsoleBooking(type: string, navigate: (href: string) => void) {
  const handled = !window.dispatchEvent(
    new CustomEvent<BookConsoleEventDetail>(BOOK_CONSOLE_EVENT, { detail: { type }, cancelable: true })
  )
  if (handled) return
  setPendingConsoleBooking(type)
  navigate("/dashboard?tab=booking")
}

/**
 * Listens for the café's Alt+Shift booking shortcuts on every dashboard page.
 * A mounted booking workspace handles the event in place; otherwise this opens
 * the Bookings tab and the workspace picks the console up when it loads.
 */
export function BookingShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const { selectedCafeId, activeStaff, can } = useAccess()
  const { consoles } = useDashboardData()
  const types = useMemo(() => consoleTypesFromConsoles(consoles), [consoles])
  const allowed = !activeStaff || can("booking.manage")
  const state = useRef({ selectedCafeId, types, allowed, pathname })
  state.current = { selectedCafeId, types, allowed, pathname }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented) return
      const key = shortcutKeyFromEvent(event)
      if (!key) return
      const { selectedCafeId, types, allowed, pathname } = state.current
      if (!allowed || !selectedCafeId || pathname.startsWith("/select-cafe")) return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || target?.closest("input, textarea, select")) return
      // Leave other open dialogs (search, confirmations) alone; the booking form is fine.
      if (document.querySelector('[role="dialog"]:not([data-booking-form]), [role="alertdialog"]')) return
      const shortcuts = readCafeShortcuts(selectedCafeId, types)
      const type = Object.keys(shortcuts).find((item) => shortcuts[item] === key)
      if (!type) return
      event.preventDefault()
      requestConsoleBooking(type, router.push)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router])

  return null
}
