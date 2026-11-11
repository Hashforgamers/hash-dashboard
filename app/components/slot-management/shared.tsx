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

export type PillColor = "green" | "blue" | "purple" | "yellow" | "red"
export type ConsoleFilter = string
export type SquadPricingMode = "squad_discount" | "controller_pricing" | "solo_only"

export interface SelectedSlot {
  slot_id: number
  date: string
  start_time: string
  end_time: string
  console_id: number
  console_name: string
  console_price: number
  available_count: number
}

// ADD THIS NEW INTERFACE
export interface ActivePricingEntry {
  available_game_id: number
  console_type: string
  price: number
  is_offer: boolean
  default_price: number
  offer_name?: string
  discount_percentage?: number
}

export interface ControllerTierRule {
  quantity: number
  total_price: number
}

export interface ControllerPricingConfig {
  base_price: number
  tiers: ControllerTierRule[]
}

export const normalizeControllerType = (name: string | undefined): "ps5" | "xbox" | null => {
  const value = (name || "").toLowerCase()
  if (value.includes("ps") || value.includes("playstation")) return "ps5"
  if (value.includes("xbox")) return "xbox"
  return null
}

export const resolveConsoleIcon = (iconKey?: string, slugHint?: string) => {
  return resolveCatalogIcon(iconKey, slugHint)
}

export const resolveConsoleColor = (slugHint?: string) => {
  return resolveCatalogColor(slugHint)
}

