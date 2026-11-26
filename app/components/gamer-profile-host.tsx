"use client"

import { useEffect, useState } from "react"
import { useAccess } from "@/app/context/AccessContext"
import { GamerProfileSheet, type GamerBookingContext } from "@/app/components/gamer-profile-sheet"

const EVENT = "hash:open-gamer"

type OpenDetail = { userId: number; booking?: GamerBookingContext }

/** Open a gamer's profile and history from anywhere in the dashboard. */
export function openGamerProfile(userId: unknown, booking?: GamerBookingContext) {
  const id = Number(userId)
  if (!Number.isFinite(id) || id <= 0 || typeof window === "undefined") return false
  window.dispatchEvent(new CustomEvent<OpenDetail>(EVENT, { detail: { userId: id, booking } }))
  return true
}

/** Mounted once in the dashboard layout; renders the shared gamer profile sheet. */
export function GamerProfileHost() {
  const { selectedCafeId } = useAccess()
  const [open, setOpen] = useState<OpenDetail | null>(null)

  useEffect(() => {
    const onOpen = (event: Event) => setOpen((event as CustomEvent<OpenDetail>).detail)
    window.addEventListener(EVENT, onOpen)
    return () => window.removeEventListener(EVENT, onOpen)
  }, [])

  const vendorId = Number(selectedCafeId || (typeof window !== "undefined" ? localStorage.getItem("selectedCafe") : 0)) || null
  return (
    <GamerProfileSheet
      vendorId={vendorId}
      gamerId={open?.userId ?? null}
      booking={open?.booking}
      onOpenChange={next => { if (!next) setOpen(null) }}
    />
  )
}

/** A gamer's name that opens their profile (with the booking it came from) wherever it appears. */
export function GamerName({ userId, name, booking, className }: {
  userId?: unknown
  name?: string | null
  booking?: GamerBookingContext
  className?: string
}) {
  const label = name || "Guest"
  if (!(Number(userId) > 0)) return <span className={className}>{label}</span>
  return (
    <button
      type="button"
      title="View booking history"
      onClick={event => { event.stopPropagation(); openGamerProfile(userId, { name: label, ...booking }) }}
      className={`text-left underline-offset-2 hover:text-primary hover:underline ${className || ""}`}
    >
      {label}
    </button>
  )
}
