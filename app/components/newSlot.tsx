"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { jwtDecode } from 'jwt-decode'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
  Headset,
  CalendarDays,
  Users,
  Sparkles,
  Ticket,
  AlertCircle,
  Clock
} from "lucide-react"
import { BOOKING_URL, DASHBOARD_URL } from '@/src/config/env'
import { ConsoleType } from './types'
import MealSelector from './mealSelector'
import CreditAccountModal, { type MonthlyCreditAccountSummary } from './credit-account-modal'

type PillColor = "green" | "blue" | "purple" | "yellow" | "red"
type ConsoleFilter = "PC" | "PS5" | "Xbox" | "VR"

interface SelectedSlot {
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
  if (value.includes("ps")) return "ps5"
  if (value.includes("xbox")) return "xbox"
  return null
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
import axios from "axios"
import { useDashboardData } from "@/app/context/DashboardDataContext"

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

interface SquadMemberInput {
  id: string
  name: string
  phone: string
}

interface SlotBookingFormProps {
  isOpen: boolean
  onClose: () => void
  selectedSlots: SelectedSlot[]
  onBookingComplete: () => void
  availableConsoles: ConsoleType[]
}

// ============= OPTIMIZATION 1: Request Cache =============
const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 20 * 1000 // 20 seconds for booking freshness
const IST_TIMEZONE = "Asia/Kolkata"

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

const isPastSlotInIST = (slotDate: string, slotEndTime: string): boolean => {
  const slotEndTs = new Date(`${slotDate}T${slotEndTime}+05:30`).getTime()
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
    console.log(`✅ Cache hit: ${url}`)
    return cached
  }

  if (pendingRequests.has(url)) {
    console.log(`⏳ Deduped request: ${url}`)
    return pendingRequests.get(url)
  }

  const promise = fetch(url)
    .then(res => res.json())
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
  const url = `${BOOKING_URL}/api/getSlotsBatch/vendor/${vendorId}${forceFresh ? `?t=${Date.now()}` : ""}`  // ✅ CORRECT ENDPOINT
  
  const cacheKey = `batch:${vendorId}:${gameIds.join(',')}:${dates.join(',')}`
  const cached = forceFresh ? null : getCachedData(cacheKey)
  if (!forceFresh && cached) {
    console.log(`✅ Batch cache hit`)
    return cached
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        game_ids: gameIds,  // ✅ CORRECT KEY NAME
        dates: dates 
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Batch API error:', errorText)
      throw new Error(`Batch fetch failed: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('✅ Batch fetch successful:', data)
    if (!forceFresh) {
      setCachedData(cacheKey, data)
    }
    return data
  } catch (error) {
    console.error('❌ Batch fetch error:', error)
    throw error  // ✅ THROW ERROR instead of returning null
  }
}

// Update this constant
const PAYMENT_TYPES = ['Cash', 'UPI', 'Pass', 'Monthly Credit'] as const
const DEFAULT_SQUAD_PRICING_POLICY: Record<string, Record<string, number>> = {
  pc: { "2": 0, "3": 3, "4": 5, "5": 8 },
}

const SQUAD_PLATFORM_RULES: Record<string, { enabled: boolean; maxPlayers: number; pricingMode: "squad_discount" | "controller_pricing" | "solo_only" }> = {
  pc: { enabled: true, maxPlayers: 10, pricingMode: "squad_discount" },
  ps: { enabled: true, maxPlayers: 4, pricingMode: "controller_pricing" },
  xbox: { enabled: true, maxPlayers: 4, pricingMode: "controller_pricing" },
  vr: { enabled: false, maxPlayers: 1, pricingMode: "solo_only" },
}


function SlotBookingForm({ 
  isOpen, 
  onClose, 
  selectedSlots, 
  onBookingComplete,
  availableConsoles 
}: SlotBookingFormProps) {
  console.log('🎯 SlotBookingForm rendered with:', { 
    isOpen, 
    selectedSlotsCount: selectedSlots.length,
    selectedSlots 
  })

  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [paymentType, setPaymentType] = useState<string>('Cash')
  const [passUid, setPassUid] = useState('')
  const [validatedPass, setValidatedPass] = useState<any>(null)
  const [isValidatingPass, setIsValidatingPass] = useState(false)
  const [passError, setPassError] = useState('')
  const [isSquadMode, setIsSquadMode] = useState<boolean>(false)
  const [squadPlayerCount, setSquadPlayerCount] = useState<number>(2)
  const [squadMembers, setSquadMembers] = useState<SquadMemberInput[]>([])
  const [waiveOffAmount, setWaiveOffAmount] = useState<number>(0)
  const [extraControllerQty, setExtraControllerQty] = useState<number>(0)
  const [extraControllerFare, setExtraControllerFare] = useState<number>(0)
  const [autoWaiveOffAmount, setAutoWaiveOffAmount] = useState<number>(0)
  const [controllerPricingConfig, setControllerPricingConfig] = useState<ControllerPricingConfig>({
    base_price: 0,
    tiers: []
  })
  const [hasControllerPricingConfigured, setHasControllerPricingConfigured] = useState<boolean>(false)
  const [isControllerPricingLoading, setIsControllerPricingLoading] = useState<boolean>(false)
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([])
  const [isMealSelectorOpen, setIsMealSelectorOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activePricing, setActivePricing] = useState<Record<string, ActivePricingEntry>>({})
  const [squadPricingPolicy, setSquadPricingPolicy] = useState<Record<string, Record<string, number>>>({})




  const [userList, setUserList] = useState<{ id?: number; name: string; email: string; phone: string }[]>([])
  const [emailSuggestions, setEmailSuggestions] = useState<{ id?: number; name: string; email: string; phone: string }[]>([])
  const [phoneSuggestions, setPhoneSuggestions] = useState<{ id?: number; name: string; email: string; phone: string }[]>([])
  const [nameSuggestions, setNameSuggestions] = useState<{ id?: number; name: string; email: string; phone: string }[]>([])
  const [focusedInput, setFocusedInput] = useState<string>('')
  const [focusedSquadMemberId, setFocusedSquadMemberId] = useState<string | null>(null)
  const [squadMemberSuggestions, setSquadMemberSuggestions] = useState<Record<string, UserSuggestion[]>>({})
  const [creditAccount, setCreditAccount] = useState<MonthlyCreditAccountSummary | null>(null)
  const [creditAccountLoading, setCreditAccountLoading] = useState(false)
  const [creditAccountError, setCreditAccountError] = useState('')
  const [showCreditAccountModal, setShowCreditAccountModal] = useState(false)
  const blurTimeoutRef = useRef<number | null>(null)


  const getVendorIdFromToken = (): number | null => {
    console.log('🔍 Getting vendor ID from token...')
    const token = localStorage.getItem('jwtToken')
    if (!token) {
      console.log('❌ No JWT token found')
      return null
    }
    try {
      const decoded = jwtDecode<{ sub: { id: number } }>(token)
      console.log('🔓 Decoded token:', decoded)
      const vendorId = decoded.sub.id
      console.log('🏪 Extracted vendor ID:', vendorId)
      return vendorId
    } catch (error) {
      console.error('❌ Error decoding token:', error)
      return null
    }
  }




  const calculateAutoWaiveOff = (slots: SelectedSlot[]) => {
    console.log('💰 Calculating auto waive-off for slots:', slots)
    
    const nowTs = Date.now()
    console.log('🕐 Current IST time:', new Date().toLocaleTimeString('en-IN', { timeZone: IST_TIMEZONE }))
    
    let totalAutoWaiveOff = 0
    
    slots.forEach(slot => {
      const slotDateTime = new Date(`${slot.date}T${slot.start_time}+05:30`)
      const slotEndTime = new Date(`${slot.date}T${slot.end_time}+05:30`)
      
      const slotDurationMs = slotEndTime.getTime() - slotDateTime.getTime()
      const slotDurationMinutes = slotDurationMs / (1000 * 60)
      
      console.log(`🕐 Slot Analysis for ${slot.start_time}-${slot.end_time}:`, {
        slotId: slot.slot_id,
        slotDurationMinutes,
        currentTime: new Date(nowTs).toLocaleTimeString('en-IN', { timeZone: IST_TIMEZONE }),
        slotStart: slotDateTime.toLocaleTimeString('en-IN'),
        slotEnd: slotEndTime.toLocaleTimeString('en-IN')
      })
      
      if (nowTs >= slotDateTime.getTime() && nowTs < slotEndTime.getTime()) {
        const elapsedMs = nowTs - slotDateTime.getTime()
        const elapsedMinutes = elapsedMs / (1000 * 60)
        
        const elapsedPercentage = elapsedMinutes / slotDurationMinutes
        const waveOffAmount = slot.console_price * elapsedPercentage
        
        console.log(`💰 Wave-off Calculation:`, {
          elapsedMinutes: Math.round(elapsedMinutes * 10) / 10,
          totalSlotMinutes: slotDurationMinutes,
          elapsedPercentage: Math.round(elapsedPercentage * 100) + '%',
          waveOffAmount: Math.round(waveOffAmount),
          consolePrice: slot.console_price
        })
        
        totalAutoWaiveOff += waveOffAmount
      }
      else if (nowTs < slotDateTime.getTime()) {
        console.log(`⏰ Booking made in advance for ${slot.start_time} - no wave-off needed`)
      }
      else if (nowTs >= slotEndTime.getTime()) {
        console.log(`⚠️ Slot ${slot.start_time} already ended - full wave-off applied`)
        totalAutoWaiveOff += slot.console_price
      }
    })
    
    const finalWaveOff = Math.round(totalAutoWaiveOff)
    console.log('💰 Total auto waive-off calculated:', finalWaveOff)
    return finalWaveOff
  }

  // Add this NEW function


const validatePass = async (uid: string) => {

      const vendorId = getVendorIdFromToken()
    if (!vendorId) {
     
      return null;
    }


  if (!uid.trim() || !vendorId) return
  
  setIsValidatingPass(true)
  setPassError('')
  
  try {
    const response = await fetch(`${BOOKING_URL}/api/pass/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pass_uid: uid.trim(),
        vendor_id: vendorId,
      }),
    })
    
    const data = await response.json()
    
    if (response.ok && data.valid) {
      setValidatedPass(data.pass)
      setPassError('')
      
      // Check if pass has enough hours
      const hoursNeeded = selectedSlots.length * 0.5  // Assuming 30min slots
      if (hoursNeeded > data.pass.remaining_hours) {
        setPassError(`Insufficient hours. Need ${hoursNeeded} hrs, available ${data.pass.remaining_hours} hrs`)
      }
    } else {
      setPassError(data.error || 'Invalid pass')
      setValidatedPass(null)
    }
  } catch (err) {
    setPassError('Failed to validate pass')
    setValidatedPass(null)
  } finally {
    setIsValidatingPass(false)
  }
}


  useEffect(() => {
    if (selectedSlots.length > 0) {
      const autoWaiveOff = calculateAutoWaiveOff(selectedSlots)
      setAutoWaiveOffAmount(autoWaiveOff)
    } else {
      setAutoWaiveOffAmount(0)
    }
  }, [selectedSlots])


