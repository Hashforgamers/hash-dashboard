"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { jwtDecode } from 'jwt-decode'
import { useRouter } from "next/navigation"
import { useSubscription } from "@/hooks/useSubscription"

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
  Lock,
  Ticket,
  AlertCircle,
  Clock
} from "lucide-react"
import { BOOKING_URL, DASHBOARD_URL } from '@/src/config/env'
import { ConsoleType } from './types'
import MealSelector from './mealSelector'

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

interface ActivePricingEntry {
  available_game_id: number
  console_type: string
  price: number
  is_offer: boolean
  default_price: number
  offer_name?: string
  discount_percentage?: number
}

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

interface SelectedMeal {
  menu_item_id: number
  name: string
  price: number
  quantity: number
  total: number
  category: string
}

interface SlotBookingFormProps {
  isOpen: boolean
  onClose: () => void
  selectedSlots: SelectedSlot[]
  onBookingComplete: () => void
  availableConsoles: ConsoleType[]
}

// ============= Request Cache =============
const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

function getCachedData(key: string) {
  const cached = requestCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data
  return null
}

function setCachedData(key: string, data: any) {
  requestCache.set(key, { data, timestamp: Date.now() })
}

// ============= Request Deduplication =============
const pendingRequests = new Map<string, Promise<any>>()

async function fetchWithDedup(url: string): Promise<any> {
  const cached = getCachedData(url)
  if (cached) return cached
  if (pendingRequests.has(url)) return pendingRequests.get(url)

  const promise = fetch(url)
    .then(res => res.json())
    .then(data => { setCachedData(url, data); pendingRequests.delete(url); return data })
    .catch(err => { pendingRequests.delete(url); throw err })

  pendingRequests.set(url, promise)
  return promise
}

