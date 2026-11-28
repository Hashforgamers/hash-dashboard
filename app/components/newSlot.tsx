"use client"

import { toast } from "sonner";
import React, { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { jwtDecode } from 'jwt-decode'
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { contiguousDeskSlots, coveringDeskSlots } from "@/lib/desk-time-range"
import { StationFloorPicker, useDeskStations, useStationLayout, type PickerStation } from "./station-map/station-picker"
import { applyLocalPositions, zoomKey } from "@/lib/station-map-storage"
import { STATION_STATE_LABEL, buildStations, istClockOf } from "@/lib/station-map"
import { deskSubtotal, rateLabel, resolveSessionRate, useDeskCards } from "./desk-rate-card"
import { useFlexQuote, useFlexSettings } from "./booking/flex-start-picker"
import { istClock, istDate } from "@/lib/flex-booking"
import { CUSTOM_STEP_MINUTES, DURATION_CHIPS, chipDurationLabel, deskBill, durationLabel, formatRupees, sessionWindowLabel, slotsForDuration, startChoices } from "@/lib/desk-bill"
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
  SlidersHorizontal,
  QrCode
} from "lucide-react"
import { UpiQrBookingDialog } from "./upi-qr-collect"
import { BOOKING_URL, DASHBOARD_URL } from '@/src/config/env'
import { ConsoleType } from './types'
import MealSelector from './mealSelector'
import { BOOK_CONSOLE_EVENT, takePendingConsoleBooking, type BookConsoleEventDetail } from "@/app/lib/cafe-shortcuts"
import BookingRecords from "./booking-records"
import scheduleStyles from "./schedule-workspace.module.css"
import CreditAccountModal, { type MonthlyCreditAccountSummary } from './credit-account-modal'

type PillColor = "green" | "blue" | "purple" | "yellow" | "red"
type ConsoleFilter = string
type SquadPricingMode = "squad_discount" | "controller_pricing" | "solo_only"

interface SelectedSlot {
  slot_id: number
  date: string
  start_time: string
  end_time: string
  console_id: number
  console_name: string
  console_price: number
  // Undiscounted price from the slot listing. Present when console_price is
  // already the price for this slot's own date and time (offers applied by
  // the booking service), which is what newBooking charges.
  base_price?: number
  available_count: number
}

// ADD THIS NEW INTERFACE
interface ActivePricingEntry {
  available_game_id: number
  console_type: string
  price: number
  is_offer: boolean
  default_price: number
  offer_name?: string
  discount_percentage?: number
}

interface ControllerTierRule {
  quantity: number
  total_price: number
}

interface ControllerPricingConfig {
  base_price: number
  tiers: ControllerTierRule[]
}

const normalizeControllerType = (name: string | undefined): "ps5" | "xbox" | null => {
  const value = (name || "").toLowerCase()
  if (value.includes("ps") || value.includes("playstation")) return "ps5"
  if (value.includes("xbox")) return "xbox"
  return null
}

const resolveConsoleIcon = (iconKey?: string, slugHint?: string) => {
  return resolveCatalogIcon(iconKey, slugHint)
}

const resolveConsoleColor = (slugHint?: string) => {
  return resolveCatalogColor(slugHint)
}

const calculateControllerFare = (config: ControllerPricingConfig, quantity: number): number => {
  if (quantity <= 0) return 0

  const base = Number(config.base_price || 0)
  const tiers = (config.tiers || [])
    .map((tier) => ({
      quantity: Number(tier.quantity || 0),
      total_price: Number(tier.total_price || 0),
    }))
    .filter((tier) => tier.quantity >= 2)
    .sort((a, b) => a.quantity - b.quantity)

  const dp = Array(quantity + 1).fill(Number.POSITIVE_INFINITY)
  dp[0] = 0

  for (let i = 1; i <= quantity; i += 1) {
    dp[i] = Math.min(dp[i], dp[i - 1] + base)
    for (const tier of tiers) {
      if (tier.quantity <= i) {
        dp[i] = Math.min(dp[i], dp[i - tier.quantity] + tier.total_price)
      }
    }
  }

  return Number.isFinite(dp[quantity]) ? Math.round(dp[quantity]) : Math.round(quantity * base)
}


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
import { slotOffer, slotUnitPrice } from "@/lib/slot-price"
import { useTimeFormat } from "@/app/hooks/useTimeFormat"
import { formatClock, formatMinutes } from "@/lib/time-format"
import { TimeField } from "@/app/components/time-field"
import {
  normalizeConsoleSlug as normalizeCatalogSlug,
  resolveConsoleColor as resolveCatalogColor,
  resolveConsoleIcon as resolveCatalogIcon,
  type ConsoleCatalogItem,
} from "./console-catalog"

interface SelectedMeal {
  menu_item_id: number
  name: string
  price: number
  quantity: number
  total: number
  category: string
}

interface UserSuggestion {
  id?: number
  name: string
  email: string
  phone: string
}

interface UserPassOption {
  required_hours?: number
  id: number
  pass_uid: string
  user_id: number
  pass_name: string
  total_hours: number
  remaining_hours: number
  valid_from: string | null
  valid_to: string | null
  is_global: boolean
  vendor_id: number | null
  can_cover_hours: boolean
  hours_shortfall: number
}

interface BookingFieldConfig {
  name: { visible: boolean; required: boolean }
  phone: { visible: boolean; required: boolean }
  email: { visible: boolean; required: boolean }
}

interface SquadPlatformRule {
  enabled: boolean
  max_players: number
  pricing_mode: SquadPricingMode
  console_slug?: string
  display_name?: string
  input_mode?: string
  controller_policy?: string
}

interface SquadMemberInput {
  id: string
  name: string
  phone: string
}

interface SlotBookingFormProps {
  defaultConsoleId?: number | null
  overlayZIndex?: number
  initialCustomer?: { name: string; phone: string; email: string }
  isOpen: boolean
  onClose: () => void
  selectedSlots: SelectedSlot[]
  onRemoveSelectedSlot: (slot: SelectedSlot) => void
  onReplaceSlots?: (slots: SelectedSlot[]) => void
  onSlotSelect: (slot: SelectedSlot) => void
  allSlots: { [key: string]: any[] }
  onBookingComplete: (result?: any) => void
  availableConsoles: ConsoleType[]
  preset?: BookingPreset | null
}

/** Station map: open the form on one station, optionally prefilled (extend). */
export type BookingPreset = {
  stationId: number
  startClock?: string
  durationMin?: number
  customer?: { name: string; phone: string; email: string }
  extendsBookingId?: number
}

const resolveSafeConsoleIcon = (iconCandidate: unknown, slugHint?: string) => {
  if (typeof iconCandidate === "function") return iconCandidate as any
  return resolveConsoleIcon(undefined, slugHint)
}

const sanitizeConsoleEntry = (entry: any): ConsoleType => {
  const slug = normalizeConsoleSlugLikeBackend(entry?.type || entry?.slug || entry?.name || "pc") || "pc"
  const name = String(entry?.name || entry?.display_name || slug).trim()
  const price = Number(entry?.price || 0)
  return {
    type: slug,
    name,
    id: Number(entry?.id) || null,
    price: Number.isFinite(price) ? price : 0,
    icon: resolveSafeConsoleIcon(entry?.icon, slug),
    iconColor: String(entry?.iconColor || resolveConsoleColor(slug)),
    color: "grey",
    description: String(entry?.description || `${name} Console`),
  }
}

// ============= OPTIMIZATION 1: Request Cache =============
const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 120 * 1000 // 2 minutes for booking freshness
const SNAPSHOT_TTL = 5 * 60 * 1000 // 5 minutes persistent snapshot for fast reload
const IST_TIMEZONE = "Asia/Kolkata"

const decodeVendorIdFromStorage = (): number | null => {
  if (typeof window === "undefined") return null
  const token = localStorage.getItem("jwtToken")
  if (!token) return null
  try {
    const decoded = jwtDecode<{ sub?: { id?: number } | string }>(token)
    if (typeof decoded.sub === "object" && decoded.sub?.id) {
      return Number(decoded.sub.id)
    }
    if (typeof decoded.sub === "string") {
      const fromSub = Number(decoded.sub)
      return Number.isFinite(fromSub) ? fromSub : null
    }
    return null
  } catch {
    return null
  }
}

const getISTDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const day = parts.find((p) => p.type === "day")?.value ?? "01"
  const month = parts.find((p) => p.type === "month")?.value ?? "01"
  const year = parts.find((p) => p.type === "year")?.value ?? "1970"
  return { year, month, day }
}

const getISTDateString = (offsetDays = 0): string => {
  const shifted = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  const { year, month, day } = getISTDateParts(shifted)
  return `${year}-${month}-${day}`
}