export const calculateControllerFare = (config: ControllerPricingConfig, quantity: number): number => {
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

export interface SelectedMeal {
  menu_item_id: number
  name: string
  price: number
  quantity: number
  total: number
  category: string
}

export interface UserSuggestion {
  id?: number
  name: string
  email: string
  phone: string
}

export interface UserPassOption {
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

export interface BookingFieldConfig {
  name: { visible: boolean; required: boolean }
  phone: { visible: boolean; required: boolean }
  email: { visible: boolean; required: boolean }
}

export interface SquadPlatformRule {
  enabled: boolean
  max_players: number
  pricing_mode: SquadPricingMode
  console_slug?: string
  display_name?: string
  input_mode?: string
  controller_policy?: string
}

export interface SquadMemberInput {
  id: string
  name: string
  phone: string
}

export interface SlotBookingFormProps {
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
}

export const resolveSafeConsoleIcon = (iconCandidate: unknown, slugHint?: string) => {
  if (typeof iconCandidate === "function") return iconCandidate as any
  return resolveConsoleIcon(undefined, slugHint)
}

export const sanitizeConsoleEntry = (entry: any): ConsoleType => {
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
export const requestCache = new Map<string, { data: any; timestamp: number }>()
export const CACHE_TTL = 120 * 1000 // 2 minutes for booking freshness
export const SNAPSHOT_TTL = 5 * 60 * 1000 // 5 minutes persistent snapshot for fast reload
export const IST_TIMEZONE = "Asia/Kolkata"

export const decodeVendorIdFromStorage = (): number | null => {
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

export const getISTDateParts = (date: Date) => {
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

export const getISTDateString = (offsetDays = 0): string => {
  const shifted = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  const { year, month, day } = getISTDateParts(shifted)
  return `${year}-${month}-${day}`
}

export const normalizeBookedDate = (raw: string): string => {
  const trimmed = (raw || "").trim()
  if (!trimmed) return ""
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`
  }
  return trimmed
}

export const getCurrentISTMinutes = (): number => {
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

export const toMinutes = (timeValue: string): number => {
  const parts = String(timeValue || "").split(":")
  if (parts.length < 2) return Number.NaN
  const hours = Number(parts[0])
  const minutes = Number(parts[1])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.NaN
  return hours * 60 + minutes
}

export const getSlotEndTimestampIST = (slotDate: string, slotStartTime: string, slotEndTime: string): number => {
  const rawEndTs = new Date(`${slotDate}T${slotEndTime}+05:30`).getTime()
  if (!Number.isFinite(rawEndTs)) return Number.NaN
  const startMinutes = toMinutes(slotStartTime)
  const endMinutes = toMinutes(slotEndTime)
  if (Number.isFinite(startMinutes) && Number.isFinite(endMinutes) && endMinutes <= startMinutes) {
    return rawEndTs + 24 * 60 * 60 * 1000
  }
  return rawEndTs
}

export const isPastSlotInIST = (slotDate: string, slotEndTime: string, slotStartTime = "00:00"): boolean => {
  const slotEndTs = getSlotEndTimestampIST(slotDate, slotStartTime, slotEndTime)
  return Number.isFinite(slotEndTs) && Date.now() >= slotEndTs
}

export const getISTMonthStartCompact = (): string => {
  const { year, month } = getISTDateParts(new Date())
  return `${year}${month}01`
}

export function getCachedData(key: string) {
  const cached = requestCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

export function setCachedData(key: string, data: any) {
  requestCache.set(key, { data, timestamp: Date.now() })
}

// ============= OPTIMIZATION 2: Request Deduplication =============
export const pendingRequests = new Map<string, Promise<any>>()

export async function fetchWithDedup(url: string): Promise<any> {
  const cached = getCachedData(url)
  if (cached) {
    console.log(`✅ Cache hit: ${url}`)
    return cached
  }

  if (pendingRequests.has(url)) {
    console.log(`⏳ Deduped request: ${url}`)
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
export async function fetchSlotsBatch(vendorId: number, gameIds: number[], dates: string[], forceFresh = false) {
  const url = `${BOOKING_URL}/api/getSlotsBatch/vendor/${vendorId}${forceFresh ? "?refresh=1" : ""}`
  
  const cacheKey = `batch:${vendorId}:${gameIds.join(',')}:${dates.join(',')}`
  const cached = forceFresh ? null : getCachedData(cacheKey)
  if (!forceFresh && cached) {
    console.log(`✅ Batch cache hit`)
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

    console.log('✅ Batch fetch successful:', data)
    setCachedData(cacheKey, data)
    return data
  } catch (error) {
    console.error('❌ Batch fetch error:', error)
    throw error  // ✅ THROW ERROR instead of returning null
  }
}

// Update this constant
export const PAYMENT_TYPES = ['Cash', 'UPI', 'pay_at_cafe', 'Pass', 'Monthly Credit'] as const
// Methods that need no extra step are remembered between bookings; Pass and Monthly Credit always start fresh.
export const REMEMBERED_PAYMENT_TYPES = ['Cash', 'UPI', 'pay_at_cafe']
export const LAST_PAYMENT_KEY = 'hfg_last_payment_method_v1'
/** Indian mobile: 10 digits once a +91 or 0 prefix is removed. */
export const looksLikeMobile = (raw: string) => /^[6-9]\d{9}$/.test(raw.replace(/[\s-]/g, '').replace(/^(\+91|0)/, ''))
export const DEFAULT_SQUAD_PRICING_POLICY_FALLBACK: Record<string, Record<string, number>> = {
  pc: { "2": 0, "3": 3, "4": 5, "5": 8 },
}

export const CONSOLE_GROUP_ALIASES: Record<string, string> = {
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

export const normalizeConsoleSlugLikeBackend = (raw: string | undefined | null): string => {
  return normalizeCatalogSlug(raw)
}

export const toLegacySquadGroup = (rawSlugOrGroup: string | undefined | null): string => {
  const normalized = normalizeConsoleSlugLikeBackend(rawSlugOrGroup)
  return CONSOLE_GROUP_ALIASES[normalized] || normalized
}

export const resolveControllerPricingKey = (rawSlugOrGroup: string | undefined | null): "ps5" | "xbox" | null => {
  const normalized = normalizeConsoleSlugLikeBackend(rawSlugOrGroup)
  if (!normalized) return null
  if (["ps", "ps4", "ps5", "playstation"].includes(normalized)) return "ps5"
  if (normalized.includes("xbox")) return "xbox"
  return null
}

export const DEFAULT_BOOKING_FIELD_CONFIG: BookingFieldConfig = {
  name: { visible: true, required: true },
  phone: { visible: true, required: true },
  email: { visible: true, required: false },
}

export interface SlotManagementProps {
  embedded?: boolean
  slab?: boolean
}
