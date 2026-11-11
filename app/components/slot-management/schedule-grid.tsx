"use client"
import { toast } from "sonner";
import React, { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { jwtDecode } from 'jwt-decode'
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { contiguousDeskSlots, coveringDeskSlots } from "@/lib/desk-time-range"
import { DeskConsolePicker } from "../desk-console-picker"
import { deskSubtotal, rateLabel, resolveSessionRate, useDeskCards } from "../desk-rate-card"
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
import { ConsoleType } from '../types'
import MealSelector from '../mealSelector'
import BookingRecords from "../booking-records"
import scheduleStyles from "../schedule-workspace.module.css"
import CreditAccountModal, { type MonthlyCreditAccountSummary } from '../credit-account-modal'
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
} from "../console-catalog"
import { type ConsoleFilter, type PillColor, type SelectedSlot, getCurrentISTMinutes, getISTDateString, isPastSlotInIST, resolveConsoleIcon, resolveSafeConsoleIcon } from "./shared"
import { ChangeBookingForm } from "./manage-bookings"
import { RejectBookingForm } from "./manage-bookings"
import { ListBooking } from "./manage-bookings"

export function SlotPill({
  label,
  color,
  icon: Icon,
  onClick,
  onDoubleClick,
  selected = false,
  disabled = false,
  compact = false,
}: {
  label: string
  color: PillColor
  icon?: React.ComponentType<{ className?: string }>
  onClick?: () => void
  onDoubleClick?: () => void
  selected?: boolean
  disabled?: boolean
  compact?: boolean
}) {
  const colorClasses: Record<PillColor, string> = {
    green: selected 
      ? "booking-slot-pill-selected" 
      : "booking-slot-pill-open",
    blue: selected 
      ? "booking-slot-pill-selected"
      : "booking-slot-pill-open", 
    purple: selected 
      ? "booking-slot-pill-selected"
      : "booking-slot-pill-open",
    yellow: selected 
      ? "booking-slot-pill-selected"
      : "booking-slot-pill-open",
    red: "booking-slot-pill-danger",
  }

  return (
    <button
      type="button"
      onClick={(event) => { if (event.detail < 2) onClick?.() }}
      onDoubleClick={onDoubleClick}
      aria-pressed={selected}
      title="Click to select; double-click to book"
      disabled={disabled}
      className={cn(
        "booking-slot-pill select-none w-full h-full flex items-center justify-center rounded-md text-[10px] font-bold uppercase keep-case",
        compact ? "min-h-[32px]" : "min-h-[38px]",
        "transition-all duration-200 cursor-pointer",
        disabled && "cursor-not-allowed opacity-60",
        colorClasses[color],
      )}
    >
      {Icon ? <Icon className="h-3 w-3 mr-0.5" /> : null}
      <span className="truncate">{label}</span>
    </button>
  )
}
export function SegmentedButton({
  children,
  active = false,
  icon: Icon,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  icon?: React.ComponentType<{ className?: string }>
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "booking-console-tab inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium uppercase keep-case",
        "transition-all duration-200",
        active
          ? "booking-console-tab-active"
          : "booking-console-tab-idle",
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  )
}
export function TopBar({ 
  selectedSlots, 
  onNewBooking,
  selectedConsole,
  onConsoleChange,
  availableConsoles,
  compact = false,
  slab = false,
}: { 
  selectedSlots: SelectedSlot[], 
  onNewBooking: () => void,
  selectedConsole: ConsoleFilter,
  onConsoleChange: (gameConsole: ConsoleFilter) => void
  availableConsoles: ConsoleType[]
  compact?: boolean
  slab?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showManageView, setShowManageView] = useState<'change' | 'reject' | 'list' | null>(null)
  const activeConsoles = [...availableConsoles].sort((a, b) =>
    String(a?.name || a?.type || "").localeCompare(String(b?.name || b?.type || ""))
  )
  
  // Conditional rendering for management views
  if (showManageView) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4">
        <div className="max-w-6xl mx-auto mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {showManageView === 'change' && 'Change Booking'}
              {showManageView === 'reject' && 'Reject Booking'}
              {showManageView === 'list' && 'List Bookings'}
            </h2>
            <Button
              variant="ghost"
              onClick={() => setShowManageView(null)}
              className="text-white hover:bg-white/10"
            >
              <X className="w-5 h-5 mr-2" />
              Back
            </Button>
          </div>

          <Card className="bg-white dark:bg-zinc-800 shadow-2xl">
            {showManageView === 'change' && <ChangeBookingForm />}
            {showManageView === 'reject' && <RejectBookingForm />}
            {showManageView === 'list' && <ListBooking />}
          </Card>
        </div>
      </div>
    )
  }

  // Main TopBar return
  return (
    <div className={cn("booking-topbar mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", compact && "mb-2 gap-2", slab && "dashboard-booking-topbar")}>
      <Card className={cn("booking-console-filter rounded-xl border p-2.5 shadow-sm backdrop-blur-sm", compact && "p-2")}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="booking-console-label text-xs font-medium uppercase tracking-wide">Select Console</span>
          <select aria-label="Select console" value={selectedConsole} onChange={event => onConsoleChange(event.target.value)} className={scheduleStyles.consoleSelect}>
            {activeConsoles.map(item => <option key={item.type} value={item.type}>{item.name || item.type}</option>)}
          </select>
          <div className={`${scheduleStyles.consoleTabs} flex flex-wrap items-center gap-2`}>
            {activeConsoles.map((consoleItem) => {
              const key = consoleItem.type
              const Icon = resolveSafeConsoleIcon(consoleItem.icon, consoleItem.type)
              const label = consoleItem.name || consoleItem.type
              return (
              <SegmentedButton
                key={key}
                active={selectedConsole === key}
                icon={Icon}
                onClick={() => onConsoleChange(key)}
              >
                {label}
              </SegmentedButton>
            )})}
            {activeConsoles.length === 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                No consoles are set up for booking yet. <a href="/gaming" className="font-medium underline underline-offset-2">Add consoles</a>
              </div>
            )}
          </div>
        </div>
      </Card>
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          onClick={onNewBooking}
          className={cn(
            "booking-new-button rounded-lg transition-all duration-200",
            "px-4 py-2 text-xs font-semibold sm:px-5 sm:text-sm",
            "ui-action-primary"
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Gaming Session {selectedSlots.length > 0 && `(${selectedSlots.length})`}
        </Button>

        {/* Dropdown Menu for Manage Bookings */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline"
              size="icon" 
              className={cn("ui-toolbar-menu rounded-lg", slab && "dashboard-booking-menu-button")}
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-zinc-200 bg-white text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
            <DropdownMenuItem onClick={() => {
              setShowManageView('change');
              setMenuOpen(false);
            }}>
              <CalendarClock className="w-4 h-4 mr-2" />
              Change Booking
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setShowManageView('reject');
              setMenuOpen(false);
            }}>
              <XCircle className="w-4 h-4 mr-2" />
              Reject Booking
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setShowManageView('list');
              setMenuOpen(false);
            }}>
              <ListTodo className="w-4 h-4 mr-2" />
              List Bookings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