// ============= Batch API Call =============
async function fetchSlotsBatch(vendorId: number, gameIds: number[], dates: string[]) {
  const url = `${BOOKING_URL}/api/getSlotsBatch/vendor/${vendorId}`
  const cacheKey = `batch:${vendorId}:${gameIds.join(',')}:${dates.join(',')}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_ids: gameIds, dates })
  })

  if (!response.ok) throw new Error(`Batch fetch failed: ${response.status}`)
  const data = await response.json()
  setCachedData(cacheKey, data)
  return data
}

const PAYMENT_TYPES = ['Cash', 'UPI', 'Pass'] as const

/* ------------------------------------------------------------------ */
/* LOCKED OVERLAY                                                       */
/*                                                                     */
/* KEY: Uses `absolute inset-0` (NOT fixed) so it only covers the     */
/* content wrapper div — the sidebar lives outside that div and is    */
/* completely unaffected.                                              */
/* ------------------------------------------------------------------ */
function LockedOverlay() {
  const router = useRouter()
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/70 backdrop-blur-md rounded-xl pointer-events-auto">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="p-4 bg-destructive/10 rounded-full shadow-sm">
          <Lock className="w-10 h-10 text-destructive" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-foreground">Subscription Required</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
            Subscribe to view and manage live sessions and slots.
          </p>
        </div>
        <button
          onClick={() => router.push("/subscription")}
          className="mt-2 px-8 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-md"
        >
          Subscribe Now
        </button>
      </div>
    </div>
  )
}


function SlotBookingForm({ 
  isOpen, 
  onClose, 
  selectedSlots, 
  onBookingComplete,
  availableConsoles 
}: SlotBookingFormProps) {
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [paymentType, setPaymentType] = useState<string>('Cash')
  const [passUid, setPassUid] = useState('')
  const [validatedPass, setValidatedPass] = useState<any>(null)
  const [isValidatingPass, setIsValidatingPass] = useState(false)
  const [passError, setPassError] = useState('')
  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(false)
  const [waiveOffAmount, setWaiveOffAmount] = useState<number>(0)
  const [extraControllerFare, setExtraControllerFare] = useState<number>(0)
  const [autoWaiveOffAmount, setAutoWaiveOffAmount] = useState<number>(0)
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([])
  const [isMealSelectorOpen, setIsMealSelectorOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activePricing, setActivePricing] = useState<Record<string, ActivePricingEntry>>({})
  const [userList, setUserList] = useState<{ name: string; email: string; phone: string }[]>([])
  const [emailSuggestions, setEmailSuggestions] = useState<{ name: string; email: string; phone: string }[]>([])
  const [phoneSuggestions, setPhoneSuggestions] = useState<{ name: string; email: string; phone: string }[]>([])
  const [nameSuggestions, setNameSuggestions] = useState<{ name: string; email: string; phone: string }[]>([])
  const [focusedInput, setFocusedInput] = useState<string>('')
  const blurTimeoutRef = useRef<number | null>(null)

  const getVendorIdFromToken = (): number | null => {
    const token = localStorage.getItem('jwtToken')
    if (!token) return null
    try {
      const decoded = jwtDecode<{ sub: { id: number } }>(token)
      return decoded.sub.id
    } catch { return null }
  }

  const calculateAutoWaiveOff = (slots: SelectedSlot[]) => {
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    let totalAutoWaiveOff = 0
    slots.forEach(slot => {
      const slotDateTime = new Date(`${slot.date}T${slot.start_time}+05:30`)
      const slotEndTime = new Date(`${slot.date}T${slot.end_time}+05:30`)
      const slotDurationMs = slotEndTime.getTime() - slotDateTime.getTime()
      const slotDurationMinutes = slotDurationMs / (1000 * 60)
      if (nowIST >= slotDateTime && nowIST < slotEndTime) {
        const elapsedMs = nowIST.getTime() - slotDateTime.getTime()
        const elapsedMinutes = elapsedMs / (1000 * 60)
        totalAutoWaiveOff += slot.console_price * (elapsedMinutes / slotDurationMinutes)
      } else if (nowIST >= slotEndTime) {
        totalAutoWaiveOff += slot.console_price
      }
    })
    return Math.round(totalAutoWaiveOff)
  }

  const validatePass = async (uid: string) => {
    const vendorId = getVendorIdFromToken()
    if (!vendorId || !uid.trim()) return
    setIsValidatingPass(true)
    setPassError('')
    try {
      const response = await fetch(`${BOOKING_URL}/api/pass/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass_uid: uid.trim(), vendor_id: vendorId }),
      })
      const data = await response.json()
      if (response.ok && data.valid) {
        setValidatedPass(data.pass)
        setPassError('')
        const hoursNeeded = selectedSlots.length * 0.5
        if (hoursNeeded > data.pass.remaining_hours) {
          setPassError(`Insufficient hours. Need ${hoursNeeded} hrs, available ${data.pass.remaining_hours} hrs`)
        }
      } else {
        setPassError(data.error || 'Invalid pass')
        setValidatedPass(null)
      }
    } catch {
      setPassError('Failed to validate pass')
      setValidatedPass(null)
    } finally {
      setIsValidatingPass(false)
    }
  }

  useEffect(() => {
    setAutoWaiveOffAmount(selectedSlots.length > 0 ? calculateAutoWaiveOff(selectedSlots) : 0)
  }, [selectedSlots])

  useEffect(() => {
    if (!isOpen) return
    const vendorId = getVendorIdFromToken()
    if (!vendorId) return
    fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/active-pricing`)
      .then(r => r.json())
      .then(data => { if (data.success) setActivePricing(data.pricing) })
      .catch(() => {})
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const vendorId = getVendorIdFromToken()
    if (!vendorId) return
    const userCacheKey = 'userList'
    const cachedData = localStorage.getItem(userCacheKey)
    const isCacheValid = (ts: number) => Date.now() - ts < 10 * 60 * 1000
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`)
        const data = await response.json()
        if (Array.isArray(data)) {
          setUserList(data)
          localStorage.setItem(userCacheKey, JSON.stringify({ data, timestamp: Date.now() }))
        }
      } catch {}
    }
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData)
        if (isCacheValid(timestamp)) setUserList(data)
        else fetchUsers()
      } catch { fetchUsers() }
    } else { fetchUsers() }
  }, [isOpen])

  const getSuggestions = (key: keyof typeof userList[0], value: string) => {
    if (!value.trim()) return userList
    return userList.filter(u => u[key].toLowerCase().includes(value.toLowerCase()))
  }

  const handleEmailInputChange = (value: string) => { setEmail(value); setEmailSuggestions(getSuggestions('email', value)); setFocusedInput('email') }
  const handlePhoneInputChange = (value: string) => { setPhone(value); setPhoneSuggestions(getSuggestions('phone', value)); setFocusedInput('phone') }
  const handleNameInputChange  = (value: string) => { setName(value);  setNameSuggestions(getSuggestions('name', value));   setFocusedInput('name') }

  const handleEmailFocus = () => { if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null } setFocusedInput("email"); setEmailSuggestions(getSuggestions("email", email)) }
  const handlePhoneFocus = () => { if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null } setFocusedInput("phone"); setPhoneSuggestions(getSuggestions("phone", phone)) }
  const handleNameFocus  = () => { if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null } setFocusedInput("name");  setNameSuggestions(getSuggestions("name", name)) }

  const handleBlur = () => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setFocusedInput(""); setEmailSuggestions([]); setPhoneSuggestions([]); setNameSuggestions([])
      blurTimeoutRef.current = null
    }, 150)
  }

  const handleSuggestionClick = (user: typeof userList[0]) => {
    if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null }
    setEmail(user.email); setPhone(user.phone); setName(user.name)
    setEmailSuggestions([]); setPhoneSuggestions([]); setNameSuggestions([])
    setFocusedInput("")
  }

  const getEffectivePrice = (slot: SelectedSlot): number => {
    const key = slot.console_name.toLowerCase()
    const entry = activePricing[key] || Object.values(activePricing).find(p => p.console_type.toLowerCase() === slot.console_name.toLowerCase())
    return entry ? entry.price : slot.console_price
  }

  const mealsTotal   = selectedMeals.reduce((sum, meal) => sum + meal.total, 0)
  const consoleTotal = selectedSlots.reduce((sum, slot) => sum + getEffectivePrice(slot), 0)
  const totalAmount  = Math.max(0, consoleTotal - waiveOffAmount - autoWaiveOffAmount + extraControllerFare + mealsTotal)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim())  newErrors.name  = 'Name is required'
    if (!email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid'
    if (!phone.trim()) newErrors.phone = 'Phone number is required'
    if (selectedSlots.length === 0) newErrors.slots = 'Please select at least one time slot'
    if (!paymentType)  newErrors.payment = 'Please select a payment method'
    if (paymentType === 'Pass') {
      if (!passUid.trim())  newErrors.pass = 'Please enter pass UID'
      else if (!validatedPass) newErrors.pass = 'Please validate the pass first'
      else if (passError)  newErrors.pass = passError
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    const vendorId = getVendorIdFromToken()
    if (!vendorId) { alert('Please login again'); return }
    setIsSubmitting(true)
    try {
      if (paymentType === 'Pass' && validatedPass) {
        const passRedeemResponse = await fetch(`${BOOKING_URL}/api/pass/redeem/dashboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pass_uid: passUid.trim(), vendor_id: vendorId,
            hours_to_deduct: selectedSlots.length * 0.5,
            session_start: selectedSlots[0]?.start_time.slice(0, 5),
            session_end: selectedSlots[selectedSlots.length - 1]?.end_time.slice(0, 5),
            notes: `Booking for ${selectedSlots[0]?.console_name} - ${selectedSlots.length} slots`,
          }),
        })
        const passRedeemData = await passRedeemResponse.json()
        if (!passRedeemResponse.ok || !passRedeemData.success) {
          alert(`Pass redemption failed: ${passRedeemData.error}`)
          setIsSubmitting(false); return
        }
      }

      const bookingData = {
        consoleType: selectedSlots[0]?.console_name || '', name, email, phone,
        bookedDate: selectedSlots[0]?.date || '',
        slotId: selectedSlots.map(slot => slot.slot_id),
        paymentType, waiveOffAmount: waiveOffAmount + autoWaiveOffAmount, extraControllerFare,
        selectedMeals: selectedMeals.map(meal => ({ menu_item_id: meal.menu_item_id, quantity: meal.quantity })),
        bookingMode: isPrivateMode ? 'private' : 'regular',
      }

      const response = await fetch(`${BOOKING_URL}/api/newBooking/vendor/${vendorId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookingData),
      })
      if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.message || 'Failed to submit booking') }
      const result = await response.json()
      if (response.ok || result.success === true || result.success === 'true') {
        setIsSubmitted(true)
        window.dispatchEvent(new CustomEvent('refresh-dashboard'))
        const userCacheKey = 'userList'
        const cached = localStorage.getItem(userCacheKey)
        if (cached) {
          try {
            const { data } = JSON.parse(cached)
            if (!data.some((u: any) => u.email === email || u.phone === phone)) {
              const usersResponse = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`)
              const updatedUsers = await usersResponse.json()
              if (Array.isArray(updatedUsers)) localStorage.setItem(userCacheKey, JSON.stringify({ data: updatedUsers, timestamp: Date.now() }))
            }
          } catch {}
        }
      } else { alert(`Error: ${result.message || 'Unexpected response from server'}`) }
    } catch (error) { console.error(error); alert('Failed to create booking') }
    finally { setIsSubmitting(false) }
  }

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center shadow-lg">
            <CheckCircle className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Booking Confirmed!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Your slot booking has been successfully created.</p>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 mb-6 text-left">
            <div className="flex justify-between items-center py-2"><span className="text-gray-600 dark:text-gray-400">Console Type:</span><span className="font-medium text-gray-800 dark:text-white">{selectedSlots[0]?.console_name}</span></div>
            <div className="flex justify-between items-center py-2"><span className="text-gray-600 dark:text-gray-400">Slots:</span><span className="font-medium text-gray-800 dark:text-white">{selectedSlots.length}</span></div>
            <div className="flex justify-between items-center py-2"><span className="text-gray-600 dark:text-gray-400">Meals & Extras:</span><span className="font-medium text-gray-800 dark:text-white">{selectedMeals.length === 0 ? 'None' : selectedMeals.map(m => `${m.name} (${m.quantity})`).join(', ')}</span></div>
            <div className="flex justify-between items-center py-2 border-t border-emerald-200 dark:border-emerald-700"><span className="text-gray-600 dark:text-gray-400">Total Amount:</span><span className="font-bold text-emerald-600 text-xl">₹{totalAmount}</span></div>
          </div>
          <Button onClick={() => { onBookingComplete(); onClose(); setIsSubmitted(false) }} className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700">Create Another Booking</Button>
        </motion.div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-6xl max-h-[95vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">New Slot Booking</h2>
            <button onClick={onClose} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Selected Slots */}
                  <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700">
                    <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 mb-3">Selected Time Slots</h3>
                    <div className="space-y-2">
                      {selectedSlots.map((slot, index) => (
                        <div key={index} className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 rounded-lg p-3">
                          <span className="text-gray-700 dark:text-gray-300">
                            <strong>{new Date(slot.date).toLocaleDateString('en-GB')}</strong> • {slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)} • {slot.console_name}
                          </span>
                          <span className="flex items-center gap-2 font-semibold">
                            {(() => {
                              const key = slot.console_name.toLowerCase()
                              const entry = activePricing[key] || Object.values(activePricing).find(p => p.console_type.toLowerCase() === slot.console_name.toLowerCase())
                              const isOffer = entry?.is_offer
                              return (<>
                                {isOffer && <span className="line-through text-gray-400 text-xs">₹{slot.console_price}</span>}
                                <span className={isOffer ? "text-orange-500" : "text-emerald-600 dark:text-emerald-400"}>₹{getEffectivePrice(slot)}</span>
                                {isOffer && <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-1.5 py-0.5 rounded-full">🏷️ {entry?.offer_name}</span>}
                              </>)
                            })()}
                          </span>
                        </div>
                      ))}
                      <div className="text-right pt-2 border-t border-emerald-200 dark:border-emerald-700">
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold">Slots Total: ₹{consoleTotal}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Customer Info */}
                  <Card className="p-6 bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded"><Users className="w-4 h-4 text-emerald-600" /></div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Customer Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Email */}
                      <div className="relative">
                        <input type="email" value={email} onChange={e => handleEmailInputChange(e.target.value)} onFocus={handleEmailFocus} onBlur={handleBlur} autoComplete="off" placeholder="Email"
                          className={cn("w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20",
                            errors.email ? "border-red-500" : focusedInput === "email" ? "border-emerald-500" : "border-gray-300 dark:border-gray-600 focus:border-emerald-500")} />
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                        <AnimatePresence>{focusedInput === "email" && emailSuggestions.length > 0 && (
                          <motion.ul initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                            className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full mt-1 max-h-40 overflow-y-auto">
                            {emailSuggestions.slice(0, 5).map((user, idx) => (
                              <motion.li key={idx} className="px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0" onMouseDown={() => handleSuggestionClick(user)}>
                                <div className="flex items-center gap-2">
                                  <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full"><User className="w-3 h-3 text-emerald-600" /></div>
                                  <div><p className="font-medium text-gray-800 dark:text-white text-sm">{user.name}</p><p className="text-gray-600 dark:text-gray-400 text-xs">{user.email}</p></div>
                                </div>
                              </motion.li>
                            ))}
                          </motion.ul>
                        )}</AnimatePresence>
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                      </div>
                      {/* Phone */}
                      <div className="relative">
                        <input type="tel" value={phone} onChange={e => handlePhoneInputChange(e.target.value)} onFocus={handlePhoneFocus} onBlur={handleBlur} autoComplete="off" placeholder="Phone"
                          className={cn("w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20",
                            errors.phone ? "border-red-500" : focusedInput === "phone" ? "border-emerald-500" : "border-gray-300 dark:border-gray-600 focus:border-emerald-500")} />
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                        <AnimatePresence>{focusedInput === "phone" && phoneSuggestions.length > 0 && (
                          <motion.ul initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                            className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full mt-1 max-h-40 overflow-y-auto">
                            {phoneSuggestions.slice(0, 5).map((user, idx) => (
                              <motion.li key={idx} className="px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0" onMouseDown={() => handleSuggestionClick(user)}>
                                <div className="flex items-center gap-2">
                                  <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full"><User className="w-3 h-3 text-emerald-600" /></div>
                                  <div><p className="font-medium text-gray-800 dark:text-white text-sm">{user.name}</p><p className="text-gray-600 dark:text-gray-400 text-xs">{user.phone}</p></div>
                                </div>
                              </motion.li>
                            ))}
                          </motion.ul>
                        )}</AnimatePresence>
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                      </div>
                      {/* Name */}
                      <div className="relative">
                        <input type="text" value={name} onChange={e => handleNameInputChange(e.target.value)} onFocus={handleNameFocus} onBlur={handleBlur} placeholder="Full name"
                          className={cn("w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20",
                            errors.name ? "border-red-500" : focusedInput === "name" ? "border-emerald-500" : "border-gray-300 dark:border-gray-600 focus:border-emerald-500")} />
                        <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                        <AnimatePresence>{focusedInput === "name" && nameSuggestions.length > 0 && (
                          <motion.ul initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                            className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full mt-1 max-h-40 overflow-y-auto">
                            {nameSuggestions.slice(0, 5).map((user, idx) => (
                              <motion.li key={idx} className="px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0" onMouseDown={() => handleSuggestionClick(user)}>
                                <div className="flex items-center gap-2">
                                  <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full"><User className="w-3 h-3 text-emerald-600" /></div>
                                  <div><p className="font-medium text-gray-800 dark:text-white text-sm">{user.name}</p><p className="text-gray-600 dark:text-gray-400 text-xs">{user.email}</p></div>
                                </div>
                              </motion.li>
                            ))}
                          </motion.ul>
                        )}</AnimatePresence>
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                      </div>
                    </div>
                  </Card>

                  {/* Private Booking Toggle */}
                  <Card className="p-4 bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg transition-all duration-300", isPrivateMode ? "bg-gradient-to-br from-purple-500 to-pink-500" : "bg-gray-300 dark:bg-gray-600")}>
                          {isPrivateMode ? <Lock className="w-5 h-5 text-white" /> : <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            {isPrivateMode
                              ? <><span className="text-purple-600 dark:text-purple-400">Private Booking</span><span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">Manual Mode</span></>
                              : <><span className="text-gray-700 dark:text-gray-300">Regular Booking</span><span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">Standard Mode</span></>}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{isPrivateMode ? 'Walk-in or manual booking for internal tracking' : 'Online booking with standard workflow'}</p>
                        </div>
                      </div>
                      <motion.button type="button" onClick={() => setIsPrivateMode(!isPrivateMode)} whileTap={{ scale: 0.95 }}
                        className={cn("relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2",
                          isPrivateMode ? "bg-gradient-to-r from-purple-600 to-pink-600 focus:ring-purple-500" : "bg-gray-300 dark:bg-gray-600 focus:ring-gray-400")}>
                        <span className="sr-only">Toggle private mode</span>
                        <motion.span animate={{ x: isPrivateMode ? 28 : 4 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg" />
                      </motion.button>
                    </div>
                    <AnimatePresence>{isPrivateMode && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mt-3 flex items-start gap-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2.5 border border-purple-200 dark:border-purple-700">
                        <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-purple-800 dark:text-purple-200"><strong>Private Mode Active:</strong> This booking will be marked as a private/walk-in booking for internal tracking.</p>
                      </motion.div>
                    )}</AnimatePresence>
                  </Card>

                  {/* Payment Method */}
                  <Card className="p-6 bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded"><CreditCard className="w-4 h-4 text-yellow-600" /></div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Payment Method</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {PAYMENT_TYPES.map(type => (
                        <motion.button key={type} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={() => { setPaymentType(type); if (type !== 'Pass') { setPassUid(''); setValidatedPass(null); setPassError('') }; if (errors.payment) setErrors(prev => ({ ...prev, payment: '' })) }}
                          className={cn("p-4 rounded-lg border transition-all duration-200", paymentType === type ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'border-gray-300 dark:border-gray-600 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20')}>
                          <div className="flex items-center justify-center gap-2">
                            {type === 'Cash' && <Wallet className="w-5 h-5" />}
                            {type === 'UPI'  && <CreditCard className="w-5 h-5" />}
                            {type === 'Pass' && <Ticket className="w-5 h-5" />}
                            <span className="font-medium">{type}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                    <AnimatePresence>{paymentType === 'Pass' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 space-y-2">
                        <div className="relative">
                          <input type="text" value={passUid} onChange={e => setPassUid(e.target.value.toUpperCase())} onBlur={() => { if (passUid.trim()) validatePass(passUid) }}
                            placeholder="Enter Pass UID (HFG-XXXXXXXXXXXX)"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200 text-sm" />
                          {isValidatingPass && <Loader2 className="w-4 h-4 animate-spin text-emerald-600 absolute right-3 top-2.5" />}
                        </div>
                        {validatedPass && !passError && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 border border-emerald-200 dark:border-emerald-700">
                            <div className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 text-xs space-y-1">
                                <p className="font-semibold text-emerald-800 dark:text-emerald-200">{validatedPass.pass_name}</p>
                                <div className="flex justify-between text-emerald-700 dark:text-emerald-300"><span>Hours Available</span><span className="font-bold">{validatedPass.remaining_hours}/{validatedPass.total_hours}</span></div>
                                {selectedSlots.length > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Hours Needed</span><span className="font-bold">{selectedSlots.length * 0.5} hrs</span></div>}
                              </div>
                            </div>
                          </motion.div>
                        )}
                        {passError && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-500 flex items-center gap-1"><X className="w-3 h-3" />{passError}</motion.p>}
                        {errors.pass && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-500">{errors.pass}</motion.p>}
                      </motion.div>
                    )}</AnimatePresence>
                    {errors.payment && <p className="text-red-500 text-sm mt-2">{errors.payment}</p>}
                  </Card>
                </div>

                {/* Pricing Summary */}
                <div className="space-y-6">
                  <Card className="p-6 bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded"><Sparkles className="w-4 h-4 text-indigo-600" /></div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Pricing Summary</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600"><span className="text-gray-600 dark:text-gray-400">Console Total:</span><span className="font-medium text-gray-800 dark:text-white">₹{consoleTotal}</span></div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-400">Manual Waive Off:</span>
                        <input type="number" value={waiveOffAmount} onChange={e => setWaiveOffAmount(Number(e.target.value) || 0)} placeholder="₹0" min={0}
                          className="w-20 text-right px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors" />
                      </div>
                      {autoWaiveOffAmount > 0 && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3">
                          <span className="text-orange-600 dark:text-orange-400 font-medium">⏰ Auto Waive Off:</span>
                          <div className="text-right"><span className="font-bold text-orange-600 dark:text-orange-400">₹{Math.round(autoWaiveOffAmount)}</span><div className="text-xs text-orange-500 dark:text-orange-300">(Time-based discount)</div></div>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-400">Extra Controller:</span>
                        <input type="number" value={extraControllerFare} onChange={e => setExtraControllerFare(Number(e.target.value) || 0)} placeholder="₹0" min={0}
                          className="w-20 text-right px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors" />
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-400">Meals & Extras:</span>
                        <button type="button" onClick={() => setIsMealSelectorOpen(true)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm hover:from-emerald-200 hover:to-green-200 transition-all duration-200 border border-emerald-200 dark:border-emerald-700">
                          <Plus className="w-3 h-3" />{selectedMeals.length === 0 ? 'Add Meals' : `${selectedMeals.length} Selected`}
                        </button>
                      </div>
                      {selectedMeals.length > 0 && (
                        <div className="py-2 border-b border-gray-200 dark:border-gray-600">
                          <div className="space-y-2">
                            {selectedMeals.map(meal => (
                              <div key={meal.menu_item_id} className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1"><span className="font-medium text-emerald-800 dark:text-emerald-200 text-sm">{meal.name}</span><div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{meal.category} • ₹{meal.price} × {meal.quantity}</div></div>
                                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">₹{meal.total}</span>
                                </div>
                              </div>
                            ))}
                            <div className="text-right pt-2 border-t border-emerald-200 dark:border-emerald-700"><span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Meals Total: ₹{mealsTotal}</span></div>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-3">
                        <span className="font-bold text-gray-800 dark:text-white text-lg">Final Total:</span>
                        <span className="font-bold text-2xl text-emerald-600">₹{totalAmount}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button type="button" onClick={onClose} variant="outline" className="flex-1 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white disabled:opacity-50">
                  {isSubmitting
                    ? <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Creating Booking...</div>
                    : <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" />Complete Booking - ₹{totalAmount}</div>}
                </Button>
              </div>
            </form>
          </div>
          <MealSelector vendorId={getVendorIdFromToken() || 0} isOpen={isMealSelectorOpen} onClose={() => setIsMealSelectorOpen(false)} onConfirm={meals => { setSelectedMeals(meals); setIsMealSelectorOpen(false) }} initialSelectedMeals={selectedMeals} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function SlotPill({ label, color, icon: Icon, onClick, selected = false, disabled = false }: { label: string; color: PillColor; icon?: React.ComponentType<{ className?: string }>; onClick?: () => void; selected?: boolean; disabled?: boolean }) {
  const colorClasses: Record<PillColor, string> = {
    green:  selected ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg" : "bg-emerald-600 text-white hover:bg-emerald-700",
    blue:   selected ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg" : "bg-blue-600 text-white hover:bg-blue-700",
    purple: selected ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg" : "bg-purple-600 text-white hover:bg-purple-700",
    yellow: selected ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg" : "bg-yellow-500 text-white hover:bg-yellow-600",
    red: "bg-red-600 text-white",
  }
  return (
    <button onClick={onClick} disabled={disabled} className={cn("w-full h-full min-h-[36px] flex items-center justify-center rounded-md text-[10px] font-bold uppercase tracking-wide transition-all duration-200 cursor-pointer", disabled && "cursor-not-allowed opacity-60", colorClasses[color])}>
      {Icon ? <Icon className="h-3 w-3 mr-0.5" /> : null}
      <span className="truncate">{label}</span>
    </button>
  )
}

function SegmentedButton({ children, active = false, icon: Icon, onClick }: { children: React.ReactNode; active?: boolean; icon?: React.ComponentType<{ className?: string }>; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium uppercase transition-all duration-200", active ? "bg-blue-600 text-white shadow-md" : "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600")}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}{children}
    </button>
  )
}

function TopBar({ selectedSlots, onNewBooking }: { selectedSlots: SelectedSlot[]; onNewBooking: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showManageView, setShowManageView] = useState<'change' | 'reject' | 'list' | null>(null)

  if (showManageView) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4">
        <div className="max-w-6xl mx-auto mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {showManageView === 'change' && 'Change Booking'}{showManageView === 'reject' && 'Reject Booking'}{showManageView === 'list' && 'List Bookings'}
            </h2>
            <Button variant="ghost" onClick={() => setShowManageView(null)} className="text-white hover:bg-white/10"><X className="w-5 h-5 mr-2" />Back</Button>
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

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Slot Management</h1>
        <p className="text-sm text-gray-400 mt-1">Manage and monitor console bookings.</p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={onNewBooking} disabled={selectedSlots.length === 0}
          className={cn("rounded-lg text-white shadow-lg transition-all duration-200 px-5 py-2 text-sm font-semibold", selectedSlots.length > 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-500 cursor-not-allowed")}>
          <Plus className="mr-2 h-4 w-4" />New Booking {selectedSlots.length > 0 && `(${selectedSlots.length})`}
        </Button>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-lg border-gray-600 bg-gray-700 hover:bg-gray-600"><MoreVertical className="w-5 h-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => { setShowManageView('change'); setMenuOpen(false) }}><CalendarClock className="w-4 h-4 mr-2" />Change Booking</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setShowManageView('reject'); setMenuOpen(false) }}><XCircle className="w-4 h-4 mr-2" />Reject Booking</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setShowManageView('list'); setMenuOpen(false) }}><ListTodo className="w-4 h-4 mr-2" />List Bookings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function ConsoleFilter({ selectedConsole, onConsoleChange }: { selectedConsole: ConsoleFilter; onConsoleChange: (c: ConsoleFilter) => void }) {
  const consoleIcons = { PC: Monitor, PS5: MonitorPlay, Xbox: Gamepad, VR: Headset }
  return (
    <Card className="rounded-xl border border-gray-700 bg-gray-800/50 backdrop-blur-sm p-4 mb-6">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-400 uppercase">Select Console</span>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(consoleIcons).map(([key, Icon]) => (
            <SegmentedButton key={key} active={selectedConsole === key} icon={Icon} onClick={() => onConsoleChange(key as ConsoleFilter)}>{key}</SegmentedButton>
          ))}
        </div>
      </div>
    </Card>
  )
}

function ScheduleGrid({ availableConsoles, selectedConsole, selectedSlots, onSlotSelect, allSlots, isLoading, fetchSlotBookings }: {
  availableConsoles: ConsoleType[]; selectedConsole: ConsoleFilter; selectedSlots: SelectedSlot[]; onSlotSelect: (slot: SelectedSlot) => void; allSlots: { [key: string]: any[] }; isLoading: boolean; fetchSlotBookings: (slotIds: number[], date: string) => Promise<void>
}) {
  const getNext3Days = () => {
    const days = []
    for (let i = 0; i < 3; i++) {
      const today = new Date()
      const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
      const year = targetDate.getFullYear()
      const month = String(targetDate.getMonth() + 1).padStart(2, '0')
      const day = String(targetDate.getDate()).padStart(2, '0')
      days.push({ date: `${day}/${month}`, fullDate: `${year}-${month}-${day}` })
    }
    return days
  }

  const days = getNext3Days()

  const uniqueTimes = React.useMemo(() => {
    const allTimes = new Set<string>()
    Object.values(allSlots).forEach(daySlots => daySlots.forEach(slot => allTimes.add(slot.start_time.slice(0, 5))))
    return Array.from(allTimes).sort((a, b) => {
      const [aH, aM] = a.split(':').map(Number)
      const [bH, bM] = b.split(':').map(Number)
      return (aH * 60 + aM) - (bH * 60 + bM)
    })
  }, [allSlots])

  const filteredConsoles = availableConsoles.filter(c => c.type === selectedConsole)
  const getConsoleIcon = (t: string) => ({ PC: Monitor, PS5: MonitorPlay, Xbox: Gamepad, VR: Headset }[t] || Monitor)
  const getConsoleColor = (id: number | null): PillColor => { if (!id) return 'green'; return (['green', 'blue', 'purple', 'yellow'] as PillColor[])[id % 4] }
  const isSlotSelected = (slotId: number, date: string) => selectedSlots.some(s => s.slot_id === slotId && s.date === date)

  const handleSlotClick = (dayData: any, time: string, gameConsole: ConsoleType) => {
    const daySlots = allSlots[dayData.fullDate] || []
    const matchingSlot = daySlots.find(slot => slot.start_time.slice(0, 5) === time && slot.console_id === gameConsole.id)
    if (!matchingSlot) return
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const slotEndTime = new Date(`${dayData.fullDate}T${matchingSlot.end_time}+05:30`)
    const isPastTime = nowIST >= slotEndTime
    const selectedSlot: SelectedSlot = { slot_id: matchingSlot.slot_id, date: dayData.fullDate, start_time: matchingSlot.start_time, end_time: matchingSlot.end_time, console_id: gameConsole.id!, console_name: gameConsole.name, console_price: matchingSlot.single_slot_price || gameConsole.price!, available_count: matchingSlot.available_slot || 0 }
    if (isPastTime) { fetchSlotBookings([matchingSlot.slot_id], dayData.fullDate); return }
    if (matchingSlot.is_available) onSlotSelect(selectedSlot)
  }

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-gray-700 bg-gray-800/30 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-center py-12"><div className="text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" /><p className="text-gray-300">Loading available slots...</p></div></div>
      </Card>
    )
  }

  const rows = days.map(day => {
    const daySlots = allSlots[day.fullDate] || []
    return {
      date: day.date, fullDate: day.fullDate,
      cells: uniqueTimes.map((time, timeIndex) => {
        if (filteredConsoles.length === 0) return <span key={timeIndex} />
        const timeSlots: React.ReactNode[] = []
        filteredConsoles.forEach(gameConsole => {
          const consoleSlots = daySlots.filter(slot => slot.start_time.slice(0, 5) === time && slot.console_id === gameConsole.id)
          if (consoleSlots.length === 0) return
          const slot = consoleSlots[0]
          const isSelected = isSlotSelected(slot.slot_id, day.fullDate)
          const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
          const slotEndTime = new Date(`${day.fullDate}T${slot.end_time}+05:30`)
          const isPastTime = nowIST >= slotEndTime
          const isFullyBooked = (slot.available_slot || 0) === 0

          if (isPastTime) {
            timeSlots.push(<div key={`past-${day.fullDate}-${gameConsole.id}`} onClick={() => handleSlotClick(day, time, gameConsole)} className="w-full h-full min-h-[40px] flex items-center justify-center bg-gray-500 dark:bg-gray-600 text-white rounded-md cursor-pointer hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors" title="Past slot - Click to view past bookings"><Clock className="h-4 w-4 mr-1" /><span className="text-xs font-semibold">PAST</span></div>)
          } else if (isFullyBooked) {
            timeSlots.push(<div key={`unavailable-${day.fullDate}-${gameConsole.id}`} className="w-full h-full min-h-[40px] flex items-center justify-center bg-red-600 text-white rounded-md cursor-not-allowed" title="Fully booked"><X className="h-5 w-5 stroke-[3]" /></div>)
          } else {
            timeSlots.push(<div key={`${day.fullDate}-${slot.slot_id}`} className="w-full h-full min-h-[40px]"><SlotPill label={`${gameConsole.name} - ${slot.available_slot}`} color={getConsoleColor(gameConsole.id)} icon={getConsoleIcon(gameConsole.type)} onClick={() => handleSlotClick(day, time, gameConsole)} selected={isSelected} disabled={false} /></div>)
          }
        })
        return <div key={`${day.fullDate}-${timeIndex}`} className="flex flex-row flex-wrap gap-1 items-stretch h-full p-1">{timeSlots}</div>
      }),
    }
  })

  if (uniqueTimes.length === 0) {
    return (
      <Card className="rounded-2xl border border-gray-700 bg-gray-800/30 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-center py-12"><div className="text-center"><CalendarDays className="w-12 h-12 text-gray-500 mx-auto mb-3" /><p className="text-gray-300">No slots available</p></div></div>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border border-gray-700 bg-gray-800/30 backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="grid gap-2 p-4 pb-3 bg-gray-800/50" style={{ gridTemplateColumns: `80px repeat(${uniqueTimes.length}, minmax(110px, 1fr))` }}>
            <div className="text-xs font-semibold text-gray-400 uppercase">Date</div>
            {uniqueTimes.map(time => <div key={time} className="text-sm font-bold text-gray-200 text-center">{time}</div>)}
          </div>
          <div className="border-t border-gray-700">
            {rows.map(row => (
              <div key={row.fullDate} className="grid gap-2 p-4 py-3 border-b border-gray-700/50 last:border-b-0 hover:bg-gray-700/20 transition-colors" style={{ gridTemplateColumns: `80px repeat(${uniqueTimes.length}, minmax(110px, 1fr))` }}>
                <div className="flex items-center text-sm font-bold text-white bg-gray-700/50 rounded-lg px-2 py-2 justify-center">{row.date}</div>
                {row.cells.map((content, idx) => <div key={`${row.fullDate}-cell-${idx}`} className="min-h-[44px] rounded-lg border border-gray-700 bg-gray-800/50 backdrop-blur-sm">{content}</div>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}


function RecentBookings({ bookings, isLoading }: { bookings: any[]; isLoading: boolean }) {
  const hasPastBookings = bookings.some(b => ['completed', 'rejected', 'cancelled'].includes(b.status))
  const bookingType = hasPastBookings ? 'Past' : 'Active'

  if (isLoading) return <Card className="p-6 mt-2 bg-gray-50 dark:bg-gray-700/30"><div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /><span className="ml-2 text-gray-600 dark:text-gray-400">Loading bookings...</span></div></Card>

  if (bookings.length === 0) return (
    <Card className="p-6 mt-2 bg-gray-50 dark:bg-gray-700/30">
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="p-3 bg-gray-200 dark:bg-gray-600 rounded-full mb-3"><AlertCircle className="w-6 h-6 text-gray-500 dark:text-gray-400" /></div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">No {hasPastBookings ? 'past' : 'active'} bookings for selected slot</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{hasPastBookings ? 'This past slot has no booking history' : 'This slot is available for new bookings'}</p>
      </div>
    </Card>
  )

  return (
    <Card className="p-4 mt-2 bg-gray-50 dark:bg-gray-700/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          {hasPastBookings ? <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <CalendarDays className="w-5 h-5 text-emerald-600" />}
          <span className={hasPastBookings ? "text-gray-700 dark:text-gray-300" : ""}>{bookingType} Slot Bookings</span>
          <span className="text-sm font-normal text-gray-500">({bookings.length} {bookingType})</span>
        </h3>
        {hasPastBookings && <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">History</span>}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {['Booking ID', 'Customer Details', 'Time', 'Status', 'Meal Selection', 'Actions'].map(h => <TableHead key={h} className="text-gray-700 dark:text-gray-300">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map(booking => (
              <TableRow key={booking.booking_id} className={cn("hover:bg-gray-100 dark:hover:bg-gray-600/30", hasPastBookings && "opacity-80")}>
                <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">{booking.booking_fid}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-gray-800 dark:text-white flex items-center gap-1"><User className="w-3 h-3" />{booking.customer_name}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" />{booking.customer_email}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{booking.customer_phone}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{booking.slot_start_time?.slice(0, 5)} - {booking.slot_end_time?.slice(0, 5)}</span>
                    <span className="text-xs text-gray-500">{new Date(booking.booking_date).toLocaleDateString('en-GB')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn("px-2 py-1 rounded-full text-xs font-medium",
                    booking.status === 'confirmed' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                    booking.status === 'checked_in' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                    booking.status === 'pending_verified' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    booking.status === 'completed' && "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
                    (booking.status === 'cancelled' || booking.status === 'rejected') && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
                    {booking.status === 'checked_in' ? 'Checked-In' : booking.status === 'pending_verified' ? 'Pending' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell>
                  {booking.meals && booking.meals.length > 0
                    ? <div className="flex items-center gap-1"><Sparkles className="w-4 h-4 text-emerald-600" /><span className="text-xs">{booking.meal_selection}</span></div>
                    : <span className="text-gray-500 italic text-xs">No meal selected</span>}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className={cn("text-xs", hasPastBookings ? "text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30")}>
                    {hasPastBookings ? 'View History' : 'View Details'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {hasPastBookings ? <span className="flex items-center gap-2"><Clock className="w-4 h-4" />Historical records for this time slot</span> : <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />Currently active bookings</span>}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {['confirmed', 'checked_in', 'pending_verified', 'completed', 'cancelled'].map(status => {
            const count = bookings.filter(b => b.status === status).length
            if (count === 0) return null
            return (
              <span key={status} className="flex items-center gap-1">
                <span className={cn("w-2 h-2 rounded-full", status === 'confirmed' && "bg-green-500", status === 'checked_in' && "bg-orange-500", status === 'pending_verified' && "bg-blue-500", status === 'completed' && "bg-gray-500", status === 'cancelled' && "bg-red-500")} />
                <span className="text-gray-600 dark:text-gray-400">{status === 'checked_in' ? 'Checked-In' : status === 'pending_verified' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}: {count}</span>
              </span>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function ChangeBookingForm() {
  const [bookingId, setBookingId] = useState(""); const [isLoading, setIsLoading] = useState(false); const [bookingFound, setBookingFound] = useState(false); const [bookingData, setBookingData] = useState(null); const [availableSlots, setAvailableSlots] = useState([]); const [isUpdating, setIsUpdating] = useState(false); const [isSubmitted, setIsSubmitted] = useState(false); const [vendorId, setVendorId] = useState(null)
  useEffect(() => { const token = localStorage.getItem("jwtToken"); if (token) setVendorId(jwtDecode<any>(token).sub.id) }, [])
  const handleSearch = async () => { if (!bookingId) return; setIsLoading(true); try { const response = await fetch(`${BOOKING_URL}/api/bookings/${bookingId}`); const data = await response.json(); if (response.ok && data.success && data.booking) { setIsSubmitted(false); const { booking } = data; setBookingData({ customer: booking.customer || { name: "", email: "", phone: "" }, booking_date: booking.date || "", selected_slots: [booking.time_slot.start_time], system: booking.system || "", vendorId, consoleTypeId: booking.game_id }); setBookingFound(true); const r = await fetch(`${BOOKING_URL}/api/getSlots/vendor/1/game/${booking.game_id}/${booking.date.replaceAll("-", "")}`); const d = await r.json(); if (r.ok && d.slots) setAvailableSlots(d.slots) } else setBookingFound(false) } catch { setBookingFound(false) } finally { setIsLoading(false) } }
  const handleUpdateBooking = async (e) => { e.preventDefault(); setIsUpdating(true); if (!bookingData) return; try { const response = await fetch(`${BOOKING_URL}/api/update_booking/${bookingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bookingData) }); if (response.ok) setIsSubmitted(true); else alert("Failed to update booking.") } catch {} finally { setIsUpdating(false) } }
  return (
    <div className="p-6"><form className="space-y-8">
      <div className="space-y-4"><h3 className="text-lg font-semibold text-gray-800 dark:text-white">Search Booking</h3><div className="flex space-x-2"><input placeholder="Enter Booking ID" value={bookingId} onChange={e => setBookingId(e.target.value)} className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white" /><Button type="button" onClick={handleSearch} disabled={isLoading} className="min-w-[100px] bg-emerald-600 hover:bg-emerald-700">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" />Search</>}</Button></div></div>
      {bookingFound && bookingData && !isSubmitted ? (<div className="space-y-8">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Gamer's Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['name', 'email', 'phone'] as const).map(field => (<div key={field} className="space-y-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{field === 'phone' ? 'Phone Number' : field.charAt(0).toUpperCase() + field.slice(1)}</label><input type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} value={bookingData.customer?.[field] || ""} onChange={e => setBookingData(prev => ({ ...prev, customer: { ...prev.customer, [field]: e.target.value } }))} className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white" /></div>))}
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Booking Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Booking Date</label><input type="date" value={bookingData.booking_date || ""} onChange={e => setBookingData(prev => ({ ...prev, booking_date: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white" /></div>
          <div className="space-y-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Slot Time</label><div className="grid grid-cols-6 gap-2">{availableSlots.map(slot => (<Button key={slot.slot_id} type="button" variant="outline" disabled={!slot.is_available} className={`rounded-full text-xs ${bookingData.selected_slots.includes(slot.start_time) ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}`} onClick={() => setBookingData(prev => ({ ...prev, selected_slots: [slot.start_time] }))}>{slot.start_time}</Button>))}</div></div>
        </div>
        <Button onClick={handleUpdateBooking} disabled={isUpdating} className="bg-emerald-600 hover:bg-emerald-700">{isUpdating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : "Update Booking"}</Button>
      </div>) : null}
      {isSubmitted && <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500"><CheckCircle className="h-4 w-4 text-emerald-600" /><AlertDescription className="text-emerald-700 dark:text-emerald-300">Booking has been successfully updated.</AlertDescription></Alert>}
    </form></div>
  )
}

function RejectBookingForm() {
  const [bookingId, setBookingId] = useState(""); const [bookingFound, setBookingFound] = useState(false); const [rejectionReason, setRejectionReason] = useState(""); const [repaymentType, setRepaymentType] = useState(""); const [userEmail, setUserEmail] = useState(""); const [bookingData, setBookingData] = useState(null); const [confirmReject, setConfirmReject] = useState(false); const [isConfirmingRejection, setIsConfirmingRejection] = useState(false); const [isLoading, setIsLoading] = useState(false); const [isSubmitted, setIsSubmitted] = useState(false); const [vendorId, setVendorId] = useState(null)
  useEffect(() => { const token = localStorage.getItem("jwtToken"); if (token) setVendorId(jwtDecode<any>(token).sub.id) }, [])
  const handleSearch = async () => { if (!bookingId) return; setIsLoading(true); try { const response = await fetch(`${BOOKING_URL}/api/bookings/${bookingId}`); const data = await response.json(); if (response.ok && data.success && data.booking) { setIsSubmitted(false); const { booking } = data; setBookingData({ customer: booking.customer || { name: "", email: "", phone: "" }, booking_date: booking.date || "", booking_id: booking.booking_id, selected_slots: [booking.time_slot.start_time], system: booking.system || "", vendorId, consoleTypeId: booking.game_id, start_time: booking.time_slot.start_time, end_time: booking.time_slot.end_time, amount_paid: booking.amount_paid }); setUserEmail(booking.customer?.email || ""); setBookingFound(true) } else setBookingFound(false) } catch { setBookingFound(false) } finally { setIsLoading(false) } }
  const handleSubmit = async (e) => { e.preventDefault(); if (!confirmReject) { setConfirmReject(true); return } setIsConfirmingRejection(true); setIsLoading(true); try { const response = await fetch(`${BOOKING_URL}/api/bookings/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ booking_id: bookingId, rejection_reason: rejectionReason, repayment_type: repaymentType, user_email: userEmail }) }); if (response.ok) setIsSubmitted(true) } catch {} finally { setIsConfirmingRejection(false); setIsLoading(false) } }
  return (
    <div className="p-6"><form className="space-y-8" onSubmit={handleSubmit}>
      <div className="space-y-4"><h3 className="text-lg font-semibold text-gray-800 dark:text-white">Search Booking</h3><div className="flex space-x-2"><input placeholder="Enter Booking ID" value={bookingId} onChange={e => setBookingId(e.target.value)} className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white" /><Button type="button" onClick={handleSearch} disabled={isLoading} className="min-w-[100px] bg-emerald-600 hover:bg-emerald-700">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" />Search</>}</Button></div></div>
      {isSubmitted ? (<Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500"><CheckCircle className="h-4 w-4 text-emerald-600" /><AlertDescription className="text-emerald-700 dark:text-emerald-300">Booking has been successfully rejected.</AlertDescription></Alert>) : (
        <AnimatePresence>{bookingFound && bookingData && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
          <div className="space-y-6"><h3 className="text-lg font-semibold text-gray-800 dark:text-white">Booking Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-50 dark:bg-gray-700/30 p-6"><div className="space-y-4">{[['Booking ID', bookingData.booking_id], ['Date', bookingData.booking_date], ['Time Slot', `${bookingData.start_time} - ${bookingData.end_time}`], ['System', bookingData.system]].map(([l, v]) => (<div key={l} className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{l}</span><span className="font-medium text-gray-800 dark:text-white">{v || ""}</span></div>))}</div></Card>
              <Card className="bg-gray-50 dark:bg-gray-700/30 p-6"><div className="space-y-4">{[['Customer', bookingData.customer?.name], ['Email', bookingData.customer?.email], ['Phone', bookingData.customer?.phone], ['Amount Paid', `₹${bookingData.amount_paid}`]].map(([l, v]) => (<div key={l} className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{l}</span><span className="font-medium text-gray-800 dark:text-white">{v || ""}</span></div>))}</div></Card>
            </div>
          </div>
          <div className="space-y-6"><h3 className="text-lg font-semibold text-gray-800 dark:text-white">Rejection Details</h3>
            <div className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason for Rejection</label><textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Please provide a detailed reason..." className="w-full min-h-[100px] px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white resize-none" /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Repayment Method</label><Select value={repaymentType} onValueChange={setRepaymentType}><SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"><SelectValue placeholder="Select repayment method" /></SelectTrigger><SelectContent><SelectItem value="refund">Full Refund to Original Payment Method</SelectItem><SelectItem value="credit">Store Credit</SelectItem><SelectItem value="reschedule">Reschedule to Another Date</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          {confirmReject ? (
            <Alert variant="destructive" className="mt-6"><AlertCircle className="h-4 w-4" /><AlertDescription className="flex items-center justify-between"><span>Are you sure you want to reject this booking? This action cannot be undone.</span><div className="flex space-x-2 mt-2"><Button type="button" variant="outline" onClick={() => setConfirmReject(false)}>Cancel</Button><Button type="submit" variant="destructive" disabled={isConfirmingRejection || isLoading}>{isConfirmingRejection || isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Confirming...</> : "Confirm Rejection"}</Button></div></AlertDescription></Alert>
          ) : (<Button type="submit" variant="destructive" className="w-full" disabled={!rejectionReason || !repaymentType}><XCircle className="w-4 h-4 mr-2" />Reject Booking</Button>)}
        </motion.div>)}</AnimatePresence>
      )}
    </form></div>
  )
}

function ListBooking() {
  const [vendorId, setVendorId] = useState(null); const [bookings, setBookings] = useState([]); const [filteredBookings, setFilteredBookings] = useState([]); const [searchQuery, setSearchQuery] = useState(""); const [sortConfig, setSortConfig] = useState(null); const [expandedDates, setExpandedDates] = useState({})
  const toggleDate = (date) => setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }))
  const groupedBookings = useMemo(() => { const groups = {}; filteredBookings.forEach(b => { if (!groups[b.bookedDate]) groups[b.bookedDate] = []; groups[b.bookedDate].push(b) }); return groups }, [filteredBookings])
  useEffect(() => { const token = localStorage.getItem("jwtToken"); if (token) setVendorId(jwtDecode<any>(token).sub.id) }, [])
  const fetchData = async () => { try { const today = new Date(); const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); const formattedDate = startOfMonth.toISOString().slice(0, 10).replace(/-/g, ""); const response = await axios.get(`${BOOKING_URL}/api/getAllBooking/vendor/${vendorId}/${formattedDate}/`, { headers: { "Content-Type": "application/json" } }); const mappedBookings = response.data.map(b => ({ id: b.bookingId.toString(), bookingDate: b.bookingDate, bookingTime: b.bookingTime, username: b.userName, consoleType: b.consoleType, bookedDate: b.bookedDate, startTime: b.startTime || null, endTime: b.endTime || null, status: b.status, type: b.type })); setBookings(mappedBookings); setFilteredBookings(mappedBookings) } catch (error) { console.error("Error fetching data:", error) } }
  useEffect(() => { if (!vendorId) return; fetchData() }, [vendorId])
  useEffect(() => { if (!sortConfig) return; const sorted = [...filteredBookings].sort((a, b) => { if (sortConfig.key === "bookingDate") { const dA = new Date(a.bookingDate); const dB = new Date(b.bookingDate); return sortConfig.direction === "asc" ? dA.getTime() - dB.getTime() : dB.getTime() - dA.getTime() } const vA = a[sortConfig.key]?.toString().toLowerCase() || ""; const vB = b[sortConfig.key]?.toString().toLowerCase() || ""; return sortConfig.direction === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA) }); setFilteredBookings(sorted) }, [sortConfig])
  const handleSort = (key) => setSortConfig(prev => ({ key, direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc" }))
  const handleSearch = () => { if (!searchQuery.trim()) setFilteredBookings(bookings); else { const lower = searchQuery.toLowerCase(); setFilteredBookings(bookings.filter(b => Object.values(b).some(v => v?.toString().toLowerCase().includes(lower)))) } }
  useEffect(() => { handleSearch() }, [searchQuery])
  const getStatusBadge = (status) => { const variants = { rejected: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300", confirmed: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" }; return <span className={`px-3 py-1 rounded-full text-xs font-medium ${variants[status] || "bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>{status}</span> }
  const formatTime = (time) => { if (typeof time === "number") { const d = new Date(time); return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}` }; const [h, m] = time.split(":"); return `${h}:${m}` }
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4"><input placeholder="Search bookings..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white" /><Button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-700"><Search className="w-4 h-4 mr-2" />Search</Button></div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-gray-50 dark:bg-gray-700/50">{[{label:"Booked Date",key:"bookedDate"},{label:"Username",key:"username"},{label:"Status",key:"status"},{label:"Booking ID",key:"id"},{label:"Booking Date",key:"bookingDate"},{label:"Booking Time",key:"bookingTime"},{label:"Console Type",key:"consoleType"},{label:"Start Time",key:"startTime"},{label:"End Time",key:"endTime"},{label:"Type",key:"type"}].map(({label,key}) => (<TableHead key={key} className="font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort(key)}>{label} {sortConfig?.key === key && (sortConfig.direction === "asc" ? "↑" : "↓")}</TableHead>))}</TableRow></TableHeader>
          <TableBody>
            {Object.entries(groupedBookings).map(([bookedDate, bkgs]) => (
              <React.Fragment key={bookedDate}>
                <TableRow className="bg-gray-100 dark:bg-gray-700/30 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50" onClick={() => toggleDate(bookedDate)}><TableCell colSpan={10} className="font-bold text-gray-800 dark:text-white">{expandedDates[bookedDate] ? "▼" : "▶"} {new Date(bookedDate).toDateString()} ({(bkgs as any[]).length})</TableCell></TableRow>
                {expandedDates[bookedDate] && (bkgs as any[]).map((booking, idx) => (
                  <motion.tr key={booking.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ delay: idx * 0.05 }} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                    <TableCell>{booking.bookedDate}</TableCell><TableCell>{booking.username}</TableCell><TableCell>{getStatusBadge(booking.status)}</TableCell><TableCell>{booking.id}</TableCell><TableCell>{booking.bookingDate}</TableCell><TableCell>{booking.bookingTime}</TableCell><TableCell>{booking.consoleType}</TableCell><TableCell>{booking.startTime ? formatTime(booking.startTime) : "Not started"}</TableCell><TableCell>{booking.endTime ? formatTime(booking.endTime) : "Not ended"}</TableCell><TableCell>{booking.type}</TableCell>
                  </motion.tr>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}


// ==================== MAIN EXPORT ====================
export default function SlotManagement() {
  const { isLocked } = useSubscription()
  const [selectedConsole, setSelectedConsole] = useState<ConsoleFilter>("PC")
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([])
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [availableConsoles, setAvailableConsoles] = useState<ConsoleType[]>([])
  const [allSlots, setAllSlots] = useState<{ [key: string]: any[] }>({})
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [slotBookings, setSlotBookings] = useState<any[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)
  const hasFetchedRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const getVendorIdFromToken = (): number | null => {
    const token = localStorage.getItem('jwtToken')
    if (!token) return null
    try { return jwtDecode<{ sub: { id: number } }>(token).sub.id } catch { return null }
  }

  const fetchSlotBookings = async (slotIds: number[], date: string) => {
    const vendorId = getVendorIdFromToken()
    if (!vendorId || slotIds.length === 0) { setSlotBookings([]); return }
    setIsLoadingBookings(true)
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const isPastDate = new Date(date) < new Date(nowIST.toISOString().split('T')[0])
    try {
      const statusParam = isPastDate ? '&include_completed=true' : ''
      const response = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/slot-bookings?slot_ids=${slotIds.join(',')}&date=${date}${statusParam}`)
      const data = await response.json()
      setSlotBookings(data.success && data.bookings ? data.bookings : [])
    } catch { setSlotBookings([]) }
    finally { setIsLoadingBookings(false) }
  }

  useEffect(() => {
    if (hasFetchedRef.current) return
    const fetchDataOnce = async () => {
      const vendorId = getVendorIdFromToken()
      if (!vendorId) { setIsLoading(false); return }
      hasFetchedRef.current = true
      abortControllerRef.current = new AbortController()
      setIsLoading(true)
      try {
        const consolesData = await fetchWithDedup(`${BOOKING_URL}/api/getAllConsole/vendor/${vendorId}`)
        const consoleTemplate = [
          { type: "PC" as ConsoleFilter, name: "PC Gaming", icon: Monitor, iconColor: "#7c3aed" },
          { type: "PS5" as ConsoleFilter, name: "PlayStation 5", icon: Tv, iconColor: "#2563eb" },
          { type: "Xbox" as ConsoleFilter, name: "Xbox Series", icon: Gamepad, iconColor: "#059669" },
          { type: "VR" as ConsoleFilter, name: "VR Gaming", icon: Headset, iconColor: "#ea580c" },
        ]
        const availableConsoles = consoleTemplate.map(template => {
          const matchedConsole = consolesData.games?.find((game: any) => {
            const apiName = (game.console_name || '').toLowerCase(); const t = template.type.toLowerCase()
            return apiName.includes(t) || (t === 'pc' && (apiName.includes('gaming') || apiName.includes('computer'))) || (t === 'ps5' && (apiName.includes('playstation') || apiName.includes('sony'))) || (t === 'xbox' && (apiName.includes('series') || apiName.includes('microsoft'))) || (t === 'vr' && (apiName.includes('virtual') || apiName.includes('reality')))
          })
          if (matchedConsole) return { type: template.type, name: matchedConsole.console_name, id: matchedConsole.id, price: matchedConsole.console_price, icon: template.icon, iconColor: template.iconColor, color: "grey" as const, description: `${template.type} Gaming Console` }
          return null
        }).filter(Boolean) as ConsoleType[]
        setAvailableConsoles(availableConsoles)
        if (availableConsoles.length === 0) { setAllSlots({}); setIsLoading(false); return }

        const dates: string[] = []
        for (let i = 0; i < 3; i++) { const today = new Date(); const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i); dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`) }

        const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
        try {
          const gameIds = availableConsoles.map(c => c.id).filter(Boolean) as number[]
          const batchData = await fetchSlotsBatch(vendorId, gameIds, dates.map(d => d.replace(/-/g, "")))
          const slotsData: { [key: string]: any[] } = {}
          dates.forEach(d => { slotsData[d] = [] })
          for (const [dateKey, slots] of Object.entries(batchData)) {
            const dateString = `${dateKey.slice(0,4)}-${dateKey.slice(4,6)}-${dateKey.slice(6,8)}`
            if (Array.isArray(slots)) {
              slotsData[dateString] = slots.map((slot: any) => {
                const gameConsole = availableConsoles.find(c => c.id === slot.console_id)
                const processedSlot = { ...slot, console_id: slot.console_id, console_name: gameConsole?.name || "Unknown Console", date: dateString, is_available: (slot.available_slot || 0) > 0, available_slot: slot.available_slot || 0 }
                if (dateString === dates[0]) { const slotEndTime = new Date(`${dateString}T${slot.end_time}+05:30`); if (nowIST >= slotEndTime) processedSlot.is_available = false }
                return processedSlot
              })
            }
          }
          setAllSlots(slotsData)
        } catch (batchError: any) {
          if (batchError.name === 'AbortError') throw batchError
          const allFetchPromises = dates.flatMap(dateString => availableConsoles.map(async gameConsole => {
            if (!gameConsole.id) return null
            try {
              const slotData = await fetchWithDedup(`${BOOKING_URL}/api/getSlots/vendor/${vendorId}/game/${gameConsole.id}/${dateString.replace(/-/g, "")}`)
              if (slotData.slots && Array.isArray(slotData.slots)) {
                return { dateString, slots: slotData.slots.map((slot: any) => { const p = { ...slot, console_id: gameConsole.id, console_name: gameConsole.name, date: dateString, is_available: slot.is_available }; if (dateString === dates[0]) { const e = new Date(`${dateString}T${slot.end_time}+05:30`); if (nowIST >= e) p.is_available = false }; return p }) }
              }
            } catch {}
            return null
          }))
          const results = await Promise.all(allFetchPromises)
          const slotsData: { [key: string]: any[] } = {}
          dates.forEach(d => { slotsData[d] = [] })
          results.forEach(r => { if (r?.dateString && r?.slots) slotsData[r.dateString].push(...r.slots) })
          setAllSlots(slotsData)
        }
        setRecentBookings([])
      } catch (error: any) { if (error.name !== 'AbortError') console.error('❌ Error in fetchData:', error) }
      finally { setIsLoading(false) }
    }
    fetchDataOnce()
    return () => { abortControllerRef.current?.abort() }
  }, [])

  useEffect(() => {
    if (selectedSlots.length > 0) fetchSlotBookings(selectedSlots.map(s => s.slot_id), selectedSlots[0].date)
    else setSlotBookings([])
  }, [selectedSlots])

  useEffect(() => {
    const handleBookingUpdated = () => { hasFetchedRef.current = false; requestCache.clear(); pendingRequests.clear(); window.location.reload() }
    window.addEventListener('refresh-dashboard', handleBookingUpdated)
    return () => window.removeEventListener('refresh-dashboard', handleBookingUpdated)
  }, [])

  const handleSlotSelect = (slot: SelectedSlot) => {
    const isSelected = selectedSlots.some(s => s.slot_id === slot.slot_id && s.date === slot.date)
    setSelectedSlots(isSelected ? selectedSlots.filter(s => !(s.slot_id === slot.slot_id && s.date === slot.date)) : [...selectedSlots, slot])
  }

  const handleBookingComplete = () => { setSelectedSlots([]); hasFetchedRef.current = false; requestCache.clear(); pendingRequests.clear(); window.location.reload() }

  // ─────────────────────────────────────────────────────────────────────────
  // LAYOUT EXPLANATION
  //
  // The outer div uses `relative` so that LockedOverlay (absolute inset-0)
  // is scoped only to this content area. The sidebar is rendered by the
  // parent layout OUTSIDE this component entirely, so it is never covered.
  //
  // We do NOT use `fixed`, `min-h-screen`, or any full-viewport sizing here.
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full min-h-full">

      {/* LockedOverlay: absolute → only covers this div, NOT the sidebar */}
      {isLocked && <LockedOverlay />}

      {/* Content: blurred + non-interactive when locked */}
      <div className={cn("w-full", isLocked && "pointer-events-none select-none blur-sm")}>
        <div className="mx-auto w-full max-w-full p-6 md:p-8">

          {/* Inline loader — no full-screen takeover */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-slate-400">Loading slot data...</p>
              </div>
            </div>
          ) : (
            <>
              <TopBar selectedSlots={selectedSlots} onNewBooking={() => { if (selectedSlots.length > 0) setShowBookingForm(true) }} />
              <ConsoleFilter selectedConsole={selectedConsole} onConsoleChange={setSelectedConsole} />
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
      </div>
    </div>
  )
}