// ADD THIS ENTIRE BLOCK
useEffect(() => {
  if (!isOpen) return

  const vendorId = getVendorIdFromToken()
  if (!vendorId) return

  const fetchActivePricing = async () => {
    try {
      const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/active-pricing`)
      const data = await res.json()
      if (data.success) {
        console.log('🏷️ Active pricing loaded:', data.pricing)
        setActivePricing(data.pricing)
      }
    } catch (err) {
      console.error('❌ Failed to fetch active pricing:', err)
    }
  }

  const fetchSquadPricingPolicy = async () => {
    try {
      const res = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/squad-pricing-policy`)
      const data = await res.json()
      if (res.ok && data?.success && data?.policy) {
        setSquadPricingPolicy(data.policy)
      } else {
        setSquadPricingPolicy(DEFAULT_SQUAD_PRICING_POLICY)
      }
    } catch (err) {
      console.error('❌ Failed to fetch squad pricing policy:', err)
      setSquadPricingPolicy(DEFAULT_SQUAD_PRICING_POLICY)
    }
  }

  fetchActivePricing()
  fetchSquadPricingPolicy()
}, [isOpen])


  useEffect(() => {
    if (!isOpen) return

    const vendorId = getVendorIdFromToken()
    if (!vendorId) return
    
    console.log('👥 Fetching user list for vendor:', vendorId)
    
    const userCacheKey = 'userList'
    const cachedData = localStorage.getItem(userCacheKey)

    const isCacheValid = (timestamp: number) => {
      const now = Date.now()
      const tenMinutes = 10 * 60 * 1000
      return now - timestamp < tenMinutes
    }

    const fetchUsers = async () => {
      console.log('🔄 Fetching fresh user data from API...')
      try {
        const response = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`)
        console.log('👥 User API response status:', response.status)
        
        const data = await response.json()
        console.log('👥 User data received:', data)

        if (Array.isArray(data)) {
          setUserList(data)
          localStorage.setItem(
            userCacheKey,
            JSON.stringify({ data, timestamp: Date.now() })
          )
          console.log('✅ User list cached successfully')
        }
      } catch (error) {
        console.error('❌ Error fetching users:', error)
      }
    }

    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData)
        if (isCacheValid(timestamp)) {
          console.log('✅ Using cached user data')
          setUserList(data)
        } else {
          console.log('⏰ Cache expired, fetching fresh data')
          fetchUsers()
        }
      } catch (parseError) {
        console.log('❌ Cache parse error, fetching fresh data')
        fetchUsers()
      }
    } else {
      console.log('📭 No cache found, fetching fresh data')
      fetchUsers()
    }
  }, [isOpen])

  const getSuggestions = (key: keyof typeof userList[0], value: string) => {
    if (!value.trim()) {
      return userList
    }
    
    const filtered = userList.filter((user) =>
      user[key].toLowerCase().includes(value.toLowerCase())
    )
    
    return filtered
  }

  const handleEmailInputChange = (value: string) => {
    setEmail(value)
    const suggestions = getSuggestions('email', value)
    setEmailSuggestions(suggestions)
    setFocusedInput('email')
  }

  const handlePhoneInputChange = (value: string) => {
    setPhone(value)
    const suggestions = getSuggestions('phone', value)
    setPhoneSuggestions(suggestions)
    setFocusedInput('phone')
  }

  const handleNameInputChange = (value: string) => {
    setName(value)
    const suggestions = getSuggestions('name', value)
    setNameSuggestions(suggestions)
    setFocusedInput('name')
  }

  const handleEmailFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setFocusedInput("email")
    const suggestions = getSuggestions("email", email)
    setEmailSuggestions(suggestions)
  }

  const handlePhoneFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setFocusedInput("phone")
    const suggestions = getSuggestions("phone", phone)
    setPhoneSuggestions(suggestions)
  }

  const handleNameFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setFocusedInput("name")
    const suggestions = getSuggestions("name", name)
    setNameSuggestions(suggestions)
  }

  const handleBlur = () => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setFocusedInput("")
      setEmailSuggestions([])
      setPhoneSuggestions([])
      setNameSuggestions([])
      blurTimeoutRef.current = null
    }, 150)
  }

  const handleSuggestionClick = (user: typeof userList[0]) => {
    console.log('👤 User suggestion clicked:', user)
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setEmail(user.email)
    setPhone(user.phone)
    setName(user.name)
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
    if (!isOpen || paymentType !== 'Monthly Credit') return

    const vendorId = getVendorIdFromToken()
    if (!vendorId) return

    let cancelled = false
    const loadCreditAccount = async () => {
      setCreditAccountLoading(true)
      setCreditAccountError('')
      try {
        const res = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/accounts`)
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.message || data?.error || 'Unable to load monthly credit accounts')
        }
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
    console.log('🍽️ Meals confirmed:', meals)
    setSelectedMeals(meals)
    setIsMealSelectorOpen(false)
  }

  // ADD THIS HELPER
