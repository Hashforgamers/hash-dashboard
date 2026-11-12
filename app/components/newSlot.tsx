"use client"
import { toast } from "sonner";
import React, { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { jwtDecode } from 'jwt-decode'
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { contiguousDeskSlots, coveringDeskSlots } from "@/lib/desk-time-range"
import { DeskConsolePicker } from "./desk-console-picker"
import { deskSubtotal, rateLabel, resolveSessionRate, useDeskCards } from "./desk-rate-card"
import { creditAuthHeaders } from "@/lib/credit-auth"
import { useAccess } from "@/app/context/AccessContext"
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card"
import { 
  MoreVertical, 
  Plus, 
  Monitor, 
  MonitorPlay,
  X,
  User,
  Mail,
  Phone,
  CreditCard,
  Wallet,
  CheckCircle,
  Loader2,
  Tv,
  Gamepad,
  Gamepad2,
  Headset,
  Joystick,
  Rocket,
  CalendarDays,
  Users,
  Sparkles,
  Ticket,
  AlertCircle,
  Clock,
  SlidersHorizontal
} from "lucide-react"
import { BOOKING_URL, DASHBOARD_URL } from '@/src/config/env'
import { ConsoleType } from './types'
import MealSelector from './mealSelector'
import BookingRecords from "./booking-records"
import scheduleStyles from "./schedule-workspace.module.css"
import CreditAccountModal, { type MonthlyCreditAccountSummary } from './credit-account-modal'
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, CalendarClock, XCircle, ListTodo } from "lucide-react"
import { useDashboardData } from "@/app/context/DashboardDataContext"
import { useApiClient } from "@/app/hooks/useApiClient"
import { httpJson, clearHttpClientCache } from "@/lib/http-client"
import { getBookingSettings } from "@/lib/booking-settings"
import {
  normalizeConsoleSlug as normalizeCatalogSlug,
  resolveConsoleColor as resolveCatalogColor,
  resolveConsoleIcon as resolveCatalogIcon,
  type ConsoleCatalogItem,
} from "./console-catalog"
import { type ConsoleFilter, SNAPSHOT_TTL, type SelectedSlot, type SlotManagementProps, decodeVendorIdFromStorage, fetchSlotsBatch, fetchWithDedup, getISTDateString, getSlotEndTimestampIST, normalizeBookedDate, normalizeConsoleSlugLikeBackend, resolveConsoleColor, resolveConsoleIcon, sanitizeConsoleEntry } from "./slot-management/shared"
import { SlotBookingForm } from "./slot-management/booking-form"
import { TopBar } from "./slot-management/schedule-grid"
import { ScheduleGrid } from "./slot-management/schedule-grid"
import { DashboardQuickBookingSlab } from "./slot-management/quick-booking-slab"
export { SlotBookingForm } from "./slot-management/booking-form"