export function ConsoleFilter({
  selectedConsole,
  onConsoleChange,
}: {
  selectedConsole: ConsoleFilter
  onConsoleChange: (gameConsole: ConsoleFilter) => void
}) {
  const consoleIcons = {
    PC: Monitor,
    PS5: MonitorPlay,
    Xbox: Gamepad,
    VR: Headset
  }

  return (
    <Card className="mb-6 rounded-xl border border-zinc-300 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Select Console</span>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(consoleIcons).map(([key, Icon]) => (
            <SegmentedButton 
              key={key}
              active={selectedConsole === key} 
              icon={Icon}
              onClick={() => onConsoleChange(key as ConsoleFilter)}
            >
              {key}
            </SegmentedButton>
          ))}
        </div>
      </div>
    </Card>
  )
}
export function ScheduleGrid({
  availableConsoles,
  selectedConsole,
  selectedSlots,
  onSlotSelect,
  onQuickBooking,
  allSlots,
  isLoading,
  fetchSlotBookings,
  compact = false,
  slab = false,
}: {
  availableConsoles: ConsoleType[]
  selectedConsole: ConsoleFilter
  selectedSlots: SelectedSlot[]
  onSlotSelect: (slot: SelectedSlot) => void
  onQuickBooking: (slot: SelectedSlot) => void
  allSlots: { [key: string]: any[] }
  isLoading: boolean
  fetchSlotBookings: (slotIds: number[], date: string) => Promise<void>
  compact?: boolean
  slab?: boolean
}) {
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartScrollRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const getNext3Days = () => {
    const days = []
    for (let i = 0; i < 3; i++) {
      const fullDate = getISTDateString(i)
      const [, month, day] = fullDate.split("-")
      const displayDate = `${day}/${month}`
      
      days.push({ date: displayDate, fullDate })
    }
    
    return days
  }

  const days = slab ? getNext3Days().slice(0, 1) : getNext3Days()

  const uniqueTimes = React.useMemo(() => {
    const allTimes = new Set<string>()
    
    Object.values(allSlots).forEach(daySlots => {
      daySlots.forEach(slot => {
        const startTime = slot.start_time.slice(0, 5)
        allTimes.add(startTime)
      })
    })
    
    const sortedTimes = Array.from(allTimes).sort((a, b) => {
      const [aHour, aMin] = a.split(':').map(Number)
      const [bHour, bMin] = b.split(':').map(Number)
      return (aHour * 60 + aMin) - (bHour * 60 + bMin)
    })
    
    return sortedTimes
  }, [allSlots])

  useEffect(() => {
    if (!timelineRef.current || uniqueTimes.length === 0) return

    const nowMinutes = getCurrentISTMinutes()

    const nearestIndex = uniqueTimes.reduce((bestIndex, time, idx) => {
      const [hours, mins] = time.split(':').map(Number)
      const minutes = hours * 60 + mins
      const bestTime = uniqueTimes[bestIndex]
      const [bestH, bestM] = bestTime.split(':').map(Number)
      const bestMinutes = bestH * 60 + bestM
      return Math.abs(minutes - nowMinutes) < Math.abs(bestMinutes - nowMinutes) ? idx : bestIndex
    }, 0)

    const colWidth = slab ? 92 : compact ? 100 : 116
    const targetLeft = Math.max(0, (nearestIndex * colWidth) - 160)
    timelineRef.current.scrollTo({ left: targetLeft, behavior: 'smooth' })
  }, [uniqueTimes])

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return
    isDraggingRef.current = true
    setIsDragging(true)
    dragStartXRef.current = e.pageX - timelineRef.current.offsetLeft
    dragStartScrollRef.current = timelineRef.current.scrollLeft
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !timelineRef.current) return
    e.preventDefault()
    const x = e.pageX - timelineRef.current.offsetLeft
    const walk = (x - dragStartXRef.current) * 1.2
    timelineRef.current.scrollLeft = dragStartScrollRef.current - walk
  }

  const stopDragging = () => {
    isDraggingRef.current = false
    setIsDragging(false)
  }

  const filteredConsoles = availableConsoles.filter(gameConsole => {
    return gameConsole.type === selectedConsole
  })

  const getConsoleIcon = (consoleType: string) => {
    return resolveConsoleIcon(undefined, consoleType)
  }

  const getConsoleColor = (consoleId: number | null): PillColor => {
    if (!consoleId) return 'green'
    const colors: PillColor[] = ['green', 'blue', 'purple', 'yellow']
    return colors[consoleId % colors.length]
  }

  const toMinuteOfDay = (timeValue: string | undefined | null): number | null => {
    if (!timeValue) return null
    const [h, m] = String(timeValue).slice(0, 5).split(":")
    const hh = Number(h)
    const mm = Number(m)
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null
    return hh * 60 + mm
  }

  const getSlotDurationMinutes = (slot: any): number => {
    const start = toMinuteOfDay(slot?.start_time)
    const end = toMinuteOfDay(slot?.end_time)
    if (start === null || end === null) return 0
    const mins = end > start ? end - start : (24 * 60 - start + end)
    return mins
  }

  const detectedDurations = React.useMemo(() => {
    const selectedIds = new Set(
      filteredConsoles
        .map((consoleItem) => Number(consoleItem.id))
        .filter((id) => Number.isFinite(id))
    )
    const durationSet = new Set<number>()

    Object.values(allSlots).forEach((daySlots: any[]) => {
      daySlots.forEach((slot: any) => {
        const consoleId = Number(slot?.console_id)
        if (!selectedIds.has(consoleId)) return
        const start = toMinuteOfDay(slot?.start_time)
        const end = toMinuteOfDay(slot?.end_time)
        if (start === null || end === null) return
        const mins = end > start ? end - start : (24 * 60 - start + end)
        if (mins > 0) durationSet.add(mins)
      })
    })

    return Array.from(durationSet).sort((a, b) => a - b)
  }, [allSlots, filteredConsoles])

  if (filteredConsoles.length === 0) {
    return (
      <Card className="overflow-hidden rounded-2xl border border-amber-300 bg-amber-50/90 backdrop-blur-sm dark:border-amber-500/35 dark:bg-amber-500/10">
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-amber-300" />
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            No {selectedConsole} consoles available in this cafe
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-200/90">
            Add or map {selectedConsole} devices from `Manage Gaming Console` to enable booking.
          </p>
        </div>
      </Card>
    )
  }

  const findCoveringSlot = (daySlots: any[], time: string, consoleId?: number) => {
    const target = toMinuteOfDay(time)
    if (target === null) return null
    return daySlots.find((slot) => {
      if (slot.console_id !== consoleId) return false
      const start = toMinuteOfDay(slot.start_time)
      const end = toMinuteOfDay(slot.end_time)
      if (start === null || end === null) return false
      return target > start && target < end
    }) || null
  }

  const isSlotSelected = (slotId: number, date: string, consoleId?: number) => {
    return selectedSlots.some(
      (slot) =>
        slot.slot_id === slotId &&
        slot.date === date &&
        Number(slot.console_id) === Number(consoleId)
    )
  }

  const pickBestSlot = (slots: any[]) => {
    if (!Array.isArray(slots) || slots.length === 0) return null
    return [...slots].sort((a, b) => {
      const aAvail = Number(a?.available_slot || 0)
      const bAvail = Number(b?.available_slot || 0)
      if (aAvail !== bAvail) return bAvail - aAvail
      const aOpen = Boolean(a?.is_available)
      const bOpen = Boolean(b?.is_available)
      if (aOpen !== bOpen) return aOpen ? -1 : 1
      return 0
    })[0]
  }

  const handleSlotClick = (dayData: any, time: string, gameConsole: ConsoleType, openBooking = false) => {
  const daySlots = allSlots[dayData.fullDate] || []
  
  let matchingSlot = daySlots.find(slot => {
    const slotStartTime = slot.start_time.slice(0, 5)
    return slotStartTime === time && slot.console_id === gameConsole.id
  })

  const sameTimeSlots = daySlots.filter((slot: any) => {
    const slotStartTime = slot.start_time.slice(0, 5)
    return slotStartTime === time && slot.console_id === gameConsole.id
  })
  const bestSameTimeSlot = pickBestSlot(sameTimeSlots)
  if (bestSameTimeSlot) {
    matchingSlot = bestSameTimeSlot
  }

  if (!matchingSlot) {
    matchingSlot = findCoveringSlot(daySlots, time, gameConsole.id ?? undefined)
  }

  if (!matchingSlot) return

  // ✅ NEW: Check if slot is in the past
  const isPastTime = isPastSlotInIST(dayData.fullDate, matchingSlot.end_time, matchingSlot.start_time)

  const selectedSlot: SelectedSlot = {
    slot_id: matchingSlot.slot_id,
    date: dayData.fullDate,
    start_time: matchingSlot.start_time,
    end_time: matchingSlot.end_time,
    console_id: gameConsole.id!,
    console_name: gameConsole.name,
    console_price: matchingSlot.single_slot_price || gameConsole.price!,
    available_count: matchingSlot.available_slot || 0,
  }

  // ✅ NEW: For past slots, just fetch bookings (don't add to selection for new booking)
  if (isPastTime) {
    console.log('🕒 Past slot clicked, fetching past bookings...')
    fetchSlotBookings([matchingSlot.slot_id], dayData.fullDate)
    return // Don't add to selected slots
  }

  // ✅ For active slots, allow selection for new booking
  if (matchingSlot.is_available && Number(matchingSlot.available_slot) > 0) {
    if (openBooking) onQuickBooking(selectedSlot)
    else onSlotSelect(selectedSlot)
  }
}
  if (isLoading) {
    return (
      <Card className="booking-schedule-card overflow-hidden rounded-xl border">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-zinc-300">Loading available slots...</p>
          </div>
        </div>
      </Card>
    )
  }

  const rows = days.map(day => {
    const daySlots = allSlots[day.fullDate] || []

    return {
      date: day.date,
      fullDate: day.fullDate,
      cells: uniqueTimes.map((time, timeIndex) => {
        if (filteredConsoles.length === 0) {
          return <span key={timeIndex} />
        }

        const timeSlots: React.ReactNode[] = []
        
        filteredConsoles.forEach(gameConsole => {
          const consoleSlots = daySlots.filter(slot => {
            const slotStartTime = slot.start_time.slice(0, 5)
            return slotStartTime === time && slot.console_id === gameConsole.id
          })

          if (consoleSlots.length === 0) {
            const coveringSlot = findCoveringSlot(daySlots, time, gameConsole.id ?? undefined)
            if (coveringSlot) {
              timeSlots.push(
                <div
                  key={`continuation-${day.fullDate}-${gameConsole.id}-${time}`}
                  onClick={(event) => { if (event.detail < 2) handleSlotClick(day, time, gameConsole) }}
                  onDoubleClick={() => handleSlotClick(day, time, gameConsole, true)}
      className={cn(
        "booking-slot-continuation select-none group relative h-full w-full cursor-pointer overflow-hidden rounded-md border transition-colors",
                    compact ? "min-h-[32px]" : "min-h-[40px]"
                  )}
                  title={`${gameConsole.name} slot continues (${coveringSlot.start_time?.slice(0, 5)}-${coveringSlot.end_time?.slice(0, 5)})`}
                >
                  <div className="booking-slot-continuation-line absolute inset-x-2 top-1/2 h-[2px] -translate-y-1/2 rounded-full" />
                  <div className="booking-slot-continuation-dot absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full" />
                  <div className="sr-only">
                    Slot continues
                  </div>
                </div>
              )
            }
            return
          }

          const slot = pickBestSlot(consoleSlots) // Prefer best candidate (open/high capacity) when duplicates exist
          if (!slot) return
          const isSelected = isSlotSelected(slot.slot_id, day.fullDate, slot.console_id)
          
          // ✅ Check if time has passed
          const isPastTime = isPastSlotInIST(day.fullDate, slot.end_time, slot.start_time)
          
          // ✅ Check if fully booked
          const isFullyBooked = (slot.available_slot || 0) === 0
          
          // ❌ Show RED X for both expired and fully booked
         // ✅ Show GREY for PAST slots (clickable) and RED for FULLY BOOKED
if (isPastTime) {
  // PAST SLOT - Grey and clickable
  timeSlots.push(
    <div
      key={`past-${day.fullDate}-${gameConsole.id}`}
      onClick={() => handleSlotClick(day, time, gameConsole)} // ✅ Make clickable
      className={cn(
        "booking-slot-past w-full h-full flex items-center justify-center rounded-md cursor-pointer transition-colors",
        compact ? "min-h-[32px]" : "min-h-[40px]"
      )}
      title="Past slot - Click to view past bookings"
    >
      <Clock className="h-4 w-4 mr-1" />
      <span className="text-xs font-semibold">PAST</span>
    </div>
  )
} else if (isFullyBooked) {
  // FULLY BOOKED - Red X (not clickable)
  timeSlots.push(
    <div
      key={`unavailable-${day.fullDate}-${gameConsole.id}`}
      className={cn(
        "booking-slot-full w-full h-full flex items-center justify-center rounded-md cursor-not-allowed",
        compact ? "min-h-[32px]" : "min-h-[40px]"
      )}
      title="Fully booked"
    >
      <X className="h-5 w-5 stroke-[3]" />
    </div>
  )
}

          // ✅ Show available slots with count
          else {
            const availableSlotCount = Number(slot.available_slot || 0)
            timeSlots.push(
              <div
                key={`${day.fullDate}-${slot.slot_id}`}
                className={cn("w-full h-full", compact ? "min-h-[32px]" : "min-h-[40px]")}
              >
                <SlotPill
                  label={`${availableSlotCount} ${availableSlotCount === 1 ? "Slot" : "Slots"}`}
                  color={getConsoleColor(gameConsole.id)}
                  icon={getConsoleIcon(gameConsole.type)}
                  onClick={() => handleSlotClick(day, time, gameConsole)}
                  onDoubleClick={() => handleSlotClick(day, time, gameConsole, true)}
                  selected={isSelected}
                  disabled={false}
                  compact={compact}
                />
              </div>
            )
          }
        })

        return (
          <div
            key={`${day.fullDate}-${timeIndex}`}
            className={cn("flex flex-row flex-wrap items-stretch h-full", compact ? "gap-0.5 p-0.5" : "gap-1 p-1")}
          >
            {timeSlots}
          </div>
        )
      }),
    }
  })
  const todayIST = getISTDateString(0)

  if (uniqueTimes.length === 0) {
    return (
      <Card className="booking-schedule-card overflow-hidden rounded-xl border">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <CalendarDays className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
            <p className="text-zinc-300">No slots available</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
      <Card className="booking-schedule-card overflow-hidden rounded-xl border">
        {detectedDurations.length > 1 && (
        <div className="booking-schedule-notice border-b px-4 py-2 text-xs">
          Mixed slot durations detected ({detectedDurations.join("m, ")}m). Cells now show available slot count.
        </div>
      )}
      <div
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        className={cn(
          "booking-timeline-scroll overflow-x-auto select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <div className="min-w-max">
          <div
            className={cn("booking-time-header grid", compact ? "gap-1 p-2 pb-2" : "gap-2 p-4 pb-3")}
            style={{ gridTemplateColumns: `${slab ? 78 : 88}px repeat(${uniqueTimes.length}, minmax(${slab ? 92 : compact ? 108 : 120}px, 1fr))` }}
          >
            <div className="booking-date-heading sticky left-0 z-20 flex items-center justify-center text-center text-xs font-semibold uppercase backdrop-blur-sm">
              Date
            </div>
            {uniqueTimes.map((time) => (
              <div key={time} className="booking-time-label text-center text-sm font-bold">
                {time}
              </div>
            ))}
          </div>

          <div className="booking-grid-body border-t">
            {rows.map((row) => {
              const isTodayRow = row.fullDate === todayIST
              return (
                <div
                  key={row.fullDate}
                  className={cn(
                    "booking-grid-row grid border-b last:border-b-0 transition-colors",
                    isTodayRow
                      ? "booking-grid-row-today"
                      : "booking-grid-row-idle",
                    compact ? "gap-1 p-2 py-1.5" : "gap-2 p-4 py-3"
                  )}
                  style={{ gridTemplateColumns: `${slab ? 78 : 88}px repeat(${uniqueTimes.length}, minmax(${slab ? 92 : compact ? 108 : 120}px, 1fr))` }}
                >
                  <div
                    className={cn(
                      "booking-date-cell sticky left-0 z-20 flex items-center justify-center rounded-lg px-2 py-2 text-sm font-bold backdrop-blur-sm",
                      isTodayRow
                        ? "booking-date-cell-today"
                        : "booking-date-cell-idle"
                    )}
                  >
                    <span>{row.date}</span>
                    {isTodayRow && (
                      <span className="booking-today-badge ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                        Today
                      </span>
                    )}
                  </div>

                  {row.cells.map((content, idx) => (
                    <div
                      key={`${row.fullDate}-cell-${idx}`}
                      className={cn(
                        "booking-slot-cell rounded-lg border backdrop-blur-sm",
                        isTodayRow && "booking-slot-cell-today",
                        compact ? "min-h-[38px]" : "min-h-[46px]"
                      )}
                    >
                      {content}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}
