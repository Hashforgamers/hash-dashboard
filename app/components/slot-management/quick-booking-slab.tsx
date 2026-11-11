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
import { type ConsoleFilter, type SelectedSlot, getISTDateString, isPastSlotInIST, resolveSafeConsoleIcon } from "./shared"

export function DashboardQuickBookingSlab({
  availableConsoles,
  selectedConsole,
  selectedSlots,
  onConsoleChange,
  onSlotSelect,
  onNewBooking,
  onQuickBooking,
  allSlots,
}: {
  availableConsoles: ConsoleType[]
  selectedConsole: ConsoleFilter
  selectedSlots: SelectedSlot[]
  onConsoleChange: (gameConsole: ConsoleFilter) => void
  onSlotSelect: (slot: SelectedSlot) => void
  onNewBooking: () => void
  onQuickBooking: (slot: SelectedSlot) => void
  allSlots: { [key: string]: any[] }
}) {
  const today = getISTDateString(0)
  const [quickConsole, setQuickConsole] = useState<ConsoleFilter | null>(null)
  const activeConsoles = [...availableConsoles].sort((a, b) =>
    String(a?.name || a?.type || "").localeCompare(String(b?.name || b?.type || ""))
  )

  useEffect(() => {
    if (activeConsoles.length === 0) return
    if (quickConsole && activeConsoles.some((consoleItem) => consoleItem.type === quickConsole)) return

    const preferredConsole = selectedConsole
      ? activeConsoles.find((consoleItem) => consoleItem.type === selectedConsole)
      : null
    const nextConsole = preferredConsole || activeConsoles[0]

    if (nextConsole?.type) {
      setQuickConsole(nextConsole.type)
      onConsoleChange(nextConsole.type)
    }
  }, [activeConsoles, onConsoleChange, quickConsole, selectedConsole])

  const selectedConsoleItem =
    quickConsole
      ? activeConsoles.find((consoleItem) => consoleItem.type === quickConsole) || null
      : null
  const selectedConsoleId = Number(selectedConsoleItem?.id)

  const todaySlots = (allSlots[today] || [])
    .filter((slot: any) => Number(slot?.console_id) === selectedConsoleId)
    .filter((slot: any) =>
      Boolean(slot?.is_available) &&
      !isPastSlotInIST(today, slot?.end_time, slot?.start_time) &&
      Number(slot?.available_slot || 0) > 0
    )
    .sort((a: any, b: any) => String(a.start_time).localeCompare(String(b.start_time)))

  const handleSlotButtonClick = (slot: any, openBooking = false) => {
    if (!slot.is_available || Number(slot.available_slot || 0) <= 0) return

    const selectedSlot: SelectedSlot = {
      slot_id: slot.slot_id,
      date: today,
      start_time: slot.start_time,
      end_time: slot.end_time,
      console_id: selectedConsoleId,
      console_name: selectedConsoleItem?.name || selectedConsoleItem?.type || selectedConsole,
      console_price: slot.single_slot_price || selectedConsoleItem?.price || 0,
      available_count: slot.available_slot || 0,
    }
    if (openBooking) onQuickBooking(selectedSlot)
    else onSlotSelect(selectedSlot)
  }

  return (
    <div className="dashboard-quick-booking">
      <div className="dashboard-quick-toolbar">
      <h2 className="dashboard-slab-title">Quick Booking</h2>
      <div className="dashboard-quick-console-strip" aria-label="Choose console for quick booking">
        {activeConsoles.map((consoleItem) => {
          const Icon = resolveSafeConsoleIcon(consoleItem.icon, consoleItem.type)
          const active = consoleItem.type === quickConsole
          const openSlotCount = (allSlots[today] || []).filter((slot: any) =>
            Number(slot?.console_id) === Number(consoleItem.id) &&
            Boolean(slot?.is_available) &&
            !isPastSlotInIST(today, slot?.end_time, slot?.start_time) &&
            Number(slot?.available_slot || 0) > 0
          ).length

          return (
            <button
              key={`${consoleItem.type}-${consoleItem.id}`}
              type="button"
              title={`${consoleItem.name || consoleItem.type}: ${openSlotCount} open today`}
              aria-label={`${consoleItem.name || consoleItem.type}, ${openSlotCount} open today`}
              aria-pressed={active}
              onClick={() => {
                setQuickConsole(consoleItem.type)
                onConsoleChange(consoleItem.type)
              }}
              className={cn("dashboard-console-card", active && "dashboard-console-card-active")}
            >
              <span className="dashboard-console-icon">
                <Icon className="h-4 w-4" />
              </span>
            </button>
          )
        })}
      </div>
      <span className="dashboard-quick-context">{selectedConsoleItem?.name || selectedConsoleItem?.type}</span>
      </div>
      <div className="dashboard-quick-slots-row">
      <div className="dashboard-slot-slider" aria-label="Available slots today">
        {!selectedConsoleItem ? (
          <div className="dashboard-slot-empty">Select console</div>
        ) : todaySlots.length === 0 ? (
          <div className="dashboard-slot-empty">No slots left today</div>
        ) : (
          todaySlots.map((slot: any) => {
            const isSelected = selectedSlots.some(
              (selected) =>
                selected.date === today &&
                selected.slot_id === slot.slot_id &&
                Number(selected.console_id) === selectedConsoleId
            )
            return (
              <button
                key={`${today}-${selectedConsoleId}-${slot.slot_id}`}
                type="button"
                title={`${String(slot.start_time).slice(0, 5)} - ${slot.available_slot || 0} left. Click to select; double-click to book.`}
                aria-pressed={isSelected}
                onClick={(event) => {
                  if (event.detail < 2) handleSlotButtonClick(slot)
                }}
                onDoubleClick={() => handleSlotButtonClick(slot, true)}
                className={cn(
                  "dashboard-slot-chip select-none",
                  isSelected && "dashboard-slot-chip-selected"
                )}
              >
                <span className="dashboard-slot-time">
                  {String(slot.start_time).slice(0, 5)}
                </span>
                <span className="dashboard-slot-capacity">
                  {slot.available_slot || 0} available
                </span>
              </button>
            )
          })
        )}
      </div>

      <Button
        type="button"
        onClick={onNewBooking}
        className={cn(
          "dashboard-quick-book-button",
          "ui-action-primary"
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        Book {selectedSlots.length > 0 ? `(${selectedSlots.length})` : ""}
      </Button>
      </div>
    </div>
  )
}
