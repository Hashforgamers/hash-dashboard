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
import { type ActivePricingEntry, type BookingFieldConfig, type ControllerPricingConfig, DEFAULT_BOOKING_FIELD_CONFIG, DEFAULT_SQUAD_PRICING_POLICY_FALLBACK, IST_TIMEZONE, LAST_PAYMENT_KEY, PAYMENT_TYPES, REMEMBERED_PAYMENT_TYPES, type SelectedMeal, type SelectedSlot, type SlotBookingFormProps, type SquadMemberInput, type SquadPlatformRule, type SquadPricingMode, type UserPassOption, type UserSuggestion, calculateControllerFare, getSlotEndTimestampIST, isPastSlotInIST, looksLikeMobile, normalizeBookedDate, normalizeConsoleSlugLikeBackend, normalizeControllerType, resolveControllerPricingKey, toLegacySquadGroup } from "./shared"

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
  availableConsoles 
}: SlotBookingFormProps) {
  const { can } = useAccess()
  const { vendorId: settingsVendorId, moduleVersions } = useDashboardData()
  const settingsVersion = moduleVersions[`pricing:${settingsVendorId}`] || 0
  const settingsVendorRef = useRef(settingsVendorId)
  settingsVendorRef.current = settingsVendorId
  const [squadPolicyState, setSquadPolicyState] = useState<"loading" | "ready" | "error">("loading")
  const [squadPolicyVendor, setSquadPolicyVendor] = useState<number | null>(null)
  const api = useApiClient()

  const [timeMode, setTimeMode] = useState("range")
  const [pickerDate, setPickerDate] = useState("")
  const [pickerConsole, setPickerConsole] = useState("")
  const slotDates = Object.keys(allSlots).sort()
  const activePickerDate = selectedSlots[0]?.date || pickerDate || slotDates[0] || ""
  const activePickerConsole = String(selectedSlots[0]?.console_id || pickerConsole || defaultConsoleId || availableConsoles[0]?.id || "")
  const pickerConsoleItem = availableConsoles.find((item) => String(item.id) === activePickerConsole)
  const pickerSlots = (allSlots[activePickerDate] || []).filter((slot: any) =>
    String(slot.console_id) === activePickerConsole && Boolean(slot.is_available) &&
    Number(slot.available_slot) > 0 &&
    !isPastSlotInIST(activePickerDate, slot.end_time, slot.start_time)
  ).sort((a: any, b: any) => String(a.start_time).localeCompare(String(b.start_time)))

  const clock = (value: string) => value.slice(0, 5)
  const firstTime = selectedSlots[0]?.start_time || pickerSlots[0]?.start_time || ""
  const continuousSlots = (start: string) => contiguousDeskSlots(pickerSlots, start)
  const [typedStart, setTypedStart] = useState("")
  const [typedEnd, setTypedEnd] = useState("")
  const clearTypedTimes = () => { setTypedStart(""); setTypedEnd("") }
  useEffect(() => { clearTypedTimes(); setTimeMode("range") }, [isOpen, activePickerDate, activePickerConsole])
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
      available_count: Number(slot.available_slot),
    })))
  }

  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [paymentType, setPaymentType] = useState<string>('Cash')
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_PAYMENT_KEY)
      if (saved && REMEMBERED_PAYMENT_TYPES.includes(saved)) setPaymentType(saved)
    } catch {}
  }, [])
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
  const [suggestedDiscount, setSuggestedDiscount] = useState<number>(0)
  const [discountOverride, setDiscountOverride] = useState<number | null>(null)

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

  useEffect(() => {
    if (isOpen && selectedSlots.length === 0) {
      onClose()
    }
  }, [isOpen, selectedSlots.length, onClose])


  const getVendorIdFromToken = (): number | null => settingsVendorId

  const sanitizeFieldConfig = (candidate: BookingFieldConfig): BookingFieldConfig => {
    const next: BookingFieldConfig = {
      name: { visible: true, required: true },
      phone: {
        visible: Boolean(candidate?.phone?.visible ?? true),
        required: Boolean(candidate?.phone?.required ?? true),
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
      next.phone.required = true
    }

    if (!next.phone.visible) next.phone.required = false
    if (!next.email.visible) next.email.required = false

    if (!next.phone.required && !next.email.required) {
      if (next.phone.visible) next.phone.required = true
      else next.email.required = true
    }

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



  const calculateAutoWaiveOff = (slots: SelectedSlot[]) => {
    
    const nowTs = Date.now()
    
    let totalAutoWaiveOff = 0
    
    slots.forEach(slot => {
      const slotDateTime = new Date(`${slot.date}T${slot.start_time}+05:30`)
      const slotEndTs = getSlotEndTimestampIST(slot.date, slot.start_time, slot.end_time)
      const slotEndTime = new Date(Number.isFinite(slotEndTs) ? slotEndTs : `${slot.date}T${slot.end_time}+05:30`)
      
      const slotDurationMs = slotEndTime.getTime() - slotDateTime.getTime()
      const slotDurationMinutes = slotDurationMs / (1000 * 60)
      
      
      if (nowTs >= slotDateTime.getTime() && nowTs < slotEndTime.getTime()) {
        const elapsedMs = nowTs - slotDateTime.getTime()
        const elapsedMinutes = elapsedMs / (1000 * 60)
        
        const elapsedPercentage = elapsedMinutes / slotDurationMinutes
        const waveOffAmount = slot.console_price * elapsedPercentage
        
        
        totalAutoWaiveOff += waveOffAmount
      }
      else if (nowTs < slotDateTime.getTime()) {
      }
      else if (nowTs >= slotEndTime.getTime()) {
        totalAutoWaiveOff += slot.console_price
      }
    })
    
    const finalWaveOff = Math.round(totalAutoWaiveOff)
    return finalWaveOff
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
    setDiscountOverride(null)
    if (selectedSlots.length > 0) {
      const autoWaiveOff = calculateAutoWaiveOff(selectedSlots)
      setSuggestedDiscount(autoWaiveOff)
    } else {
      setSuggestedDiscount(0)
    }
  }, [selectedSlots])

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

  const handlePhoneInputChange = (raw: string) => {
    const value = raw.replace(/[^\d+\s-]/g, '') // digits, +, spaces and dashes only
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

  // Returning-gamer context (tier, visits, last visit) from the gamer list, loaded once when first needed.
  const [gamerDirectory, setGamerDirectory] = useState<any[] | null>(null)
  const loadGamerDirectory = () => {
    const vendorId = getVendorIdFromToken()
    if (gamerDirectory !== null || !vendorId) return
    setGamerDirectory([])
    fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/knowYourGamer`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setGamerDirectory(Array.isArray(rows) ? rows : []))
      .catch(() => undefined)
  }
  const returningGamer = useMemo(() => {
    const digits = phone.replace(/\D/g, "").slice(-10)
    if (!gamerDirectory?.length || digits.length < 10) return null
    return gamerDirectory.find((g: any) => String(g?.contact ?? "").replace(/\D/g, "").slice(-10) === digits) ?? null
  }, [gamerDirectory, phone])

  const handleSuggestionClick = (user: UserSuggestion) => {
    loadGamerDirectory()
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
    setIsMealSelectorOpen(false)
  }

  const selectedConsoleName = (selectedSlots[0]?.console_name || '').toLowerCase()
  const selectedConsoleSlug = normalizeConsoleSlugLikeBackend(selectedSlots[0]?.console_name || "")
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
  const [deskConsoleIds, setDeskConsoleIds] = useState<number[] | null>(null)
  const [deskChoice, setDeskChoice] = useState("")
  const deviceCards = deskCards.filter(card => card.game_id === Number(activePickerConsole) && card.is_active !== false && !card.archived && card.pricing_mode !== "slot")
  useEffect(() => { setDeskChoice("") }, [activePickerConsole, settingsVendorId, isOpen])
  const variantPricingRequired = deskCards.some(card => card.game_id === Number(activePickerConsole) && card.pricing_mode === "variants") || deviceCards.length > 0
  const slotMinutes = (slot: SelectedSlot) => {
    const start = new Date(slot.date + "T" + slot.start_time + "+05:30").getTime()
    return (getSlotEndTimestampIST(slot.date, slot.start_time, slot.end_time) - start) / 60000
  }
  const sessionMinutes = selectedSlots.reduce((n, slot) => n + slotMinutes(slot), 0)
  const { eligible: matchingDeskCards, card: deskCard } = resolveSessionRate(deviceCards, sessionMinutes, isSquadMode ? squadPlayerCount : 1, deskChoice)
  const effectiveDeskChoice = deskCard?.profile || ""
  const controllersIncluded = !!deskCard?.definition.controllers_included
  const supportsExtraController = !controllersIncluded && selectedControllerType !== null && hasControllerPricingConfigured
  const bookingFlowMode: "solo" | "squad" = isSquadMode ? "squad" : "solo"
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
  const deskPrice = deskCard ? deskSubtotal(deskCard, sessionMinutes, isSquadMode ? squadPlayerCount : 1) : null
  const consoleTotal = deskPrice ?? (isSquadMode ? Number((consoleUnitTotal * squadConsoleMultiplier).toFixed(2)) : consoleUnitTotal)
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
  const suggestedDeskDiscount = deskPrice !== null && consoleUnitTotal > 0
    ? Math.round(suggestedDiscount * deskPrice / consoleUnitTotal * 100) / 100
    : suggestedDiscount
  const autoWaiveOffAmount = Math.min(Math.max(0, gamingNet - waiveOffAmount), discountOverride ?? suggestedDeskDiscount)
  const totalAmount = Math.max(
    0,
    consoleTotal - squadDiscountAmount - waiveOffAmount - autoWaiveOffAmount + extraControllerFare + mealsTotal
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
    pay_at_cafe: {
      label: "Pay After Session",
      icon: Clock,
      hint: "Collect the balance when the player finishes.",
      accent: "amber",
    },
    "Monthly Credit": {
      label: "Monthly Credit",
      icon: Clock,
      hint: "Bill in monthly cycle",
      accent: "amber",
    },
  }

  const paymentMethodCard = (
    <Card className="sb-card p-3">
      <label className="flex items-center justify-between gap-2">
        <span className="slot-section-title">Payment</span>
        <select className="min-w-0 rounded border bg-background px-2" value={paymentType} onChange={event => {
          const method = event.target.value
          setPaymentType(method)
          if (REMEMBERED_PAYMENT_TYPES.includes(method)) { try { localStorage.setItem(LAST_PAYMENT_KEY, method) } catch {} }
          if (method !== "Pass") resetPassFlow()
          if (errors.payment) setErrors(previous => ({ ...previous, payment: "" }))
        }}>
          {PAYMENT_TYPES.map(method => <option key={method} value={method}>{paymentMethodMeta[method].label}</option>)}
        </select>
      </label>
      {paymentType === "pay_at_cafe" && <p className="mt-1 text-xs text-muted-foreground">Collect when play ends.</p>}
      {paymentType === 'Monthly Credit' && (
        <div className="mt-2 space-y-2">
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-900/25 dark:text-amber-300">
            Monthly credit works only for users with an active Gamers Credit account.
          </p>
          <div className="rounded-xl border border-zinc-300 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-800 dark:text-white">Credit Account Status</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Loading credit account...</p>
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
                <div className="min-w-0 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 min-[480px]:col-span-2 xl:col-span-1">
                  <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300">Available</p>
                  <p className="break-words text-base font-semibold text-blue-900 dark:text-blue-100">₹{availableCreditAmount.toFixed(2)}</p>
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

      {paymentType === 'Monthly Credit' && creditAccount?.is_active && <p role="status" className={`text-xs ${totalAmount>availableCreditAmount?'text-red-500':'text-muted-foreground'}`}>{totalAmount>availableCreditAmount ? `This booking exceeds available credit by ₹${(totalAmount-availableCreditAmount).toFixed(2)}. Collect payment or review the account limit.` : `Available after booking: ₹${(availableCreditAmount-totalAmount).toFixed(2)}`}</p>}
      <AnimatePresence>
        {paymentType === 'Pass'  && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            <div className="rounded-lg border border-zinc-300 bg-white/70 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
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
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
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
                    ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700"
                    : "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700"
                )}
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
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Hours Needed</span>
                      <span className="font-bold">{Number(validatedPass?.required_hours || 0).toFixed(2)} hrs</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {validatedPass?.can_cover_hours && (
              <div className="rounded-lg border border-zinc-300 bg-white/70 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
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
                    className="h-8 w-28 rounded-md border border-zinc-300 bg-white px-2.5 text-xs dark:border-zinc-600 dark:bg-zinc-800"
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
                  <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-300">{passOtpMessage}</p>
                ) : null}
                {passVerificationToken ? (
                  <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
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

      {errors.payment && <p className="text-red-500 text-sm mt-2">{errors.payment}</p>}
    </Card>
  )


  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) newErrors.name = 'Name is required'
    const phoneVisible = bookingFieldConfig.phone.visible
    const emailVisible = bookingFieldConfig.email.visible
    const phoneRequired = bookingFieldConfig.phone.required
    const emailRequired = bookingFieldConfig.email.required
    const hasPhone = Boolean(phone.trim())
    const hasEmail = Boolean(email.trim())

    if (phoneRequired && !hasPhone) newErrors.phone = 'Phone number is required'
    if (emailRequired && !hasEmail) newErrors.email = 'Email is required'
    if (hasEmail && !/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid'
    if (!hasPhone && !hasEmail) {
      if (phoneVisible && emailVisible) {
        newErrors.phone = newErrors.phone || 'Enter phone or email'
        newErrors.email = newErrors.email || 'Enter phone or email'
      } else if (phoneVisible) {
        newErrors.phone = newErrors.phone || 'Phone number is required'
      } else if (emailVisible) {
        newErrors.email = newErrors.email || 'Email is required'
      } else {
        newErrors.phone = 'At least one contact field is required'
      }
    }
    if (selectedSlots.length === 0) newErrors.slots = 'Please select at least one time slot'
    if (waiveOffAmount > gamingNet) {
      setSubmitError("Additional Discount exceeds the gaming charges.")
      return false
    }
    if (typedStart || typedEnd) {
      setSubmitError("Apply or clear the requested times before confirming.")
      return false
    }
    if (deskCard && !deskConsoleIds) { setSubmitError("Choose available consoles before confirming."); return false }
    if (deskRatesLoading || deskRateError || (variantPricingRequired && !effectiveDeskChoice)) {
      setSubmitError(deskRateError || (deskRatesLoading ? "Loading booking rates. Please wait." : "Choose a pricing variant before confirming."))
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
        paymentType: paymentType === 'Monthly Credit' ? 'monthly_credit' : paymentType,
        pass_uid: paymentType === 'Pass' ? validatedPass?.pass_uid : undefined,
        pass_verification_token: paymentType === 'Pass' ? passVerificationToken : undefined,
        bookingType: isSquadMode ? 'squad' : 'direct',
        waiveOffAmount: waiveOffAmount + autoWaiveOffAmount,
        extraControllerQty: supportsExtraController ? extraControllerQty : 0,
        extraControllerFare: supportsExtraController ? extraControllerFare : 0,
        selectedMeals: selectedMeals.map(meal => ({
          menu_item_id: meal.menu_item_id,
          quantity: meal.quantity
        })),
        requireFullRange: true,
        deskPricingMode: variantPricingRequired ? "variants" : "slot",
        deskProfile: deskCard?.profile,
        deskConsoleIds: deskCard ? deskConsoleIds : undefined,
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

  // Phones: drag the sheet's handle down to dismiss it; a short drag springs back.
  const [sheetDrag, setSheetDrag] = useState(0)
  const dragStartY = useRef<number | null>(null)
  const sheetHandlers = {
    onTouchStart: (e: React.TouchEvent) => { dragStartY.current = e.touches[0].clientY },
    onTouchMove: (e: React.TouchEvent) => {
      if (dragStartY.current !== null) setSheetDrag(Math.max(0, e.touches[0].clientY - dragStartY.current))
    },
    onTouchEnd: () => {
      const dismiss = sheetDrag > 120
      dragStartY.current = null
      setSheetDrag(0)
      if (dismiss) onClose()
    },
  }

  if (!isOpen) return null

  if (!portalReady) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={false}
        style={{ zIndex: overlayZIndex }}
        className="fixed inset-0 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-5"
      >
        <motion.div
          initial={false}
          role="dialog"
          aria-modal="true"
          aria-label="New Gaming Session"
          style={sheetDrag ? { transform: `translateY(${sheetDrag}px)`, transition: "none" } : { transition: "transform 0.2s ease" }}
          className="slot-booking-modal flex max-h-[92dvh] w-full max-w-[960px] flex-col overflow-hidden rounded-t-2xl border pb-[env(safe-area-inset-bottom)] shadow-2xl animate-in slide-in-from-bottom duration-300 motion-reduce:animate-none sm:rounded-2xl sm:pb-0 sm:slide-in-from-bottom-4 sm:fade-in-0"
        >
          <div {...sheetHandlers} className="flex shrink-0 touch-none justify-center pb-1 pt-2 sm:hidden" aria-hidden="true">
            <span className="h-1.5 w-10 rounded-full bg-white/25" />
          </div>
          <div {...sheetHandlers} className="slot-booking-modal-header relative flex items-center justify-between border-b px-4 py-3 max-sm:touch-pan-x">
            <div className="min-w-0">
              <h2 className="slot-booking-title">New Gaming Session</h2>
              {selectedSlots.length > 0 && <p className="slot-booking-context">
                {selectedSlots[0].console_name?.trim().toUpperCase() === "PC" ? "PC Gaming" : selectedSlots[0].console_name}
                {" · "}{selectedSlots.every((slot, i) => !i || selectedSlots[i-1].end_time === slot.start_time)
                  ? <strong>{clock(selectedSlots[0].start_time)}–{clock(selectedSlots[selectedSlots.length-1].end_time)}</strong>
                  : selectedSlots.length + " selected slots"}
                {" · "}{new Date(selectedSlots[0].date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFieldConfigError("")
                  setBookingFieldDraft(bookingFieldConfig)
                  setIsFieldConfigOpen((prev) => !prev)
                }}
                className="slot-booking-modal-secondary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Booking Settings
              </button>
              <button
                onClick={onClose}
                aria-label="Close booking"
                className="slot-booking-modal-close rounded-lg p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {isFieldConfigOpen && (
              <div className="slot-booking-popover absolute right-4 top-[calc(100%-2px)] z-30 w-[310px] rounded-xl border p-3 shadow-xl">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Player Details</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Player Name and one contact field are required.
                </p>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
                    <p className="font-semibold text-zinc-700 dark:text-zinc-200">Mobile Number</p>
                    <div className="mt-2 flex items-center justify-between">
                      <label className="text-zinc-600 dark:text-zinc-300">Show field</label>
                      <input
                        type="checkbox"
                        checked={bookingFieldDraft.phone.visible}
                        onChange={(e) => applyFieldDraftChange("phone", "visible", e.target.checked)}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <label className="text-zinc-600 dark:text-zinc-300">Required</label>
                      <input
                        type="checkbox"
                        checked={bookingFieldDraft.phone.required}
                        onChange={(e) => applyFieldDraftChange("phone", "required", e.target.checked)}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
                    <p className="font-semibold text-zinc-700 dark:text-zinc-200">Email</p>
                    <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Optional email stays hidden in form for faster desk booking.
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <label className="text-zinc-600 dark:text-zinc-300">Required</label>
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
                    className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
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
                    {isFieldConfigSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="slot-booking-body min-h-0 flex-1 overflow-y-auto text-sm">
            <form id="slot-booking-form" onSubmit={handleSubmit} className="space-y-2">
              {submitError && (
                <div role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
                  {submitError}
                </div>
              )}
              <div className="slot-booking-layout">
                <div className="slot-booking-details">
                  <Card className="sb-card slot-booking-slots p-3 order-1">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="slot-section-title">Session Time</h3>
                      {onReplaceSlots && <select aria-label="Time entry method" className="rounded border bg-background px-2 text-xs" value={timeMode} onChange={e => { clearTypedTimes(); setTimeMode(e.target.value) }}>
                        <option value="range">Available times</option>
                        <option value="manual">Enter times manually</option>
                        <option value="slots">Individual slots</option>
                      </select>}
                    </div>
                    <div id="booking-slot-picker">
                        {!selectedSlots.length && <div className="mb-2 grid grid-cols-2 gap-2">
                          <label className="text-xs">Date
                            <select disabled={selectedSlots.length > 0} title="One booking uses one date" value={activePickerDate} onChange={(event) => setPickerDate(event.target.value)}
                              className="mt-1 h-9 w-full rounded-md border border-zinc-500/30 bg-background px-2 text-sm">
                              {slotDates.map((date) => <option key={date} value={date}>{date}</option>)}
                            </select>
                          </label>
                          <label className="text-xs">Console
                            <select disabled={selectedSlots.length > 0} title="One booking uses one console type" value={activePickerConsole} onChange={(event) => setPickerConsole(event.target.value)}
                              className="mt-1 h-9 w-full rounded-md border border-zinc-500/30 bg-background px-2 text-sm">
                              {availableConsoles.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
                            </select>
                          </label>
                        </div>}
                        {onReplaceSlots && timeMode === "range" && (
                          <div className="mb-3 flex flex-wrap items-end gap-2">
                            <label className="text-xs">From
                              <select className="block rounded border bg-background p-1" value={selectedSlots.length ? clock(firstTime) : ""} disabled={isSubmitting} onChange={e => selectRange(e.target.value, 1)}>
                                <option value="" disabled>Start time</option>
                                {pickerSlots.map(slot => <option key={slot.slot_id} value={clock(slot.start_time)}>{clock(slot.start_time)}</option>)}
                              </select>
                            </label>
                            <label className="text-xs">To
                              <select className="block rounded border bg-background p-1" value={rangeOptions.slice(0, selectedSlots.length).every((slot, i) => slot.slot_id === selectedSlots[i]?.slot_id) && selectedSlots.length <= rangeOptions.length ? selectedSlots.length : 0} disabled={isSubmitting || !selectedSlots.length} onChange={e => selectRange(firstTime, Number(e.target.value))}>
                                <option value={0} disabled>End time</option>
                                {rangeOptions.map((slot, i) => <option key={slot.slot_id} value={i + 1}>{clock(slot.end_time)}</option>)}
                              </select>
                            </label>
                          </div>
                        )}
                        {onReplaceSlots && timeMode === "manual" && <div className="mb-2 text-xs">
                          <div className="mt-2 flex flex-wrap items-end gap-2">
                            <label>Requested from<input type="time" className="block rounded border bg-background p-1" value={typedStart} onChange={e => setTypedStart(e.target.value)}/></label>
                            <label>Requested to<input type="time" className="block rounded border bg-background p-1" value={typedEnd} onChange={e => setTypedEnd(e.target.value)}/></label>
                            {!!coveringRange.length && <button type="button" className="rounded border px-2 py-1" onClick={() => selectRange(coveringRange[0].start_time, coveringRange.length)}>
                              Use {clock(coveringRange[0].start_time)}–{clock(coveringRange[coveringRange.length-1].end_time)}
                            </button>}
                            {(typedStart || typedEnd) && <button type="button" onClick={clearTypedTimes}>Clear</button>}
                          </div>
                          {typedStart && typedEnd && !coveringRange.length && <p role="status">No continuous availability for those times.</p>}
                        </div>}
                        {(!onReplaceSlots || timeMode === "slots") && (
                        <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                          {pickerSlots.map((slot: any) => {
                            const selected = selectedSlots.some((item) => item.slot_id === slot.slot_id &&
                              item.date === activePickerDate && String(item.console_id) === activePickerConsole)
                            return <button key={slot.slot_id} type="button" aria-pressed={selected}
                              disabled={isSubmitting}
                              onClick={() => onSlotSelect({
                                slot_id: slot.slot_id, date: activePickerDate,
                                start_time: slot.start_time, end_time: slot.end_time,
                                console_id: Number(activePickerConsole),
                                console_name: pickerConsoleItem?.name || pickerConsoleItem?.type || "",
                                console_price: slot.single_slot_price ?? pickerConsoleItem?.price ?? 0,
                                available_count: Number(slot.available_slot),
                              })}
                              className={cn("rounded-md border px-2 py-1.5 text-xs tabular-nums transition-colors",
                                selected ? "border-blue-400 bg-blue-500/15 text-blue-600 dark:text-blue-200" : "border-zinc-500/30 hover:bg-zinc-500/10")}>
                              {String(slot.start_time).slice(0, 5)}–{String(slot.end_time).slice(0, 5)}
                            </button>
                          })}
                          {pickerSlots.length === 0 && <p className="py-2 text-xs text-zinc-500">No available slots.</p>}
                        </div>)}
                    </div>
                    {deskRateError && <p role="status" className="text-xs">{deskRateError} Reopen this booking to retry.</p>}
                    {variantPricingRequired && !deviceCards.length && <p role="alert" className="text-xs text-amber-500">No enabled rate cards. Enable a card in Console Pricing before booking.</p>}
                    {deviceCards.length > 0 && <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span>Session rate</span>
                      {matchingDeskCards.length > 1 ? <select aria-label="Session rate variant" className="rounded border bg-background p-1" value={effectiveDeskChoice} onChange={e => setDeskChoice(e.target.value)}>
                        <option value="" disabled>Choose variant</option>
                        {matchingDeskCards.map(card => <option key={card.profile} value={card.profile}>{rateLabel(card)}</option>)}
                      </select> : deskCard ? <span className="font-medium">{rateLabel(deskCard)}</span> : null}
                      {deskCard && <span className="text-emerald-500">₹{deskPrice} · Applied automatically</span>}
                      {!matchingDeskCards.length && <span role="alert" className="text-amber-500">No rate covers this duration and player count.</span>}
                    </div>}
                    {deskCard && selectedSlots.length > 0 && <DeskConsolePicker key={`${activePickerConsole}-${deskCard.profile}`} vendor={settingsVendorId} game={Number(activePickerConsole)} profile={deskCard.profile} date={normalizeBookedDate(selectedSlots[0].date)} slotIds={selectedSlots.map(slot=>slot.slot_id)} quantity={isSquadMode && squadConsoleGroup === "pc" ? squadPlayerCount : 1} onChange={setDeskConsoleIds} />}
                    {(timeMode === "slots" || !onReplaceSlots) && <div className="slot-booking-slot-list">
                      {selectedSlots.map((slot) => (
                        <div key={`${slot.date}-${slot.console_id}-${slot.slot_id}`} className="slot-booking-modal-soft flex items-center justify-between gap-3 rounded-md px-2.5 py-2 text-xs">
                          <span className="text-zinc-700 dark:text-zinc-300">
                            <strong>{new Date(slot.date).toLocaleDateString('en-GB')}</strong> • {slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)} • {slot.console_name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-2 font-semibold">
                              {!deskCard && (() => {
                                const key = slot.console_name.toLowerCase()
                                const entry = activePricing[key] ||
                                  Object.values(activePricing).find((p) =>
                                    p.console_type.toLowerCase() === slot.console_name.toLowerCase()
                                  )
                                const isOffer = entry?.is_offer
                                return (
                                  <>
                                    {isOffer && (
                                      <span className="text-xs text-zinc-400 line-through">
                                        ₹{slot.console_price}
                                      </span>
                                    )}
                                    <span className="slot-booking-price">
                                      ₹{getEffectivePrice(slot)}
                                    </span>
                                    {isOffer && (
                                      <span className="slot-booking-offer">
                                        {entry?.offer_name}
                                      </span>
                                    )}
                                  </>
                                )
                              })()}
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemoveSelectedSlot(slot)}
                              className={buttonVariants({ variant: "soft-danger", size: "icon-sm" })}
                              title="Remove this slot"
                              aria-label="Remove selected slot"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>}
                  </Card>

                  <Card className="sb-card order-2 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div>
                        <h3 className="slot-section-title">
                          {isSquadMode ? "Squad Captain Details" : "Player Details"}
                        </h3>
                        {suggestionError && (
                          <p role="status" className="text-sm text-amber-600">
                            {suggestionError}{' '}
                            <button type="button" className="underline" onClick={() => {
                              if (focusedInput === 'phone') void fetchUserSuggestions('phone', phone, setPhoneSuggestions)
                              else if (focusedInput === 'email') void fetchUserSuggestions('email', email, setEmailSuggestions)
                              else void fetchUserSuggestions('name', name, setNameSuggestions)
                            }}>Retry</button>
                          </p>
                        )}
                        {isSquadMode && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">Primary contact for squad booking</p>
                        )}
                      </div>
                    </div>

                    <div
                      className={cn(
                        "grid grid-cols-1 gap-3",
                        bookingFieldConfig.phone.visible && bookingFieldConfig.email.visible
                          ? "md:grid-cols-3"
                          : "md:grid-cols-2"
                      )}
                    >
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
                            "w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border rounded-lg transition-all duration-200",
                            errors.name
                              ? "border-red-500 focus:border-red-500"
                              : focusedInput === "name"
                              ? "border-emerald-500 focus:border-emerald-500"
                              : "border-zinc-300 dark:border-zinc-600 focus:border-emerald-500",
                            "focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                          )}
                        />
                        <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                        <AnimatePresence>
                          {focusedInput === "name" && (nameSuggestions.length > 0 || isSuggestionLoading.name) && (
                            <motion.ul
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute z-20 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg w-full mt-1 max-h-40 overflow-y-auto"
                            >
                              {isSuggestionLoading.name && nameSuggestions.length === 0 && (
                                <li className="px-3 py-2 text-sm text-zinc-500">Searching customers…</li>
                              )}
                              {nameSuggestions.slice(0, 5).map((user, idx) => (
                                <motion.li
                                  key={idx}
                                  whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                                  className="px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-zinc-100 dark:border-zinc-700 last:border-b-0"
                                  onMouseDown={() => handleSuggestionClick(user)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                      <User className="w-3 h-3 text-emerald-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-zinc-800 dark:text-white text-sm">{user.name}</p>
                                      <p className="text-zinc-600 dark:text-zinc-400 text-xs">{user.phone || user.email}</p>
                                    </div>
                                  </div>
                                </motion.li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        {returningGamer && (
                          <p className="mt-1.5 text-xs text-muted-foreground" role="status">
                            Returning gamer{returningGamer.membershipTier ? ` · ${returningGamer.membershipTier}` : ""}
                            {Number(returningGamer.totalSlots) > 0 ? ` · ${returningGamer.totalSlots} visits` : ""}
                            {returningGamer.lastVisit ? ` · last here ${new Date(returningGamer.lastVisit).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                          </p>
                        )}
                      </div>

                      {bookingFieldConfig.phone.visible && (
                        <div className="relative">
                          <input
                            type="tel"
                            inputMode="tel"
                            maxLength={16}
                            value={phone}
                            onChange={(e) => handlePhoneInputChange(e.target.value)}
                            onFocus={handlePhoneFocus}
                            onBlur={handleBlur}
                            autoComplete="off"
                            placeholder={isSquadMode ? "Captain Mobile Number" : "Mobile Number"}
                            className={cn(
                              "w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border rounded-lg transition-all duration-200",
                              errors.phone
                                ? "border-red-500 focus:border-red-500"
                                : focusedInput === "phone"
                                ? "border-emerald-500 focus:border-emerald-500"
                                : "border-zinc-300 dark:border-zinc-600 focus:border-emerald-500",
                              "focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                            )}
                          />
                          <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                          {!errors.phone && phone.replace(/\D/g, '').length >= 4 && !looksLikeMobile(phone) && (
                            <p className="mt-1 text-xs text-amber-300">Indian mobile numbers have 10 digits.</p>
                          )}
                          <AnimatePresence>
                            {focusedInput === "phone" && (phoneSuggestions.length > 0 || isSuggestionLoading.phone) && (
                              <motion.ul
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute z-20 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg w-full mt-1 max-h-40 overflow-y-auto"
                              >
                                {isSuggestionLoading.phone && phoneSuggestions.length === 0 && (
                                  <li className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">Searching...</li>
                                )}
                                {phoneSuggestions.slice(0, 5).map((user, idx) => (
                                  <motion.li
                                    key={idx}
                                    whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                                    className="px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-zinc-100 dark:border-zinc-700 last:border-b-0"
                                    onMouseDown={() => handleSuggestionClick(user)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                        <User className="w-3 h-3 text-emerald-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-zinc-800 dark:text-white text-sm">{user.name}</p>
                                        <p className="text-zinc-600 dark:text-zinc-400 text-xs">{user.phone}</p>
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
                              "w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border rounded-lg transition-all duration-200",
                              errors.email
                                ? "border-red-500 focus:border-red-500"
                                : focusedInput === "email"
                                ? "border-emerald-500 focus:border-emerald-500"
                                : "border-zinc-300 dark:border-zinc-600 focus:border-emerald-500",
                              "focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                            )}
                          />
                          <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                          <AnimatePresence>
                            {focusedInput === "email" && (emailSuggestions.length > 0 || isSuggestionLoading.email) && (
                              <motion.ul
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute z-20 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg w-full mt-1 max-h-40 overflow-y-auto"
                              >
                                {isSuggestionLoading.email && emailSuggestions.length === 0 && (
                                  <li className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">Searching...</li>
                                )}
                                {emailSuggestions.slice(0, 5).map((user, idx) => (
                                  <motion.li
                                    key={idx}
                                    whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                                    className="px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-zinc-100 dark:border-zinc-700 last:border-b-0"
                                    onMouseDown={() => handleSuggestionClick(user)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                        <User className="w-3 h-3 text-emerald-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-zinc-800 dark:text-white text-sm">{user.name}</p>
                                        <p className="text-zinc-600 dark:text-zinc-400 text-xs">{user.email}</p>
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

                    <AnimatePresence>
                      {isSquadMode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                              Squad Player Details (Optional)
                            </p>
                            <button
                              type="button"
                              onClick={addSquadMemberRow}
                              disabled={squadMembers.length >= maxQuickMembers}
                              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300"
                            >
                              Add Player
                            </button>
                          </div>
                            <div className="space-y-2">
                              {squadMembers.map((member, idx) => (
                                <div key={member.id} className="rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                                    <input
                                      type="text"
                                      placeholder={`Player ${idx + 2} name`}
                                      value={member.name}
                                      onFocus={() => handleSquadMemberFocus(member.id, member.name)}
                                      onBlur={() => handleSquadMemberBlur(member.id)}
                                      onChange={(e) => updateSquadMemberRow(member.id, "name", e.target.value)}
                                      className="rounded border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                                    />
                                    <input
                                      type="tel"
                                      placeholder={`Player ${idx + 2} phone`}
                                      value={member.phone}
                                      onFocus={() => handleSquadMemberFocus(member.id, member.phone)}
                                      onBlur={() => handleSquadMemberBlur(member.id)}
                                      onChange={(e) => updateSquadMemberRow(member.id, "phone", e.target.value)}
                                      className="rounded border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-zinc-600 dark:bg-zinc-800"
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
                                      <div className="mt-2 max-h-36 overflow-auto rounded border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                                        {squadMemberSuggestions[member.id].map((suggested, suggestionIdx) => (
                                          <button
                                            key={`${member.id}-sg-${suggestionIdx}`}
                                            type="button"
                                            onMouseDown={() => handleSquadMemberSuggestionPick(member.id, suggested)}
                                            className="flex w-full items-center justify-between border-b border-zinc-100 px-2 py-1.5 text-left text-xs last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                                          >
                                            <span className="font-medium text-zinc-700 dark:text-zinc-200">
                                              {suggested.name}
                                            </span>
                                            <span className="text-zinc-500 dark:text-zinc-400">
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

                  <Card className="sb-card order-3 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <h3 className="slot-section-title">Play Mode</h3>

                        </div>
                      </div>
                    </div>

                    <div className="ui-segmented mt-3 grid w-full grid-cols-2">
                      <button
                        type="button"
                        aria-pressed={bookingFlowMode === "solo"}
                        onClick={() => setBookingModeQuick("solo")}
                      >
                        Solo Play
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingModeQuick("squad")}
                        disabled={!squadSupported}
                        title={squadPolicyState === "loading" ? "Loading session options" : squadPolicyState === "error" ? "Session options could not load. Solo booking is available." : !squadSupported ? "This console is configured for solo sessions" : "Book for a group"}
                        aria-pressed={bookingFlowMode === "squad"}
                        className={cn(!squadSupported && "cursor-not-allowed opacity-50")}
                      >
                        Squad Play
                      </button>
                    </div>
                    {squadPolicyState === "error" && (
                      <p className="mt-2 text-xs text-muted-foreground">Squad options could not load. You can still book a solo session.</p>
                    )}

                    <AnimatePresence>
                      {isSquadMode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 space-y-2"
                        >
                          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-700 dark:bg-blue-900/20">
                            <span className="text-xs text-blue-800 dark:text-blue-200 font-medium">Players in Squad</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSquadPlayerCount((prev) => Math.max(2, prev - 1))}
                                className={buttonVariants({ variant: "soft-info", size: "icon-sm" })}
                              >
                                -
                              </button>
                              <span className="w-16 text-center text-sm font-semibold text-blue-900 dark:text-blue-100">
                                {squadPlayerCount}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSquadPlayerCount((prev) => Math.min(squadMaxPlayers, prev + 1))}
                                className={buttonVariants({ variant: "soft-info", size: "icon-sm" })}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-300">
                            Max players: <span className="font-semibold">{squadMaxPlayers}</span>
                            <span className="ml-2">
                              Mode: <span className="font-semibold">
                                {deskCard ? rateLabel(deskCard) : squadPlatformRule.pricing_mode === "squad_discount"
                                  ? "Squad discount"
                                  : squadPlatformRule.pricing_mode === "controller_pricing"
                                  ? "Controller pricing"
                                  : "Solo only"}
                              </span>
                            </span>
                            {selectedControllerType && !controllersIncluded && (
                              <span className="ml-2">
                                Suggested extra controllers: <span className="font-semibold">{suggestedExtraControllerQty}</span>
                              </span>
                            )}
                          </div>

                          {selectedControllerType && !controllersIncluded && (
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => applyExtraControllerQty(suggestedExtraControllerQty)}
                                className={buttonVariants({ variant: "soft-info", size: "sm" })}
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

                <aside className="slot-booking-sidebar" aria-label="Booking payment">
                  <Card className="sb-card slot-booking-summary p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="slot-section-title">Bill Summary</h3>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-2 border-b border-zinc-200 dark:border-zinc-600">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Gaming Charges{!deskCard && isSquadMode && squadUsesDiscountEngine ? ` (₹${consoleUnitTotal} x ${squadPlayerCount})` : ""}:
                        </span>
                        <span className="font-medium text-zinc-800 dark:text-white">₹{consoleTotal}</span>
                      </div>

                      {isSquadMode && (
                        <div className="flex justify-between items-center py-2 border-b border-zinc-200 dark:border-zinc-600">
                          <span className="text-zinc-600 dark:text-zinc-400">Players:</span>
                          <span className="font-medium text-zinc-800 dark:text-white">{squadPlayerCount}</span>
                        </div>
                      )}

                      {isSquadMode && squadDiscountPercent > 0 && (
                        <div className="flex justify-between items-center py-2 border-b border-zinc-200 dark:border-zinc-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3">
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                            Squad Discount ({squadDiscountPercent}%):
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-300">-₹{squadDiscountAmount}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center py-2 border-b border-zinc-200 dark:border-zinc-600">
                        <span className="text-zinc-600 dark:text-zinc-400">Additional Discount:</span>
                        <input
                          type="number"
                          value={waiveOffAmount}
                          onChange={(e) => setWaiveOffAmount(Math.max(0, Math.min(gamingNet, Number(e.target.value) || 0)))}
                          placeholder="₹0"
                          className="w-20 text-right px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
                          min={0}
                        />
                      </div>

                      {suggestedDiscount > 0 && (
                        <div className="flex justify-between items-center py-2 border-b border-zinc-200 dark:border-zinc-600">
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Auto Discount:</span>
                          <div className="text-right">
                            <input aria-label="Auto Discount" type="number" min={0} max={Math.max(0, consoleTotal - squadDiscountAmount - waiveOffAmount)} step="0.01"
                              className="w-20 rounded border bg-background px-2 py-1 text-right"
                              value={autoWaiveOffAmount} onChange={e => setDiscountOverride(Math.max(0, Math.min(Number(e.target.value) || 0, consoleTotal - squadDiscountAmount - waiveOffAmount)))} />
                            {discountOverride !== null && <button type="button" className="ml-2 text-xs underline" onClick={() => setDiscountOverride(null)}>Reset</button>}

                          </div>
                        </div>
                      )}

                      {supportsExtraController && (
                        <div className="flex justify-between items-center py-2 border-b border-zinc-200 dark:border-zinc-600">
                          <span className="text-zinc-600 dark:text-zinc-400">Extra Controller:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => applyExtraControllerQty(extraControllerQty - 1)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300"
                              disabled={isControllerPricingLoading}
                            >
                              -
                            </button>
                            <span className="w-14 text-center text-sm text-zinc-800 dark:text-white">
                              {extraControllerQty} qty
                            </span>
                            <button
                              type="button"
                              onClick={() => applyExtraControllerQty(extraControllerQty + 1)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300"
                              disabled={isControllerPricingLoading}
                            >
                              +
                            </button>
                            <span className="w-16 text-right text-sm font-medium text-zinc-800 dark:text-white">
                              ₹{extraControllerFare}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center py-2 border-b border-zinc-200 dark:border-zinc-600">
                        <span className="text-zinc-600 dark:text-zinc-400">Snacks & Add-ons:</span>
                        <button
                          type="button"
                          onClick={() => setIsMealSelectorOpen(true)}
                          className="slot-booking-modal-accent flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all duration-200"
                        >
                          <Plus className="w-3 h-3" />
                          {selectedMeals.length === 0 ? 'Add Items' : `${selectedMeals.length} Selected`}
                        </button>
                      </div>

                      {selectedMeals.length > 0 && (
                        <div className="py-2 border-b border-zinc-200 dark:border-zinc-600">
                          <div className="space-y-2">
                            {selectedMeals.map(meal => (
                              <div key={meal.menu_item_id} className="slot-booking-modal-soft rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <span className="text-sm font-medium text-zinc-800 dark:text-white">
                                      {meal.name}
                                    </span>
                                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                                      {meal.category} • ₹{meal.price} × {meal.quantity}
                                    </div>
                                  </div>
                                  <span className="text-sm font-bold text-zinc-800 dark:text-white">
                                    ₹{meal.total}
                                  </span>
                                </div>
                              </div>
                            ))}
                            <div className="border-t border-zinc-200 pt-2 text-right dark:border-zinc-600">
                              <span className="text-sm font-bold text-zinc-800 dark:text-white">
                                Meals Total: ₹{mealsTotal}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </Card>
                  {paymentMethodCard}
                </aside>
              </div>

            </form>
          </div>

          <div className="slot-booking-modal-footer shrink-0 border-t px-3 py-2">
            <div className="slot-booking-actions">
              <div className="slot-booking-footer-total">
                <span>Total payable</span>
                <strong>₹{totalAmount.toLocaleString("en-IN")}</strong>
              </div>
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="slot-booking-modal-secondary h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="slot-booking-form"
                disabled={(!!deskCard && !deskConsoleIds) || deskRatesLoading || !!deskRateError || (variantPricingRequired && !effectiveDeskChoice) || !!typedStart || !!typedEnd || (!!deskCard && deskPrice === null) || selectedSlots.length === 0 || isSubmitting || submissionUncertain || (paymentType === 'Monthly Credit' && (!creditAccount?.is_active || availableCreditAmount < totalAmount))}
                className="ui-action-primary h-9 px-4 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Booking…
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Confirm Booking
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
    ,
    document.body
  )
}
