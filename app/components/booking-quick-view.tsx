"use client"

import type { ReactNode } from "react"
import { History, Mail, Phone } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { openGamerProfile } from "@/app/components/gamer-profile-host"
import type { GamerBookingContext } from "@/app/components/gamer-profile-sheet"

/**
 * The one booking popover used across Overview, Live sessions and Bookings:
 * who the gamer is, this booking, quick contact, and a way into their full history.
 */
export function BookingQuickView({ open, onClose, userId, booking, children }: {
  open: boolean
  onClose: () => void
  userId?: unknown
  booking: GamerBookingContext
  children?: ReactNode
}) {
  const hasProfile = Number(userId) > 0
  const rows: [string, ReactNode][] = [
    ["Session", [booking.console, booking.when].filter(Boolean).join(" · ") || "-"],
    ["Booking", booking.bookingId ? `#${booking.bookingId}` : "-"],
    ["Phone", booking.phone ? <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`tel:${booking.phone}`}><Phone className="h-3 w-3" />{booking.phone}</a> : "-"],
    ["Email", booking.email ? <a className="inline-flex min-w-0 items-center gap-1 break-all text-primary hover:underline" href={`mailto:${booking.email}`}><Mail className="h-3 w-3 shrink-0" />{booking.email}</a> : "-"],
  ]
  return (
    <Dialog open={open} onOpenChange={next => { if (!next) onClose() }}>
      <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{booking.name || "Guest"}</DialogTitle>
          <DialogDescription>{hasProfile ? `Gamer #${Number(userId)}` : "Walk-in guest"}</DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-border rounded-lg border border-border text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 px-3 py-2">
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="min-w-0 text-right text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        {hasProfile && (
          <Button variant="outline" onClick={() => { onClose(); openGamerProfile(userId, booking) }}>
            <History className="h-4 w-4" />Full booking history
          </Button>
        )}
        {children}
      </DialogContent>
    </Dialog>
  )
}