const normalizeBookedDate = (raw: string): string => {
  const trimmed = (raw || "").trim()
  if (!trimmed) return ""
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`
  }
  return trimmed
}

const getCurrentISTMinutes = (): number => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date())
  const hours = Number(parts.find((p) => p.type === "hour")?.value ?? "0")
  const minutes = Number(parts.find((p) => p.type === "minute")?.value ?? "0")
  return hours * 60 + minutes
}

const toMinutes = (timeValue: string): number => {
  const parts = String(timeValue || "").split(":")
  if (parts.length < 2) return Number.NaN
  const hours = Number(parts[0])
  const minutes = Number(parts[1])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.NaN
  return hours * 60 + minutes
}

const getSlotEndTimestampIST = (slotDate: string, slotStartTime: string, slotEndTime: string): number => {
  const rawEndTs = new Date(`${slotDate}T${slotEndTime}+05:30`).getTime()
  if (!Number.isFinite(rawEndTs)) return Number.NaN
  const startMinutes = toMinutes(slotStartTime)
  const endMinutes = toMinutes(slotEndTime)
  if (Number.isFinite(startMinutes) && Number.isFinite(endMinutes) && endMinutes <= startMinutes) {
    return rawEndTs + 24 * 60 * 60 * 1000
  }
  return rawEndTs
}

const isPastSlotInIST = (slotDate: string, slotEndTime: string, slotStartTime = "00:00"): boolean => {
  const slotEndTs = getSlotEndTimestampIST(slotDate, slotStartTime, slotEndTime)
  return Number.isFinite(slotEndTs) && Date.now() >= slotEndTs
}

const getISTMonthStartCompact = (): string => {
  const { year, month } = getISTDateParts(new Date())
  return `${year}${month}01`
}

function getCachedData(key: string) {
  const cached = requestCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

function setCachedData(key: string, data: any) {
  requestCache.set(key, { data, timestamp: Date.now() })
}

// ============= OPTIMIZATION 2: Request Deduplication =============
const pendingRequests = new Map<string, Promise<any>>()

async function fetchWithDedup(url: string): Promise<any> {
  const cached = getCachedData(url)
  if (cached) {
    return cached
  }

  if (pendingRequests.has(url)) {
    return pendingRequests.get(url)
  }

  const promise = httpJson<any>(url, {
      timeoutMs: 10_000,
      retries: 2,
      dedupe: true,
      dedupeKey: `GET:${url}`,
    })
    .then(data => {
      setCachedData(url, data)
      pendingRequests.delete(url)
      return data
    })
    .catch(err => {
      pendingRequests.delete(url)
      throw err
    })

  pendingRequests.set(url, promise)
  return promise
}

// ============= OPTIMIZATION 3: Batch API Call =============
async function fetchSlotsBatch(vendorId: number, gameIds: number[], dates: string[], forceFresh = false) {
  const url = `${BOOKING_URL}/api/getSlotsBatch/vendor/${vendorId}${forceFresh ? "?refresh=1" : ""}`
  
  const cacheKey = `batch:${vendorId}:${gameIds.join(',')}:${dates.join(',')}`
  const cached = forceFresh ? null : getCachedData(cacheKey)
  if (!forceFresh && cached) {
    return cached
  }
  
  try {
    const data = await httpJson<any>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game_ids: gameIds,
        dates: dates,
      }),
      timeoutMs: 15_000,
      retries: 0,
    })

    setCachedData(cacheKey, data)
    return data
  } catch (error) {
    console.error('❌ Batch fetch error:', error)
    throw error  // ✅ THROW ERROR instead of returning null
  }
}

// Update this constant
const PAYMENT_TYPES = ['Cash', 'UPI', 'Card', 'Monthly Credit', 'pay_at_cafe', 'UPI QR', 'Pass', 'cafe_wallet'] as const
const DEFAULT_SQUAD_PRICING_POLICY_FALLBACK: Record<string, Record<string, number>> = {
  pc: { "2": 0, "3": 3, "4": 5, "5": 8 },
}

const CONSOLE_GROUP_ALIASES: Record<string, string> = {
  pc: "pc",
  computer: "pc",
  gaming_pc: "pc",
  playstation: "ps",
  ps: "ps",
  ps4: "ps",
  ps5: "ps",
  x_box: "xbox",
  xbox: "xbox",
  vr: "vr",
  vr_headset: "vr",
  virtual_reality: "vr",
}

const normalizeConsoleSlugLikeBackend = (raw: string | undefined | null): string => {
  return normalizeCatalogSlug(raw)
}

const toLegacySquadGroup = (rawSlugOrGroup: string | undefined | null): string => {
  const normalized = normalizeConsoleSlugLikeBackend(rawSlugOrGroup)
  return CONSOLE_GROUP_ALIASES[normalized] || normalized
}

const resolveControllerPricingKey = (rawSlugOrGroup: string | undefined | null): "ps5" | "xbox" | null => {
  const normalized = normalizeConsoleSlugLikeBackend(rawSlugOrGroup)
  if (!normalized) return null
  if (["ps", "ps4", "ps5", "playstation"].includes(normalized)) return "ps5"
  if (normalized.includes("xbox")) return "xbox"
  return null
}

const DEFAULT_BOOKING_FIELD_CONFIG: BookingFieldConfig = {
  name: { visible: true, required: true },
  // Walk-ins (e.g. kids) may have no phone or email: name alone is enough.
  phone: { visible: true, required: false },
  email: { visible: true, required: false },
}


export function SlotBookingForm({
  initialCustomer,
  overlayZIndex = 50,
  isOpen, 
  onClose, 
  selectedSlots, 
  onRemoveSelectedSlot,
  onReplaceSlots,
  defaultConsoleId,
  onSlotSelect,
  allSlots,
  onBookingComplete,
  availableConsoles,
  preset = null,
}: SlotBookingFormProps) {
  const { can } = useAccess()
  const { vendorId: settingsVendorId, moduleVersions, consoles: floorConsoles, landingData: floorLanding } = useDashboardData()
  const settingsVersion = moduleVersions[`pricing:${settingsVendorId}`] || 0
  const settingsVendorRef = useRef(settingsVendorId)
  settingsVendorRef.current = settingsVendorId
  const [squadPolicyState, setSquadPolicyState] = useState<"loading" | "ready" | "error">("loading")
  const [squadPolicyVendor, setSquadPolicyVendor] = useState<number | null>(null)
  const api = useApiClient()
  console.log('🎯 SlotBookingForm rendered with:', { 
    isOpen, 
    selectedSlotsCount: selectedSlots.length,
    selectedSlots 
  })

  // "quick": click-only start/duration chips; "slots": pick individual slots (passes, odd gaps).
  const [timeMode, setTimeMode] = useState("quick")
  const [startKey, setStartKey] = useState("now")
  const [customClock, setCustomClock] = useState("")
  const [showOtherTime, setShowOtherTime] = useState(false)
  const [durationMin, setDurationMin] = useState(60)
  const [nowClock, setNowClock] = useState(() => istClock())
  const [stationAuto, setStationAuto] = useState(true)
  const [stationIds, setStationIds] = useState<number[]>([])
  // Station picked on the floor map (or by Extend); kept until staff pick another or Auto-assign.
  const [preferredStation, setPreferredStation] = useState<number | null>(null)
  const [showDiscount, setShowDiscount] = useState(false)
  const [pickerDate, setPickerDate] = useState("")
  const [pickerConsole, setPickerConsole] = useState("")
  // A booking shortcut or console switch changes the default; let it win over an earlier pick.
  useEffect(() => { setPickerConsole("") }, [defaultConsoleId])
  const slotDates = Object.keys(allSlots).sort()
  const activePickerDate = pickerDate || selectedSlots[0]?.date || istDate() || slotDates[0] || ""
  const activePickerConsole = String(pickerConsole || selectedSlots[0]?.console_id || defaultConsoleId || availableConsoles[0]?.id || "")
  const pickerConsoleItem = availableConsoles.find((item) => String(item.id) === activePickerConsole)
  const pickerSlots = (allSlots[activePickerDate] || []).filter((slot: any) =>
    String(slot.console_id) === activePickerConsole && Boolean(slot.is_available) &&
    Number(slot.available_slot) > 0 &&
    !isPastSlotInIST(activePickerDate, slot.end_time, slot.start_time)
  ).sort((a: any, b: any) => String(a.start_time).localeCompare(String(b.start_time)))

  const clock = (value: string) => value.slice(0, 5)
  const { time: showClock } = useTimeFormat()
  const firstTime = selectedSlots[0]?.start_time || pickerSlots[0]?.start_time || ""
  const continuousSlots = (start: string) => contiguousDeskSlots(pickerSlots, start)
  const [typedStart, setTypedStart] = useState("")
  const [typedEnd, setTypedEnd] = useState("")
  const clearTypedTimes = () => { setTypedStart(""); setTypedEnd("") }
  // Each open starts from what was clicked on the grid, else Now for 1 hour.
  const openedRef = useRef(false)
  useEffect(() => {
    if (!isOpen) { openedRef.current = false; return }
    if (openedRef.current) return
    openedRef.current = true
    clearTypedTimes()
    const now = istClock()
    setNowClock(now); setPickerDate(""); setShowOtherTime(false); setStationAuto(true); setStationIds([])
    setShowDiscount(false)
    setPreferredStation(preset?.stationId ?? null)
    if (preset?.stationId) setStationAuto(false)
    if (!selectedSlots.length) {
      setTimeMode("quick"); setDurationMin(preset?.durationMin || 60)
      if (preset?.startClock && preset.startClock > now) { setStartKey("custom"); setCustomClock(preset.startClock) }
      else setStartKey("now")
      return
    }
    const sorted = [...selectedSlots].sort((a, b) => a.start_time.localeCompare(b.start_time))
    const contiguous = sorted.every((slot, i) => !i || sorted[i - 1].end_time === slot.start_time)
    setTimeMode(contiguous ? "quick" : "slots")
    const minutes = sorted.reduce((n, slot) => n + Math.max(0, (getSlotEndTimestampIST(slot.date, slot.start_time, slot.end_time) - new Date(`${slot.date}T${slot.start_time}+05:30`).getTime()) / 60000), 0)
    setDurationMin(Math.max(15, Math.round(minutes)))
    const start = clock(sorted[0].start_time)
    const running = sorted[0].date === istDate() && start <= now && now < clock(sorted[0].end_time)
    if (running) setStartKey("now")
    else { setStartKey("custom"); setCustomClock(start) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])
  const coveringRange = coveringDeskSlots(pickerSlots, typedStart, typedEnd)
  const rangeOptions = continuousSlots(firstTime)
  function selectRange(start: string, count: number) {
    clearTypedTimes()
    const range = continuousSlots(start).slice(0, count)
    if (range.length) onReplaceSlots?.(range.map(slot => ({
      slot_id: slot.slot_id, date: activePickerDate, start_time: slot.start_time,
      end_time: slot.end_time, console_id: Number(activePickerConsole),
      console_name: pickerConsoleItem?.name || pickerConsoleItem?.type || "",
      console_price: slot.single_slot_price ?? pickerConsoleItem?.price ?? 0,
      base_price: slot.base_slot_price ?? undefined,
      available_count: Number(slot.available_slot),
    })))
  }

  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [paymentType, setPaymentType] = useState<string>('Cash')
  useEffect(() => {
    if (isOpen && initialCustomer) {
      setName(initialCustomer.name)
      setPhone(initialCustomer.phone)
      setEmail(initialCustomer.email)
    }
  }, [isOpen, initialCustomer])
  const [passUid, setPassUid] = useState('')
  const [validatedPass, setValidatedPass] = useState<UserPassOption | null>(null)
  const [passError, setPassError] = useState('')
  const [passOptions, setPassOptions] = useState<UserPassOption[]>([])
  const [isLoadingPassOptions, setIsLoadingPassOptions] = useState(false)
  const [passOtpRequestId, setPassOtpRequestId] = useState('')
  const [passOtpCode, setPassOtpCode] = useState('')
  const [passVerificationToken, setPassVerificationToken] = useState('')
  const [passOtpMessage, setPassOtpMessage] = useState('')
  const [isSendingPassOtp, setIsSendingPassOtp] = useState(false)
  const [isVerifyingPassOtp, setIsVerifyingPassOtp] = useState(false)
  const [isSquadMode, setIsSquadMode] = useState<boolean>(false)
  const [squadPlayerCount, setSquadPlayerCount] = useState<number>(2)
  const [squadMembers, setSquadMembers] = useState<SquadMemberInput[]>([])
  const [waiveOffAmount, setWaiveOffAmount] = useState<number>(0)
  const [extraControllerQty, setExtraControllerQty] = useState<number>(0)
  const [extraControllerFare, setExtraControllerFare] = useState<number>(0)

  const [controllerPricingConfig, setControllerPricingConfig] = useState<ControllerPricingConfig>({
    base_price: 0,
    tiers: []
  })
  const [hasControllerPricingConfigured, setHasControllerPricingConfigured] = useState<boolean>(false)
  const [isControllerPricingLoading, setIsControllerPricingLoading] = useState<boolean>(false)
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([])
  const [isMealSelectorOpen, setIsMealSelectorOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const submittingRef = useRef(false)
  const [upiQrBooking, setUpiQrBooking] = useState<{ vendorId: number; bookingIds: number[]; result: any } | null>(null)
  const [submitError, setSubmitError] = useState("")
  const [submissionUncertain, setSubmissionUncertain] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activePricing, setActivePricing] = useState<Record<string, ActivePricingEntry>>({})
  const [squadPricingPolicy, setSquadPricingPolicy] = useState<Record<string, Record<string, number>>>({})
  const [squadPlatformRules, setSquadPlatformRules] = useState<Record<string, SquadPlatformRule>>({})
  const [availableSquadGroups, setAvailableSquadGroups] = useState<string[]>([])




  const [userList, setUserList] = useState<{ id?: number; name: string; email: string; phone: string }[]>([])
  const [emailSuggestions, setEmailSuggestions] = useState<{ id?: number; name: string; email: string; phone: string }[]>([])
  const [phoneSuggestions, setPhoneSuggestions] = useState<{ id?: number; name: string; email: string; phone: string }[]>([])
  const [nameSuggestions, setNameSuggestions] = useState<{ id?: number; name: string; email: string; phone: string }[]>([])
  const [focusedInput, setFocusedInput] = useState<string>('')
  const [bookingFieldConfig, setBookingFieldConfig] = useState<BookingFieldConfig>(DEFAULT_BOOKING_FIELD_CONFIG)
  const [bookingFieldDraft, setBookingFieldDraft] = useState<BookingFieldConfig>(DEFAULT_BOOKING_FIELD_CONFIG)
  const [isFieldConfigOpen, setIsFieldConfigOpen] = useState(false)
  const [isFieldConfigSaving, setIsFieldConfigSaving] = useState(false)
  const [fieldConfigError, setFieldConfigError] = useState("")
  const [isSuggestionLoading, setIsSuggestionLoading] = useState<Record<string, boolean>>({})
  const [focusedSquadMemberId, setFocusedSquadMemberId] = useState<string | null>(null)
  const [squadMemberSuggestions, setSquadMemberSuggestions] = useState<Record<string, UserSuggestion[]>>({})
  const [creditAccount, setCreditAccount] = useState<MonthlyCreditAccountSummary | null>(null)
  const [creditAccountLoading, setCreditAccountLoading] = useState(false)
  const [creditAccountError, setCreditAccountError] = useState('')
  const [showCreditAccountModal, setShowCreditAccountModal] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const blurTimeoutRef = useRef<number | null>(null)
  const suggestionDebounceRef = useRef<number | null>(null)
  const suggestionAbortRef = useRef<AbortController | null>(null)
  const suggestionVersionRef = useRef(0)
  const [suggestionError, setSuggestionError] = useState('')

  useEffect(() => {
    setPortalReady(true)
    return () => setPortalReady(false)
  }, [])




  const getVendorIdFromToken = (): number | null => settingsVendorId

  const sanitizeFieldConfig = (candidate: BookingFieldConfig): BookingFieldConfig => {
    const next: BookingFieldConfig = {
      name: { visible: true, required: true },
      phone: {
        visible: Boolean(candidate?.phone?.visible ?? true),
        required: Boolean(candidate?.phone?.required ?? false),
      },
      email: {
        visible: Boolean(candidate?.email?.visible ?? true),
        required: Boolean(candidate?.email?.required ?? false),
      },
    }

    if (next.phone.required) next.phone.visible = true
    if (next.email.required) next.email.visible = true

    // Staff preference: if email is not compulsory, hide it from booking form.
    if (!next.email.required) {
      next.email.visible = false
    }

    if (!next.phone.visible && !next.email.visible) {
      next.phone.visible = true
    }

    if (!next.phone.visible) next.phone.required = false
    if (!next.email.visible) next.email.required = false

    return next
  }

  const applyFieldDraftChange = (
    field: "phone" | "email",
    key: "visible" | "required",
    value: boolean
  ) => {
    setBookingFieldDraft((prev) => {
      const next: BookingFieldConfig = {
        ...prev,
        name: { visible: true, required: true },
        phone: { ...prev.phone },
        email: { ...prev.email },
      }
      next[field][key] = value
      return sanitizeFieldConfig(next)
    })
  }

  const upsertUsersInCache = (incoming: UserSuggestion[]) => {
    if (!incoming.length) return
    setUserList((prev) => {
      const map = new Map<string, UserSuggestion>()
      prev.forEach((user) => {
        const key = String(user.id ?? `${user.phone || ""}|${user.email || ""}|${user.name || ""}`)
        map.set(key, user)
      })
      incoming.forEach((user) => {
        const key = String(user.id ?? `${user.phone || ""}|${user.email || ""}|${user.name || ""}`)
        map.set(key, user)
      })
      return Array.from(map.values())
    })
  }

  const cancelSuggestionFetch = () => {
    suggestionVersionRef.current += 1
    if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current)
    suggestionDebounceRef.current = null
    suggestionAbortRef.current?.abort()
    suggestionAbortRef.current = null
    setIsSuggestionLoading({})
  }

  const showCachedSuggestions = (
    field: "name" | "phone" | "email" | "all", query: string,
    setter: React.Dispatch<React.SetStateAction<UserSuggestion[]>>
  ) => {
    const prefix = query.trim().toLowerCase()
    const fields: ('name' | 'phone' | 'email')[] = field === 'all' ? ['name', 'phone', 'email'] : [field]
    setter(userList.filter(user => fields.some(key => String(user[key] || '').toLowerCase().startsWith(prefix))).slice(0, 8))
  }

  const fetchUserSuggestions = async (
    field: "name" | "phone" | "email" | "all",
    query: string,
    setter: React.Dispatch<React.SetStateAction<UserSuggestion[]>>
  ) => {
    cancelSuggestionFetch()
    const vendorId = getVendorIdFromToken()
    if (!vendorId) return
    const version = suggestionVersionRef.current
    const controller = new AbortController()
    suggestionAbortRef.current = controller
    showCachedSuggestions(field, query, setter)
    setSuggestionError('')
    setIsSuggestionLoading({ [field]: true })
    try {
      const params = new URLSearchParams({ q: query.trim(), field, limit: "8", booked_only: "true" })
      const data = await api.get<any[]>(
        `${BOOKING_URL}/api/vendor/${vendorId}/users?${params.toString()}`,
        { signal: controller.signal, timeoutMs: 8_000, retries: 0 }
      )
      if (controller.signal.aborted || version !== suggestionVersionRef.current) return
      const rows: UserSuggestion[] = Array.isArray(data) ? data : []
      setter(rows)
      upsertUsersInCache(rows)
    } catch (error: any) {
      if (controller.signal.aborted || version !== suggestionVersionRef.current) return
      console.error("Failed to fetch user suggestions:", error)
      setSuggestionError('Customer search could not connect. Please retry.')
    } finally {
      if (version === suggestionVersionRef.current) setIsSuggestionLoading({})
    }
  }

  const scheduleSuggestionFetch = (
    field: "name" | "phone" | "email" | "all",
    query: string,
    setter: React.Dispatch<React.SetStateAction<UserSuggestion[]>>
  ) => {
    // Invalidate the previous request immediately, including during debounce.
    cancelSuggestionFetch()
    setSuggestionError('')
    showCachedSuggestions(field, query, setter)
    suggestionDebounceRef.current = window.setTimeout(() => {
      void fetchUserSuggestions(field, query, setter)
    }, 180)
  }

  const loadVendorFieldConfig = async () => {
    const vendorId = getVendorIdFromToken()
    if (!vendorId) return
    try {
      const data = await getBookingSettings<any>(`${BOOKING_URL}/api/vendor/${vendorId}/booking-field-config`, settingsVersion)
      if (settingsVendorRef.current !== vendorId) return
      const remoteConfig = sanitizeFieldConfig(
        (data?.config as BookingFieldConfig) || DEFAULT_BOOKING_FIELD_CONFIG
      )
      setBookingFieldConfig(remoteConfig)
      setBookingFieldDraft(remoteConfig)
      setFieldConfigError("")
    } catch (error) {
      if (settingsVendorRef.current !== vendorId) return
      console.error("❌ Failed to load booking field config:", error)
      setBookingFieldConfig(DEFAULT_BOOKING_FIELD_CONFIG)
      setBookingFieldDraft(DEFAULT_BOOKING_FIELD_CONFIG)
    }
  }

  const saveVendorFieldConfig = async () => {
    const vendorId = getVendorIdFromToken()
    if (!vendorId) return
    setIsFieldConfigSaving(true)
    setFieldConfigError("")
    const normalized = sanitizeFieldConfig(bookingFieldDraft)
    try {
      const data = await api.put<any, string>(
        `${BOOKING_URL}/api/vendor/${vendorId}/booking-field-config`,
        JSON.stringify({
          show_phone: normalized.phone.visible,
          require_phone: normalized.phone.required,
          show_email: normalized.email.visible,
          require_email: normalized.email.required,
        }),
        {
          headers: { "Content-Type": "application/json" },
          timeoutMs: 10_000,
          retries: 0,
        }
      )
      if (data?.success === false) {
        throw new Error(data?.message || "Failed to save field settings")
      }
      clearHttpClientCache(`/api/vendor/${vendorId}/booking-field-config`)
      const savedConfig = sanitizeFieldConfig(
        (data?.config as BookingFieldConfig) || normalized
      )
      setBookingFieldConfig(savedConfig)
      setBookingFieldDraft(savedConfig)

      if (!savedConfig.email.visible) {
        setEmail("")
        setEmailSuggestions([])
      }
      if (!savedConfig.phone.visible) {
        setPhone("")
        setPhoneSuggestions([])
      }
      setIsFieldConfigOpen(false)
    } catch (error: any) {
      setFieldConfigError(error?.message || "Failed to save field settings")
    } finally {
      setIsFieldConfigSaving(false)
    }
  }



  const resetPassFlow = () => {
    setPassUid("")
    setValidatedPass(null)
    setPassOptions([])
    setPassError("")
    setPassOtpRequestId("")
    setPassOtpCode("")
    setPassVerificationToken("")
    setPassOtpMessage("")
  }

  // Closing the form (cancel, X, or after Confirm) clears the gamer and extras,
  // so the next booking starts clean. Time and station are reset on open.
  useEffect(() => {
    if (isOpen) return
    setName(""); setEmail(""); setPhone("")
    setPhoneSuggestions([]); setNameSuggestions([]); setEmailSuggestions([]); setFocusedInput(""); setSuggestionError("")
    setIsSquadMode(false); setSquadPlayerCount(2); setSquadMembers([]); setSquadMemberSuggestions({}); setFocusedSquadMemberId(null)
    setSelectedMeals([]); setWaiveOffAmount(0); setExtraControllerQty(0)
    setCreditAccount(null); setCreditAccountError(""); setShowCreditAccountModal(false)
    resetPassFlow()
    setPaymentType("Cash")
    setErrors({}); setSubmitError("")
    setStationIds([]); setStationAuto(true); setPreferredStation(null); setPickerConsole("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const fetchValidPassOptions = async (userId: number) => {
    const vendorId = getVendorIdFromToken()
    if (!vendorId || !userId) return

    setIsLoadingPassOptions(true)
    setPassError("")
    setPassOtpMessage("")
    setPassVerificationToken("")
    setPassOtpRequestId("")
    setPassOtpCode("")

    try {
      const params = new URLSearchParams({
        vendor_id: String(vendorId),
        user_id: String(userId),
        slot_ids: selectedSlots.map(slot => slot.slot_id).join(","),
      })
      const data = await api.get<any>(`${BOOKING_URL}/api/pass/dashboard/valid-options?${params.toString()}`, {
        headers: creditAuthHeaders(),
        timeoutMs: 10_000,
        retries: 1,
      })
      if (data?.success === false) {
        throw new Error(data?.message || "Failed to fetch valid passes")
      }
      const options: UserPassOption[] = Array.isArray(data?.passes) ? data.passes : []
      setPassOptions(options)
      if (!options.length) {
        setPassUid("")
        setValidatedPass(null)
        setPassError("No valid pass available for this user at this cafe")
        return
      }
      const selected =
        options.find((row) => row.pass_uid === passUid) ??
        options.find((row) => row.can_cover_hours) ??
        options[0]
      setPassUid(selected.pass_uid)
      setValidatedPass(selected)
      if (!selected.can_cover_hours) {
        setPassError(
          `Selected pass has insufficient hours. Need ${Number(selected.required_hours || 0).toFixed(2)}h, short by ${selected.hours_shortfall.toFixed(1)}h.`
        )
      } else {
        setPassError("")
      }
    } catch (error: any) {
      setPassOptions([])
      setValidatedPass(null)
      setPassError(error?.message || "Failed to fetch valid passes")
    } finally {
      setIsLoadingPassOptions(false)
    }
  }

  const sendPassOtp = async () => {
    const vendorId = getVendorIdFromToken()
    const userId = matchedPrimaryUser?.id
    if (!vendorId || !userId || !validatedPass?.pass_uid) return

    setIsSendingPassOtp(true)
    setPassOtpMessage("")
    setPassError("")
    try {
      const data = await api.post<any, string>(
        `${BOOKING_URL}/api/pass/dashboard/otp/send`,
        JSON.stringify({
          vendor_id: vendorId,
          user_id: userId,
          pass_uid: validatedPass.pass_uid,
        }),
        {
          headers: creditAuthHeaders(),
          timeoutMs: 10_000,
          retries: 0,
        }
      )
      if (data?.success === false) {
        throw new Error(data?.message || "Failed to send OTP")
      }
      setPassOtpRequestId(data.otp_request_id || "")
      setPassVerificationToken("")
      setPassOtpMessage(`OTP sent to ${data.masked_email || "registered email"} and app notification.`)
    } catch (error: any) {
      setPassOtpMessage("")
      setPassError(error?.message || "Failed to send pass OTP")
    } finally {
      setIsSendingPassOtp(false)
    }
  }

  const verifyPassOtp = async () => {
    if (!passOtpRequestId || !passOtpCode.trim()) {
      setPassError("Enter OTP to verify pass usage")
      return
    }
    setIsVerifyingPassOtp(true)
    setPassError("")
    try {
      const data = await api.post<any, string>(
        `${BOOKING_URL}/api/pass/dashboard/otp/verify`,
        JSON.stringify({
          otp_request_id: passOtpRequestId,
          otp: passOtpCode.trim(),
        }),
        {
          headers: creditAuthHeaders(),
          timeoutMs: 10_000,
          retries: 0,
        }
      )
      if (data?.success === false) {
        throw new Error(data?.message || "Invalid OTP")
      }
      setPassVerificationToken(String(data.pass_verification_token || ""))
      setPassOtpMessage("OTP verified. Pass is ready to use for booking.")
    } catch (error: any) {
      setPassVerificationToken("")
      setPassError(error?.message || "Failed to verify OTP")
    } finally {
      setIsVerifyingPassOtp(false)
    }
  }

  const handlePassSelectionChange = (selectedUid: string) => {
    setPassUid(selectedUid)
    const selected = passOptions.find((row) => row.pass_uid === selectedUid) || null
    setValidatedPass(selected)
    setPassVerificationToken("")
    setPassOtpCode("")
    setPassOtpRequestId("")
    setPassOtpMessage("")
    if (!selected) {
      setPassError("Select a valid pass")
      return
    }
    if (!selected.can_cover_hours) {
      setPassError(
        `Selected pass has insufficient hours. Shortfall ${selected.hours_shortfall.toFixed(1)}h.`
      )
    } else {
      setPassError("")
    }
  }



  useEffect(() => {
    if (!isOpen) return
    if (!submittingRef.current) {
      setSubmitError("")
      setSubmissionUncertain(false)
    }
  }, [isOpen])

  useEffect(() => {
    setSquadPolicyState("loading")
    setSquadPolicyVendor(null)
    setSquadPlatformRules({})
    setActivePricing({})
    setHasControllerPricingConfigured(false)
    setBookingFieldConfig(DEFAULT_BOOKING_FIELD_CONFIG)
  }, [settingsVendorId])

  // Warm setup before opening the form; reopens normally hit the shared cache.
  useEffect(() => {
    if (!settingsVendorId) return
    void loadVendorFieldConfig()
  }, [settingsVendorId, settingsVersion, isOpen])

  useEffect(() => {
    if (isOpen) return
    resetPassFlow()
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (suggestionDebounceRef.current) {
        clearTimeout(suggestionDebounceRef.current)
      }
      if (suggestionAbortRef.current) {
        suggestionAbortRef.current.abort()
      }
    }
  }, [])


// ADD THIS ENTIRE BLOCK
useEffect(() => {
  const vendorId = settingsVendorId
  if (!vendorId) return
  let cancelled = false

  const fetchActivePricing = async () => {
    try {
      const data = await getBookingSettings<any>(`${DASHBOARD_URL}/api/vendor/${vendorId}/active-pricing`, settingsVersion)
      if (cancelled) return
      if (data.success) {
        setActivePricing(data.pricing)
      }
    } catch (err) {
      console.error('❌ Failed to fetch active pricing:', err)
    }
  }

  const fetchSquadPricingPolicy = async () => {
    try {
      const data = await getBookingSettings<any>(`${BOOKING_URL}/api/vendor/${vendorId}/squad-pricing-policy`, settingsVersion)
      if (cancelled) return
      if (data?.success && data?.policy) {
        setSquadPolicyState("ready")
        setSquadPolicyVendor(vendorId)
        const nextPolicy: Record<string, Record<string, number>> = {}
        Object.entries(data.policy as Record<string, Record<string, number>>).forEach(([group, grid]) => {
          const normalizedGroup = toLegacySquadGroup(group)
          nextPolicy[normalizedGroup] = Object.entries(grid || {}).reduce((acc, [k, v]) => {
            const playerCount = Number(k)
            const discount = Number(v)
            if (!Number.isNaN(playerCount) && !Number.isNaN(discount)) {
              acc[String(playerCount)] = discount
            }
            return acc
          }, {} as Record<string, number>)
        })
        setSquadPricingPolicy(nextPolicy)

        const incomingRules = (data?.platform_rules || {}) as Record<string, SquadPlatformRule>
        const nextRules: Record<string, SquadPlatformRule> = {}
        Object.entries(incomingRules).forEach(([group, rule]) => {
          const normalizedGroup = toLegacySquadGroup(group)
          nextRules[normalizedGroup] = {
            enabled: Boolean(rule?.enabled),
            max_players: Number(rule?.max_players || 1),
            pricing_mode: (rule?.pricing_mode || "solo_only") as SquadPricingMode,
            console_slug: String(rule?.console_slug || ""),
            display_name: String(rule?.display_name || normalizedGroup),
            input_mode: String(rule?.input_mode || ""),
            controller_policy: String(rule?.controller_policy || ""),
          }
        })
        setSquadPlatformRules(nextRules)

        const groupsFromApi = Array.isArray(data?.available_console_groups)
          ? data.available_console_groups.map((group: string) => toLegacySquadGroup(group))
          : Object.keys(nextRules)
        setAvailableSquadGroups(Array.from(new Set(groupsFromApi)))
      } else {
        setSquadPolicyState("error")
        setSquadPricingPolicy(DEFAULT_SQUAD_PRICING_POLICY_FALLBACK)
        setSquadPlatformRules({})
        setAvailableSquadGroups(Object.keys(DEFAULT_SQUAD_PRICING_POLICY_FALLBACK))
      }
    } catch (err) {
      if (cancelled) return
      setSquadPolicyState("error")
      console.error('❌ Failed to fetch squad pricing policy:', err)
      setSquadPricingPolicy(DEFAULT_SQUAD_PRICING_POLICY_FALLBACK)
      setSquadPlatformRules({})
      setAvailableSquadGroups(Object.keys(DEFAULT_SQUAD_PRICING_POLICY_FALLBACK))
    }
  }

  fetchActivePricing()
  fetchSquadPricingPolicy()
  // This endpoint contains all controller types, so selection need not fetch it.
  void getBookingSettings(`${DASHBOARD_URL}/api/vendor/${vendorId}/controller-pricing`, settingsVersion).catch(() => {})
  return () => { cancelled = true }
}, [settingsVendorId, settingsVersion, isOpen])


  useEffect(() => {
    cancelSuggestionFetch()
    setUserList([])
    setNameSuggestions([])
    setPhoneSuggestions([])
    setEmailSuggestions([])
    setSquadMemberSuggestions({})
    setFocusedSquadMemberId(null)
    setSuggestionError('')
    setFocusedInput('')
    if (!isOpen || !settingsVendorId) return

    // Warm a bounded set; never download every customer on modal open.
    const controller = new AbortController()
    let active = true
    void api.get<UserSuggestion[]>(
      `${BOOKING_URL}/api/vendor/${settingsVendorId}/users?booked_only=true&limit=8`,
      { signal: controller.signal, timeoutMs: 8_000, retries: 0 }
    ).then(rows => {
      if (active && Array.isArray(rows)) upsertUsersInCache(rows)
    }).catch(() => { /* Field searches have their own visible retry state. */ })
    return () => {
      active = false
      controller.abort()
      cancelSuggestionFetch()
    }
  }, [isOpen, settingsVendorId])

  const handleEmailInputChange = (value: string) => {
    setEmail(value)
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: "" }))
    }
    setFocusedInput('email')
    scheduleSuggestionFetch('email', value, setEmailSuggestions)
  }

  const handlePhoneInputChange = (value: string) => {
    setPhone(value)
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: "" }))
    }
    setFocusedInput('phone')
    scheduleSuggestionFetch('phone', value, setPhoneSuggestions)
  }

  const handleNameInputChange = (value: string) => {
    setName(value)
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: "" }))
    }
    setFocusedInput('name')
    scheduleSuggestionFetch('name', value, setNameSuggestions)
  }

  const handleEmailFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setFocusedInput("email")
    fetchUserSuggestions("email", email, setEmailSuggestions)
  }

  const handlePhoneFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setFocusedInput("phone")
    fetchUserSuggestions("phone", phone, setPhoneSuggestions)
  }

  const handleNameFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setFocusedInput("name")
    fetchUserSuggestions("name", name, setNameSuggestions)
  }

  const handleBlur = () => {
    blurTimeoutRef.current = window.setTimeout(() => {
      cancelSuggestionFetch()
      setFocusedInput("")
      setEmailSuggestions([])
      setPhoneSuggestions([])
      setNameSuggestions([])
      blurTimeoutRef.current = null
    }, 150)
  }

  const handleSuggestionClick = (user: UserSuggestion) => {
    cancelSuggestionFetch()
    setSuggestionError('')
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setEmail(user.email || "")
    setPhone(user.phone || "")
    setName(user.name || "")
    upsertUsersInCache([user])
    setEmailSuggestions([])
    setPhoneSuggestions([])
    setNameSuggestions([])
    setFocusedInput("")
  }

  const matchedPrimaryUser = useMemo(() => {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPhone = phone.trim()
    const normalizedName = name.trim().toLowerCase()
    return userList.find((user) => {
      const byEmail = normalizedEmail && user.email?.trim().toLowerCase() === normalizedEmail
      const byPhone = normalizedPhone && user.phone?.trim() === normalizedPhone
      const byName = normalizedName && user.name?.trim().toLowerCase() === normalizedName
      return Boolean(byEmail || byPhone || (byName && (normalizedEmail || normalizedPhone)))
    }) || null
  }, [userList, email, phone, name])

  const availableCreditAmount = useMemo(() => {
    if (!creditAccount) return 0
    return Math.max(Number(creditAccount.credit_limit || 0) - Number(creditAccount.outstanding_amount || 0), 0)
  }, [creditAccount])

  useEffect(() => {
    if (!isOpen || paymentType !== "Pass") return
    if (!matchedPrimaryUser?.id) {
      resetPassFlow()
      setPassError("Select an existing user to use pass payment")
      return
    }
    fetchValidPassOptions(Number(matchedPrimaryUser.id))
  }, [isOpen, paymentType, matchedPrimaryUser?.id, selectedSlots.length])

  useEffect(() => {
    if (!isOpen || paymentType !== 'Monthly Credit') return
    if (!matchedPrimaryUser?.id) { setCreditAccount(null); return }

    const vendorId = getVendorIdFromToken()
    if (!vendorId) return

    let cancelled = false
    const loadCreditAccount = async () => {
      setCreditAccountLoading(true)
      setCreditAccountError('')
      try {
        const data = await api.get<any>(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/eligibility/${matchedPrimaryUser.id}`, {
          headers: creditAuthHeaders(),
          timeoutMs: 10_000,
          retries: 1,
        })
        const accounts = Array.isArray(data?.accounts) ? data.accounts : []
        const matchedAccount = matchedPrimaryUser?.id
          ? accounts.find((row: any) => Number(row.user_id) === Number(matchedPrimaryUser.id))
          : null
        if (!cancelled) {
          setCreditAccount(matchedAccount || null)
        }
      } catch (error: any) {
        if (!cancelled) {
          setCreditAccount(null)
          setCreditAccountError(error?.message || 'Unable to load monthly credit accounts')
        }
      } finally {
        if (!cancelled) setCreditAccountLoading(false)
      }
    }

    loadCreditAccount()
    return () => {
      cancelled = true
    }
  }, [isOpen, paymentType, matchedPrimaryUser?.id])

  const handleMealSelectorConfirm = (meals: SelectedMeal[]) => {
    setSelectedMeals(meals)
    setIsMealSelectorOpen(false)
  }

  // ADD THIS HELPER