const getEffectivePrice = (slot: SelectedSlot): number => {
  const key = slot.console_name.toLowerCase()  // e.g. "ps5", "pc gaming"
  // Try exact key first, then partial match
  const pricingEntry = activePricing[key] || 
    Object.values(activePricing).find(p => 
      p.console_type.toLowerCase() === slot.console_name.toLowerCase()
    )
  if (pricingEntry) return pricingEntry.price
  return slot.console_price
}


  const handleMealSelectorClose = () => {
    console.log('🍽️ Meal selector closed')
    setIsMealSelectorOpen(false)
  }

  const selectedConsoleName = (selectedSlots[0]?.console_name || '').toLowerCase()
  const selectedControllerType = normalizeControllerType(selectedSlots[0]?.console_name)
  const supportsExtraController = selectedControllerType !== null && hasControllerPricingConfigured
  const bookingFlowMode: "solo" | "squad" = isSquadMode ? "squad" : "solo"
  const squadConsoleGroup = (() => {
    if (selectedConsoleName.includes("ps")) return "ps"
    if (selectedConsoleName.includes("xbox")) return "xbox"
    if (selectedConsoleName.includes("vr")) return "vr"
    if (selectedConsoleName.includes("pc")) return "pc"
    return "pc"
  })()
  const squadPlatformRule = SQUAD_PLATFORM_RULES[squadConsoleGroup] || SQUAD_PLATFORM_RULES.vr
  const squadSupported = Boolean(squadPlatformRule.enabled)
  const squadUsesDiscountEngine = squadPlatformRule.pricingMode === "squad_discount"
  const squadPolicyForConsole =
    (squadConsoleGroup === "pc"
      ? (squadPricingPolicy[squadConsoleGroup] || DEFAULT_SQUAD_PRICING_POLICY[squadConsoleGroup] || DEFAULT_SQUAD_PRICING_POLICY.pc)
      : {})
  const squadMaxPlayers = (() => {
    if (squadUsesDiscountEngine) {
      const keys = Object.keys(squadPolicyForConsole).map((k) => Number(k)).filter((v) => !Number.isNaN(v))
      if (keys.length > 0) return Math.max(...keys)
    }
    return Number(squadPlatformRule.maxPlayers || 1)
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
    const query = String(value || "").trim().toLowerCase()
    if (!query) {
      setSquadMemberSuggestions((prev) => ({ ...prev, [memberId]: [] }))
      return
    }
    const matches = userList
      .filter((user) => {
        const nameMatch = String(user.name || "").toLowerCase().includes(query)
        const phoneMatch = String(user.phone || "").toLowerCase().includes(query)
        const emailMatch = String(user.email || "").toLowerCase().includes(query)
        return nameMatch || phoneMatch || emailMatch
      })
      .slice(0, 5)
    setSquadMemberSuggestions((prev) => ({ ...prev, [memberId]: matches }))
    setFocusedSquadMemberId(memberId)
  }

  const handleSquadMemberFocus = (memberId: string, currentQuery = "") => {
    const query = String(currentQuery || "").trim().toLowerCase()
    const matches = (query
      ? userList.filter((user) => {
          const nameMatch = String(user.name || "").toLowerCase().includes(query)
          const phoneMatch = String(user.phone || "").toLowerCase().includes(query)
          const emailMatch = String(user.email || "").toLowerCase().includes(query)
          return nameMatch || phoneMatch || emailMatch
        })
      : userList
    ).slice(0, 5)
    setFocusedSquadMemberId(memberId)
    setSquadMemberSuggestions((prev) => ({ ...prev, [memberId]: matches }))
  }

  const handleSquadMemberBlur = (memberId: string) => {
    window.setTimeout(() => {
      setFocusedSquadMemberId((current) => (current === memberId ? null : current))
      setSquadMemberSuggestions((prev) => ({ ...prev, [memberId]: [] }))
    }, 140)
  }

  const handleSquadMemberSuggestionPick = (memberId: string, user: UserSuggestion) => {
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
        const response = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/controller-pricing`)
        if (!response.ok) throw new Error("Failed to fetch controller pricing")
        const data = await response.json()
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
  }, [selectedControllerType])

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
    if (!isSquadMode || !selectedControllerType) return
    if (extraControllerQty !== suggestedExtraControllerQty) {
      setExtraControllerQty(suggestedExtraControllerQty)
    }
  }, [isSquadMode, selectedControllerType, suggestedExtraControllerQty, extraControllerQty])

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
  const squadConsoleMultiplier = isSquadMode && squadConsoleGroup === "pc" ? squadPlayerCount : 1
  const consoleTotal = isSquadMode ? Number((consoleUnitTotal * squadConsoleMultiplier).toFixed(2)) : consoleUnitTotal
  const squadDiscountPercent = (() => {
    if (!isSquadMode || !squadUsesDiscountEngine) return 0
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
  const totalAmount = Math.max(
    0,
    consoleTotal - squadDiscountAmount - waiveOffAmount - autoWaiveOffAmount + extraControllerFare + mealsTotal
  )

  const paymentMethodMeta: Record<string, {
    icon: React.ComponentType<{ className?: string }>
    hint: string
    accent: string
  }> = {
    Cash: {
      icon: Wallet,
      hint: "Collect directly at desk",
      accent: "emerald",
    },
    UPI: {
      icon: CreditCard,
      hint: "Scan and pay instantly",
      accent: "sky",
    },
    Pass: {
      icon: Ticket,
      hint: "Validate and redeem hours",
      accent: "violet",
    },
    "Monthly Credit": {
      icon: Clock,
      hint: "Bill in monthly cycle",
      accent: "amber",
    },
  }

  const paymentMethodCard = (
    <Card className="sb-card p-4 sm:p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-yellow-100 p-1 dark:bg-yellow-900/30">
            <CreditCard className="h-4 w-4 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Payment Method</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pick one to finish quickly</p>
          </div>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-300">
          Selected: {paymentType}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {PAYMENT_TYPES.map((type) => (
          (() => {
            const meta = paymentMethodMeta[type]
            const Icon = meta.icon
            const isActive = paymentType === type
            const iconClass = isActive
              ? "payment-option-icon-active"
              : "payment-option-icon"
            return (
              <motion.button
                key={type}
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setPaymentType(type)
                  if (type !== 'Pass') {
                    setPassUid('')
                    setValidatedPass(null)
                    setPassError('')
                  }
                  if (errors.payment) setErrors((prev) => ({ ...prev, payment: '' }))
                }}
                className={cn(
                  "payment-option-card group min-h-[72px] rounded-xl p-3 transition-all duration-200",
                  isActive
                    ? "payment-option-card-active"
                    : ""
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors", iconClass)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span
                    className={cn(
                      "payment-option-dot h-2.5 w-2.5 rounded-full",
                      isActive ? "payment-option-dot-active" : ""
                    )}
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-white text-left leading-tight">
                  {type === "Monthly Credit" ? "Credit" : type}
                </p>
              </motion.button>
            )
          })()
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {paymentMethodMeta[paymentType]?.hint}
      </p>
      {paymentType === 'Monthly Credit' && (
        <div className="mt-2 space-y-2">
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-900/25 dark:text-amber-300">
            Monthly credit works only for users with an active Gamers Credit account.
          </p>
          <div className="rounded-xl border border-gray-300 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Credit Account Status</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {matchedPrimaryUser?.id
                    ? `Matched customer: ${matchedPrimaryUser.name}`
                    : 'No known customer matched yet. Create credit on the fly if needed.'}
                </p>
              </div>
              {!creditAccount?.is_active && (
                <button
                  type="button"
                  onClick={() => setShowCreditAccountModal(true)}
                  className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-200"
                >
                  Create Credit Account
                </button>
              )}
            </div>
            {creditAccountLoading ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">Loading credit account...</p>
            ) : creditAccount?.is_active ? (
              <div className="mt-2 grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 xl:grid-cols-3">
                <div className="min-w-0 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Limit</p>
                  <p className="break-words text-base font-semibold text-emerald-900 dark:text-emerald-100">₹{Number(creditAccount.credit_limit || 0).toFixed(2)}</p>
                </div>
                <div className="min-w-0 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Outstanding</p>
                  <p className="break-words text-base font-semibold text-amber-900 dark:text-amber-100">₹{Number(creditAccount.outstanding_amount || 0).toFixed(2)}</p>
                </div>
                <div className="min-w-0 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 min-[480px]:col-span-2 xl:col-span-1">
                  <p className="text-xs uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Available</p>
                  <p className="break-words text-base font-semibold text-cyan-900 dark:text-cyan-100">₹{availableCreditAmount.toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
                {creditAccountError || 'No credit account configured for this customer.'}
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {paymentType === 'Pass' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            <div className="relative">
              <input
                type="text"
                value={passUid}
                onChange={(e) => setPassUid(e.target.value.toUpperCase())}
                onBlur={() => {
                  if (passUid.trim()) validatePass(passUid)
                }}
                placeholder="Enter Pass UID (HFG-XXXXXXXXXXXX)"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200 text-sm"
              />
              {isValidatingPass && (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600 absolute right-3 top-2.5" />
              )}
            </div>

            {validatedPass && !passError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 border border-emerald-200 dark:border-emerald-700"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs space-y-1">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                      {validatedPass.pass_name}
                    </p>
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                      <span>Hours Available</span>
                      <span className="font-bold">
                        {validatedPass.remaining_hours}/{validatedPass.total_hours}
                      </span>
                    </div>
                    {selectedSlots.length > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Hours Needed</span>
                        <span className="font-bold">{selectedSlots.length * 0.5} hrs</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
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

      {errors.payment && <p className="text-red-500 text-sm mt-2">{errors.payment}</p>}
    </Card>
  )

  console.log('💰 Pricing calculation:', {
    consoleTotal,
    mealsTotal,
    waiveOffAmount,
    autoWaiveOffAmount,
    extraControllerFare,
    totalAmount
  })

  const validateForm = () => {
    console.log('✅ Validating form...')
    const newErrors: Record<string, string> = {}

    if (!name.trim()) newErrors.name = 'Name is required'
    if (!email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid'
    if (!phone.trim()) newErrors.phone = 'Phone number is required'
    if (selectedSlots.length === 0) newErrors.slots = 'Please select at least one time slot'
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
    if (!passUid.trim()) {
      newErrors.pass = 'Please enter pass UID'
    } else if (!validatedPass) {
      newErrors.pass = 'Please validate the pass first'
    } else if (passError) {
      newErrors.pass = passError
    }
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
    console.log('✅ Form validation result:', { isValid: Object.keys(newErrors).length === 0, errors: newErrors })
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Form submission started')
    
    if (!validateForm()) {
      console.log('❌ Form validation failed')
      return
    }

    const vendorId = getVendorIdFromToken()
    if (!vendorId) {
      console.log('❌ No vendor ID, cannot submit')
      alert('Please login again')
      return
    }

    setIsSubmitting(true)
    console.log('📝 Preparing booking data...')

    try {

      if (paymentType === 'Pass' && validatedPass) {
      const hoursToDeduct = selectedSlots.length * 0.5
      
      const passRedeemResponse = await fetch(`${BOOKING_URL}/api/pass/redeem/dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pass_uid: passUid.trim(),
          vendor_id: vendorId,
          hours_to_deduct: hoursToDeduct,
          session_start: selectedSlots[0]?.start_time.slice(0, 5),
          session_end: selectedSlots[selectedSlots.length - 1]?.end_time.slice(0, 5),
          notes: `Booking for ${selectedSlots[0]?.console_name} - ${selectedSlots.length} slots`,
        }),
      })
      
      const passRedeemData = await passRedeemResponse.json()
      
      if (!passRedeemResponse.ok || !passRedeemData.success) {
        alert(`Pass redemption failed: ${passRedeemData.error}`)
        setIsSubmitting(false)
        return
      }
    }


      const bookingData = {
        consoleType: selectedSlots[0]?.console_name || '',
        name,
        email,
        phone,
        bookedDate: selectedSlots[0]?.date || '',
        slotId: selectedSlots.map(slot => slot.slot_id),
        paymentType: paymentType === 'Monthly Credit' ? 'monthly_credit' : paymentType,
        bookingType: isSquadMode ? 'squad' : 'direct',
        waiveOffAmount: waiveOffAmount + autoWaiveOffAmount,
        extraControllerQty: supportsExtraController ? extraControllerQty : 0,
        extraControllerFare: supportsExtraController ? extraControllerFare : 0,
        selectedMeals: selectedMeals.map(meal => ({
          menu_item_id: meal.menu_item_id,
          quantity: meal.quantity
        })),
        bookingMode: 'regular',
        squadDetails: {
          enabled: isSquadMode && squadSupported,
          playerCount: isSquadMode ? squadPlayerCount : 1,
          suggestedExtraControllerQty: isSquadMode ? suggestedExtraControllerQty : 0,
          discountPercentPreview: isSquadMode ? squadDiscountPercent : 0,
          discountAmountPreview: isSquadMode ? squadDiscountAmount : 0,
          consoleGroup: squadConsoleGroup,
          pricingMode: squadPlatformRule.pricingMode,
          members: isSquadMode
            ? squadMembers
                .filter((m) => m.name.trim() && m.phone.trim())
                .map((m) => ({ name: m.name.trim(), phone: m.phone.trim() }))
            : [],
        }
      }

      console.log('📤 Submitting booking data:', bookingData)

      const bookingHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Client-Source': 'dashboard',
      }
      const dashboardToken = localStorage.getItem('rbac_access_token_v1') || localStorage.getItem('jwtToken')
      if (dashboardToken) {
        bookingHeaders.Authorization = `Bearer ${dashboardToken}`
      }

      const response = await fetch(`${BOOKING_URL}/api/newBooking/vendor/${vendorId}`, {
        method: 'POST',
        headers: bookingHeaders,
        body: JSON.stringify(bookingData),
      })

console.log('📥 API response status:', response.status)

// ✅ FIX: Check response.ok first (status 200-299 means success)
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}))
  throw new Error(errorData.message || 'Failed to submit booking')
}