export default function SlotManagement({ embedded = false, slab = false }: SlotManagementProps) {
  const { moduleCache, moduleVersions, setModuleCache } = useDashboardData()
  const [selectedConsole, setSelectedConsole] = useState<ConsoleFilter>("")
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([])
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [availableConsoles, setAvailableConsoles] = useState<ConsoleType[]>([])
  const [allSlots, setAllSlots] = useState<{ [key: string]: any[] }>({})
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [recordsRevision, setRecordsRevision] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
    const [slotBookings, setSlotBookings] = useState<any[]>([])
const [isLoadingBookings, setIsLoadingBookings] = useState(false)
  const [vendorId, setVendorId] = useState<number | null>(() => decodeVendorIdFromStorage())

  const getVendorIdFromToken = (): number | null => {
    return decodeVendorIdFromStorage()
  }

  type BookingCacheData = {
    availableConsoles: ConsoleType[]
    allSlots: { [key: string]: any[] }
    selectedConsole: ConsoleFilter
    dates: string[]
  }

  const getSnapshotKey = (id: number) => `booking_dashboard_snapshot:${id}`

  const readLocalSnapshot = (id: number): BookingCacheData | null => {
    try {
      const raw = localStorage.getItem(getSnapshotKey(id))
      if (!raw) return null
      const parsed = JSON.parse(raw)
      const ts = Number(parsed?.ts || 0)
      const data = parsed?.data as BookingCacheData | undefined
      if (!data || Date.now() - ts > SNAPSHOT_TTL) return null
      if (!Array.isArray(data.availableConsoles) || typeof data.allSlots !== "object") return null
      return {
        ...data,
        availableConsoles: data.availableConsoles.map((entry: any) => sanitizeConsoleEntry(entry)),
      }
    } catch {
      return null
    }
  }

  const writeLocalSnapshot = (id: number, data: BookingCacheData) => {
    try {
      localStorage.setItem(getSnapshotKey(id), JSON.stringify({ ts: Date.now(), data }))
    } catch {
      // Ignore storage quota failures.
    }
  }

  const bookingCacheKey = vendorId ? `booking_dashboard:${vendorId}` : "booking_dashboard:0"
  const bookingVersionKey = vendorId ? `booking:${vendorId}` : "booking:0"
  const cachedBooking = moduleCache[bookingCacheKey]?.data as BookingCacheData | undefined
  const bookingVersion = moduleVersions[bookingVersionKey] || 0
  const snapshotRef = useRef<BookingCacheData | undefined>(cachedBooking)
  snapshotRef.current = cachedBooking
  const deselectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bookingsRequest = useRef(0)
  const snapshotRequest = useRef(0)
  useEffect(() => () => {
    if (deselectTimer.current) clearTimeout(deselectTimer.current)
    bookingsRequest.current += 1
    snapshotRequest.current += 1
  }, [])

  const applyBookingCache = (data: BookingCacheData) => {
    setAvailableConsoles((data.availableConsoles || []).map((entry: any) => sanitizeConsoleEntry(entry)))
    setAllSlots(data.allSlots)
    setSelectedConsole((current) => data.availableConsoles.some(c => c.type === current)
      ? current : data.selectedConsole)
    setIsLoading(false)
  }

  const loadBookingData = async (
    resolvedVendorId: number,
    options: { forceFresh?: boolean; initialOnly?: boolean; slotsOnly?: boolean } = {}
  ): Promise<BookingCacheData | null> => {
    const requestId = ++snapshotRequest.current
    const forceFresh = Boolean(options.forceFresh)
    const initialOnly = Boolean(options.initialOnly)
    try {
      console.time("⏱️ Total fetch time")

      const cacheBust = forceFresh ? `?t=${Date.now()}` : ""
      const consolesUrl = `${BOOKING_URL}/api/getAllConsole/vendor/${resolvedVendorId}${cacheBust}`
      const consoleTypesUrl = `${BOOKING_URL}/api/console-types/vendor/${resolvedVendorId}${cacheBust}`
      const reusable = snapshotRef.current
      const canReuseCatalog = options.slotsOnly && reusable?.availableConsoles.length
      const [consolesData, consoleTypesData] = canReuseCatalog ? [null, null] : await Promise.all([
        fetchWithDedup(consolesUrl),
        fetchWithDedup(consoleTypesUrl).catch(() => null),
      ])

      const resolvedByType = new Map<string, ConsoleType>()
      const rawGames = Array.isArray(consolesData?.games) ? consolesData.games : []
      const rawCatalog = Array.isArray(consoleTypesData?.console_types)
        ? (consoleTypesData.console_types as ConsoleCatalogItem[])
        : Array.isArray(consolesData?.catalog)
          ? (consolesData.catalog as ConsoleCatalogItem[])
          : []

      const gameBySlug = new Map<string, any>()
      rawGames.forEach((game: any) => {
        const hasLiveConsoles = Number(game?.console_count ?? 0) > 0
        if (!hasLiveConsoles) return
        const normalizedSlug = normalizeConsoleSlugLikeBackend(
          game?.console_slug || game?.console_name
        )
        if (!normalizedSlug || gameBySlug.has(normalizedSlug)) return
        gameBySlug.set(normalizedSlug, game)
      })

      rawCatalog.forEach((catalogItem) => {
        const slug = normalizeConsoleSlugLikeBackend(catalogItem?.slug)
        if (!slug) return
        const mappedGame = gameBySlug.get(slug)
        if (!mappedGame) return
        if (resolvedByType.has(slug)) return
        const displayName = String(
          catalogItem?.display_name || mappedGame?.console_display_name || mappedGame?.console_name || slug
        ).trim()
        resolvedByType.set(slug, {
          type: slug,
          name: displayName,
          id: Number(mappedGame?.id) || null,
          price: Number(mappedGame?.console_price) || 0,
          icon: resolveConsoleIcon(catalogItem?.icon || mappedGame?.icon, slug),
          iconColor: resolveConsoleColor(slug),
          color: "grey" as const,
          description: `${displayName} Console`,
        })
      })

      rawGames.forEach((game: any) => {
        const hasLiveConsoles = Number(game?.console_count ?? 0) > 0
        if (!hasLiveConsoles) return
        const slug = normalizeConsoleSlugLikeBackend(game?.console_slug || game?.console_name)
        if (!slug || resolvedByType.has(slug)) return
        const displayName = String(game?.console_display_name || game?.console_name || slug).trim()
        resolvedByType.set(slug, {
          type: slug,
          name: displayName,
          id: Number(game?.id) || null,
          price: Number(game?.console_price) || 0,
          icon: resolveConsoleIcon(game?.icon, slug),
          iconColor: resolveConsoleColor(slug),
          color: "grey" as const,
          description: `${displayName} Console`,
        })
      })

      const consolesResolved = canReuseCatalog
        ? reusable!.availableConsoles
        : Array.from(resolvedByType.values())

      if (consolesResolved.length === 0) {
        return { availableConsoles: [], allSlots: {}, selectedConsole, dates: [] }
      }

      const dates: string[] = []
      for (let i = 0; i < 3; i++) {
        dates.push(getISTDateString(i))
      }

      const nowTs = Date.now()

      let slotsData: { [key: string]: any[] } = {}
      dates.forEach((dateString) => {
        slotsData[dateString] = []
      })

      try {
        const allGameIds = consolesResolved.map(c => c.id).filter(Boolean) as number[]
        const preferredConsole = consolesResolved.find((c) => c.type === selectedConsole) || consolesResolved[0]
        const gameIds = initialOnly
          ? [Number(preferredConsole?.id || 0)].filter((id) => Number.isFinite(id) && id > 0)
          : allGameIds
        const batchDates = dates.map(d => d.replace(/-/g, ""))


        const batchData = await fetchSlotsBatch(resolvedVendorId, gameIds, batchDates, forceFresh)

        for (const [dateKey, slots] of Object.entries(batchData)) {
          const dateString = `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}`

          if (Array.isArray(slots)) {
            const processedSlots = slots.map((slot: any) => {
              const gameConsole = consolesResolved.find(c => c.id === slot.console_id)

              const processedSlot = {
                ...slot,
                console_id: slot.console_id,
                console_name: gameConsole?.name || "Unknown Console",
                date: dateString,
                is_available: (slot.available_slot || 0) > 0,
                available_slot: slot.available_slot || 0,
              }

              if (dateString === dates[0]) {
                const slotEndTs = getSlotEndTimestampIST(dateString, slot.start_time, slot.end_time)
                const isPast = Number.isFinite(slotEndTs) && nowTs >= slotEndTs
                if (isPast) {
                  processedSlot.is_available = false
                }
              }
              return processedSlot
            })

            slotsData[dateString] = processedSlots
          }
        }
      } catch (batchError: any) {
        console.error("❌ Batch fetch failed, falling back to individual requests:", batchError)

        const allFetchPromises = dates.flatMap((dateString) =>
          consolesResolved.map(async (gameConsole) => {
            if (!gameConsole.id) return null

            try {
              const formattedDate = dateString.replace(/-/g, "")
              const apiUrl = `${BOOKING_URL}/api/getSlots/vendor/${resolvedVendorId}/game/${gameConsole.id}/${formattedDate}`

              const slotData = await fetchWithDedup(apiUrl)

              if (slotData.slots && Array.isArray(slotData.slots)) {
                const processedSlots = slotData.slots.map((slot: any) => {
                  const processedSlot = {
                    ...slot,
                    console_id: gameConsole.id,
                    console_name: gameConsole.name,
                    date: dateString,
                    is_available: slot.is_available,
                  }

                  if (dateString === dates[0]) {
                    const slotEndTs = getSlotEndTimestampIST(dateString, slot.start_time, slot.end_time)
                    const isPast = Number.isFinite(slotEndTs) && nowTs >= slotEndTs

                    if (isPast) {
                      processedSlot.is_available = false
                    }
                  }

                  return processedSlot
                })

                return { dateString, slots: processedSlots }
              }
            } catch (error) {
              console.error(`❌ Error fetching slots for ${gameConsole.name} on ${dateString}:`, error)
            }

            return null
          })
        )

        const results = await Promise.all(allFetchPromises)
        results.forEach(result => {
          if (result && result.dateString && result.slots) {
            slotsData[result.dateString].push(...result.slots)
          }
        })
      }

      const filteredConsoles = consolesResolved.filter((c) => c.id != null)
      let nextSelectedConsole = selectedConsole
      if (filteredConsoles.length > 0 && !filteredConsoles.some((c) => c.type === selectedConsole)) {
        nextSelectedConsole = filteredConsoles[0].type
      }

      console.timeEnd("⏱️ Total fetch time")
      if (requestId !== snapshotRequest.current) return null
      return { availableConsoles: filteredConsoles, allSlots: slotsData, selectedConsole: nextSelectedConsole, dates }
    } catch (error: any) {
      console.error('❌ Error in booking load:', error)
      return null
    }
  }

  const refreshBookingSnapshot = async (forceFresh = false, slotsOnly = false) => {
    if (!vendorId) return
    const data = await loadBookingData(vendorId, { forceFresh, slotsOnly })
    if (!data) return
    setModuleCache(bookingCacheKey, data)
    writeLocalSnapshot(vendorId, data)
    applyBookingCache(data)
  }

const fetchSlotBookings = async (slotIds: number[], date: string) => {
  const requestId = ++bookingsRequest.current
  const vendorId = getVendorIdFromToken()
  if (!vendorId || slotIds.length === 0) {
    setSlotBookings([])
    return
  }
  
  setIsLoadingBookings(true)
  const normalizedDate = normalizeBookedDate(date)
  
  // ✅ Check if querying past slots
  const todayIST = getISTDateString(0)
  const isPastDate = normalizedDate < todayIST
  
  try {
    const slotIdsParam = slotIds.join(',')
    // ✅ Add status filter for past bookings
    const statusParam = isPastDate ? '&include_completed=true' : ''

    const url = `${BOOKING_URL}/api/vendor/${vendorId}/slot-bookings?slot_ids=${slotIdsParam}&date=${normalizedDate}${statusParam}`
    const data = await fetchWithDedup(url)
    if (requestId !== bookingsRequest.current) return

    if (data?.success && data?.bookings) {
      const rawBookings = Array.isArray(data.bookings) ? data.bookings : []
      const dedupedBookings = rawBookings.filter((booking: any, index: number, arr: any[]) => {
        const bookingId = Number(booking?.booking_id || booking?.bookingId || 0)
        if (bookingId > 0) {
          return arr.findIndex((b: any) => Number(b?.booking_id || b?.bookingId || 0) === bookingId) === index
        }

        // Fallback for records without booking id
        const fallbackKey = [
          String(booking?.customer_phone || "").trim(),
          String(booking?.customer_name || "").trim(),
          String(booking?.booking_date || booking?.date || "").trim(),
          String(booking?.slot_start_time || booking?.start_time || "").trim(),
          String(booking?.slot_end_time || booking?.end_time || "").trim(),
          String(booking?.status || "").trim(),
        ].join("|")

        return (
          arr.findIndex((b: any) => {
            const otherKey = [
              String(b?.customer_phone || "").trim(),
              String(b?.customer_name || "").trim(),
              String(b?.booking_date || b?.date || "").trim(),
              String(b?.slot_start_time || b?.start_time || "").trim(),
              String(b?.slot_end_time || b?.end_time || "").trim(),
              String(b?.status || "").trim(),
            ].join("|")
            return otherKey === fallbackKey
          }) === index
        )
      })

      setSlotBookings(dedupedBookings)
    } else {
      setSlotBookings([])
    }
  } catch (error) {
    console.error('❌ Error fetching slot bookings:', error)
    if (requestId === bookingsRequest.current) setSlotBookings([])
  } finally {
    if (requestId === bookingsRequest.current) setIsLoadingBookings(false)
  }
}
  useEffect(() => {
    if (!vendorId) {
      setVendorId(getVendorIdFromToken())
    }
  }, [])

  useEffect(() => {
    if (cachedBooking) {
      applyBookingCache(cachedBooking)
    }
  }, [cachedBooking])

  useEffect(() => {
    if (!vendorId) return

    let hasLocalSnapshot = false
    let cancelled = false
    // Instant local snapshot restore for fast perceived load.
    if (!cachedBooking) {
      const localSnapshot = readLocalSnapshot(vendorId)
      if (localSnapshot) {
        hasLocalSnapshot = true
        setModuleCache(bookingCacheKey, localSnapshot)
        applyBookingCache(localSnapshot)
      }
    }

    const shouldRefresh = !cachedBooking || bookingVersion > 0
    if (!shouldRefresh) return

    if (!cachedBooking && !hasLocalSnapshot) {
      setIsLoading(true)
    }

    const shouldUseFastPath = !cachedBooking && !hasLocalSnapshot && bookingVersion <= 0

    loadBookingData(vendorId, {
      forceFresh: bookingVersion > 0,
      slotsOnly: bookingVersion > 0,
      initialOnly: shouldUseFastPath,
    })
      .then((data) => {
        if (!data || cancelled) return
        setModuleCache(bookingCacheKey, data)
        writeLocalSnapshot(vendorId, data)
        applyBookingCache(data)
        setRecentBookings([])

        // Progressive hydration: after first paint, fetch remaining console slots in background.
        if (shouldUseFastPath) {
          loadBookingData(vendorId, { forceFresh: false, initialOnly: false })
            .then((fullData) => {
              if (!fullData || cancelled) return
              setModuleCache(bookingCacheKey, fullData)
              writeLocalSnapshot(vendorId, fullData)
              applyBookingCache(fullData)
            })
            .catch((error) => {
              console.error("❌ Background full booking hydration failed:", error)
            })
        }
      })
      .catch((error) => {
        console.error("❌ Error loading booking data:", error)
      })
      .finally(() => {
        if (cancelled) return
        if (!cachedBooking) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [vendorId, bookingVersion])

  // Fetch bookings when slots are selected
useEffect(() => {
  if (selectedSlots.length > 0) {
    const slotIds = selectedSlots.map(slot => slot.slot_id)
    const date = selectedSlots[0].date // All slots should have same date
    fetchSlotBookings(slotIds, date)
  } else {
    bookingsRequest.current += 1
    setSlotBookings([])
    setIsLoadingBookings(false)
  }
}, [selectedSlots])


  useEffect(() => {
    const handleBookingUpdated = () => {
      refreshBookingSnapshot(true)
    }

    window.addEventListener('refresh-dashboard', handleBookingUpdated)
    return () => window.removeEventListener('refresh-dashboard', handleBookingUpdated)
  }, [vendorId])

  const handleSlotSelect = (slot: SelectedSlot) => {
    if (deselectTimer.current) clearTimeout(deselectTimer.current)
    const matches = (s: SelectedSlot) => s.slot_id === slot.slot_id && s.date === slot.date &&
      Number(s.console_id) === Number(slot.console_id)
    const toggle = () => {
      setSelectedSlots(previous => previous.some(matches)
        ? previous.filter(s => !matches(s)) : [...previous, slot])
      deselectTimer.current = null
    }
    // Resolve a grid single-click before painting selection. A double-click
    // cancels this work and selects + opens in one React update.
    // The picker inside the open form has no double-click action.
    if (showBookingForm) toggle()
    else deselectTimer.current = setTimeout(toggle, 250)
  }

  const handleRemoveSelectedSlot = (slotToRemove: SelectedSlot) => {
    setSelectedSlots((prev) =>
      prev.filter(
        (slot) =>
          !(
            slot.slot_id === slotToRemove.slot_id &&
            slot.date === slotToRemove.date &&
            Number(slot.console_id) === Number(slotToRemove.console_id)
          )
      )
    )
  }

  const handleQuickBooking = (slot: SelectedSlot) => {
    if (deselectTimer.current) clearTimeout(deselectTimer.current)
    deselectTimer.current = null
    // A double-click also fires click events. Ensure the target remains selected
    // and preserve any other slots the user has already chosen.
    setSelectedSlots((previous) => previous.some((selected) =>
      selected.slot_id === slot.slot_id && selected.date === slot.date &&
      Number(selected.console_id) === Number(slot.console_id)
    ) ? previous : [...previous, slot])
    setShowBookingForm(true)
  }

  const handleNewBooking = () => setShowBookingForm(true)

  const handleConsoleChange = (consoleType: ConsoleFilter) => {
    if (deselectTimer.current) clearTimeout(deselectTimer.current)
    deselectTimer.current = null
    setSelectedConsole(consoleType)
    setSelectedSlots([])
    setSlotBookings([])
    setShowBookingForm(false)
  }

  const handleBookingComplete = () => {
    setRecordsRevision(value => value + 1)
    setSelectedSlots([])
    // The success event refreshes inventory and dashboard data together.
  }

  const hasRenderableSnapshot =
    availableConsoles.length > 0 && Object.keys(allSlots || {}).length > 0

  if (isLoading && !hasRenderableSnapshot) {
    return (
      <main className={embedded ? "h-full min-h-0 bg-background flex items-center justify-center" : "min-h-screen bg-background flex items-center justify-center"}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-black dark:text-zinc-200">Loading slot data...</p>
        </div>
      </main>
    )
  }

  return (
    <main className={slab ? "dashboard-quick-root" : embedded ? `${scheduleStyles.schedule} h-full min-h-0 bg-background overflow-hidden` : "min-h-screen bg-background"}>
      <div
        className={slab ? "dashboard-quick-root-inner" : `mx-auto w-full max-w-full p-3 ${
          embedded ? "flex h-full min-h-0 flex-col gap-3 overflow-hidden" : ""
        }`}
      >
        {isLoading && hasRenderableSnapshot && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-zinc-700/60 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
            Syncing latest slots...
          </div>
        )}
        {embedded ? (
          <>
            {slab ? (
              <DashboardQuickBookingSlab
                availableConsoles={availableConsoles}
                selectedConsole={selectedConsole}
                selectedSlots={selectedSlots}
                onConsoleChange={handleConsoleChange}
                onSlotSelect={handleSlotSelect}
                onNewBooking={handleNewBooking}
                onQuickBooking={handleQuickBooking}
                allSlots={allSlots}
              />
            ) : (
              <div className="shrink-0 space-y-3">
                <TopBar
                  selectedSlots={selectedSlots}
                  onNewBooking={handleNewBooking}
                  selectedConsole={selectedConsole}
                  onConsoleChange={handleConsoleChange}
                  availableConsoles={availableConsoles}
                  compact
                />
                <ScheduleGrid
                  availableConsoles={availableConsoles}
                  selectedConsole={selectedConsole}
                  selectedSlots={selectedSlots}
                  onSlotSelect={handleSlotSelect}
                  onQuickBooking={handleQuickBooking}
                  allSlots={allSlots}
                  isLoading={isLoading}
                  fetchSlotBookings={fetchSlotBookings}
                  compact
                />
              </div>
            )}
            {!slab && (
              <div className="min-h-0 flex-1 overflow-hidden">
                <BookingRecords key={vendorId} vendorId={vendorId} refreshKey={recordsRevision} />
              </div>
            )}
          </>
        ) : (
          <>
            <TopBar
              selectedSlots={selectedSlots}
              onNewBooking={handleNewBooking}
              selectedConsole={selectedConsole}
              onConsoleChange={handleConsoleChange}
              availableConsoles={availableConsoles}
            />
            <ScheduleGrid
              availableConsoles={availableConsoles}
              selectedConsole={selectedConsole}
              selectedSlots={selectedSlots}
              onSlotSelect={handleSlotSelect}
                  onQuickBooking={handleQuickBooking}
              allSlots={allSlots}
              isLoading={isLoading}
              fetchSlotBookings={fetchSlotBookings}
            />
            <div className="mt-4 h-[520px]"><BookingRecords key={vendorId} vendorId={vendorId} refreshKey={recordsRevision} /></div>
          </>
        )}
      </div>

      <SlotBookingForm
        key={recordsRevision}
        isOpen={showBookingForm}
        onClose={() => setShowBookingForm(false)}
        selectedSlots={selectedSlots}
        defaultConsoleId={availableConsoles.find(console => console.type === selectedConsole)?.id}
        onReplaceSlots={setSelectedSlots}
        onRemoveSelectedSlot={handleRemoveSelectedSlot}
        onSlotSelect={handleSlotSelect}
        allSlots={allSlots}
        onBookingComplete={handleBookingComplete}
        availableConsoles={availableConsoles}
      />
    </main>
  )
}