// The slot's own date/time price (see lib/slot-price.ts), not whatever offer is on right now.
const getEffectivePrice = (slot: SelectedSlot): number => slotUnitPrice(slot, activePricing)


  const handleMealSelectorClose = () => {
    setIsMealSelectorOpen(false)
  }

  const selectedConsoleName = (selectedSlots[0]?.console_name || pickerConsoleItem?.name || '').toLowerCase()
  const selectedConsoleSlug = normalizeConsoleSlugLikeBackend(selectedSlots[0]?.console_name || pickerConsoleItem?.name || "")
  const preferredSquadGroup = toLegacySquadGroup(selectedConsoleSlug || selectedConsoleName)
  const squadConsoleGroup = useMemo(() => {
    const knownRuleKeys = Object.keys(squadPlatformRules || {})
    if (knownRuleKeys.length === 0) return preferredSquadGroup || "pc"
    if (preferredSquadGroup && squadPlatformRules[preferredSquadGroup]) return preferredSquadGroup
    if (selectedConsoleSlug && squadPlatformRules[selectedConsoleSlug]) return selectedConsoleSlug
    const bySlugMatch = knownRuleKeys.find((group) => {
      const ruleSlug = normalizeConsoleSlugLikeBackend(squadPlatformRules[group]?.console_slug || "")
      return Boolean(ruleSlug) && ruleSlug === selectedConsoleSlug
    })
    if (bySlugMatch) return bySlugMatch
    return preferredSquadGroup || selectedConsoleSlug
  }, [availableSquadGroups, preferredSquadGroup, selectedConsoleSlug, squadPlatformRules])
  const squadPlatformRule = squadPlatformRules[squadConsoleGroup] || {
    enabled: false,
    max_players: 1,
    pricing_mode: "solo_only" as SquadPricingMode,
    console_slug: selectedConsoleSlug,
    display_name: selectedSlots[0]?.console_name || squadConsoleGroup,
    input_mode: "",
    controller_policy: "",
  }
  const selectedControllerType = (
    resolveControllerPricingKey(squadConsoleGroup)
    || resolveControllerPricingKey(squadPlatformRule.console_slug)
    || normalizeControllerType(selectedSlots[0]?.console_name)
  )
  const { cards: deskCards, error: deskRateError, loading: deskRatesLoading } = useDeskCards(isOpen ? settingsVendorId : null)
  const [deskChoice, setDeskChoice] = useState("")
  const [pricingGame, setPricingGame] = useState("")
  // Custom start ("any minute"): only offered once the cafe turns it on in Settings > Session Timing.
  const flexSettings = useFlexSettings(isOpen ? settingsVendorId : null)

  // Custom-start cafes book exactly the minutes asked for; passes still use slot times.
  const flexMode = timeMode === "quick" && flexSettings.flex_enabled && !!onReplaceSlots && paymentType !== "Pass"
  // Extend from the station map: only while the start still sits on the booking's end.
  const extensionOf = preset?.extendsBookingId && preset.startClock && startKey === "custom" && customClock === preset.startClock
    && Number(activePickerConsole) && preferredStation === preset.stationId ? preset.extendsBookingId : null
  const choices = startChoices(nowClock, pickerSlots.map((slot: any) => slot.start_time), flexMode)
  const startClock = startKey === "custom" ? customClock : (choices.find(choice => choice.key === startKey) || choices[0])?.clock || ""
  // +15m/+30m late at night roll into the next day.
  const startDate = flexMode && activePickerDate === istDate() && startClock && startClock < nowClock && startKey !== "custom"
    ? new Date(new Date(`${activePickerDate}T12:00:00+05:30`).getTime() + 86400000).toISOString().slice(0, 10)
    : activePickerDate
  const deviceCards = deskCards.filter(card => card.game_id === Number(activePickerConsole) && card.is_active !== false && !card.archived && (card.pricing_mode !== "slot" || !!card.definition.game_variant?.trim()))
  useEffect(() => { setDeskChoice(""); setPricingGame("") }, [activePickerConsole, settingsVendorId, isOpen])
  const variantPricingRequired = deskCards.some(card => card.game_id === Number(activePickerConsole) && card.pricing_mode === "variants") || (!!pricingGame && deviceCards.some(card => card.definition.game_variant === pricingGame))
  const slotMinutes = (slot: SelectedSlot) => {
    const start = new Date(slot.date + "T" + slot.start_time + "+05:30").getTime()
    return (getSlotEndTimestampIST(slot.date, slot.start_time, slot.end_time) - start) / 60000
  }
  const sessionMinutes = flexMode ? durationMin : selectedSlots.reduce((n, slot) => n + slotMinutes(slot), 0)
  const { eligible: matchingDeskCards, card: deskCard } = resolveSessionRate(deviceCards, sessionMinutes, isSquadMode ? squadPlayerCount : 1, deskChoice, pricingGame)
  const effectiveDeskChoice = deskCard?.profile || ""
  const controllersIncluded = !!deskCard?.definition.controllers_included
  const supportsExtraController = !controllersIncluded && selectedControllerType !== null && hasControllerPricingConfigured
  const bookingFlowMode: "solo" | "squad" = isSquadMode ? "squad" : "solo"
  const { quote: flexQuote, problem: flexProblem, loading: flexLoading } = useFlexQuote({
    enabled: isOpen && flexMode, vendor: settingsVendorId, gameId: Number(activePickerConsole), date: startDate,
    clock: startClock, minutes: durationMin, players: isSquadMode ? squadPlayerCount : 1, squad: isSquadMode,
    deskProfile: deskCard?.profile, deskRevision: deskCard?.revision, pricingGame,
    extendsBookingId: extensionOf,
  })
  const flexUnits = flexQuote?.units || 1
  // Station now or at start: "Auto-assign" leaves it to the server (now) or to the start dialog (later).
  const flexConsoleIds = !stationAuto && stationIds.length === flexUnits ? stationIds : null
  const flexActive = flexMode && !!flexQuote && flexQuote.available !== false && (stationAuto || !!flexConsoleIds)
  // Rate-card desks (not custom start): stations free for the whole of the held slots.
  const deskQuantity = isSquadMode && squadConsoleGroup === "pc" ? squadPlayerCount : 1
  const deskStations = useDeskStations({
    vendor: settingsVendorId, game: Number(activePickerConsole), profile: deskCard?.profile,
    date: selectedSlots[0] ? normalizeBookedDate(selectedSlots[0].date) : "", slotIds: selectedSlots.map(slot => slot.slot_id),
    enabled: isOpen && !!deskCard && !flexMode,
  })
  const deskConsoleIds = !stationAuto && stationIds.length === deskQuantity ? stationIds : null
  const stationNeed = flexMode ? flexUnits : deskQuantity
  const stationSource: "flex" | "desk" | null = flexMode ? "flex" : deskCard ? "desk" : null
  const stationLoading = stationSource === "flex" ? flexLoading : stationSource === "desk" ? deskStations.loading : false
  const floorLayout = useStationLayout(settingsVendorId, isOpen)
  const floorStations = useMemo(() => isOpen ? applyLocalPositions(buildStations(floorConsoles, floorLanding, Date.now()), floorLayout.local) : [],
    // Live states only need to be fresh when the form opens or data arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, floorConsoles, floorLanding, floorLayout.local])
  const pickerStations: PickerStation[] = useMemo(() => {
    const gameId = Number(activePickerConsole)
    const slug = pickerConsoleItem?.type || ""
    const flexRows = stationSource === "flex" ? (flexQuote?.stations || flexProblem?.stations || []) : []
    const deskIds = new Set(stationSource === "desk" ? deskStations.rows.map(row => row.id) : [])
    const flexById = new Map(flexRows.map(row => [row.console_id, row]))
    const ids = new Set<number>([
      ...floorStations.filter(st => st.gameId === gameId || (!!slug && st.type === slug)).map(st => st.id),
      ...flexRows.map(row => row.console_id), ...deskIds,
    ])
    return Array.from(ids).map(id => {
      const st = floorStations.find(item => item.id === id)
      const flexRow = flexById.get(id)
      const available = stationSource === "flex" ? !!flexRow?.available : stationSource === "desk" ? deskIds.has(id) : false
      const liveState = st?.state && st.state !== "free" ? st.state : "booked"
      const reason = !stationSource ? "Stations are assigned when the session starts"
        : st?.state === "offline" ? "Offline / maintenance"
        : flexRow && !flexRow.available ? (flexRow.max_minutes_available > 0 && flexRow.next_busy_at ? `Busy from ${showClock(String(flexRow.next_busy_at).slice(11, 16))}` : "Busy for this time")
        : (st?.state === "busy" || st?.state === "ending") && st.end ? `In session until ${showClock(istClockOf(st.end))}`
        : "Booked for this time"
      const caption = !stationSource ? STATION_STATE_LABEL[st?.state || "free"]
        : (st?.state === "busy" || st?.state === "ending") && st.end ? `Till ${showClock(istClockOf(st.end))}`
        : st?.state === "offline" ? "Offline" : "Booked"
      return {
        id, code: st?.code || flexRow?.name || deskStations.rows.find(row => row.id === id)?.name || `#${id}`,
        fullName: st?.fullName || flexRow?.name || deskStations.rows.find(row => row.id === id)?.name || `Station ${id}`,
        icon: st?.icon || "", type: st?.type || slug, typeName: st?.typeName || pickerConsoleItem?.name || "",
        number: st?.number ?? null, mapX: st?.mapX ?? null, mapY: st?.mapY ?? null,
        available, state: available ? "free" : !stationSource ? (st?.state || "free") : liveState, reason, caption,
      }
    })
  }, [activePickerConsole, pickerConsoleItem, stationSource, flexQuote, flexProblem, deskStations.rows, floorStations, showClock])
  const stationAvailableKey = pickerStations.filter(st => st.available).map(st => st.id).join(",")
  // Drop picks that stopped being free; re-pick the station chosen on the floor map when it is free.
  useEffect(() => {
    if (!isOpen || stationLoading || !stationSource) return
    const free = new Set(pickerStations.filter(st => st.available).map(st => st.id))
    setStationIds(ids => {
      const kept = ids.filter(id => free.has(id))
      if (kept.length === 0 && preferredStation && free.has(preferredStation)) return [preferredStation]
      return kept.length === ids.length ? ids : kept
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stationLoading, stationSource, stationAvailableKey, preferredStation])
  const toggleStation = (id: number) => {
    setPreferredStation(null)
    setStationAuto(false)
    setStationIds(ids => stationNeed === 1 ? [id] : ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id].slice(-stationNeed))
  }
  const preferredMissing = !!preferredStation && !stationAuto && stationIds.length === 0 && !stationLoading && !!stationSource
    && !pickerStations.some(st => st.id === preferredStation && st.available)
  const sameSlots = (next: SelectedSlot[]) => next.length === selectedSlots.length &&
    next.every((slot, i) => slot.slot_id === selectedSlots[i]?.slot_id && slot.date === selectedSlots[i]?.date && Number(slot.console_id) === Number(selectedSlots[i]?.console_id))
  useEffect(() => { setStationIds([]) }, [activePickerConsole, startClock, durationMin, flexUnits])
  // Keep the selected slots (what the booking holds) in step with the chips.
  useEffect(() => {
    if (!isOpen || !flexMode || !onReplaceSlots || flexLoading) return
    const next: SelectedSlot[] = flexQuote ? flexQuote.blocked_slots.map(slot => ({
      slot_id: slot.slot_id, date: slot.date, start_time: `${slot.start_time}:00`, end_time: `${slot.end_time}:00`,
      console_id: Number(activePickerConsole), console_name: pickerConsoleItem?.name || pickerConsoleItem?.type || "",
      console_price: pickerConsoleItem?.price ?? 0, available_count: Number(slot.available_slot),
    })) : []
    if (!sameSlots(next)) onReplaceSlots(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, flexMode, flexQuote, flexLoading])
  const slotKey = pickerSlots.map((slot: any) => `${slot.slot_id}:${slot.available_slot}`).join(",")
  useEffect(() => {
    if (!isOpen || flexMode || timeMode !== "quick" || !onReplaceSlots) return
    const first = pickerSlots.find((slot: any) => clock(slot.start_time) === startClock)
      || pickerSlots.find((slot: any) => clock(slot.start_time) <= startClock && (startClock < clock(slot.end_time) || clock(slot.end_time) <= clock(slot.start_time)))
    const length = first ? Math.max(1, (getSlotEndTimestampIST(activePickerDate, first.start_time, first.end_time) - new Date(`${activePickerDate}T${first.start_time}+05:30`).getTime()) / 60000) : 30
    const range = first ? continuousSlots(first.start_time).slice(0, slotsForDuration(durationMin, length)) : []
    const next: SelectedSlot[] = range.map((slot: any) => ({
      slot_id: slot.slot_id, date: activePickerDate, start_time: slot.start_time, end_time: slot.end_time,
      console_id: Number(activePickerConsole), console_name: pickerConsoleItem?.name || pickerConsoleItem?.type || "",
      console_price: slot.single_slot_price ?? pickerConsoleItem?.price ?? 0, base_price: slot.base_slot_price ?? undefined,
      available_count: Number(slot.available_slot),
    }))
    if (!sameSlots(next)) onReplaceSlots(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, flexMode, timeMode, startClock, durationMin, activePickerConsole, activePickerDate, slotKey])
  const selectedMinutes = selectedSlots.reduce((n, slot) => n + slotMinutes(slot), 0)
  const slotShortfall = !flexMode && timeMode === "quick" && selectedSlots.length > 0 && selectedMinutes + 1 < durationMin
  const squadSupported = squadPolicyVendor === settingsVendorId && squadPolicyState === "ready" && Boolean(squadPlatformRule.enabled)
  const squadUsesDiscountEngine = squadPlatformRule.pricing_mode === "squad_discount"
  const squadPolicyForConsole = squadPricingPolicy[squadConsoleGroup]
    || (squadUsesDiscountEngine ? DEFAULT_SQUAD_PRICING_POLICY_FALLBACK.pc : {})
  const squadMaxPlayers = (() => {
    if (squadUsesDiscountEngine) {
      const keys = Object.keys(squadPolicyForConsole).map((k) => Number(k)).filter((v) => !Number.isNaN(v))
      if (keys.length > 0) return Math.max(...keys)
    }
    return Number(squadPlatformRule.max_players || 1)
  })()
  const includedControllers = selectedControllerType ? 1 : 0
  const suggestedExtraControllerQty = isSquadMode && selectedControllerType
    ? Math.max(0, squadPlayerCount - includedControllers)
    : 0
  const maxQuickMembers = Math.max(1, squadPlayerCount - 1)

  const setBookingModeQuick = (mode: "solo" | "squad") => {
    if (mode === "solo") {
      setIsSquadMode(false)
      return
    }
    if (!squadSupported) return
    setIsSquadMode(true)
  }

  const addSquadMemberRow = () => {
    if (!isSquadMode) return
    setSquadPlayerCount((prev) => Math.min(squadMaxPlayers, prev + 1))
  }

  const removeSquadMemberRow = (memberId: string) => {
    if (!isSquadMode) return
    setSquadMembers((prev) => prev.filter((m) => m.id !== memberId))
    setSquadPlayerCount((prev) => Math.max(2, prev - 1))
  }

  const updateSquadMemberRow = (memberId: string, field: "name" | "phone", value: string) => {
    setSquadMembers((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, [field]: value } : member
      )
    )
    setFocusedSquadMemberId(memberId)
    scheduleSuggestionFetch(field, value, squadSuggestionSetter(memberId))
  }

  const squadSuggestionSetter = (memberId: string): React.Dispatch<React.SetStateAction<UserSuggestion[]>> =>
    (value) => setSquadMemberSuggestions(prev => ({
      ...prev,
      [memberId]: typeof value === 'function' ? value(prev[memberId] || []) : value,
    }))

  const handleSquadMemberFocus = (memberId: string, currentQuery = "") => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    setFocusedSquadMemberId(memberId)
    void fetchUserSuggestions('all', currentQuery, squadSuggestionSetter(memberId))
  }

  const handleSquadMemberBlur = (memberId: string) => {
    window.setTimeout(() => {
      setFocusedSquadMemberId((current) => (current === memberId ? null : current))
      setSquadMemberSuggestions((prev) => ({ ...prev, [memberId]: [] }))
    }, 140)
  }

  const handleSquadMemberSuggestionPick = (memberId: string, user: UserSuggestion) => {
    cancelSuggestionFetch()
    upsertUsersInCache([user])
    setSquadMembers((prev) =>
      prev.map((member) =>
        member.id === memberId
          ? { ...member, name: user.name || member.name, phone: user.phone || member.phone }
          : member
      )
    )
    setFocusedSquadMemberId(null)
    setSquadMemberSuggestions((prev) => ({ ...prev, [memberId]: [] }))
  }

  const applyExtraControllerQty = (nextQty: number) => {
    const sanitizedQty = Math.max(0, Math.min(8, nextQty))
    setExtraControllerQty(sanitizedQty)
    if (isSquadMode && selectedControllerType) {
      const mappedPlayers = Math.max(2, Math.min(squadMaxPlayers, sanitizedQty + 2))
      setSquadPlayerCount(mappedPlayers)
    }
  }

  useEffect(() => {
    const fetchControllerPricing = async () => {
      if (!selectedControllerType) {
        setControllerPricingConfig({ base_price: 0, tiers: [] })
        setHasControllerPricingConfigured(false)
        return
      }

      const vendorId = getVendorIdFromToken()
      if (!vendorId) return

      setIsControllerPricingLoading(true)
      try {
        const data = await getBookingSettings<any>(`${DASHBOARD_URL}/api/vendor/${vendorId}/controller-pricing`, settingsVersion)
        if (settingsVendorRef.current !== vendorId) return
        const entry = data?.pricing?.[selectedControllerType as "ps5" | "xbox"]
        const configured = Boolean(entry?.configured)
        setHasControllerPricingConfigured(configured)
        setControllerPricingConfig({
          base_price: configured ? Number(entry?.base_price ?? 0) : 0,
          tiers: Array.isArray(entry?.tiers)
            ? entry.tiers.map((tier: any) => ({
                quantity: Number(tier?.quantity ?? 0),
                total_price: Number(tier?.total_price ?? 0),
              }))
            : []
        })
      } catch (error) {
        console.error("❌ Failed to fetch controller pricing:", error)
        setHasControllerPricingConfigured(false)
        setControllerPricingConfig({ base_price: 0, tiers: [] })
      } finally {
        setIsControllerPricingLoading(false)
      }
    }

    fetchControllerPricing()
  }, [selectedControllerType, settingsVendorId, settingsVersion])

  useEffect(() => {
    if (!squadSupported && isSquadMode) {
      setIsSquadMode(false)
    }
  }, [squadSupported, isSquadMode])

  useEffect(() => {
    if (!isSquadMode && squadPlayerCount !== 2) {
      setSquadPlayerCount(2)
    }
  }, [isSquadMode, squadPlayerCount])

  useEffect(() => {
    if (!isSquadMode) {
      if (squadMembers.length > 0) setSquadMembers([])
      if (focusedSquadMemberId) setFocusedSquadMemberId(null)
      if (Object.keys(squadMemberSuggestions).length > 0) setSquadMemberSuggestions({})
      return
    }

    const targetMembers = Math.max(1, squadPlayerCount - 1)
    setSquadMembers((prev) => {
      if (prev.length === targetMembers) return prev
      if (prev.length > targetMembers) return prev.slice(0, targetMembers)
      const next = [...prev]
      for (let i = prev.length; i < targetMembers; i += 1) {
        next.push({ id: `${Date.now()}-${i}`, name: "", phone: "" })
      }
      return next
    })
  }, [isSquadMode, squadPlayerCount, squadMembers.length])

  useEffect(() => {
    if (!isSquadMode || !supportsExtraController) return
    if (extraControllerQty !== suggestedExtraControllerQty) {
      setExtraControllerQty(suggestedExtraControllerQty)
    }
  }, [isSquadMode, supportsExtraController, suggestedExtraControllerQty, extraControllerQty])

  useEffect(() => {
    if (!supportsExtraController && (extraControllerFare !== 0 || extraControllerQty !== 0)) {
      setExtraControllerQty(0)
      setExtraControllerFare(0)
    }
  }, [supportsExtraController, extraControllerFare, extraControllerQty])

  useEffect(() => {
    if (!supportsExtraController) return
    const nextFare = calculateControllerFare(controllerPricingConfig, extraControllerQty)
    if (nextFare !== extraControllerFare) {
      setExtraControllerFare(nextFare)
    }
  }, [controllerPricingConfig, extraControllerQty, extraControllerFare, supportsExtraController])

  const mealsTotal = selectedMeals.reduce((sum, meal) => sum + meal.total, 0)
  const consoleUnitTotal = selectedSlots.reduce((sum, slot) => sum + getEffectivePrice(slot), 0)
  const squadConsoleMultiplier = isSquadMode && squadUsesDiscountEngine ? squadPlayerCount : 1
  const deskPrice = deskCard
    ? (flexMode
      ? (flexActive && flexQuote?.price.basis === "rate_card" ? flexQuote.price.base_amount : null)
      : deskSubtotal(deskCard, sessionMinutes, isSquadMode ? squadPlayerCount : 1))
    : null
  const consoleTotal = deskPrice ?? (flexActive && flexQuote
    ? flexQuote.price.base_amount
    : (isSquadMode ? Number((consoleUnitTotal * squadConsoleMultiplier).toFixed(2)) : consoleUnitTotal))
  const squadDiscountPercent = (() => {
    if (deskCard || !isSquadMode || !squadUsesDiscountEngine) return 0
    const keys = Object.keys(squadPolicyForConsole).map((k) => Number(k)).filter((v) => !Number.isNaN(v)).sort((a, b) => a - b)
    if (keys.length === 0) return 0
    const minPlayers = keys[0]
    const maxPlayers = keys[keys.length - 1]
    const cappedPlayers = Math.min(maxPlayers, Math.max(minPlayers, squadPlayerCount))
    return Number(squadPolicyForConsole[String(cappedPlayers)] || 0)
  })()
  const squadDiscountAmount = isSquadMode
    ? Number(((consoleTotal * squadDiscountPercent) / 100).toFixed(2))
    : 0
  const gamingNet = Math.max(0, consoleTotal - squadDiscountAmount)
  // No time-based discount: the price covers exactly the booked minutes (same inputs, same price).
  const totalAmount = Math.max(
    0,
    consoleTotal - squadDiscountAmount - waiveOffAmount + extraControllerFare + mealsTotal
  )

  const paymentMethodMeta: Record<string, {
    icon: React.ComponentType<{ className?: string }>
    label: string
    hint: string
    accent: string
  }> = {
    Cash: {
      label: "Cash",
      icon: Wallet,
      hint: "Collect payment at counter",
      accent: "emerald",
    },
    UPI: {
      label: "UPI",
      icon: CreditCard,
      hint: "Scan and pay instantly",
      accent: "sky",
    },
    Pass: {
      label: "Gaming Pass",
      icon: Ticket,
      hint: "Validate and redeem hours",
      accent: "violet",
    },
    "UPI QR": {
      label: "UPI QR (auto-paid)",
      icon: QrCode,
      hint: "Customer scans a QR; marked paid automatically",
      accent: "sky",
    },
    pay_at_cafe: {
      label: "Pay later",
      icon: Clock,
      hint: "Collect the balance when the player finishes.",
      accent: "amber",
    },
    "Monthly Credit": {
      label: "Credit",
      icon: Clock,
      hint: "Bill in monthly cycle",
      accent: "amber",
    },
    Card: { label: "Card", icon: CreditCard, hint: "Card at the counter", accent: "sky" },
    cafe_wallet: { label: "Wallet", icon: Wallet, hint: "Gamer credit at this cafe", accent: "emerald" },
  }
  const pickPayment = (method: string) => {
    setPaymentType(method)
    if (method !== "Pass") resetPassFlow()
    if (errors.payment) setErrors(previous => ({ ...previous, payment: "" }))
  }
  const chipClass = (active: boolean) => cn("rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
    active ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-foreground hover:bg-muted")

  const paymentSelector = (
      <div className="flex flex-wrap items-center gap-2">
        <div className={segGroup} role="radiogroup" aria-label="Payment">
          {PAYMENT_TYPES.map(method => {
            const MethodIcon = paymentMethodMeta[method].icon
            return (
              <button key={method} type="button" role="radio" aria-checked={paymentType === method} disabled={isSubmitting} title={paymentMethodMeta[method].hint}
                onClick={() => pickPayment(method)} className={cn(segItem(paymentType === method), "gap-1.5")}><MethodIcon className="h-3.5 w-3.5 opacity-80" />{paymentMethodMeta[method].label}</button>
            )
          })}
        </div>
      </div>
  )
  const paymentHint = paymentType === "pay_at_cafe" ? "Collect when play ends."
    : paymentType === "UPI QR" ? "After saving, a QR appears. The booking is marked paid once the customer pays." : ""
  // Credit account and pass checks need room: they sit in the form, the method stays in the pinned panel.
  const paymentDetails = (paymentType === 'Monthly Credit' || paymentType === 'Pass') && (
    <div>
      {paymentType === 'Monthly Credit' && (
        <div className="mt-2 space-y-2">
          <p className="rounded-md border px-2.5 py-1.5 text-xs border-amber-700 bg-amber-900/25 text-amber-300">
            Monthly credit works only for users with an active Gamers Credit account.
          </p>
          <div className="rounded-lg border p-3 border-border bg-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Credit Account Status</p>
                <p className="text-xs text-muted-foreground">
                  {matchedPrimaryUser?.id
                    ? `Matched customer: ${matchedPrimaryUser.name}`
                    : 'No known customer matched yet. Create credit on the fly if needed.'}
                </p>
              </div>
              {!creditAccount?.is_active && (
                <button
                  type="button"
                  onClick={() => setShowCreditAccountModal(true)}
                  disabled={!can("credit.manage")}
                  title={can("credit.manage") ? "Create credit account" : "Ask a staff member with credit management access"}
                  className={buttonVariants({ variant: "soft-info", size: "sm" })}
                >
                  Create Credit Account
                </button>
              )}
            </div>
            {creditAccountLoading ? (
              <p className="mt-2 text-xs text-muted-foreground">Loading credit account…</p>
            ) : creditAccount?.is_active ? (
              <div className="mt-2 grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 xl:grid-cols-3">
                <div className="min-w-0 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-emerald-300">Limit</p>
                  <p className="break-words text-base font-semibold text-emerald-100">₹{Number(creditAccount.credit_limit || 0).toFixed(2)}</p>
                </div>
                <div className="min-w-0 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-amber-300">Outstanding</p>
                  <p className="break-words text-base font-semibold text-amber-100">₹{Number(creditAccount.outstanding_amount || 0).toFixed(2)}</p>
                </div>
                <div className="min-w-0 rounded-lg border border-border bg-primary/10 px-3 py-2 min-[480px]:col-span-2 xl:col-span-1">
                  <p className="text-xs uppercase tracking-wide text-primary">Available</p>
                  <p className="break-words text-base font-semibold text-foreground">₹{availableCreditAmount.toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {creditAccountError || 'No credit account configured for this customer.'}
              </div>
            )}
          </div>
        </div>
      )}

      {paymentType === 'Monthly Credit' && creditAccount?.is_active && <p role="status" className={`text-xs ${totalAmount>availableCreditAmount?'text-red-500':'text-muted-foreground'}`}>{totalAmount>availableCreditAmount ? `This booking exceeds available credit by ₹${(totalAmount-availableCreditAmount).toFixed(2)}. Collect payment or review the account limit.` : `Available after booking: ₹${(availableCreditAmount-totalAmount).toFixed(2)}`}</p>}
      <AnimatePresence>
        {paymentType === 'Pass'  && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            <div className="rounded-lg border p-3 border-border bg-card">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Valid Passes
                </p>
                {isLoadingPassOptions ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                ) : null}
              </div>
              <div className="mt-2">
                <select
                  value={passUid}
                  onChange={(e) => handlePassSelectionChange(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm border-border bg-muted"
                  disabled={isLoadingPassOptions || !passOptions.length}
                >
                  <option value="">{passOptions.length ? "Select pass" : "No valid pass found"}</option>
                  {passOptions.map((pass) => (
                    <option key={pass.id} value={pass.pass_uid}>
                      {pass.pass_name} • {pass.pass_uid} • {pass.remaining_hours}/{pass.total_hours}h
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {validatedPass && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "rounded-lg border p-2",
                  validatedPass.can_cover_hours
                    ? "bg-emerald-900/20 border-emerald-700"
                    : "bg-amber-900/20 border-amber-700"
                )}
              >
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs space-y-1">
                    <p className="font-semibold text-emerald-200">
                      {validatedPass.pass_name}
                    </p>
                    <div className="flex justify-between text-emerald-300">
                      <span>Hours Available</span>
                      <span className="font-semibold">
                        {validatedPass.remaining_hours}/{validatedPass.total_hours}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Hours Needed</span>
                      <span className="font-semibold">{Number(validatedPass?.required_hours || 0).toFixed(2)} hrs</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {validatedPass?.can_cover_hours && (
              <div className="rounded-lg border p-3 border-border bg-card">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={sendPassOtp}
                    disabled={isSendingPassOtp || !matchedPrimaryUser?.id}
                    className="h-8 px-3 text-xs"
                  >
                    {isSendingPassOtp ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Sending OTP
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                  <input
                    value={passOtpCode}
                    onChange={(e) => setPassOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6 digit OTP"
                    className="h-8 w-28 rounded-md border px-2.5 text-xs border-border bg-muted"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={verifyPassOtp}
                    disabled={isVerifyingPassOtp || !passOtpRequestId || passOtpCode.length < 6}
                    className="h-8 px-3 text-xs"
                  >
                    {isVerifyingPassOtp ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Verifying
                      </>
                    ) : (
                      "Verify OTP"
                    )}
                  </Button>
                </div>
                {passOtpMessage ? (
                  <p className="mt-2 text-xs text-emerald-300">{passOtpMessage}</p>
                ) : null}
                {passVerificationToken ? (
                  <p className="mt-1 text-xs font-semibold text-emerald-300">
                    OTP verified. You can confirm booking now.
                  </p>
                ) : null}
              </div>
            )}

            {passError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                {passError}
              </motion.p>
            )}

            {errors.pass && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500"
              >
                {errors.pass}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  console.log('💰 Pricing calculation:', {
    consoleTotal,
    mealsTotal,
    waiveOffAmount,
    extraControllerFare,
    totalAmount
  })

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) newErrors.name = 'Name is required'
    const phoneRequired = bookingFieldConfig.phone.required
    const emailRequired = bookingFieldConfig.email.required
    const hasPhone = Boolean(phone.trim())
    const hasEmail = Boolean(email.trim())

    if (phoneRequired && !hasPhone) newErrors.phone = 'Phone number is required'
    if (emailRequired && !hasEmail) newErrors.email = 'Email is required'
    if (hasEmail && !/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid'
    if (selectedSlots.length === 0) newErrors.slots = 'Please select at least one time slot'
    if (waiveOffAmount > gamingNet) {
      setSubmitError("Additional Discount exceeds the gaming charges.")
      return false
    }
    if (slotShortfall) { setSubmitError(`Only ${durationLabel(selectedMinutes)} free from ${startClock}. Pick a shorter time or another start.`); return false }
    if (flexMode && !flexActive) { setSubmitError(flexProblem?.message || "No station is free for that time."); return false }
    if (deskCard && !stationAuto && !(flexMode ? flexConsoleIds : deskConsoleIds)) { setSubmitError("Choose a station, or tap Auto-assign."); return false }
    if (deskRatesLoading || deskRateError || (variantPricingRequired && !effectiveDeskChoice)) {
      setSubmitError(deskRateError || (deskRatesLoading ? "Loading booking rates. Please wait." : "No rate covers this duration and player count."))
      return false
    }
    if (effectiveDeskChoice && effectiveDeskChoice !== "standard" && (!deskCard || deskPrice === null)) {
      setSubmitError("Choose a rate card that covers this duration and player count.")
      return false
    }
    if (!paymentType) newErrors.payment = 'Please select a payment method'
    if (isSquadMode) {
      if (!squadSupported) {
        newErrors.squad = 'Squad mode is not supported for this console type'
      } else if (squadPlayerCount < 2) {
        newErrors.squad = 'Squad booking requires at least 2 players'
      } else if (squadPlayerCount > squadMaxPlayers) {
        newErrors.squad = `Maximum ${squadMaxPlayers} players allowed for this console type`
      }
      const hasPartialMember = squadMembers.some(
        (m) => (m.name.trim() && !m.phone.trim()) || (!m.name.trim() && m.phone.trim())
      )
      if (hasPartialMember) {
        newErrors.squad_members = 'Fill both name and phone for squad members, or leave both empty'
      }
    }

    // Validate pass if Pass payment is selected
    if (paymentType === 'Pass') {
      if (!matchedPrimaryUser?.id) {
        newErrors.pass = 'Select an existing customer to use pass payment'
      } else if (!passUid.trim() || !validatedPass) {
        newErrors.pass = 'Select a valid pass'
      } else if (!validatedPass.can_cover_hours) {
        newErrors.pass = 'Selected pass does not have enough hours for this booking'
      } else if (!passVerificationToken) {
        newErrors.pass = 'Verify OTP before confirming pass booking'
      } else if (passError) {
        newErrors.pass = passError
      }
    }

    if (paymentType === 'cafe_wallet' && !matchedPrimaryUser?.id) {
      newErrors.payment = 'Pick an existing gamer to pay from their credit'
    }

    if (paymentType === 'Monthly Credit') {
      if (creditAccountLoading) {
        newErrors.payment = 'Monthly credit account status is still loading'
      } else if (!creditAccount?.is_active) {
        newErrors.payment = 'Monthly credit account is not configured for this customer'
      } else if (availableCreditAmount < totalAmount) {
        newErrors.payment = `Available credit is ₹${availableCreditAmount.toFixed(2)}, booking needs ₹${totalAmount.toFixed(2)}`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current || submissionUncertain) return
    setSubmitError("")
    
    if (!validateForm()) {
      return
    }

    const vendorId = getVendorIdFromToken()
    if (!vendorId) {
      setSubmitError('Your session is unavailable. Sign in again before booking.')
      return
    }

    submittingRef.current = true
    setIsSubmitting(true)

    try {

      const bookingData = {
        consoleType: selectedSlots[0]?.console_name || '',
        name,
        email: bookingFieldConfig.email.visible ? email : '',
        phone: bookingFieldConfig.phone.visible ? phone : '',
        userId: matchedPrimaryUser?.id ?? null,
        bookedDate: normalizeBookedDate(selectedSlots[0]?.date || ''),
        slotId: selectedSlots.map(slot => slot.slot_id),
        // UPI QR bookings start as pay-after-session; the QR payment then marks them paid.
        paymentType: paymentType === 'Monthly Credit' ? 'monthly_credit' : paymentType === 'UPI QR' ? 'pay_at_cafe' : paymentType,
        pass_uid: paymentType === 'Pass' ? validatedPass?.pass_uid : undefined,
        pass_verification_token: paymentType === 'Pass' ? passVerificationToken : undefined,
        bookingType: isSquadMode ? 'squad' : 'direct',
        waiveOffAmount, // staff-entered discount only
        extraControllerQty: supportsExtraController ? extraControllerQty : 0,
        extraControllerFare: supportsExtraController ? extraControllerFare : 0,
        selectedMeals: selectedMeals.map(meal => ({
          menu_item_id: meal.menu_item_id,
          quantity: meal.quantity
        })),
        requireFullRange: true,
        deskPricingMode: variantPricingRequired ? "variants" : "slot",
        pricingGame,
        deskProfile: deskCard?.profile,
        deskConsoleIds: deskCard && !stationAuto ? (flexMode ? flexConsoleIds : deskConsoleIds) : undefined,
        // Additive: book the device type now, staff pick the station when the session starts.
        assignLater: stationAuto && (!!deskCard || flexMode) ? true : undefined,
        ...(flexActive && flexQuote ? {
          timingMode: 'flex',
          gameId: flexQuote.game_id,
          startAt: flexQuote.window.start_at,
          durationMinutes: flexQuote.window.duration_minutes,
          flexConsoleIds: flexConsoleIds || undefined,
          extendsBookingId: flexQuote.extends_booking_id || undefined,
        } : {}),
        deskRevision: deskCard?.revision,
        deskSubtotal: deskPrice ?? undefined,
        bookingMode: 'regular',
        squadDetails: {
          enabled: isSquadMode && squadSupported,
          playerCount: isSquadMode ? squadPlayerCount : 1,
          suggestedExtraControllerQty: isSquadMode ? suggestedExtraControllerQty : 0,
          discountPercentPreview: isSquadMode ? squadDiscountPercent : 0,
          discountAmountPreview: isSquadMode ? squadDiscountAmount : 0,
          consoleGroup: squadConsoleGroup,
          pricingMode: squadPlatformRule.pricing_mode,
          members: isSquadMode
            ? squadMembers
                .filter((m) => m.name.trim() && m.phone.trim())
                .map((m) => ({ name: m.name.trim(), phone: m.phone.trim() }))
            : [],
        }
      }


      const bookingHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Client-Source': 'dashboard',
      }
      const dashboardToken = localStorage.getItem('rbac_access_token_v1') || localStorage.getItem('jwtToken')
      if (dashboardToken) {
        bookingHeaders.Authorization = `Bearer ${dashboardToken}`
      }

      const result = await api.post<any, string>(
        `${BOOKING_URL}/api/newBooking/vendor/${vendorId}`,
        JSON.stringify(bookingData),
        {
          headers: bookingHeaders,
          timeoutMs: 45_000,
          retries: 0,
        }
      )



if (result?.success === true || result?.success === 'true' || result?.booking || result?.id) {
  const createdIds = Array.isArray(result?.booking_ids) ? result.booking_ids.map(Number).filter((id: number) => id > 0) : []
  if (paymentType === 'UPI QR' && createdIds.length > 0) {
    // Keep the form mounted behind the QR; it closes once paid or left for later.
    setUpiQrBooking({ vendorId, bookingIds: createdIds, result })
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('refresh-dashboard'))
    return
  }
  // Return staff directly to the schedule after a confirmed server response.
  onClose()
  onBookingComplete(result)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refresh-dashboard'))
  }

  // Invalidate suggestions without holding the completed submission open
  // for a full customer-list request.
  try { localStorage.removeItem(`userList:${vendorId}`) } catch { /* Booking is already saved. */ }
} else {
  // Only show error if response was not ok
  setSubmissionUncertain(true)
  setSubmitError('The server returned an unrecognized confirmation. Close this form and check Booking Records before creating another booking.')
}

    } catch (error) {
      console.error('❌ Error submitting booking:', error)
      const message = error instanceof Error ? error.message : 'Failed to create booking'
      const status = Number((error as { status?: number })?.status || 0)
      const uncertain = !status || status >= 500 || status === 408
      setSubmissionUncertain(uncertain)
      setSubmitError(uncertain
        ? `Booking confirmation did not arrive. The booking may already have been saved. Close this form and check Booking Records${paymentType === 'Pass' ? ' and pass usage' : ''} before submitting again.`
        : message)
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  if (!portalReady) return null

  const bill = deskBill({
    device: pickerConsoleItem?.name || selectedSlots[0]?.console_name || "Session",
    minutes: sessionMinutes,
    gaming: consoleTotal,
    rateName: deskCard ? rateLabel(deskCard) : null,
    players: isSquadMode ? squadPlayerCount : 1,
    squadDiscount: squadDiscountAmount,
    squadPercent: squadDiscountPercent,
    staffDiscount: waiveOffAmount,
    controllers: supportsExtraController ? extraControllerFare : 0,
    controllerQty: extraControllerQty,
    addOns: mealsTotal,
    addOnCount: selectedMeals.reduce((n, meal) => n + meal.quantity, 0),
  })
  const windowStart = flexQuote && flexMode ? flexQuote.window.start : selectedSlots[0]?.start_time
  const windowEnd = flexQuote && flexMode ? flexQuote.window.end : selectedSlots[selectedSlots.length - 1]?.end_time
  const contextLine = [
    pickerConsoleItem?.name || selectedSlots[0]?.console_name,
    windowStart && windowEnd ? sessionWindowLabel(windowStart, windowEnd, sessionMinutes, showClock) : null,
    activePickerDate !== istDate() ? new Date(`${startDate}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null,
  ].filter(Boolean).join(" · ")
  const confirmBlocked = selectedSlots.length === 0 || isSubmitting || submissionUncertain || slotShortfall
    || (flexMode && (!flexActive || flexLoading))
    || (!!deskCard && !stationAuto && !(flexMode ? flexConsoleIds : deskConsoleIds))
    || deskRatesLoading || !!deskRateError || (variantPricingRequired && !effectiveDeskChoice) || (!!deskCard && deskPrice === null)
    || (paymentType === 'Monthly Credit' && (!creditAccount?.is_active || availableCreditAmount < totalAmount))
  const timeStatus = flexMode
    ? (flexLoading ? "Checking…" : flexProblem ? flexProblem.message : flexQuote && !flexQuote.available ? "No station free for the whole time." : "")
    : selectedSlots.length === 0 ? `No free ${pickerConsoleItem?.name || "console"} at ${startClock || "that time"}.`
    : slotShortfall ? `Only ${durationLabel(selectedMinutes)} free from ${startClock}.` : ""
  const subLabel = "w-[4.5rem] shrink-0 pt-2 text-xs font-medium text-muted-foreground"
  const selectedStationCodes = stationAuto ? [] : stationIds.map(id => pickerStations.find(st => st.id === id)?.code || `#${id}`)
  const summaryStation = stationAuto ? (stationSource ? "Auto-assign" : null) : selectedStationCodes.join(", ") || "Pick a station"
  const confirmOnEnter = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.defaultPrevented || event.nativeEvent.isComposing) return
    const target = event.target as HTMLElement
    // Inputs submit the form themselves; leave textareas and selects alone.
    if (target.closest("input, textarea, select, [role='listbox'], .slot-booking-popover")) return
    event.preventDefault()
    if (!confirmBlocked) (document.getElementById("slot-booking-form") as HTMLFormElement | null)?.requestSubmit()
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={false}
        style={{ zIndex: overlayZIndex }}
        className="fixed inset-0 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
      >
        <motion.div
          initial={false}
          role="dialog"
          data-booking-form
          aria-modal="true"
          aria-label="New Gaming Session"
          onKeyDown={confirmOnEnter}
          className="slot-booking-modal slot-booking-wide flex h-[94vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-lg border shadow-xl sm:h-[88vh] sm:w-[92vw]"
        >
          <div className="slot-booking-modal-header relative flex items-center justify-between gap-3 border-b px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="slot-booking-title text-lg">New session</h2>
              <p className="slot-booking-context mt-0.5 truncate text-sm tabular-nums">{contextLine || "Pick a time"}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Booking settings" title="Player fields"
                onClick={() => { setFieldConfigError(""); setBookingFieldDraft(bookingFieldConfig); setIsFieldConfigOpen((prev) => !prev) }}
                className="slot-booking-modal-secondary rounded-lg p-2 transition"><SlidersHorizontal className="h-4 w-4" /></button>
              <button onClick={onClose} aria-label="Close booking" className="slot-booking-modal-close rounded-lg p-2 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            {isFieldConfigOpen && (
              <div className="slot-booking-popover absolute right-4 top-[calc(100%-2px)] z-30 w-[310px] rounded-lg border p-3 shadow-xl">
                <p className="text-sm font-semibold text-foreground">Player Details</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Player Name and one contact field are required.
                </p>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="rounded-lg border p-2 border-border">
                    <p className="font-semibold text-foreground">Mobile Number</p>
                    <div className="mt-2 flex items-center justify-between">
                      <label className="text-muted-foreground">Show field</label>
                      <input
                        type="checkbox"
                        checked={bookingFieldDraft.phone.visible}
                        onChange={(e) => applyFieldDraftChange("phone", "visible", e.target.checked)}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <label className="text-muted-foreground">Required</label>
                      <input
                        type="checkbox"
                        checked={bookingFieldDraft.phone.required}
                        onChange={(e) => applyFieldDraftChange("phone", "required", e.target.checked)}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border p-2 border-border">
                    <p className="font-semibold text-foreground">Email</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Optional email stays hidden in form for faster desk booking.
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <label className="text-muted-foreground">Required</label>
                      <input
                        type="checkbox"
                        checked={bookingFieldDraft.email.required}
                        onChange={(e) => applyFieldDraftChange("email", "required", e.target.checked)}
                      />
                    </div>
                  </div>
                </div>

                {fieldConfigError && (
                  <p className="mt-2 text-xs text-red-500">{fieldConfigError}</p>
                )}

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border px-2.5 py-1.5 text-xs border-border text-muted-foreground"
                    onClick={() => {
                      setBookingFieldDraft(bookingFieldConfig)
                      setIsFieldConfigOpen(false)
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ui-action-primary rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                    onClick={saveVendorFieldConfig}
                    disabled={isFieldConfigSaving}
                  >
                    {isFieldConfigSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
            {/* Left: the cafe floor, as arranged in Gaming Stations > Map. Tiles pick the station. */}
            <section aria-label="Station" className="flex h-[52vh] min-h-[340px] shrink-0 flex-col border-b border-border p-4 lg:h-auto lg:min-h-0 lg:w-[60%] lg:border-b-0 lg:border-r lg:p-5">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Station</h3>
                <span className="truncate text-xs text-muted-foreground">{!stationSource ? "View only" : stationAuto ? "Auto-assign picks a free station" : "Click a free tile"}</span>
              </div>
              <StationFloorPicker
                floor={floorStations}
                stations={pickerStations}
                zones={floorLayout.zones}
                selected={stationIds}
                auto={stationAuto}
                need={stationNeed}
                loading={stationLoading}
                disabled={isSubmitting}
                canPick={!!stationSource}
                onAuto={() => { setStationAuto(true); setStationIds([]); setPreferredStation(null) }}
                onToggle={toggleStation}
                zoomStorageKey={zoomKey(settingsVendorId, `new-session.${pickerConsoleItem?.type || activePickerConsole}`)}
                note={!stationSource ? "Stations are assigned when the session starts."
                  : preferredMissing ? `${pickerStations.find(st => st.id === preferredStation)?.code || "That station"} is not free for this time. Pick another or use Auto-assign.`
                  : stationSource === "desk" && deskStations.error ? deskStations.error : undefined}
              />
            </section>

            {/* Right: details, then the pinned amount panel. */}
            <div className="flex min-w-0 flex-col lg:min-h-0 lg:w-[40%]">
          <div className="slot-booking-body text-sm lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <form id="slot-booking-form" onSubmit={handleSubmit} className="divide-y divide-border">
              {submitError && (
                <div className="px-5 pt-4">
                  <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">{submitError}</div>
                </div>
              )}

              {availableConsoles.length > 1 && (
                <FormSection label="Console type">
                  <div className={segGroup} role="radiogroup" aria-label="Console">
                    {availableConsoles.map(item => {
                      const ConsoleIcon = resolveSafeConsoleIcon(item.icon, item.type)
                      const active = String(item.id) === activePickerConsole
                      return (
                        <button key={item.id} type="button" role="radio" aria-checked={active} disabled={isSubmitting}
                          onClick={() => { setPickerConsole(String(item.id)); setDeskChoice(""); setPricingGame(""); setStationIds([]) }}
                          className={cn(segItem(active), "gap-2 px-3.5")}>
                          <ConsoleIcon className="h-4 w-4" />{item.name}
                        </button>
                      )
                    })}
                  </div>
                </FormSection>
              )}

              <FormSection label="When">
                {timeMode === "quick" ? <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <span className={subLabel}>Start</span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className={segGroup} role="radiogroup" aria-label="Start">
                        {choices.map(choice => (
                          <button key={choice.key} type="button" role="radio" aria-checked={startKey === choice.key} disabled={isSubmitting}
                            onClick={() => { if (choice.key === "now") setNowClock(istClock()); setStartKey(choice.key); setShowOtherTime(false) }}
                            className={cn(segItem(startKey === choice.key), "tabular-nums")}>{choice.key.startsWith("slot:") ? showClock(choice.clock) : choice.label}</button>
                        ))}
                        <button type="button" aria-expanded={showOtherTime} className={cn(segItem(startKey === "custom"), "tabular-nums")}
                          onClick={() => setShowOtherTime(v => !v)}>{startKey === "custom" && customClock ? showClock(customClock) : "Other…"}</button>
                      </div>
                      {showOtherTime && (
                        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/20 p-2.5 text-xs text-muted-foreground">
                          <label>Date
                            <select value={activePickerDate} onChange={(event) => { setPickerConsole(activePickerConsole); setPickerDate(event.target.value) }}
                              className="mt-1 block h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
                              {Array.from(new Set([istDate(), ...slotDates])).sort().map((date) => <option key={date} value={date}>{date}</option>)}
                            </select>
                          </label>
                          <label>Time<TimeField className="mt-1 flex" aria-label="Start time" minuteStep={flexMode ? 1 : 15} value={customClock} onValueChange={(value) => { setCustomClock(value); setStartKey("custom") }} /></label>
                          {onReplaceSlots && <button type="button" className="pb-2 underline hover:text-foreground" onClick={() => setTimeMode("slots")}>Pick slots instead</button>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className={subLabel}>Duration</span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <div className={segGroup} role="radiogroup" aria-label="Duration">
                        {DURATION_CHIPS.map(minutes => (
                          <button key={minutes} type="button" role="radio" aria-checked={durationMin === minutes} disabled={isSubmitting}
                            onClick={() => setDurationMin(minutes)} className={segItem(durationMin === minutes)}>{chipDurationLabel(minutes)}</button>
                        ))}
                      </div>
                      <span className={cn("inline-flex h-10 items-center overflow-hidden rounded-lg border bg-muted/40", (DURATION_CHIPS as readonly number[]).includes(durationMin) ? "border-border" : "border-primary/60 text-primary")}>
                        <button type="button" aria-label="15 minutes less" disabled={isSubmitting || durationMin <= CUSTOM_STEP_MINUTES} className="grid h-full w-9 place-items-center text-muted-foreground hover:bg-white/[0.06] hover:text-foreground disabled:opacity-40" onClick={() => setDurationMin(m => Math.max(CUSTOM_STEP_MINUTES, m - CUSTOM_STEP_MINUTES))}>−</button>
                        <span className="min-w-[3.75rem] px-1 text-center text-sm font-medium tabular-nums">{durationLabel(durationMin)}</span>
                        <button type="button" aria-label="15 minutes more" disabled={isSubmitting || durationMin >= 720} className="grid h-full w-9 place-items-center text-muted-foreground hover:bg-white/[0.06] hover:text-foreground disabled:opacity-40" onClick={() => setDurationMin(m => Math.min(720, m + CUSTOM_STEP_MINUTES))}>+</button>
                      </span>
                    </div>
                  </div>
                </div> : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs"><span className="font-medium text-muted-foreground">Pick slots · {activePickerDate}</span>
                      <button type="button" className="text-muted-foreground underline hover:text-foreground" onClick={() => setTimeMode("quick")}>Back to quick times</button></div>
                    <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                      {pickerSlots.map((slot: any) => {
                        const selected = selectedSlots.some((item) => item.slot_id === slot.slot_id && item.date === activePickerDate && String(item.console_id) === activePickerConsole)
                        return <button key={slot.slot_id} type="button" aria-pressed={selected} disabled={isSubmitting}
                          onClick={() => onSlotSelect({
                            slot_id: slot.slot_id, date: activePickerDate, start_time: slot.start_time, end_time: slot.end_time,
                            console_id: Number(activePickerConsole), console_name: pickerConsoleItem?.name || pickerConsoleItem?.type || "",
                            console_price: slot.single_slot_price ?? pickerConsoleItem?.price ?? 0, base_price: slot.base_slot_price ?? undefined,
                            available_count: Number(slot.available_slot),
                          })}
                          className={cn(chipClass(selected), "px-2 py-1 text-xs tabular-nums")}>{showClock(slot.start_time)}–{showClock(slot.end_time)}</button>
                      })}
                      {pickerSlots.length === 0 && <p className="py-2 text-xs text-muted-foreground">No free slots.</p>}
                    </div>
                  </div>
                )}
                {deviceCards.some(card => card.definition.game_variant?.trim()) && (
                  <div className="mt-2.5 flex gap-2"><span className={subLabel}>Game</span>
                    <div className={segGroup}>
                      {["", ...new Set(deviceCards.map(card => card.definition.game_variant?.trim()).filter(Boolean) as string[])].map(title => (
                        <button key={title || "standard"} type="button" onClick={() => { setPricingGame(title); setDeskChoice(""); setStationIds([]) }} className={segItem(pricingGame === title)}>{title || "Other games"}</button>
                      ))}
                    </div>
                  </div>
                )}
                {matchingDeskCards.length > 1 && (
                  <div className="mt-2.5 flex gap-2"><span className={subLabel}>Rate</span>
                    <div className={segGroup}>
                      {matchingDeskCards.map(card => <button key={card.profile} type="button" onClick={() => setDeskChoice(card.profile)} className={segItem(effectiveDeskChoice === card.profile)}>{rateLabel(card)}</button>)}
                    </div>
                  </div>
                )}
                {timeStatus && <p role="status" className="mt-2 text-xs text-amber-400">{timeStatus}</p>}
                {deskRateError && <p role="status" className="mt-2 text-xs text-amber-400">{deskRateError} Reopen to retry.</p>}
                {variantPricingRequired && !matchingDeskCards.length && <p role="alert" className="mt-2 text-xs text-amber-400">No rate covers this time and player count.</p>}
              </FormSection>

              <FormSection label={isSquadMode ? "Captain" : "Player"}>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {bookingFieldConfig.phone.visible && (
                        <div className="relative">
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => handlePhoneInputChange(e.target.value)}
                            onFocus={handlePhoneFocus}
                            onBlur={handleBlur}
                            autoComplete="off"
                            placeholder={isSquadMode ? "Captain Mobile Number" : "Mobile Number"}
                            className={cn(
                              "h-10 w-full rounded-lg border bg-background pl-10 pr-4 text-sm transition-colors duration-150",
                              errors.phone
                                ? "border-red-500 focus:border-ring"
                                : focusedInput === "phone"
                                ? "border-ring"
                                : "border-border focus:border-ring",
                              "focus:outline-none focus:ring-1 focus:ring-ring/40"
                            )}
                          />
                          <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                          <AnimatePresence>
                            {focusedInput === "phone" && (phoneSuggestions.length > 0 || isSuggestionLoading.phone) && (
                              <motion.ul
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute z-20 bg-muted border border-border rounded-lg shadow-lg w-full mt-1 max-h-40 overflow-y-auto"
                              >
                                {isSuggestionLoading.phone && phoneSuggestions.length === 0 && (
                                  <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>
                                )}
                                {phoneSuggestions.slice(0, 5).map((user, idx) => (
                                  <motion.li
                                    key={idx}
                                    whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                                    className="px-3 py-2 hover:bg-emerald-900/30 cursor-pointer border-b border-border last:border-b-0"
                                    onMouseDown={() => handleSuggestionClick(user)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 bg-emerald-900/30 rounded-full">
                                        <User className="w-3 h-3 text-emerald-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-foreground text-sm">{user.name}</p>
                                        <p className="text-muted-foreground text-xs">{user.phone}</p>
                                      </div>
                                    </div>
                                  </motion.li>
                                ))}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>
                      )}
                      <div className="relative">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleNameInputChange(e.target.value)}
                          onFocus={handleNameFocus}
                          onBlur={handleBlur}
                          autoComplete="off"
                          placeholder={isSquadMode ? "Captain Name" : "Player Name"}
                          className={cn(
                            "h-10 w-full rounded-lg border bg-background pl-10 pr-4 text-sm transition-colors duration-150",
                            errors.name
                              ? "border-red-500 focus:border-ring"
                              : focusedInput === "name"
                              ? "border-ring"
                              : "border-border focus:border-ring",
                            "focus:outline-none focus:ring-1 focus:ring-ring/40"
                          )}
                        />
                        <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                        <AnimatePresence>
                          {focusedInput === "name" && (nameSuggestions.length > 0 || isSuggestionLoading.name) && (
                            <motion.ul
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute z-20 bg-muted border border-border rounded-lg shadow-lg w-full mt-1 max-h-40 overflow-y-auto"
                            >
                              {isSuggestionLoading.name && nameSuggestions.length === 0 && (
                                <li className="px-3 py-2 text-sm text-muted-foreground">Searching customers…</li>
                              )}
                              {nameSuggestions.slice(0, 5).map((user, idx) => (
                                <motion.li
                                  key={idx}
                                  whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                                  className="px-3 py-2 hover:bg-emerald-900/30 cursor-pointer border-b border-border last:border-b-0"
                                  onMouseDown={() => handleSuggestionClick(user)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 bg-emerald-900/30 rounded-full">
                                      <User className="w-3 h-3 text-emerald-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-foreground text-sm">{user.name}</p>
                                      <p className="text-muted-foreground text-xs">{user.phone || user.email}</p>
                                    </div>
                                  </div>
                                </motion.li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                      </div>
                      {bookingFieldConfig.email.visible && (
                        <div className="relative">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => handleEmailInputChange(e.target.value)}
                            onFocus={handleEmailFocus}
                            onBlur={handleBlur}
                            autoComplete="off"
                            placeholder={isSquadMode ? "Captain email" : "Email"}
                            className={cn(
                              "h-10 w-full rounded-lg border bg-background pl-10 pr-4 text-sm transition-colors duration-150",
                              errors.email
                                ? "border-red-500 focus:border-ring"
                                : focusedInput === "email"
                                ? "border-ring"
                                : "border-border focus:border-ring",
                              "focus:outline-none focus:ring-1 focus:ring-ring/40"
                            )}
                          />
                          <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                          <AnimatePresence>
                            {focusedInput === "email" && (emailSuggestions.length > 0 || isSuggestionLoading.email) && (
                              <motion.ul
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute z-20 bg-muted border border-border rounded-lg shadow-lg w-full mt-1 max-h-40 overflow-y-auto"
                              >
                                {isSuggestionLoading.email && emailSuggestions.length === 0 && (
                                  <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>
                                )}
                                {emailSuggestions.slice(0, 5).map((user, idx) => (
                                  <motion.li
                                    key={idx}
                                    whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                                    className="px-3 py-2 hover:bg-emerald-900/30 cursor-pointer border-b border-border last:border-b-0"
                                    onMouseDown={() => handleSuggestionClick(user)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 bg-emerald-900/30 rounded-full">
                                        <User className="w-3 h-3 text-emerald-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-foreground text-sm">{user.name}</p>
                                        <p className="text-muted-foreground text-xs">{user.email}</p>
                                      </div>
                                    </div>
                                  </motion.li>
                                ))}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>
                      )}
              </div>
              {suggestionError && (
                <p role="status" className="mt-2 text-xs text-amber-500">{suggestionError}{' '}
                  <button type="button" className="underline" onClick={() => {
                    if (focusedInput === 'phone') void fetchUserSuggestions('phone', phone, setPhoneSuggestions)
                    else if (focusedInput === 'email') void fetchUserSuggestions('email', email, setEmailSuggestions)
                    else void fetchUserSuggestions('name', name, setNameSuggestions)
                  }}>Retry</button>
                </p>
              )}
              </FormSection>

              <FormSection label="Booking for">
                <div className="flex flex-wrap items-center gap-2">
                  <div className={segGroup} role="radiogroup" aria-label="Booking for">
                    <button type="button" role="radio" aria-checked={!isSquadMode} disabled={isSubmitting}
                      onClick={() => setBookingModeQuick("solo")} className={cn(segItem(!isSquadMode), "gap-1.5 px-4")}>
                      <User className="h-3.5 w-3.5" />Individual
                    </button>
                    <button type="button" role="radio" aria-checked={isSquadMode} disabled={isSubmitting || !squadSupported}
                      title={squadPolicyState === "loading" ? "Loading" : !squadSupported ? "This console is solo only" : "Book for a group"}
                      onClick={() => setBookingModeQuick("squad")} className={cn(segItem(isSquadMode), "gap-1.5 px-4")}>
                      <Users className="h-3.5 w-3.5" />Squad
                    </button>
                  </div>
                  {isSquadMode && <span className="inline-flex h-10 items-center overflow-hidden rounded-lg border border-border bg-muted/40" aria-label="Players">
                    <button type="button" aria-label="One player less" className="grid h-full w-9 place-items-center text-muted-foreground hover:bg-white/[0.06] hover:text-foreground disabled:opacity-40" disabled={squadPlayerCount <= 2} onClick={() => setSquadPlayerCount((prev) => Math.max(2, prev - 1))}>−</button>
                    <span className="min-w-[5.5rem] px-1 text-center text-sm font-medium tabular-nums">{squadPlayerCount} players</span>
                    <button type="button" aria-label="One player more" className="grid h-full w-9 place-items-center text-muted-foreground hover:bg-white/[0.06] hover:text-foreground disabled:opacity-40" disabled={squadPlayerCount >= squadMaxPlayers} onClick={() => setSquadPlayerCount((prev) => Math.min(squadMaxPlayers, prev + 1))}>+</button>
                  </span>}
                  {!squadSupported && squadPolicyState !== "loading" && <span className="text-xs text-muted-foreground">Solo only for this console</span>}
                </div>
                {errors.squad && <p className="mt-2 text-xs text-red-500">{errors.squad}</p>}
              </FormSection>

              <FormSection label="Extras">
                <div className="flex flex-wrap items-center gap-2">
                  {supportsExtraController && <span className="inline-flex h-8 items-center overflow-hidden rounded-md border border-border text-xs">
                    <span className="px-2.5 text-muted-foreground">Controllers</span>
                    <button type="button" aria-label="One controller less" className="grid h-full w-8 place-items-center hover:bg-muted" disabled={isControllerPricingLoading} onClick={() => applyExtraControllerQty(extraControllerQty - 1)}>−</button>
                    <span className="px-1 tabular-nums">{extraControllerQty}</span>
                    <button type="button" aria-label="One controller more" className="grid h-full w-8 place-items-center hover:bg-muted" disabled={isControllerPricingLoading} onClick={() => applyExtraControllerQty(extraControllerQty + 1)}>+</button>
                  </span>}
                  <button type="button" onClick={() => setIsMealSelectorOpen(true)} className={extraClass(selectedMeals.length > 0)}>
                    <Plus className="h-3.5 w-3.5" />{selectedMeals.length ? `Snacks (${selectedMeals.reduce((n, meal) => n + meal.quantity, 0)})` : "Snacks"}
                  </button>
                  <button type="button" onClick={() => setShowDiscount(v => !v)} className={extraClass(waiveOffAmount > 0)}>{waiveOffAmount > 0 ? `Discount ${formatRupees(waiveOffAmount)}` : "Discount"}</button>
                  {showDiscount && <input type="number" min={0} aria-label="Discount" autoFocus value={waiveOffAmount || ""} placeholder="₹"
                    onChange={(e) => setWaiveOffAmount(Math.max(0, Math.min(gamingNet, Number(e.target.value) || 0)))}
                    className="h-8 w-24 rounded-md border border-border bg-background px-2 text-right text-sm" />}
                </div>
                    <AnimatePresence>
                      {isSquadMode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 rounded-lg border p-3 border-border"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold text-muted-foreground">
                              Squad Player Details (Optional)
                            </p>
                            <button
                              type="button"
                              onClick={addSquadMemberRow}
                              disabled={squadMembers.length >= maxQuickMembers}
                              className="rounded border px-2 py-1 text-xs disabled:opacity-50 border-border text-muted-foreground"
                            >
                              Add Player
                            </button>
                          </div>
                            <div className="space-y-2">
                              {squadMembers.map((member, idx) => (
                                <div key={member.id} className="rounded-md border p-2 border-border">
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                                    <input
                                      type="text"
                                      placeholder={`Player ${idx + 2} name`}
                                      value={member.name}
                                      onFocus={() => handleSquadMemberFocus(member.id, member.name)}
                                      onBlur={() => handleSquadMemberBlur(member.id)}
                                      onChange={(e) => updateSquadMemberRow(member.id, "name", e.target.value)}
                                      className="rounded border px-3 py-2 text-xs border-border bg-muted"
                                    />
                                    <input
                                      type="tel"
                                      placeholder={`Player ${idx + 2} phone`}
                                      value={member.phone}
                                      onFocus={() => handleSquadMemberFocus(member.id, member.phone)}
                                      onBlur={() => handleSquadMemberBlur(member.id)}
                                      onChange={(e) => updateSquadMemberRow(member.id, "phone", e.target.value)}
                                      className="rounded border px-3 py-2 text-xs border-border bg-muted"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeSquadMemberRow(member.id)}
                                      className={buttonVariants({ variant: "soft-danger", size: "sm" })}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  {focusedSquadMemberId === member.id &&
                                    Array.isArray(squadMemberSuggestions[member.id]) &&
                                    squadMemberSuggestions[member.id].length > 0 && (
                                      <div className="mt-2 max-h-36 overflow-auto rounded border border-border bg-card">
                                        {squadMemberSuggestions[member.id].map((suggested, suggestionIdx) => (
                                          <button
                                            key={`${member.id}-sg-${suggestionIdx}`}
                                            type="button"
                                            onMouseDown={() => handleSquadMemberSuggestionPick(member.id, suggested)}
                                            className="flex w-full items-center justify-between border-b px-2 py-1.5 text-left text-xs last:border-b-0 border-border hover:bg-muted"
                                          >
                                            <span className="font-medium text-foreground">
                                              {suggested.name}
                                            </span>
                                            <span className="text-muted-foreground">
                                              {suggested.phone}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                </div>
                              ))}
                            </div>
                          {errors.squad_members && <p className="mt-2 text-red-500 text-xs">{errors.squad_members}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>
              </FormSection>

              {paymentDetails && (
                <FormSection label="Payment details">
                  {paymentDetails}
                </FormSection>
              )}
            </form>
          </div>

          <div className="slot-booking-modal-footer sticky bottom-0 shrink-0 space-y-3 border-t px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Station</p>
                <p className={cn("truncate text-base font-semibold tabular-nums", summaryStation === "Pick a station" ? "text-amber-300" : "text-foreground")} title={summaryStation || ""}>
                  {summaryStation || "Assigned at start"}
                </p>
                <p className="mt-0.5 truncate text-sm tabular-nums text-muted-foreground">
                  {[windowStart && windowEnd ? `${showClock(clock(windowStart))} – ${showClock(clock(windowEnd))}` : "Pick a time", sessionMinutes > 0 ? durationLabel(sessionMinutes) : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] text-muted-foreground">Total · GST incl.</p>
                <strong className="text-3xl font-semibold leading-tight tabular-nums">{formatRupees(totalAmount)}</strong>
              </div>
            </div>
            {bill.lines.length > 0 && (
              <dl className="space-y-1 rounded-lg border border-border bg-muted/25 px-3 py-2 text-xs" aria-label="Bill">
                {bill.lines.map(line => (
                  <div key={line.key} className="flex items-baseline justify-between gap-3 tabular-nums">
                    <dt className="truncate text-muted-foreground">{line.label}</dt>
                    <dd className={line.tone === "discount" ? "text-emerald-400" : "text-foreground/90"}>{formatRupees(line.amount)}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Payment</p>
              {paymentSelector}
              {paymentHint && <p className="mt-1.5 text-xs text-muted-foreground">{paymentHint}</p>}
              {errors.payment && <p className="mt-1.5 text-xs text-red-500">{errors.payment}</p>}
            </div>
            <Button type="submit" form="slot-booking-form" disabled={confirmBlocked} className="ui-action-primary h-12 w-full gap-2 text-base font-semibold disabled:opacity-50">
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Booking…</> : <><CheckCircle className="h-4 w-4" />Confirm · {formatRupees(totalAmount)}<kbd className="ml-1 hidden rounded border border-white/25 px-1.5 text-[10px] font-medium opacity-80 sm:inline">↵</kbd></>}
            </Button>
          </div>
            </div>
          </div>
          <MealSelector
            vendorId={getVendorIdFromToken() || 0}
            isOpen={isMealSelectorOpen}
            onClose={handleMealSelectorClose}
            onConfirm={handleMealSelectorConfirm}
            initialSelectedMeals={selectedMeals}
          />
          <CreditAccountModal
            open={showCreditAccountModal}
            vendorId={getVendorIdFromToken()}
            customer={{
              userId: matchedPrimaryUser?.id ?? null,
              name,
              email,
              phone,
            }}
            onClose={() => setShowCreditAccountModal(false)}
            onCreated={({ account, user }) => {
              setCreditAccount(account)
              setName(user.name)
              setEmail(user.email || '')
              setPhone(user.phone || '')
              setShowCreditAccountModal(false)
              setUserList((prev) => {
                const nextUser = { id: user.userId || undefined, name: user.name, email: user.email || '', phone: user.phone || '' }
                const filtered = prev.filter((row) => !(row.id && nextUser.id && Number(row.id) === Number(nextUser.id)))
                return [nextUser, ...filtered]
              })
            }}
          />
        </motion.div>
      </motion.div>
      {upiQrBooking && (
        <UpiQrBookingDialog
          key="upi-qr-booking"
          vendorId={upiQrBooking.vendorId}
          bookingIds={upiQrBooking.bookingIds}
          onDone={() => {
            const done = upiQrBooking.result
            setUpiQrBooking(null)
            onClose()
            onBookingComplete(done)
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('refresh-dashboard'))
          }}
        />
      )}
    </AnimatePresence>
    ,
    document.body
  )
}
// New session dialog building blocks: one section rhythm, one segmented look,
// accent only on the selected item.
function FormSection({ label, aside, children }: { label: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="px-5 py-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}
const segGroup = "inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1"
const segItem = (active: boolean) => cn(
  "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
  active ? "bg-primary/15 text-primary shadow-sm ring-1 ring-inset ring-primary/40" : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
)
const extraClass = (active: boolean) => cn(
  "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
  active ? "border-primary/50 bg-primary/10 text-primary" : "border-dashed border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
)

function SlotPill({
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
        "booking-slot-pill select-none w-full h-full flex items-center justify-center rounded-md text-xs font-semibold uppercase",
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

function SegmentedButton({
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
        "booking-console-tab inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium uppercase",
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

function TopBar({ 
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
      <div className="fixed inset-0 z-50 p-4 bg-black/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">
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

          <Card className="bg-muted shadow-xl">
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
      <Card className={cn("booking-console-filter rounded-lg border p-3 shadow-sm backdrop-blur-sm", compact && "p-2")}>
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
                No consoles configured for booking. Add devices in `Manage Gaming Console`.
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
          <DropdownMenuContent align="end" className="w-56 shadow-lg border-border bg-card text-foreground">
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


function ConsoleFilter({
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
    <Card className="mb-6 rounded-lg border p-4 shadow-sm backdrop-blur-sm border-border bg-muted/50">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase text-muted-foreground">Select Console</span>
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

function ScheduleGrid({
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
  const { time: showClock } = useTimeFormat()
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
      <Card className="overflow-hidden rounded-lg border backdrop-blur-sm border-amber-500/35 bg-amber-500/10">
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-amber-300" />
          <p className="text-sm font-semibold text-amber-100">
            No {selectedConsole} consoles available in this cafe
          </p>
          <p className="mt-1 text-xs text-amber-200/90">
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
    base_price: matchingSlot.base_slot_price ?? undefined,
    available_count: matchingSlot.available_slot || 0,
  }

  // ✅ NEW: For past slots, just fetch bookings (don't add to selection for new booking)
  if (isPastTime) {
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
      <Card className="booking-schedule-card overflow-hidden rounded-lg border">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">Loading available slots…</p>
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
                  title={`${gameConsole.name} slot continues (${showClock(coveringSlot.start_time)}–${showClock(coveringSlot.end_time)})`}
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
      <Card className="booking-schedule-card overflow-hidden rounded-lg border">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No slots available</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
      <Card className="booking-schedule-card overflow-hidden rounded-lg border">
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
              <div key={time} className="booking-time-label text-center text-sm font-semibold">
                {showClock(time)}
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
                      "booking-date-cell sticky left-0 z-20 flex items-center justify-center rounded-lg px-2 py-2 text-sm font-semibold backdrop-blur-sm",
                      isTodayRow
                        ? "booking-date-cell-today"
                        : "booking-date-cell-idle"
                    )}
                  >
                    <span>{row.date}</span>
                    {isTodayRow && (
                      <span className="booking-today-badge ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
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


function RecentBookings({ 
  bookings, 
  isLoading,
  fixedCard = false,
}: { 
  bookings: any[], 
  isLoading: boolean 
  fixedCard?: boolean
}) {
  const { time: showClock } = useTimeFormat()
  // ✅ Determine if these are past bookings
  const hasPastBookings = bookings.some(b => 
    b.status === 'completed' || b.status === 'rejected' || b.status === 'cancelled'
  )
  const bookingType = hasPastBookings ? 'Past' : 'Active'
  
  if (isLoading) {
    return (
      <Card className={cn("booking-detail-card mt-2 p-3", fixedCard && "h-full min-h-0")}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="booking-contrast-muted ml-2">Loading bookings…</span>
        </div>
      </Card>
    )
  }

  if (bookings.length === 0) {
    return (
      <Card className={cn("booking-detail-card mt-2 p-3", fixedCard && "h-full min-h-0")}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="booking-empty-icon mb-3 rounded-full p-3">
            <AlertCircle className="booking-contrast-subtle h-6 w-6" />
          </div>
          <p className="booking-contrast-muted font-medium">
            No {hasPastBookings ? 'past' : 'active'} bookings for selected slot
          </p>
          <p className="booking-contrast-subtle mt-1 text-sm">
            {hasPastBookings 
              ? 'This past slot has no booking history'
              : 'This slot is available for new bookings'}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn("booking-detail-card mt-2 p-4", fixedCard && "h-full min-h-0 flex flex-col")}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="booking-contrast-heading flex items-center gap-2 text-lg font-semibold">
          {/* ✅ Show different icon based on booking type */}
          {hasPastBookings ? (
            <Clock className="booking-contrast-subtle h-5 w-5" />
          ) : (
            <CalendarDays className="w-5 h-5 text-emerald-600" />
          )}
          
          {/* ✅ Show "Past" or "Active" in title */}
          <span className={hasPastBookings ? "booking-contrast-muted" : ""}>
            {bookingType} Slot Bookings
          </span>
          
          <span className="booking-contrast-subtle text-sm font-normal">
            ({bookings.length} {bookingType})
          </span>
        </h3>
        
        {/* ✅ Show badge for past bookings */}
        {hasPastBookings && (
          <span className="booking-contrast-muted rounded-full px-3 py-1 text-xs font-medium bg-muted">
            History
          </span>
        )}
      </div>

      <div className={cn("overflow-x-auto", fixedCard && "min-h-0 flex-1 overflow-auto")}>
        <Table>
          <TableHeader className="sticky top-0 z-20">
            <TableRow>
              <TableHead className="booking-contrast-header sticky top-0 z-20 bg-muted">Booking ID</TableHead>
              <TableHead className="booking-contrast-header sticky top-0 z-20 bg-muted">Customer Details</TableHead>
              <TableHead className="booking-contrast-header sticky top-0 z-20 bg-muted">Time</TableHead>
              <TableHead className="booking-contrast-header sticky top-0 z-20 bg-muted">Status</TableHead>
              <TableHead className="booking-contrast-header sticky top-0 z-20 bg-muted">Meal Selection</TableHead>
              <TableHead className="booking-contrast-header sticky top-0 z-20 bg-muted">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow 
                key={booking.booking_id} 
                className={cn(
                  "hover:bg-muted/30",
                  hasPastBookings && "opacity-80" // Slightly fade past bookings
                )}
              >
                {/* Booking ID */}
                <TableCell className="booking-contrast-heading font-medium">
                  <div className="flex flex-col gap-1">
                    <span>{booking.booking_fid || `#BK-${booking.booking_id}`}</span>
                    {(booking.squad_enabled || Number(booking.squad_player_count || 1) > 1) && (
                      <span className="w-fit rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                        Squad x{Math.max(1, Number(booking.squad_player_count || 1))}
                      </span>
                    )}
                  </div>
                </TableCell>
                
                {/* Customer Details */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="booking-contrast-heading flex items-center gap-1 font-medium">
                      <User className="w-3 h-3" />
                      {booking.customer_name}
                    </span>
                    <span className="booking-contrast-muted flex items-center gap-1 text-xs">
                      <Mail className="w-3 h-3" />
                      {booking.customer_email}
                    </span>
                    <span className="booking-contrast-muted flex items-center gap-1 text-xs">
                      <Phone className="w-3 h-3" />
                      {booking.customer_phone}
                    </span>
                    {(booking.squad_enabled || Number(booking.squad_player_count || 1) > 1) && (
                      <span className="booking-contrast-muted text-xs">
                        Squad: {Array.isArray(booking.squad_members) && booking.squad_members.length > 0
                          ? booking.squad_members.map((m: any) => m?.name).filter(Boolean).join(", ")
                          : `${Math.max(1, Number(booking.squad_player_count || 1))} players`}
                      </span>
                    )}
                  </div>
                </TableCell>
                
                {/* ✅ NEW: Time Column */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="booking-contrast-muted text-xs font-medium">
                      {showClock(booking.slot_start_time || booking.start_time, "N/A")} – {showClock(booking.slot_end_time || booking.end_time, "N/A")}
                    </span>
                    <span className="booking-contrast-subtle text-xs">
                      {booking.booking_date
                        ? new Date(booking.booking_date).toLocaleDateString('en-GB')
                        : "Date unavailable"}
                    </span>
                  </div>
                </TableCell>
                
                {/* Status */}
                <TableCell>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    // ✅ Enhanced status colors
                    booking.status === 'confirmed' && "bg-emerald-900/30 text-emerald-400",
                    booking.status === 'checked_in' && "bg-amber-900/30 text-amber-400",
                    booking.status === 'pending_verified' && "bg-primary/30 text-primary",
                    booking.status === 'completed' && "bg-muted text-muted-foreground",
                    booking.status === 'cancelled' && "bg-red-900/30 text-red-400",
                    booking.status === 'rejected' && "bg-red-900/30 text-red-400"
                  )}>
                    {booking.status === 'checked_in' ? 'Checked-In' : 
                     booking.status === 'pending_verified' ? 'Pending' :
                     booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </TableCell>
                
                {/* Meal Selection */}
                <TableCell>
                  <div className="booking-contrast-muted flex items-center gap-1 text-sm">
                    {booking.meals && booking.meals.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-emerald-300" />
                        <span className="text-xs">{booking.meal_selection}</span>
                      </div>
                    ) : (
                      <span className="booking-contrast-subtle text-xs italic">No meal selected</span>
                    )}
                  </div>
                </TableCell>
                
                {/* Actions */}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "booking-contrast-heading text-xs",
                      hasPastBookings 
                        ? "hover:bg-muted" 
                        : "hover:bg-emerald-900/30"
                    )}
                  >
                    {hasPastBookings ? 'View History' : 'View Details'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* ✅ NEW: Summary Footer */}
      <div className="mt-4 flex items-center justify-between border-t pt-4 border-border">
        <div className="booking-contrast-muted text-sm">
          {hasPastBookings ? (
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Historical records for this time slot
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Currently active bookings
            </span>
          )}
        </div>
        
        {/* Status breakdown */}
        <div className="flex items-center gap-3 text-xs">
          {['confirmed', 'checked_in', 'pending_verified', 'completed', 'cancelled'].map(status => {
            const count = bookings.filter(b => b.status === status).length
            if (count === 0) return null
            
            return (
              <span key={status} className="flex items-center gap-1">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  status === 'confirmed' && "bg-emerald-500",
                  status === 'checked_in' && "bg-amber-500",
                  status === 'pending_verified' && "bg-primary",
                  status === 'completed' && "bg-muted",
                  status === 'cancelled' && "bg-red-500"
                )} />
                <span className="booking-contrast-muted">
                  {status === 'checked_in' ? 'Checked-In' : 
                   status === 'pending_verified' ? 'Pending' :
                   status.charAt(0).toUpperCase() + status.slice(1)}: {count}
                </span>
              </span>
            )
          })}
        </div>
      </div>
    </Card>
  )
}





// ==================== CHANGE BOOKING FORM ====================
function ChangeBookingForm() {
  const api = useApiClient()
  const { time: showClock } = useTimeFormat()
  const [bookingId, setBookingId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bookingFound, setBookingFound] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [vendorId, setVendorId] = useState(null);

  useEffect(() => {
    setVendorId(decodeVendorIdFromStorage());
  }, []);

  const handleSearch = async () => {
    if (!bookingId) return;

    setIsLoading(true);
    try {
      const data = await api.get<any>(`${BOOKING_URL}/api/bookings/${bookingId}`, {
        timeoutMs: 10_000,
        retries: 1,
      });

      if (data.success && data.booking) {
        setIsSubmitted(false);
        const { booking } = data;
        setBookingData({
          customer: booking.customer || { name: "", email: "", phone: "" },
          booking_date: booking.date || "",
          selected_slots: [`${booking.time_slot.start_time}`],
          system: booking.system || "",
          vendorId: vendorId,
          consoleTypeId: booking.game_id,
        });

        setBookingFound(true);
        await fetchAvailableSlots(1, booking.game_id, booking.date);
      } else {
        setBookingFound(false);
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      setBookingFound(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableSlots = async (vendorId, consoleTypeId, date) => {
    try {
      const data = await api.get<any>(
        `${BOOKING_URL}/api/getSlots/vendor/${vendorId}/game/${consoleTypeId}/${date.replaceAll("-", "")}`,
        { timeoutMs: 10_000, retries: 1 }
      );

      if (data.slots) {
        setAvailableSlots(data.slots);
      }
    } catch (error) {
      console.error("Error fetching available slots:", error);
    }
  };

  const handleUpdateBooking = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    if (!bookingData) return;

    try {
      const result = await api.put<any, string>(
        `${BOOKING_URL}/api/update_booking/${bookingId}`,
        JSON.stringify(bookingData),
        {
          headers: { "Content-Type": "application/json" },
          timeoutMs: 12_000,
          retries: 0,
        }
      );
      if (result?.success !== false) {
        setIsSubmitted(true);
      } else {
        toast.error("Failed to update booking.");
      }
    } catch (error) {
      console.error("Error updating booking:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-3">
      <form className="space-y-3">
        {/* Search Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Search Booking</h3>
          <div className="flex space-x-2">
            <input
              id="bookingId"
              placeholder="Enter Booking ID"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="flex-1 px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 text-white"
            />

            <Button variant="success"
              type="button"
              onClick={handleSearch}
              disabled={isLoading} className="min-w-[100px]">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Booking Details */}
        {bookingFound && bookingData && !isSubmitted ? (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">
              Gamer's Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <input
                  value={bookingData.customer?.name || ""}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, name: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={bookingData.customer?.email || ""}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, email: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                <input
                  type="tel"
                  value={bookingData.customer?.phone || ""}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, phone: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 text-white"
                />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white">
              Booking Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Booking Date</label>
                <input
                  type="date"
                  value={bookingData.booking_date || ""}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      booking_date: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Slot Time</label>
                <div className="grid grid-cols-6 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.slot_id}
                      type="button"
                      variant="outline"
                      disabled={!slot.is_available}
                      className={`rounded-full text-xs ${
                        bookingData.selected_slots.includes(slot.start_time)
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : ""
                      }`}
                      onClick={() =>
                        setBookingData((prev) => ({
                          ...prev,
                          selected_slots: [slot.start_time],
                        }))
                      }
                    >
                      {showClock(slot.start_time)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button variant="success" 
              onClick={handleUpdateBooking} 
              disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating…
                </>
              ) : (
                "Update Booking"
              )}
            </Button>
          </div>
        ) : null}

        {/* Success Message */}
        {isSubmitted && (
          <Alert className="bg-emerald-900/20 border-emerald-500">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-300">
              Booking has been successfully updated.
            </AlertDescription>
          </Alert>
        )}
      </form>
    </div>
  );
}

// ==================== REJECT BOOKING FORM ====================
function RejectBookingForm() {
  const api = useApiClient()
  const { time: showClock } = useTimeFormat()
  const [bookingId, setBookingId] = useState("");
  const [bookingFound, setBookingFound] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [repaymentType, setRepaymentType] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [bookingData, setBookingData] = useState(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [isConfirmingRejection, setIsConfirmingRejection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [vendorId, setVendorId] = useState(null);

  useEffect(() => {
    setVendorId(decodeVendorIdFromStorage());
  }, []);

  const handleSearch = async () => {
    if (!bookingId) return;

    setIsLoading(true);
    try {
      const data = await api.get<any>(`${BOOKING_URL}/api/bookings/${bookingId}`, {
        timeoutMs: 10_000,
        retries: 1,
      });

      if (data.success && data.booking) {
        setIsSubmitted(false);
        const { booking } = data;
        setBookingData({
          customer: booking.customer || { name: "", email: "", phone: "" },
          booking_date: booking.date || "",
          booking_id: booking.booking_id,
          selected_slots: [`${booking.time_slot.start_time}`],
          system: booking.system || "",
          vendorId: vendorId,
          consoleTypeId: booking.game_id,
          start_time: booking.time_slot.start_time,
          end_time: booking.time_slot.end_time,
          amount_paid: booking.amount_paid,
        });
        setUserEmail(booking.customer?.email || "");
        setBookingFound(true);
      } else {
        setBookingFound(false);
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      setBookingFound(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!confirmReject) {
      setConfirmReject(true);
      return;
    }

    setIsConfirmingRejection(true);
    setIsLoading(true);

    try {
      const response = await api.post<any, string>(
        `${BOOKING_URL}/api/bookings/reject`,
        JSON.stringify({
          booking_id: bookingId,
          rejection_reason: rejectionReason,
          repayment_type: repaymentType,
          user_email: userEmail,
        }),
        {
          headers: creditAuthHeaders(),
          timeoutMs: 12_000,
          retries: 0,
        }
      );

      if (response?.success !== false) {
        setIsSubmitted(true);
      } else {
        console.error("Error rejecting booking");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsConfirmingRejection(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="p-3">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Search Booking</h3>
          <div className="flex space-x-2">
            <input
              placeholder="Enter Booking ID"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="flex-1 px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 text-white"
            />
            <Button variant="success"
              type="button"
              onClick={handleSearch}
              disabled={isLoading} className="min-w-[100px]">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>

        {isSubmitted ? (
          <Alert className="bg-emerald-900/20 border-emerald-500">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-300">
              Booking has been successfully rejected.
            </AlertDescription>
          </Alert>
        ) : (
          <AnimatePresence>
            {bookingFound && bookingData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-3"
              >
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">
                    Booking Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Card className="bg-muted/30 p-3">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Booking ID</span>
                          <span className="font-medium text-white">
                            {bookingData.booking_id || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date</span>
                          <span className="font-medium text-white">
                            {bookingData.booking_date || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time Slot</span>
                          <span className="font-medium text-white">
                            {showClock(bookingData.start_time)} – {showClock(bookingData.end_time)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">System</span>
                          <span className="font-medium text-white">
                            {bookingData.system || ""}
                          </span>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-muted/30 p-3">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Customer</span>
                          <span className="font-medium text-white">
                            {bookingData.customer?.name || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email</span>
                          <span className="font-medium text-white">
                            {bookingData.customer?.email || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Phone</span>
                          <span className="font-medium text-white">
                            {bookingData.customer?.phone || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount Paid</span>
                          <span className="font-medium text-white">
                            ₹{bookingData.amount_paid || ""}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">
                    Rejection Details
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Reason for Rejection
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a detailed reason for rejecting this booking..."
                        className="w-full min-h-[100px] px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 text-white resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Repayment Method
                      </label>
                      <Select value={repaymentType} onValueChange={setRepaymentType}>
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder="Select repayment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="refund">
                            Full Refund to Original Payment Method
                          </SelectItem>
                          <SelectItem value="credit">Store Credit</SelectItem>
                          <SelectItem value="reschedule">
                            Reschedule to Another Date
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {confirmReject ? (
                  <Alert variant="destructive" className="mt-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        Are you sure you want to reject this booking? This action cannot be undone.
                      </span>
                      <div className="flex space-x-2 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setConfirmReject(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="destructive"
                          disabled={isConfirmingRejection || isLoading}
                        >
                          {isConfirmingRejection || isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Confirming...
                            </>
                          ) : (
                            "Confirm Rejection"
                          )}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Button
                    type="submit"
                    variant="destructive"
                    className="w-full"
                    disabled={!rejectionReason || !repaymentType}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Booking
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </form>
    </div>
  );
}

// ==================== LIST BOOKING COMPONENT ====================
function ListBooking() {
  const api = useApiClient()
  const { format: clockFormat } = useTimeFormat()
  interface BookingType {
    id: string;
    bookingDate: string;
    bookingTime: string;
    username: string;
    consoleType: string;
    bookedDate: string;
    startTime: string | null;
    endTime: string | null;
    status: string;
    type: string;
  }

  const [vendorId, setVendorId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState(null);
  const [expandedDates, setExpandedDates] = useState({});

  const toggleDate = (date) => {
    setExpandedDates((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  const groupedBookings = useMemo(() => {
    const groups = {};
    filteredBookings.forEach((booking) => {
      const bookedDate = booking.bookedDate;
      if (!groups[bookedDate]) {
        groups[bookedDate] = [];
      }
      groups[bookedDate].push(booking);
    });
    return groups;
  }, [filteredBookings]);

  useEffect(() => {
    setVendorId(decodeVendorIdFromStorage());
  }, []);

  const fetchData = async () => {
    try {
      const formattedDate = getISTMonthStartCompact();
      const rows = await api.get<any[]>(
        `${BOOKING_URL}/api/getAllBooking/vendor/${vendorId}/${formattedDate}/`,
        { headers: { "Content-Type": "application/json" }, timeoutMs: 12_000, retries: 1 }
      );

      const mappedBookings = (Array.isArray(rows) ? rows : []).map((booking) => ({
        id: booking.bookingId.toString(),
        bookingDate: booking.bookingDate,
        bookingTime: booking.bookingTime,
        username: booking.userName,
        consoleType: booking.consoleType,
        bookedDate: booking.bookedDate,
        startTime: booking.startTime || null,
        endTime: booking.endTime || null,
        status: booking.status,
        type: booking.type,
      }));

      setBookings(mappedBookings);
      setFilteredBookings(mappedBookings);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    if (!vendorId) return;
    fetchData();
  }, [vendorId]);

  useEffect(() => {
    if (!sortConfig) return;
    const sorted = [...filteredBookings].sort((a, b) => {
      if (sortConfig.key === "bookingDate") {
        const dateA = new Date(a.bookingDate);
        const dateB = new Date(b.bookingDate);
        return sortConfig.direction === "asc"
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      } else {
        const valueA = a[sortConfig.key]?.toString().toLowerCase() || "";
        const valueB = b[sortConfig.key]?.toString().toLowerCase() || "";
        if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      }
    });
    setFilteredBookings(sorted);
  }, [sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredBookings(bookings);
    } else {
      const lower = searchQuery.toLowerCase();
      const results = bookings.filter((booking) =>
        Object.values(booking).some((value) => value.toString().toLowerCase().includes(lower))
      );
      setFilteredBookings(results);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery]);

  const getStatusBadge = (status) => {
    const variants = {
      rejected: "border border-red-400/40 bg-red-500/15 text-red-200",
      confirmed: "border border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
    };
    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          variants[status] || "border border-border bg-muted/60 text-foreground"
        }`}
      >
        {status}
      </span>
    );
  };

  const formatTime = (time) => {
    if (typeof time === "number") {
      const date = new Date(time);
      return formatMinutes(date.getHours() * 60 + date.getMinutes(), clockFormat);
    }
    return formatClock(time, clockFormat);
  };

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <input
          placeholder="Search bookings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full flex-1 rounded-lg border border-border bg-muted/70 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
        />
        <Button onClick={handleSearch} className="ui-action-primary">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow className="bg-muted/80">
              {[
                { label: "Booked Date", key: "bookedDate" },
                { label: "Username", key: "username" },
                { label: "Status", key: "status" },
                { label: "Booking ID", key: "id" },
                { label: "Booking Date", key: "bookingDate" },
                { label: "Booking Time", key: "bookingTime" },
                { label: "Console Type", key: "consoleType" },
                { label: "Start Time", key: "startTime" },
                { label: "End Time", key: "endTime" },
                { label: "Type", key: "type" },
              ].map(({ label, key }) => (
                <TableHead
                  key={key}
                  className="cursor-pointer font-semibold text-foreground hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort(key)}
                >
                  {label}{" "}
                  {sortConfig?.key === key && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedBookings).map(([bookedDate, bookings]) => (
              <React.Fragment key={bookedDate}>
                <TableRow
                  className="cursor-pointer bg-muted/60 hover:bg-muted/70"
                  onClick={() => toggleDate(bookedDate)}
                >
                  <TableCell colSpan={10} className="font-semibold text-foreground">
                    {expandedDates[bookedDate] ? "▼" : "▶"}{" "}
                    {new Date(bookedDate).toDateString()} ({bookings.length})
                  </TableCell>
                </TableRow>

                {expandedDates[bookedDate] &&
                  bookings.map((booking, idx) => (
                    <motion.tr
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-muted/60"
                    >
                      <TableCell className="text-foreground">{booking.bookedDate}</TableCell>
                      <TableCell className="text-foreground">{booking.username}</TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{booking.id}</TableCell>
                      <TableCell className="text-muted-foreground">{booking.bookingDate}</TableCell>
                      <TableCell className="text-muted-foreground">{booking.bookingTime}</TableCell>
                      <TableCell className="text-muted-foreground">{booking.consoleType}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {booking.startTime ? formatTime(booking.startTime) : "Not started"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {booking.endTime ? formatTime(booking.endTime) : "Not ended"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{booking.type}</TableCell>
                    </motion.tr>
                  ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}


interface SlotManagementProps {
  embedded?: boolean
  slab?: boolean
  // Only host the New session form (the station map opens it for one station).
  formOnly?: boolean
}

function DashboardQuickBookingSlab({
  availableConsoles,
  selectedConsole,
  selectedSlots,
  onConsoleChange,
  onSlotSelect,
  onNewBooking,
  onQuickBooking,
  allSlots,
  onDateChange,
}: {
  availableConsoles: ConsoleType[]
  selectedConsole: ConsoleFilter
  selectedSlots: SelectedSlot[]
  onConsoleChange: (gameConsole: ConsoleFilter) => void
  onSlotSelect: (slot: SelectedSlot) => void
  onNewBooking: () => void
  onQuickBooking: (slot: SelectedSlot) => void
  allSlots: { [key: string]: any[] }
  onDateChange: () => void
}) {
  const { time: showClock } = useTimeFormat()
  const calendarToday = getISTDateString(0)
  const [chosenDate, setChosenDate] = useState("")
  const dates = Object.keys(allSlots).filter(date => date >= calendarToday).sort()
  const today = dates.includes(chosenDate) ? chosenDate : calendarToday
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

  // Follow console changes made outside the strip, such as a booking shortcut.
  useEffect(() => {
    if (selectedConsole && selectedConsole !== quickConsole && activeConsoles.some((item) => item.type === selectedConsole)) {
      setQuickConsole(selectedConsole)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConsole])

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
      base_price: slot.base_slot_price ?? undefined,
      available_count: slot.available_slot || 0,
    }
    if (openBooking) onQuickBooking(selectedSlot)
    else onSlotSelect(selectedSlot)
  }

  return (
    <div className="dashboard-quick-booking">
      <div className="dashboard-quick-toolbar">
      <h2 className="dashboard-slab-title">Quick Booking</h2>
      <select aria-label="Quick booking date" value={today}
        onChange={event => { setChosenDate(event.target.value); onDateChange() }}
        className="h-9 rounded-md border border-border bg-background px-2 text-sm">
        {(dates.length ? dates : [calendarToday]).map(date => <option key={date} value={date}>
          {date === calendarToday ? "Today" : date === getISTDateString(1) ? "Tomorrow" : date} · {date}
        </option>)}
      </select>
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
              title={`${consoleItem.name || consoleItem.type}: ${openSlotCount} open on ${today}`}
              aria-label={`${consoleItem.name || consoleItem.type}, ${openSlotCount} open on ${today}`}
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
      <div className="dashboard-slot-slider" aria-label={`Available slots on ${today}`}>
        {!selectedConsoleItem ? (
          <div className="dashboard-slot-empty">Select console</div>
        ) : todaySlots.length === 0 ? (
          <div className="dashboard-slot-empty">No available slots on this date</div>
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
                title={`${showClock(slot.start_time)} - ${slot.available_slot || 0} left. Click to select; double-click to book.`}
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
                  {showClock(slot.start_time)}
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

export default function SlotManagement({ embedded = false, slab = false, formOnly = false }: SlotManagementProps) {
  const { moduleCache, moduleVersions, setModuleCache } = useDashboardData()
  const [selectedConsole, setSelectedConsole] = useState<ConsoleFilter>("")
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([])
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [bookingPreset, setBookingPreset] = useState<BookingPreset | null>(null)
  const [availableConsoles, setAvailableConsoles] = useState<ConsoleType[]>([])
  const [allSlots, setAllSlots] = useState<{ [key: string]: any[] }>({})
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [recordsRevision, setRecordsRevision] = useState(0)
  const [bookingDay, setBookingDay] = useState(() => getISTDateString(0))
  useEffect(() => {
    setSelectedSlots(slots => slots.filter(slot => !isPastSlotInIST(slot.date, slot.end_time, slot.start_time)))
  }, [bookingDay])
  useEffect(() => {
    const checkDay = () => setBookingDay(getISTDateString(0))
    const timer = window.setInterval(checkDay, 1000)
    window.addEventListener("focus", checkDay)
    return () => { window.clearInterval(timer); window.removeEventListener("focus", checkDay) }
  }, [])
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
      console.log(
        `Loaded ${dedupedBookings.length} unique ${isPastDate ? 'past' : 'active'} bookings (raw: ${rawBookings.length})`
      )
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

    const dayChanged = cachedBooking?.dates?.[0] !== bookingDay
    const shouldRefresh = !cachedBooking || bookingVersion > 0 || dayChanged
    if (!shouldRefresh) return

    if (!cachedBooking && !hasLocalSnapshot) {
      setIsLoading(true)
    }

    const shouldUseFastPath = !cachedBooking && !hasLocalSnapshot && bookingVersion <= 0

    loadBookingData(vendorId, {
      forceFresh: bookingVersion > 0 || dayChanged,
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
  }, [vendorId, bookingVersion, bookingDay])

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

  // Booking shortcuts (Alt+Shift+key, set in Account Settings → Keyboard Shortcuts)
  // open the booking form with that console type preselected.
  const shortcutState = useRef({ availableConsoles, showBookingForm, selectedSlots })
  shortcutState.current = { availableConsoles, showBookingForm, selectedSlots }
  const openConsoleBooking = (type: string, detail?: BookConsoleEventDetail) => {
    const { availableConsoles, showBookingForm, selectedSlots } = shortcutState.current
    const consoleItem = (detail?.gameId ? availableConsoles.find((item) => Number(item.id) === Number(detail.gameId)) : undefined)
      || availableConsoles.find((item) => item.type === type)
    if (!consoleItem) {
      toast.error("That console type has no bookable consoles right now.")
      return
    }
    if (showBookingForm && selectedSlots.length > 0) {
      toast.info("Finish or close the current booking before switching console.")
      return
    }
    handleConsoleChange(consoleItem.type)
    setBookingPreset(detail?.stationId ? {
      stationId: detail.stationId, startClock: detail.startClock, durationMin: detail.durationMin,
      customer: detail.customer ? { name: detail.customer.name, phone: detail.customer.phone, email: detail.customer.email || "" } : undefined,
      extendsBookingId: detail.extendsBookingId,
    } : null)
    setShowBookingForm(true)
  }
  const openConsoleBookingRef = useRef(openConsoleBooking)
  openConsoleBookingRef.current = openConsoleBooking

  useEffect(() => {
    const onBookConsole = (event: Event) => {
      if (event.defaultPrevented) return // another booking workspace took it
      const detail = (event as CustomEvent<BookConsoleEventDetail>).detail
      const type = detail?.type
      if (!type) return
      event.preventDefault()
      openConsoleBookingRef.current(type, detail)
    }
    window.addEventListener(BOOK_CONSOLE_EVENT, onBookConsole)
    return () => window.removeEventListener(BOOK_CONSOLE_EVENT, onBookConsole)
  }, [])

  useEffect(() => {
    if (availableConsoles.length === 0) return
    const pending = takePendingConsoleBooking()
    if (pending) openConsoleBookingRef.current(pending)
  }, [availableConsoles])

  const handleBookingComplete = () => {
    setRecordsRevision(value => value + 1)
    setSelectedSlots([])
    // The success event refreshes inventory and dashboard data together.
  }

  const hasRenderableSnapshot =
    availableConsoles.length > 0 && Object.keys(allSlots || {}).length > 0

  const bookingForm = (
    <SlotBookingForm
      key={recordsRevision}
      isOpen={showBookingForm}
      onClose={() => { setShowBookingForm(false); setBookingPreset(null) }}
      selectedSlots={selectedSlots}
      defaultConsoleId={availableConsoles.find(console => console.type === selectedConsole)?.id}
      onReplaceSlots={setSelectedSlots}
      onRemoveSelectedSlot={handleRemoveSelectedSlot}
      onSlotSelect={handleSlotSelect}
      allSlots={allSlots}
      onBookingComplete={handleBookingComplete}
      availableConsoles={availableConsoles}
      preset={bookingPreset}
      initialCustomer={bookingPreset?.customer}
    />
  )

  if (formOnly) return bookingForm

  if (isLoading && !hasRenderableSnapshot) {
    return (
      <main className={embedded ? "h-full min-h-0 bg-background flex items-center justify-center" : "min-h-screen bg-background flex items-center justify-center"}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground">Loading slot data…</p>
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
          <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
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
                onDateChange={() => setSelectedSlots([])}
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

      {bookingForm}
    </main>
  )
}