const result = await response.json()
console.log('📥 API response data:', result)

// ✅ FIX: If response.ok is true, treat as success regardless of result.success
// This handles cases where backend returns different success formats
if (response.ok || result.success === true || result.success === 'true') {
  console.log('✅ Booking created successfully!')
  setIsSubmitted(true)

  if (typeof window !== 'undefined') {
    console.log('📡 Dispatching refresh-dashboard event')
    window.dispatchEvent(new CustomEvent('refresh-dashboard'))
  }

  // Update user cache
  const userCacheKey = 'userList'
  const cached = localStorage.getItem(userCacheKey)

  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached)

      const isUserExists = data.some(
        (user: any) => user.email === email || user.phone === phone
      )

      if (!isUserExists) {
        console.log('👤 New user detected, refreshing user cache...')
        const usersResponse = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`)
        const updatedUsers = await usersResponse.json()

        if (Array.isArray(updatedUsers)) {
          localStorage.setItem(
            userCacheKey,
            JSON.stringify({ data: updatedUsers, timestamp: Date.now() })
          )
          console.log('✅ User cache updated with new user')
        }
      }
    } catch (err) {
      console.error('❌ Error checking or updating user cache:', err)
    }
  }
} else {
  // Only show error if response was not ok
  console.log('❌ Unexpected response format:', result)
  alert(`Error: ${result.message || 'Unexpected response from server'}`)
}

    } catch (error) {
      console.error('❌ Error submitting booking:', error)
      alert(error instanceof Error ? error.message : 'Failed to create booking')
    } finally {
      setIsSubmitting(false)
      console.log('🏁 Form submission completed')
    }
  }

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="slot-booking-modal max-w-md w-full rounded-2xl p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center shadow-lg"
          >
            <CheckCircle className="w-8 h-8 text-white" />
          </motion.div>

          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
            Booking Confirmed!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your slot booking has been successfully created.
          </p>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 mb-6 text-left">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400">Console Type:</span>
              <span className="font-medium text-gray-800 dark:text-white">{selectedSlots[0]?.console_name}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400">Slots:</span>
              <span className="font-medium text-gray-800 dark:text-white">{selectedSlots.length}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400">Meals & Extras:</span>
              <span className="font-medium text-gray-800 dark:text-white">
                {selectedMeals.length === 0
                  ? 'None'
                  : selectedMeals.map(meal => `${meal.name} (${meal.quantity})`).join(', ')}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-emerald-200 dark:border-emerald-700">
              <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
              <span className="font-bold text-emerald-600 text-xl">₹{totalAmount}</span>
            </div>
          </div>

          <Button
            onClick={() => {
              onBookingComplete()
              onClose()
              setIsSubmitted(false)
            }}
            className="ui-action-primary w-full"
          >
            Create Another Booking
          </Button>
        </motion.div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="slot-booking-modal flex w-full max-w-6xl max-h-[96vh] flex-col overflow-hidden rounded-2xl border shadow-2xl"
        >
          <div className="flex items-center justify-between border-b p-4 sm:p-5 md:p-6">
            <h2 className="premium-heading !text-xl sm:!text-2xl">New Slot Booking</h2>
            <button
              onClick={onClose}
              className="slot-booking-modal-close rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
            <form id="slot-booking-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6 pb-4">
              <div className="grid grid-cols-1 gap-4 md:gap-5 xl:grid-cols-3 xl:gap-6">
                <div className="flex flex-col gap-4 md:gap-5 xl:col-span-2">
                  <Card className="sb-card p-4 order-1">
                    <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 mb-3">Selected Time Slots</h3>
                    <div className="space-y-2">
                      {selectedSlots.map((slot, index) => (
                        <div key={index} className="slot-booking-modal-soft flex items-center justify-between rounded-lg p-3 text-sm">
                          <span className="text-gray-700 dark:text-gray-300">
                            <strong>{new Date(slot.date).toLocaleDateString('en-GB')}</strong> • {slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)} • {slot.console_name}
                          </span>
                          {/* REPLACE THE SPAN ABOVE WITH THIS */}
<span className="flex items-center gap-2 font-semibold">
  {(() => {
    const key = slot.console_name.toLowerCase()
    const entry = activePricing[key] || 
      Object.values(activePricing).find(p => 
        p.console_type.toLowerCase() === slot.console_name.toLowerCase()
      )
    const isOffer = entry?.is_offer
    return (
      <>
        {isOffer && (
          <span className="line-through text-gray-400 text-xs">
            ₹{slot.console_price}
          </span>
        )}
        <span className={isOffer ? "text-orange-500" : "text-emerald-600 dark:text-emerald-400"}>
          ₹{getEffectivePrice(slot)}
        </span>
        {isOffer && (
          <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-1.5 py-0.5 rounded-full">
            🏷️ {entry?.offer_name}
          </span>
        )}
      </>
    )
  })()}
</span>

                        </div>
                      ))}
                      <div className="text-right pt-2 border-t border-emerald-200 dark:border-emerald-700">
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                          Slots Total: ₹{consoleTotal}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="sb-card p-4 sm:p-5 md:p-6 order-3">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded">
                        <Users className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                          {isSquadMode ? "Captain Information" : "Customer Information"}
                        </h3>
                        {isSquadMode && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Primary contact for squad booking</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            "w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border rounded-lg transition-all duration-200",
                            errors.email
                              ? "border-red-500 focus:border-red-500"
                              : focusedInput === "email"
                              ? "border-emerald-500 focus:border-emerald-500"
                              : "border-gray-300 dark:border-gray-600 focus:border-emerald-500",
                            "focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                          )}
                        />
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                        <AnimatePresence>
                          {focusedInput === "email" && emailSuggestions.length > 0 && (
                            <motion.ul
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full mt-1 max-h-40 overflow-y-auto"
                            >
                              {emailSuggestions.slice(0, 5).map((user, idx) => (
                                <motion.li
                                  key={idx}
                                  whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                                  className="px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                  onMouseDown={() => handleSuggestionClick(user)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                      <User className="w-3 h-3 text-emerald-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-800 dark:text-white text-sm">{user.name}</p>
                                      <p className="text-gray-600 dark:text-gray-400 text-xs">{user.email}</p>
                                    </div>
                                  </div>
                                </motion.li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                      </div>

                      <div className="relative">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => handlePhoneInputChange(e.target.value)}
                          onFocus={handlePhoneFocus}
                          onBlur={handleBlur}
                          autoComplete="off"
                          placeholder={isSquadMode ? "Captain phone" : "Phone"}
                          className={cn(
                            "w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border rounded-lg transition-all duration-200",
                            errors.phone
                              ? "border-red-500 focus:border-red-500"
                              : focusedInput === "phone"
                              ? "border-emerald-500 focus:border-emerald-500"
                              : "border-gray-300 dark:border-gray-600 focus:border-emerald-500",
                            "focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                          )}
                        />
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                        <AnimatePresence>
                          {focusedInput === "phone" && phoneSuggestions.length > 0 && (
                            <motion.ul
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full mt-1 max-h-40 overflow-y-auto"
                            >
                              {phoneSuggestions.slice(0, 5).map((user, idx) => (
                                <motion.li
                                  key={idx}
                                  whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                                  className="px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                  onMouseDown={() => handleSuggestionClick(user)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                      <User className="w-3 h-3 text-emerald-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-800 dark:text-white text-sm">{user.name}</p>
                                      <p className="text-gray-600 dark:text-gray-400 text-xs">{user.phone}</p>
                                    </div>
                                  </div>
                                </motion.li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleNameInputChange(e.target.value)}
                          onFocus={handleNameFocus}
                          onBlur={handleBlur}
                          placeholder={isSquadMode ? "Captain full name" : "Full name"}
                          className={cn(
                            "w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border rounded-lg transition-all duration-200",
                            errors.name
                              ? "border-red-500 focus:border-red-500"
                              : focusedInput === "name"
                              ? "border-emerald-500 focus:border-emerald-500"
                              : "border-gray-300 dark:border-gray-600 focus:border-emerald-500",
                            "focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                          )}
                        />
                        <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                        <AnimatePresence>
                          {focusedInput === "name" && nameSuggestions.length > 0 && (
                            <motion.ul
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full mt-1 max-h-40 overflow-y-auto"
                            >
                              {nameSuggestions.slice(0, 5).map((user, idx) => (
                                <motion.li
                                  key={idx}
                                  whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                                  className="px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                  onMouseDown={() => handleSuggestionClick(user)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                      <User className="w-3 h-3 text-emerald-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-800 dark:text-white text-sm">{user.name}</p>
                                      <p className="text-gray-600 dark:text-gray-400 text-xs">{user.email}</p>
                                    </div>
                                  </div>
                                </motion.li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isSquadMode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              Squad Player Details (Optional)
                            </p>
                            <button
                              type="button"
                              onClick={addSquadMemberRow}
                              disabled={squadMembers.length >= maxQuickMembers}
                              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                            >
                              Add Player
                            </button>
                          </div>
                            <div className="space-y-2">
                              {squadMembers.map((member, idx) => (
                                <div key={member.id} className="rounded-md border border-slate-200 p-2 dark:border-slate-700">
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                                    <input
                                      type="text"
                                      placeholder={`Player ${idx + 2} name`}
                                      value={member.name}
                                      onFocus={() => handleSquadMemberFocus(member.id, member.name)}
                                      onBlur={() => handleSquadMemberBlur(member.id)}
                                      onChange={(e) => updateSquadMemberRow(member.id, "name", e.target.value)}
                                      className="rounded border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-600 dark:bg-gray-800"
                                    />
                                    <input
                                      type="tel"
                                      placeholder={`Player ${idx + 2} phone`}
                                      value={member.phone}
                                      onFocus={() => handleSquadMemberFocus(member.id, member.phone)}
                                      onBlur={() => handleSquadMemberBlur(member.id)}
                                      onChange={(e) => updateSquadMemberRow(member.id, "phone", e.target.value)}
                                      className="rounded border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-600 dark:bg-gray-800"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeSquadMemberRow(member.id)}
                                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 dark:border-red-700 dark:text-red-400"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  {focusedSquadMemberId === member.id &&
                                    Array.isArray(squadMemberSuggestions[member.id]) &&
                                    squadMemberSuggestions[member.id].length > 0 && (
                                      <div className="mt-2 max-h-36 overflow-auto rounded border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                                        {squadMemberSuggestions[member.id].map((suggested, suggestionIdx) => (
                                          <button
                                            key={`${member.id}-sg-${suggestionIdx}`}
                                            type="button"
                                            onMouseDown={() => handleSquadMemberSuggestionPick(member.id, suggested)}
                                            className="flex w-full items-center justify-between border-b border-slate-100 px-2 py-1.5 text-left text-xs last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                                          >
                                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                              {suggested.name}
                                            </span>
                                            <span className="text-slate-500 dark:text-slate-400">
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
                  </Card>

                  <Card className="sb-card p-4 order-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "p-2 rounded-lg",
                          bookingFlowMode === "squad"
                            ? "bg-blue-500"
                            : "bg-emerald-500"
                        )}>
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Booking Type</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Switch mode quickly for staff workflow</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBookingModeQuick("solo")}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                          bookingFlowMode === "solo"
                            ? "border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                            : "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300"
                        )}
                      >
                        Solo
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingModeQuick("squad")}
                        disabled={!squadSupported}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                          !squadSupported && "cursor-not-allowed opacity-50",
                          bookingFlowMode === "squad"
                            ? "border-blue-500 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                            : "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300"
                        )}
                      >
                        Squad
                      </button>
                    </div>
                    {!squadSupported && (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                        Squad booking is disabled for this console type.
                      </p>
                    )}

                    <AnimatePresence>
                      {isSquadMode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 space-y-3"
                        >
                          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-700 dark:bg-blue-900/20">
                            <span className="text-xs text-blue-800 dark:text-blue-200 font-medium">Players in Squad</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSquadPlayerCount((prev) => Math.max(2, prev - 1))}
                                className="inline-flex h-7 w-7 items-center justify-center rounded border border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300"
                              >
                                -
                              </button>
                              <span className="w-16 text-center text-sm font-semibold text-blue-900 dark:text-blue-100">
                                {squadPlayerCount}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSquadPlayerCount((prev) => Math.min(squadMaxPlayers, prev + 1))}
                                className="inline-flex h-7 w-7 items-center justify-center rounded border border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            Max players: <span className="font-semibold">{squadMaxPlayers}</span>
                            <span className="ml-2">
                              Mode: <span className="font-semibold">{squadUsesDiscountEngine ? "PC discount rule engine" : "Controller pricing"}</span>
                            </span>
                            {selectedControllerType && (
                              <span className="ml-2">
                                Suggested extra controllers: <span className="font-semibold">{suggestedExtraControllerQty}</span>
                              </span>
                            )}
                          </div>

                          {selectedControllerType && (
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => applyExtraControllerQty(suggestedExtraControllerQty)}
                                className="rounded-md border border-cyan-300 px-2.5 py-1 text-xs text-cyan-700 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-300 dark:hover:bg-cyan-900/20"
                              >
                                Use suggested controllers
                              </button>
                            </div>
                          )}

                          {errors.squad && <p className="text-red-500 text-xs">{errors.squad}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>

                </div>

                <div className="space-y-4 md:space-y-5">
                  <Card className="sb-card p-4 sm:p-5 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Pricing Summary</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-400">
                          Console Total{isSquadMode && squadConsoleGroup === "pc" ? ` (₹${consoleUnitTotal} x ${squadPlayerCount})` : ""}:
                        </span>
                        <span className="font-medium text-gray-800 dark:text-white">₹{consoleTotal}</span>
                      </div>

                      {isSquadMode && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                          <span className="text-gray-600 dark:text-gray-400">Squad Players:</span>
                          <span className="font-medium text-gray-800 dark:text-white">{squadPlayerCount}</span>
                        </div>
                      )}

                      {isSquadMode && squadDiscountPercent > 0 && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3">
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                            Squad Discount ({squadDiscountPercent}%):
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-300">-₹{squadDiscountAmount}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-400">Manual Waive Off:</span>
                        <input
                          type="number"
                          value={waiveOffAmount}
                          onChange={(e) => setWaiveOffAmount(Number(e.target.value) || 0)}
                          placeholder="₹0"
                          className="w-20 text-right px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
                          min={0}
                        />
                      </div>

                      {autoWaiveOffAmount > 0 && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3">
                          <span className="text-orange-600 dark:text-orange-400 font-medium">⏰ Auto Waive Off:</span>
                          <div className="text-right">
                            <span className="font-bold text-orange-600 dark:text-orange-400">₹{Math.round(autoWaiveOffAmount)}</span>
                            <div className="text-xs text-orange-500 dark:text-orange-300">
                              (Time-based discount)
                            </div>
                          </div>
                        </div>
                      )}

                      {supportsExtraController && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                          <span className="text-gray-600 dark:text-gray-400">Extra Controller:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => applyExtraControllerQty(extraControllerQty - 1)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                              disabled={isControllerPricingLoading}
                            >
                              -
                            </button>
                            <span className="w-14 text-center text-sm text-gray-800 dark:text-white">
                              {extraControllerQty} qty
                            </span>
                            <button
                              type="button"
                              onClick={() => applyExtraControllerQty(extraControllerQty + 1)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                              disabled={isControllerPricingLoading}
                            >
                              +
                            </button>
                            <span className="w-16 text-right text-sm font-medium text-gray-800 dark:text-white">
                              ₹{extraControllerFare}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-400">Meals & Extras:</span>
                        <button
                          type="button"
                          onClick={() => setIsMealSelectorOpen(true)}
                          className="slot-booking-modal-accent flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all duration-200"
                        >
                          <Plus className="w-3 h-3" />
                          {selectedMeals.length === 0 ? 'Add Meals & Extras' : `${selectedMeals.length} Selected`}
                        </button>
                      </div>

                      {selectedMeals.length > 0 && (
                        <div className="py-2 border-b border-gray-200 dark:border-gray-600">
                          <div className="space-y-2">
                            {selectedMeals.map(meal => (
                              <div key={meal.menu_item_id} className="slot-booking-modal-soft rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <span className="text-sm font-medium text-gray-800 dark:text-white">
                                      {meal.name}
                                    </span>
                                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                      {meal.category} • ₹{meal.price} × {meal.quantity}
                                    </div>
                                  </div>
                                  <span className="text-sm font-bold text-gray-800 dark:text-white">
                                    ₹{meal.total}
                                  </span>
                                </div>
                              </div>
                            ))}
                            <div className="border-t border-gray-200 pt-2 text-right dark:border-gray-600">
                              <span className="text-sm font-bold text-gray-800 dark:text-white">
                                Meals Total: ₹{mealsTotal}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center py-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-3">
                        <span className="font-bold text-gray-800 dark:text-white text-lg">Final Total:</span>
                        <span className="font-bold text-2xl text-emerald-600">₹{totalAmount}</span>
                      </div>
                    </div>
                  </Card>
                  {paymentMethodCard}
                </div>
              </div>

            </form>
          </div>

          <div className="slot-booking-modal-footer sticky bottom-0 z-20 p-3 backdrop-blur-md sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="slot-booking-modal-secondary flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="slot-booking-form"
                disabled={isSubmitting || (paymentType === 'Monthly Credit' && (!creditAccount?.is_active || availableCreditAmount < totalAmount))}
                className="ui-action-primary flex-1 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Booking...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Complete Booking - ₹{totalAmount}
                  </div>
                )}
              </Button>
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
    </AnimatePresence>
  )
}

function SlotPill({
  label,
  color,
  icon: Icon,
  onClick,
  selected = false,
  disabled = false,
  compact = false,
}: {
  label: string
  color: PillColor
  icon?: React.ComponentType<{ className?: string }>
  onClick?: () => void
  selected?: boolean
  disabled?: boolean
  compact?: boolean
}) {
  const colorClasses: Record<PillColor, string> = {
    green: selected 
      ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg" 
      : "bg-emerald-600 text-white hover:bg-emerald-700",
    blue: selected 
      ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg"
      : "bg-blue-600 text-white hover:bg-blue-700", 
    purple: selected 
      ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg"
      : "bg-purple-600 text-white hover:bg-purple-700",
    yellow: selected 
      ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg"
      : "bg-yellow-500 text-white hover:bg-yellow-600",
    red: "bg-red-600 text-white",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full h-full flex items-center justify-center rounded-md text-[10px] font-bold uppercase tracking-wide",
        compact ? "min-h-[30px]" : "min-h-[36px]",
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
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium uppercase",
        "transition-all duration-200",
        active
          ? "bg-blue-600 text-white shadow-md"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
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
}: { 
  selectedSlots: SelectedSlot[], 
  onNewBooking: () => void,
  selectedConsole: ConsoleFilter,
  onConsoleChange: (gameConsole: ConsoleFilter) => void
  availableConsoles: ConsoleType[]
  compact?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showManageView, setShowManageView] = useState<'change' | 'reject' | 'list' | null>(null)
  const consoleIcons = {
    PC: Monitor,
    PS5: MonitorPlay,
    Xbox: Gamepad,
    VR: Headset
  }
  const orderedTypes: ConsoleFilter[] = ["PC", "PS5", "Xbox", "VR"]
  const activeTypes = orderedTypes.filter((type) =>
    availableConsoles.some((c) => c.type === type)
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

          <Card className="bg-white dark:bg-gray-800 shadow-2xl">
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
    <div className={cn("mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", compact && "mb-2 gap-2")}>
      <Card className={cn("rounded-xl border border-slate-300 bg-white/90 p-3 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/50", compact && "p-2")}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Select Console</span>
          <div className="flex flex-wrap items-center gap-2">
            {activeTypes.map((key) => {
              const Icon = consoleIcons[key]
              return (
              <SegmentedButton
                key={key}
                active={selectedConsole === key}
                icon={Icon}
                onClick={() => onConsoleChange(key as ConsoleFilter)}
              >
                {key}
              </SegmentedButton>
            )})}
            {activeTypes.length === 0 && (
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
          disabled={selectedSlots.length === 0}
          className={cn(
            "rounded-lg shadow-lg transition-all duration-200",
            "px-4 py-2 text-xs font-semibold sm:px-5 sm:text-sm",
            selectedSlots.length > 0 
              ? "ui-action-primary"
              : "bg-slate-600 text-white cursor-not-allowed"
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Booking {selectedSlots.length > 0 && `(${selectedSlots.length})`}
        </Button>

        {/* Dropdown Menu for Manage Bookings */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline"
              size="icon" 
              className="ui-toolbar-menu rounded-lg"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-slate-200 bg-white text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
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
    <Card className="mb-6 rounded-xl border border-slate-300 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase text-slate-500 dark:text-gray-400">Select Console</span>
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
  allSlots,
  isLoading,
  fetchSlotBookings,
  compact = false,
}: {
  availableConsoles: ConsoleType[]
  selectedConsole: ConsoleFilter
  selectedSlots: SelectedSlot[]
  onSlotSelect: (slot: SelectedSlot) => void
  allSlots: { [key: string]: any[] }
  isLoading: boolean
  fetchSlotBookings: (slotIds: number[], date: string) => Promise<void>
  compact?: boolean
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

  const days = getNext3Days()

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

    const colWidth = compact ? 100 : 116
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

  const getConsoleIcon = (consoleType: string) => {
    switch (consoleType) {
      case 'PC': return Monitor
      case 'PS5': return MonitorPlay
      case 'Xbox': return Gamepad
      case 'VR': return Headset
      default: return Monitor
    }
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

  const isSlotSelected = (slotId: number, date: string) => {
    return selectedSlots.some(slot => slot.slot_id === slotId && slot.date === date)
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

  const handleSlotClick = (dayData: any, time: string, gameConsole: ConsoleType) => {
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
    matchingSlot = findCoveringSlot(daySlots, time, gameConsole.id)
  }

  if (!matchingSlot) return

  // ✅ NEW: Check if slot is in the past
  const isPastTime = isPastSlotInIST(dayData.fullDate, matchingSlot.end_time)

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
  if (matchingSlot.is_available) {
    onSlotSelect(selectedSlot)
  }
}


  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-gray-700 bg-gray-800/30 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-300">Loading available slots...</p>
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
            const coveringSlot = findCoveringSlot(daySlots, time, gameConsole.id)
            if (coveringSlot) {
              timeSlots.push(
                <div
                  key={`continuation-${day.fullDate}-${gameConsole.id}-${time}`}
                  onClick={() => handleSlotClick(day, time, gameConsole)}
                  className={cn(
                    "group relative h-full w-full cursor-pointer overflow-hidden rounded-md border border-amber-400/20 bg-gradient-to-r from-amber-300/8 to-amber-300/4 transition-colors hover:from-amber-300/14 hover:to-amber-300/10",
                    compact ? "min-h-[32px]" : "min-h-[40px]"
                  )}
                  title={`${gameConsole.name} slot continues (${coveringSlot.start_time?.slice(0, 5)}-${coveringSlot.end_time?.slice(0, 5)})`}
                >
                  <div className="absolute inset-x-2 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-amber-300/45 group-hover:bg-amber-200/70" />
                  <div className="absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-200/80 group-hover:bg-amber-100" />
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
          const isSelected = isSlotSelected(slot.slot_id, day.fullDate)
          
          // ✅ Check if time has passed
          const isPastTime = isPastSlotInIST(day.fullDate, slot.end_time)
          
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
        "w-full h-full flex items-center justify-center bg-gray-500 dark:bg-gray-600 text-white rounded-md cursor-pointer hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors",
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
        "w-full h-full flex items-center justify-center bg-red-600 text-white rounded-md cursor-not-allowed",
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
            timeSlots.push(
              <div
                key={`${day.fullDate}-${slot.slot_id}`}
                className={cn("w-full h-full", compact ? "min-h-[32px]" : "min-h-[40px]")}
              >
                <SlotPill
                  label={`${gameConsole.name} - ${slot.available_slot} • ${Math.max(getSlotDurationMinutes(slot), 30)}m`}
                  color={getConsoleColor(gameConsole.id)}
                  icon={getConsoleIcon(gameConsole.type)}
                  onClick={() => handleSlotClick(day, time, gameConsole)}
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
      <Card className="rounded-2xl border border-gray-700 bg-gray-800/30 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <CalendarDays className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-300">No slots available</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
      <Card className="overflow-hidden rounded-2xl border border-slate-300 bg-white/90 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/30">
        {detectedDurations.length > 1 && (
        <div className="border-b border-cyan-200 bg-cyan-50 px-4 py-2 text-xs text-cyan-800 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-100/90">
          Mixed slot durations detected ({detectedDurations.join("m, ")}m). In-between cells show continuation of longer slots.
        </div>
      )}
      <div
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        className={cn(
          "overflow-x-auto select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <div className="min-w-max">
          <div
            className={cn("grid bg-slate-100/80 dark:bg-gray-800/50", compact ? "gap-1 p-2 pb-2" : "gap-2 p-4 pb-3")}
            style={{ gridTemplateColumns: `80px repeat(${uniqueTimes.length}, minmax(${compact ? 96 : 110}px, 1fr))` }}
          >
            <div className="sticky left-0 z-20 flex items-center justify-center bg-slate-800/95 text-center text-xs font-semibold uppercase text-white backdrop-blur-sm">
              Date
            </div>
            {uniqueTimes.map((time) => (
              <div key={time} className="text-center text-sm font-bold text-slate-700 dark:text-gray-200">
                {time}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-300 dark:border-gray-700">
            {rows.map((row) => {
              const isTodayRow = row.fullDate === todayIST
              return (
                <div
                  key={row.fullDate}
                  className={cn(
                    "grid border-b border-slate-200 last:border-b-0 transition-colors dark:border-gray-700/50",
                    isTodayRow
                      ? "bg-cyan-50 ring-1 ring-inset ring-cyan-300/50 dark:bg-cyan-500/10 dark:ring-cyan-400/35"
                      : "hover:bg-slate-100/70 dark:hover:bg-gray-700/20",
                    compact ? "gap-1 p-2 py-1.5" : "gap-2 p-4 py-3"
                  )}
                  style={{ gridTemplateColumns: `80px repeat(${uniqueTimes.length}, minmax(${compact ? 96 : 110}px, 1fr))` }}
                >
                  <div
                    className={cn(
                      "sticky left-0 z-20 flex items-center justify-center rounded-lg px-2 py-2 text-sm font-bold backdrop-blur-sm",
                      isTodayRow
                        ? "bg-cyan-100 text-cyan-900 ring-1 ring-cyan-300/60 dark:bg-cyan-500/20 dark:text-cyan-100 dark:ring-cyan-300/35"
                        : "bg-slate-700/95 text-white"
                    )}
                  >
                    <span>{row.date}</span>
                    {isTodayRow && (
                      <span className="ml-1.5 rounded-full bg-cyan-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-900 dark:bg-cyan-400/20 dark:text-cyan-100">
                        Today
                      </span>
                    )}
                  </div>

                  {row.cells.map((content, idx) => (
                    <div
                      key={`${row.fullDate}-cell-${idx}`}
                      className={cn(
                        "rounded-lg border border-slate-300 bg-white/85 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50",
                        isTodayRow && "border-cyan-300 bg-cyan-50/70 dark:border-cyan-500/30 dark:bg-cyan-500/5",
                        compact ? "min-h-[36px]" : "min-h-[44px]"
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
  // ✅ Determine if these are past bookings
  const hasPastBookings = bookings.some(b => 
    b.status === 'completed' || b.status === 'rejected' || b.status === 'cancelled'
  )
  const bookingType = hasPastBookings ? 'Past' : 'Active'
  
  if (isLoading) {
    return (
      <Card className={cn("booking-contrast-card mt-2 bg-slate-50 p-6 dark:bg-gray-700/30", fixedCard && "h-full min-h-0")}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="booking-contrast-muted ml-2">Loading bookings...</span>
        </div>
      </Card>
    )
  }

  if (bookings.length === 0) {
    return (
      <Card className={cn("booking-contrast-card mt-2 bg-slate-50 p-6 dark:bg-gray-700/30", fixedCard && "h-full min-h-0")}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 bg-gray-200 dark:bg-gray-600 rounded-full mb-3">
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
    <Card className={cn("booking-contrast-card mt-2 bg-gray-50 p-4 dark:bg-gray-700/30", fixedCard && "h-full min-h-0 flex flex-col")}>
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
          <span className="booking-contrast-muted rounded-full bg-gray-200 px-3 py-1 text-xs font-medium dark:bg-gray-700">
            History
          </span>
        )}
      </div>

      <div className={cn("overflow-x-auto", fixedCard && "min-h-0 flex-1 overflow-auto")}>
        <Table>
          <TableHeader className="sticky top-0 z-20">
            <TableRow>
              <TableHead className="booking-contrast-header sticky top-0 z-20 bg-gray-100 dark:bg-gray-800">Booking ID</TableHead>
              <TableHead className="booking-contrast-header sticky top-0 z-20 bg-gray-100 dark:bg-gray-800">Customer Details</TableHead>
              <TableHead className="booking-contrast-header sticky top-0 z-20 bg-gray-100 dark:bg-gray-800">Time</TableHead>
              <TableHead className="booking-contrast-header sticky top-0 z-20 bg-gray-100 dark:bg-gray-800">Status</TableHead>
              <TableHead className="booking-contrast-header sticky top-0 z-20 bg-gray-100 dark:bg-gray-800">Meal Selection</TableHead>
              <TableHead className="booking-contrast-header sticky top-0 z-20 bg-gray-100 dark:bg-gray-800">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow 
                key={booking.booking_id} 
                className={cn(
                  "hover:bg-gray-100 dark:hover:bg-gray-600/30",
                  hasPastBookings && "opacity-80" // Slightly fade past bookings
                )}
              >
                {/* Booking ID */}
                <TableCell className="booking-contrast-heading font-medium">
                  <div className="flex flex-col gap-1">
                    <span>{booking.booking_fid || `#BK-${booking.booking_id}`}</span>
                    {(booking.squad_enabled || Number(booking.squad_player_count || 1) > 1) && (
                      <span className="w-fit rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-black dark:text-sky-200">
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
                      <span className="booking-contrast-muted text-[11px]">
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
                      {(booking.slot_start_time || booking.start_time || "N/A")} - {(booking.slot_end_time || booking.end_time || "N/A")}
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
                    booking.status === 'confirmed' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                    booking.status === 'checked_in' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                    booking.status === 'pending_verified' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    booking.status === 'completed' && "bg-gray-100 text-black dark:bg-gray-700 dark:text-gray-300",
                    booking.status === 'cancelled' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    booking.status === 'rejected' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
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
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
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
                        ? "hover:bg-gray-100 dark:hover:bg-gray-700" 
                        : "hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
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
      <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-600">
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
                  status === 'confirmed' && "bg-green-500",
                  status === 'checked_in' && "bg-orange-500",
                  status === 'pending_verified' && "bg-blue-500",
                  status === 'completed' && "bg-gray-500",
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
  const [bookingId, setBookingId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bookingFound, setBookingFound] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [vendorId, setVendorId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []);

  const handleSearch = async () => {
    if (!bookingId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${BOOKING_URL}/api/bookings/${bookingId}`);
      const data = await response.json();

      if (response.ok && data.success && data.booking) {
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
      const response = await fetch(
        `${BOOKING_URL}/api/getSlots/vendor/${vendorId}/game/${consoleTypeId}/${date.replaceAll("-", "")}`
      );
      const data = await response.json();

      if (response.ok && data.slots) {
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
      const response = await fetch(
        `${BOOKING_URL}/api/update_booking/${bookingId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingData),
        }
      );

      const result = await response.json();
      if (response.ok) {
        setIsSubmitted(true);
      } else {
        alert("Failed to update booking.");
      }
    } catch (error) {
      console.error("Error updating booking:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-6">
      <form className="space-y-8">
        {/* Search Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Search Booking</h3>
          <div className="flex space-x-2">
            <input
              id="bookingId"
              placeholder="Enter Booking ID"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
            />

            <Button
              type="button"
              onClick={handleSearch}
              disabled={isLoading}
              className="min-w-[100px] bg-emerald-600 hover:bg-emerald-700"
            >
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
          <div className="space-y-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Gamer's Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  value={bookingData.customer?.name || ""}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, name: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={bookingData.customer?.email || ""}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, email: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                <input
                  type="tel"
                  value={bookingData.customer?.phone || ""}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, phone: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
                />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Booking Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Booking Date</label>
                <input
                  type="date"
                  value={bookingData.booking_date || ""}
                  onChange={(e) =>
                    setBookingData((prev) => ({
                      ...prev,
                      booking_date: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Slot Time</label>
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
                      {slot.start_time}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleUpdateBooking} 
              disabled={isUpdating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Booking"
              )}
            </Button>
          </div>
        ) : null}

        {/* Success Message */}
        {isSubmitted && (
          <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700 dark:text-emerald-300">
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
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []);

  const handleSearch = async () => {
    if (!bookingId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${BOOKING_URL}/api/bookings/${bookingId}`);
      const data = await response.json();

      if (response.ok && data.success && data.booking) {
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
      const response = await fetch(`${BOOKING_URL}/api/bookings/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          rejection_reason: rejectionReason,
          repayment_type: repaymentType,
          user_email: userEmail,
        }),
      });

      if (response.ok) {
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
    <div className="p-6">
      <form className="space-y-8" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Search Booking</h3>
          <div className="flex space-x-2">
            <input
              placeholder="Enter Booking ID"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
            />
            <Button
              type="button"
              onClick={handleSearch}
              disabled={isLoading}
              className="min-w-[100px] bg-emerald-600 hover:bg-emerald-700"
            >
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
          <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700 dark:text-emerald-300">
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
                className="space-y-8"
              >
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Booking Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-gray-50 dark:bg-gray-700/30 p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Booking ID</span>
                          <span className="font-medium text-gray-800 dark:text-white">
                            {bookingData.booking_id || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Date</span>
                          <span className="font-medium text-gray-800 dark:text-white">
                            {bookingData.booking_date || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Time Slot</span>
                          <span className="font-medium text-gray-800 dark:text-white">
                            {bookingData.start_time || ""} - {bookingData.end_time || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">System</span>
                          <span className="font-medium text-gray-800 dark:text-white">
                            {bookingData.system || ""}
                          </span>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-gray-50 dark:bg-gray-700/30 p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Customer</span>
                          <span className="font-medium text-gray-800 dark:text-white">
                            {bookingData.customer?.name || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Email</span>
                          <span className="font-medium text-gray-800 dark:text-white">
                            {bookingData.customer?.email || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Phone</span>
                          <span className="font-medium text-gray-800 dark:text-white">
                            {bookingData.customer?.phone || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Amount Paid</span>
                          <span className="font-medium text-gray-800 dark:text-white">
                            ₹{bookingData.amount_paid || ""}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Rejection Details
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Reason for Rejection
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a detailed reason for rejecting this booking..."
                        className="w-full min-h-[100px] px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Repayment Method
                      </label>
                      <Select value={repaymentType} onValueChange={setRepaymentType}>
                        <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
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
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []);

  const fetchData = async () => {
    try {
      const formattedDate = getISTMonthStartCompact();
      const response = await axios.get(
        `${BOOKING_URL}/api/getAllBooking/vendor/${vendorId}/${formattedDate}/`,
        { headers: { "Content-Type": "application/json" } }
      );

      const mappedBookings = response.data.map((booking) => ({
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
      console.error("Error fetching data:", error.response ? error.response.data : error.message);
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
          variants[status] || "border border-slate-500/50 bg-slate-700/60 text-slate-200"
        }`}
      >
        {status}
      </span>
    );
  };

  const formatTime = (time) => {
    if (typeof time === "number") {
      const date = new Date(time);
      return `${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    }
    const [hours, minutes] = time.split(":");
    return `${hours}:${minutes}`;
  };

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <input
          placeholder="Search bookings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full flex-1 rounded-lg border border-slate-600/70 bg-slate-800/70 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-400/60 focus:outline-none"
        />
        <Button onClick={handleSearch} className="ui-action-primary">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60">
        <div className="overflow-x-auto">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow className="bg-slate-800/80">
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
                  className="cursor-pointer font-semibold text-slate-200 hover:bg-slate-700/70 transition-colors"
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
                  className="cursor-pointer bg-slate-800/60 hover:bg-slate-700/70"
                  onClick={() => toggleDate(bookedDate)}
                >
                  <TableCell colSpan={10} className="font-bold text-slate-100">
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
                      className="hover:bg-slate-800/60"
                    >
                      <TableCell className="text-slate-200">{booking.bookedDate}</TableCell>
                      <TableCell className="text-slate-200">{booking.username}</TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell className="text-slate-300">{booking.id}</TableCell>
                      <TableCell className="text-slate-300">{booking.bookingDate}</TableCell>
                      <TableCell className="text-slate-300">{booking.bookingTime}</TableCell>
                      <TableCell className="text-slate-300">{booking.consoleType}</TableCell>
                      <TableCell className="text-slate-300">
                        {booking.startTime ? formatTime(booking.startTime) : "Not started"}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {booking.endTime ? formatTime(booking.endTime) : "Not ended"}
                      </TableCell>
                      <TableCell className="text-slate-300">{booking.type}</TableCell>
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
}

export default function SlotManagement({ embedded = false }: SlotManagementProps) {
  const { moduleCache, moduleVersions, setModuleCache } = useDashboardData()
  const [selectedConsole, setSelectedConsole] = useState<ConsoleFilter>("PC")
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([])
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [availableConsoles, setAvailableConsoles] = useState<ConsoleType[]>([])
  const [allSlots, setAllSlots] = useState<{ [key: string]: any[] }>({})
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
    const [slotBookings, setSlotBookings] = useState<any[]>([])
const [isLoadingBookings, setIsLoadingBookings] = useState(false)
  const [vendorId, setVendorId] = useState<number | null>(null)

  const getVendorIdFromToken = (): number | null => {
    const token = localStorage.getItem('jwtToken')
    if (!token) return null
    try {
      const decoded = jwtDecode<{ sub: { id: number } }>(token)
      return decoded.sub.id
    } catch (error) {
      console.error('❌ Error decoding token:', error)
      return null
    }
  }

  type BookingCacheData = {
    availableConsoles: ConsoleType[]
    allSlots: { [key: string]: any[] }
    selectedConsole: ConsoleFilter
    dates: string[]
  }

  const bookingCacheKey = vendorId ? `booking_dashboard:${vendorId}` : "booking_dashboard:0"
  const bookingVersionKey = vendorId ? `booking:${vendorId}` : "booking:0"
  const cachedBooking = moduleCache[bookingCacheKey]?.data as BookingCacheData | undefined
  const bookingVersion = moduleVersions[bookingVersionKey] || 0

  const applyBookingCache = (data: BookingCacheData) => {
    setAvailableConsoles(data.availableConsoles)
    setAllSlots(data.allSlots)
    if (data.selectedConsole) {
      setSelectedConsole(data.selectedConsole)
    }
    setIsLoading(false)
  }

  const loadBookingData = async (resolvedVendorId: number): Promise<BookingCacheData | null> => {
    try {
      console.time("⏱️ Total fetch time")

      console.log("📡 Fetching consoles...")
      const consolesData = await fetchWithDedup(`${BOOKING_URL}/api/getAllConsole/vendor/${resolvedVendorId}?t=${Date.now()}`)

      const consoleTemplate = [
        { type: "PC" as ConsoleFilter, name: "PC Gaming", icon: Monitor, iconColor: "#7c3aed" },
        { type: "PS5" as ConsoleFilter, name: "PlayStation 5", icon: Tv, iconColor: "#2563eb" },
        { type: "Xbox" as ConsoleFilter, name: "Xbox Series", icon: Gamepad, iconColor: "#059669" },
        { type: "VR" as ConsoleFilter, name: "VR Gaming", icon: Headset, iconColor: "#ea580c" },
      ]

      const consolesResolved = consoleTemplate
        .map(template => {
          const matchedConsole = consolesData.games?.find((game: any) => {
            const apiName = (game.console_name || '').toLowerCase()
            const templateType = template.type.toLowerCase()

            const hasLiveConsoles = Number(game.console_count ?? 0) > 0
            if (!hasLiveConsoles) return false

            return apiName.includes(templateType) ||
              (templateType === 'pc' && (apiName.includes('gaming') || apiName.includes('computer'))) ||
              (templateType === 'ps5' && (apiName.includes('playstation') || apiName.includes('sony'))) ||
              (templateType === 'xbox' && (apiName.includes('series') || apiName.includes('microsoft'))) ||
              (templateType === 'vr' && (apiName.includes('virtual') || apiName.includes('reality')))
          })

          if (matchedConsole) {
            return {
              type: template.type,
              name: matchedConsole.console_name,
              id: matchedConsole.id,
              price: matchedConsole.console_price,
              icon: template.icon,
              iconColor: template.iconColor,
              color: "grey" as const,
              description: `${template.type} Gaming Console`
            }
          }
          return null
        })
        .filter(Boolean) as ConsoleType[]

      if (consolesResolved.length === 0) {
        console.log("⚠️ No consoles available")
        return { availableConsoles: [], allSlots: {}, selectedConsole, dates: [] }
      }

      const dates: string[] = []
      for (let i = 0; i < 3; i++) {
        dates.push(getISTDateString(i))
      }
      console.log("📅 Dates to fetch:", dates)

      console.log("📡 Fetching slots with BATCH API...")
      const nowTs = Date.now()

      let slotsData: { [key: string]: any[] } = {}
      dates.forEach((dateString) => {
        slotsData[dateString] = []
      })

      try {
        const gameIds = consolesResolved.map(c => c.id).filter(Boolean) as number[]
        const batchDates = dates.map(d => d.replace(/-/g, ""))

        console.log("🚀 Batch request:", { vendorId: resolvedVendorId, gameIds, dates: batchDates })

        const batchData = await fetchSlotsBatch(resolvedVendorId, gameIds, batchDates, true)
        console.log("✅ Batch data received:", batchData)

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
                const slotEndTime = new Date(`${dateString}T${slot.end_time}+05:30`)
                const isPast = nowTs >= slotEndTime.getTime()
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
                    const slotEndTime = new Date(`${dateString}T${slot.end_time}+05:30`)
                    const isPast = nowTs >= slotEndTime.getTime()

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

      const presentConsoleIds = new Set<number>()
      Object.values(slotsData).forEach((daySlots: any[]) => {
        daySlots.forEach((slot: any) => {
          if (slot?.console_id != null) presentConsoleIds.add(Number(slot.console_id))
        })
      })
      const filteredConsoles = consolesResolved.filter((c) => c.id != null && presentConsoleIds.has(Number(c.id)))
      let nextSelectedConsole = selectedConsole
      if (filteredConsoles.length > 0 && !filteredConsoles.some((c) => c.type === selectedConsole)) {
        nextSelectedConsole = filteredConsoles[0].type as ConsoleFilter
      }

      console.timeEnd("⏱️ Total fetch time")
      return { availableConsoles: filteredConsoles, allSlots: slotsData, selectedConsole: nextSelectedConsole, dates }
    } catch (error: any) {
      console.error('❌ Error in booking load:', error)
      return null
    }
  }

  const refreshBookingSnapshot = async () => {
    if (!vendorId) return
    requestCache.clear()
    pendingRequests.clear()
    const data = await loadBookingData(vendorId)
    if (!data) return
    setModuleCache(bookingCacheKey, data)
    applyBookingCache(data)
  }

const fetchSlotBookings = async (slotIds: number[], date: string) => {
  const vendorId = getVendorIdFromToken()
  if (!vendorId || slotIds.length === 0) {
    setSlotBookings([])
    return
  }
  
  setIsLoadingBookings(true)
  console.log('🔍 Fetching bookings for slots:', slotIds, 'date:', date)
  
  // ✅ Check if querying past slots
  const todayIST = getISTDateString(0)
  const isPastDate = date < todayIST
  
  try {
    const slotIdsParam = slotIds.join(',')
    // ✅ Add status filter for past bookings
    const statusParam = isPastDate ? '&include_completed=true' : ''
    
    const response = await fetch(
      `${BOOKING_URL}/api/vendor/${vendorId}/slot-bookings?slot_ids=${slotIdsParam}&date=${date}${statusParam}`
    )
    
    const data = await response.json()
    console.log('📥 Slot bookings response:', data)
    
    if (data.success && data.bookings) {
      setSlotBookings(data.bookings)
      console.log(`✅ Loaded ${data.bookings.length} ${isPastDate ? 'past' : 'active'} bookings`)
    } else {
      setSlotBookings([])
      console.log('📭 No bookings found')
    }
  } catch (error) {
    console.error('❌ Error fetching slot bookings:', error)
    setSlotBookings([])
  } finally {
    setIsLoadingBookings(false)
  }
}


  useEffect(() => {
    setVendorId(getVendorIdFromToken())
  }, [])

  useEffect(() => {
    if (cachedBooking) {
      applyBookingCache(cachedBooking)
    }
  }, [cachedBooking])

  useEffect(() => {
    if (!vendorId) return

    const shouldRefresh = !cachedBooking || bookingVersion > 0
    if (!shouldRefresh) return

    if (!cachedBooking) {
      setIsLoading(true)
    }

    requestCache.clear()
    pendingRequests.clear()

    loadBookingData(vendorId)
      .then((data) => {
        if (!data) return
        setModuleCache(bookingCacheKey, data)
        applyBookingCache(data)
        setRecentBookings([])
      })
      .catch((error) => {
        console.error("❌ Error loading booking data:", error)
      })
      .finally(() => {
        if (!cachedBooking) {
          setIsLoading(false)
        }
        console.log("✅ Booking data load complete")
      })
  }, [vendorId, bookingVersion])

  // Fetch bookings when slots are selected
useEffect(() => {
  if (selectedSlots.length > 0) {
    const slotIds = selectedSlots.map(slot => slot.slot_id)
    const date = selectedSlots[0].date // All slots should have same date
    fetchSlotBookings(slotIds, date)
  } else {
    setSlotBookings([])
  }
}, [selectedSlots])


  useEffect(() => {
    const handleBookingUpdated = () => {
      refreshBookingSnapshot()
    }

    window.addEventListener('refresh-dashboard', handleBookingUpdated)
    return () => window.removeEventListener('refresh-dashboard', handleBookingUpdated)
  }, [vendorId])

  const handleSlotSelect = (slot: SelectedSlot) => {
    const isSelected = selectedSlots.some(s => s.slot_id === slot.slot_id && s.date === slot.date)

    if (isSelected) {
      setSelectedSlots(selectedSlots.filter(s => !(s.slot_id === slot.slot_id && s.date === slot.date)))
    } else {
      setSelectedSlots([...selectedSlots, slot])
    }
  }

  const handleNewBooking = () => {
    if (selectedSlots.length > 0) {
      setShowBookingForm(true)
    }
  }

  const handleBookingComplete = () => {
    setSelectedSlots([])
    refreshBookingSnapshot()
  }

  if (isLoading) {
    return (
      <main className={embedded ? "h-full min-h-0 bg-background flex items-center justify-center" : "min-h-screen bg-background flex items-center justify-center"}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-black dark:text-slate-200">Loading slot data...</p>
        </div>
      </main>
    )
  }

  return (
    <main className={embedded ? "h-full min-h-0 bg-background overflow-hidden" : "min-h-screen bg-background"}>
      <div
        className={`mx-auto w-full max-w-full p-3 sm:p-4 md:p-6 ${
          embedded ? "flex h-full min-h-0 flex-col gap-3 sm:gap-4" : ""
        }`}
      >
        {embedded ? (
          <>
            <div className="shrink-0 space-y-3 sm:space-y-4">
              <TopBar
                selectedSlots={selectedSlots}
                onNewBooking={handleNewBooking}
                selectedConsole={selectedConsole}
                onConsoleChange={setSelectedConsole}
                availableConsoles={availableConsoles}
                compact
              />
              <ScheduleGrid
                availableConsoles={availableConsoles}
                selectedConsole={selectedConsole}
                selectedSlots={selectedSlots}
                onSlotSelect={handleSlotSelect}
                allSlots={allSlots}
                isLoading={isLoading}
                fetchSlotBookings={fetchSlotBookings}
                compact
              />
            </div>
            <div className="min-h-0 flex-1">
              <RecentBookings bookings={slotBookings} isLoading={isLoadingBookings} fixedCard />
            </div>
          </>
        ) : (
          <>
            <TopBar
              selectedSlots={selectedSlots}
              onNewBooking={handleNewBooking}
              selectedConsole={selectedConsole}
              onConsoleChange={setSelectedConsole}
              availableConsoles={availableConsoles}
            />
            <ScheduleGrid
              availableConsoles={availableConsoles}
              selectedConsole={selectedConsole}
              selectedSlots={selectedSlots}
              onSlotSelect={handleSlotSelect}
              allSlots={allSlots}
              isLoading={isLoading}
              fetchSlotBookings={fetchSlotBookings}
            />
            <RecentBookings bookings={slotBookings} isLoading={isLoadingBookings} />
          </>
        )}
      </div>

      <SlotBookingForm
        isOpen={showBookingForm}
        onClose={() => setShowBookingForm(false)}
        selectedSlots={selectedSlots}
        onBookingComplete={handleBookingComplete}
        availableConsoles={availableConsoles}
      />
    </main>
  )
}
