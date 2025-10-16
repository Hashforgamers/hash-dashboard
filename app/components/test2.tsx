"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { jwtDecode } from 'jwt-decode'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  Dot, 
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
  Sparkles
} from "lucide-react"
import { BOOKING_URL } from '@/src/config/env'
import { ConsoleType } from './types'
import MealSelector from './mealSelector'

type PillColor = "green" | "blue" | "purple" | "yellow" | "red"
type ConsoleFilter = "all" | "PC" | "PS5" | "Xbox" | "VR"

interface SelectedSlot {
  slot_id: number
  date: string
  start_time: string
  end_time: string
  console_id: number
  console_name: string
  console_price: number
}

interface SelectedMeal {
  menu_item_id: number
  name: string
  price: number
  quantity: number
  total: number
  category: string
}

interface UserSuggestion {
  name: string
  email: string
  phone: string
}

interface SlotBookingFormProps {
  isOpen: boolean
  onClose: () => void
  selectedSlots: SelectedSlot[]
  onBookingComplete: () => void
  availableConsoles: ConsoleType[]
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
  const [waiveOffAmount, setWaiveOffAmount] = useState<number>(0)
  const [extraControllerFare, setExtraControllerFare] = useState<number>(0)
  const [autoWaiveOffAmount, setAutoWaiveOffAmount] = useState<number>(0)
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([])
  const [isMealSelectorOpen, setIsMealSelectorOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [userList, setUserList] = useState<{ name: string; email: string; phone: string }[]>([])
  const [emailSuggestions, setEmailSuggestions] = useState<{ name: string; email: string; phone: string }[]>([])
  const [phoneSuggestions, setPhoneSuggestions] = useState<{ name: string; email: string; phone: string }[]>([])
  const [nameSuggestions, setNameSuggestions] = useState<{ name: string; email: string; phone: string }[]>([])
  const [focusedInput, setFocusedInput] = useState<string>('')
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
    
    const nowIST = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    )
    console.log('🕐 Current IST time:', nowIST.toLocaleTimeString('en-IN'))
    
    let totalAutoWaiveOff = 0
    
    slots.forEach(slot => {
      const slotDateTime = new Date(`${slot.date}T${slot.start_time}+05:30`)
      const slotEndTime = new Date(`${slot.date}T${slot.end_time}+05:30`)
      
      const slotDurationMs = slotEndTime.getTime() - slotDateTime.getTime()
      const slotDurationMinutes = slotDurationMs / (1000 * 60)
      
      console.log(`🕐 Slot Analysis for ${slot.start_time}-${slot.end_time}:`, {
        slotId: slot.slot_id,
        slotDurationMinutes,
        currentTime: nowIST.toLocaleTimeString('en-IN'),
        slotStart: slotDateTime.toLocaleTimeString('en-IN'),
        slotEnd: slotEndTime.toLocaleTimeString('en-IN')
      })
      
      if (nowIST >= slotDateTime && nowIST < slotEndTime) {
        const elapsedMs = nowIST.getTime() - slotDateTime.getTime()
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
      else if (nowIST < slotDateTime) {
        console.log(`⏰ Booking made in advance for ${slot.start_time} - no wave-off needed`)
      }
      else if (nowIST >= slotEndTime) {
        console.log(`⚠️ Slot ${slot.start_time} already ended - full wave-off applied`)
        totalAutoWaiveOff += slot.console_price
      }
    })
    
    const finalWaveOff = Math.round(totalAutoWaiveOff)
    console.log('💰 Total auto waive-off calculated:', finalWaveOff)
    return finalWaveOff
  }

  useEffect(() => {
    if (selectedSlots.length > 0) {
      const autoWaiveOff = calculateAutoWaiveOff(selectedSlots)
      setAutoWaiveOffAmount(autoWaiveOff)
    } else {
      setAutoWaiveOffAmount(0)
    }
  }, [selectedSlots])

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

  const handleMealSelectorConfirm = (meals: SelectedMeal[]) => {
    console.log('🍽️ Meals confirmed:', meals)
    setSelectedMeals(meals)
    setIsMealSelectorOpen(false)
  }

  const handleMealSelectorClose = () => {
    console.log('🍽️ Meal selector closed')
    setIsMealSelectorOpen(false)
  }

  const mealsTotal = selectedMeals.reduce((sum, meal) => sum + meal.total, 0)
  const consoleTotal = selectedSlots.reduce((sum, slot) => sum + slot.console_price, 0)
  const totalAmount = Math.max(
    0,
    consoleTotal - waiveOffAmount - autoWaiveOffAmount + extraControllerFare + mealsTotal
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
      const bookingData = {
        consoleType: selectedSlots[0]?.console_name || '',
        name,
        email,
        phone,
        bookedDate: selectedSlots[0]?.date || '',
        slotId: selectedSlots.map(slot => slot.slot_id),
        paymentType,
        waiveOffAmount: waiveOffAmount + autoWaiveOffAmount,
        extraControllerFare,
        selectedMeals: selectedMeals.map(meal => ({
          menu_item_id: meal.menu_item_id,
          quantity: meal.quantity
        }))
      }

      console.log('📤 Submitting booking data:', bookingData)

      const response = await fetch(`${BOOKING_URL}/api/newBooking/vendor/${vendorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      })

      console.log('📥 API response status:', response.status)

      if (!response.ok) {
        throw new Error('Failed to submit booking')
      }

      const result = await response.json()
      console.log('📥 API response data:', result)
      
      if (result.success) {
        console.log('✅ Booking created successfully!')
        setIsSubmitted(true)

        if (typeof window !== 'undefined') {
          console.log('📡 Dispatching refresh-dashboard event')
          window.dispatchEvent(new CustomEvent('refresh-dashboard'))
        }

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
        console.log('❌ Booking creation failed:', result.message)
        alert(`Error: ${result.message}`)
      }
    } catch (error) {
      console.error('❌ Error submitting booking:', error)
      alert('Failed to create booking')
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
          className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center"
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
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
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
          className="w-full max-w-6xl max-h-[95vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">New Slot Booking</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700">
                    <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 mb-3">Selected Time Slots</h3>
                    <div className="space-y-2">
                      {selectedSlots.map((slot, index) => (
                        <div key={index} className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 rounded-lg p-3">
                          <span className="text-gray-700 dark:text-gray-300">
                            <strong>{new Date(slot.date).toLocaleDateString('en-GB')}</strong> • {slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)} • {slot.console_name}
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            ₹{slot.console_price}
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

                  <Card className="p-6 bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded">
                        <Users className="w-4 h-4 text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Customer Information</h3>
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
                          placeholder="Email"
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
                          placeholder="Phone"
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
                          placeholder="Full name"
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
                  </Card>

                  <Card className="p-6 bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                        <CreditCard className="w-4 h-4 text-yellow-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Payment Method</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {(['Cash', 'UPI'] as const).map((type) => (
                        <motion.button
                          key={type}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setPaymentType(type)
                            if (errors.payment) setErrors((prev) => ({ ...prev, payment: '' }))
                          }}
                          className={cn(
                            "p-4 rounded-lg border transition-all duration-200",
                            paymentType === type
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                              : 'border-gray-300 dark:border-gray-600 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20'
                          )}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {type === 'Cash' ? <Wallet className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                            <span className="font-medium">{type}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                    {errors.payment && <p className="text-red-500 text-sm mt-2">{errors.payment}</p>}
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="p-6 bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Pricing Summary</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-400">Console Total:</span>
                        <span className="font-medium text-gray-800 dark:text-white">₹{consoleTotal}</span>
                      </div>

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

                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-400">Extra Controller:</span>
                        <input
                          type="number"
                          value={extraControllerFare}
                          onChange={(e) => setExtraControllerFare(Number(e.target.value) || 0)}
                          placeholder="₹0"
                          className="w-20 text-right px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
                          min={0}
                        />
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-400">Meals & Extras:</span>
                        <button
                          type="button"
                          onClick={() => setIsMealSelectorOpen(true)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm hover:from-emerald-200 hover:to-green-200 dark:hover:from-emerald-900/50 dark:hover:to-green-900/50 transition-all duration-200 border border-emerald-200 dark:border-emerald-700"
                        >
                          <Plus className="w-3 h-3" />
                          {selectedMeals.length === 0 ? 'Add Meals' : `${selectedMeals.length} Selected`}
                        </button>
                      </div>

                      {selectedMeals.length > 0 && (
                        <div className="py-2 border-b border-gray-200 dark:border-gray-600">
                          <div className="space-y-2">
                            {selectedMeals.map(meal => (
                              <div key={meal.menu_item_id} className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <span className="font-medium text-emerald-800 dark:text-emerald-200 text-sm">
                                      {meal.name}
                                    </span>
                                    <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                      {meal.category} • ₹{meal.price} × {meal.quantity}
                                    </div>
                                  </div>
                                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                                    ₹{meal.total}
                                  </span>
                                </div>
                              </div>
                            ))}
                            <div className="text-right pt-2 border-t border-emerald-200 dark:border-emerald-700">
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
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
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white disabled:opacity-50"
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
            </form>
          </div>

          <MealSelector
            vendorId={getVendorIdFromToken() || 0}
            isOpen={isMealSelectorOpen}
            onClose={handleMealSelectorClose}
            onConfirm={handleMealSelectorConfirm}
            initialSelectedMeals={selectedMeals}
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
}: {
  label: string
  color: PillColor
  icon?: React.ComponentType<{ className?: string }>
  onClick?: () => void
  selected?: boolean
  disabled?: boolean
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
        "w-full h-full min-h-[36px] flex items-center justify-center rounded-md text-[10px] font-bold uppercase tracking-wide",
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
          : "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600",
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  )
}

function TopBar({ 
  selectedSlots, 
  onNewBooking 
}: { 
  selectedSlots: SelectedSlot[], 
  onNewBooking: () => void 
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Slot Management</h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage and monitor console bookings.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={onNewBooking}
          disabled={selectedSlots.length === 0}
          className={cn(
            "rounded-lg text-white shadow-lg transition-all duration-200",
            "px-5 py-2 text-sm font-semibold",
            selectedSlots.length > 0 
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-500 cursor-not-allowed"
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Booking {selectedSlots.length > 0 && `(${selectedSlots.length})`}
        </Button>
        <Button 
          variant="outline"
          size="icon" 
          className="rounded-lg border-gray-600 bg-gray-700 hover:bg-gray-600"
        >
          <MoreVertical className="h-4 w-4 text-gray-300" />
        </Button>
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
    all: Dot,
    PC: Monitor,
    PS5: MonitorPlay,
    Xbox: Gamepad,
    VR: Headset
  }

  return (
    <Card className="rounded-xl border border-gray-700 bg-gray-800/50 backdrop-blur-sm p-4 mb-6">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-400 uppercase">Select Console</span>
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
  isLoading
}: {
  availableConsoles: ConsoleType[]
  selectedConsole: ConsoleFilter
  selectedSlots: SelectedSlot[]
  onSlotSelect: (slot: SelectedSlot) => void
  allSlots: { [key: string]: any[] }
  isLoading: boolean
}) {
  const getNext3Days = () => {
    const days = []
    for (let i = 0; i < 3; i++) {
      const today = new Date()
      const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
      
      const year = targetDate.getFullYear()
      const month = String(targetDate.getMonth() + 1).padStart(2, '0')
      const day = String(targetDate.getDate()).padStart(2, '0')
      
      const fullDate = `${year}-${month}-${day}`
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

  const filteredConsoles = availableConsoles.filter(gameConsole => {
    if (selectedConsole === 'all') return true
    return gameConsole.type === selectedConsole
  })

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

  const isSlotSelected = (slotId: number) => {
    return selectedSlots.some(slot => slot.slot_id === slotId)
  }

  const handleSlotClick = (dayData: any, time: string, gameConsole: ConsoleType) => {
    const daySlots = allSlots[dayData.fullDate] || []
    
    const matchingSlot = daySlots.find(slot => {
      const slotStartTime = slot.start_time.slice(0, 5)
      return slotStartTime === time && slot.console_id === gameConsole.id && slot.is_available
    })

    if (!matchingSlot) return

    const selectedSlot: SelectedSlot = {
      slot_id: matchingSlot.slot_id,
      date: dayData.fullDate,
      start_time: matchingSlot.start_time,
      end_time: matchingSlot.end_time,
      console_id: gameConsole.id!,
      console_name: gameConsole.name,
      console_price: matchingSlot.single_slot_price || gameConsole.price!
    }

    onSlotSelect(selectedSlot)
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
        const isAllView = selectedConsole === 'all'
        
        filteredConsoles.forEach(gameConsole => {
          const consoleSlots = daySlots.filter(slot => {
            const slotStartTime = slot.start_time.slice(0, 5)
            return slotStartTime === time && slot.console_id === gameConsole.id
          })

          if (consoleSlots.length === 0) return

          const availableSlots = consoleSlots.filter(slot => slot.is_available)
          const bookedSlots = consoleSlots.filter(slot => !slot.is_available)

         

          availableSlots.forEach(slot => {
            const isSelected = isSlotSelected(slot.slot_id)
            
            if (isAllView) {
              timeSlots.push(
                <div key={slot.slot_id} className="w-[48px] h-[32px]">
                  <SlotPill
                    label={gameConsole.type}
                    color={getConsoleColor(gameConsole.id)}
                    icon={undefined}
                    onClick={() => handleSlotClick(day, time, gameConsole)}
                    selected={isSelected}
                  />
                </div>
              )
            } else {
              timeSlots.push(
                <div key={slot.slot_id} className="w-full h-full min-h-[40px]">
                  <SlotPill
                    label={gameConsole.name}
                    color={getConsoleColor(gameConsole.id)}
                    icon={getConsoleIcon(gameConsole.type)}
                    onClick={() => handleSlotClick(day, time, gameConsole)}
                    selected={isSelected}
                  />
                </div>
              )
            }
          }) 

          bookedSlots.forEach((slot, index) => {
            if (isAllView) {
              timeSlots.push(
                <div 
                  key={`booked-${gameConsole.id}-${index}`} 
                  className="w-[48px] h-[32px] flex items-center justify-center bg-red-600 text-white rounded-md"
                >
                  <X className="h-4 w-4" />
                </div>
              )
            } else {
              timeSlots.push(
                <div 
                  key={`booked-${gameConsole.id}-${index}`} 
                  className="w-full h-full min-h-[40px] flex items-center justify-center bg-red-600 text-white rounded-md"
                >
                  <X className="h-5 w-5 stroke-[3]" />
                </div>
              )
            }
          })
}) 

        if (isAllView) {
          return (
            <div key={`${day.fullDate}-${timeIndex}`} className="flex flex-row gap-1 items-center justify-center flex-wrap min-h-[44px] max-h-[80px] overflow-hidden p-1">
              {timeSlots.length > 0 ? timeSlots : <span className="text-gray-500 text-xs">-</span>}
            </div>
          )
        } else {
          return (
            <div key={`${day.fullDate}-${timeIndex}`} className="flex flex-row flex-wrap gap-1 items-stretch h-full p-1">
              {timeSlots}
            </div>
          )
        }
      }),
    }
  })

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
    <Card className="rounded-2xl border border-gray-700 bg-gray-800/30 backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="grid gap-2 p-4 pb-3 bg-gray-800/50" style={{ gridTemplateColumns: `80px repeat(${uniqueTimes.length}, minmax(110px, 1fr))` }}>
            <div className="text-xs font-semibold text-gray-400 uppercase">Date</div>
            {uniqueTimes.map((time) => (
              <div key={time} className="text-sm font-bold text-gray-200 text-center">
                {time}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-700">
            {rows.map((row) => (
              <div 
                key={row.fullDate}
                className="grid gap-2 p-4 py-3 border-b border-gray-700/50 last:border-b-0 hover:bg-gray-700/20 transition-colors" 
                style={{ gridTemplateColumns: `80px repeat(${uniqueTimes.length}, minmax(110px, 1fr))` }}
              >
                <div className="flex items-center text-sm font-bold text-white bg-gray-700/50 rounded-lg px-2 py-2 justify-center">
                  {row.date}
                </div>
                
                {row.cells.map((content, idx) => (
                  <div
                    key={`${row.fullDate}-cell-${idx}`}
                    className="min-h-[44px] rounded-lg border border-gray-700 bg-gray-800/50 backdrop-blur-sm"
                  >
                    {content}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

function RecentBookings({ bookings }: { bookings: any[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold tracking-tight text-white mb-4">Selected Slot Bookings</h2>

      <Card className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800/30 backdrop-blur-sm">
        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-700/50 text-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Booking ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Contact Number</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Email ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Meal Selected</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No bookings selected
                  </td>
                </tr>
              ) : (
                bookings.map((booking, index) => (
                  <tr key={booking.id || index} className="border-t border-gray-700 hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-blue-400">#{booking.id}</td>
                    <td className="px-6 py-4 text-gray-200">{booking.name}</td>
                    <td className="px-6 py-4 text-gray-300">{booking.phone}</td>
                    <td className="px-6 py-4 text-gray-300">{booking.email || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-300">{booking.meal || '1-Coc'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 hover:bg-gray-700 rounded text-blue-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button className="p-1.5 hover:bg-gray-700 rounded text-red-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}

export default function SlotManagement() {
  const [selectedConsole, setSelectedConsole] = useState<ConsoleFilter>("all")
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([])
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [availableConsoles, setAvailableConsoles] = useState<ConsoleType[]>([])
  const [allSlots, setAllSlots] = useState<{ [key: string]: any[] }>({})
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  useEffect(() => {
    let isMounted = true

    const fetchDataOnce = async () => {
      const vendorId = getVendorIdFromToken()
      if (!vendorId) {
        if (isMounted) setIsLoading(false)
        return
      }

      if (!isMounted) return
      
      try {
        setIsLoading(true)
        
        const consolesResponse = await fetch(`${BOOKING_URL}/api/getAllConsole/vendor/${vendorId}`)
        
        if (!isMounted) return
        
        if (!consolesResponse.ok) {
          if (isMounted) {
            setIsLoading(false)
            setAvailableConsoles([])
            setAllSlots({})
          }
          return
        }

        const data = await consolesResponse.json()
        
        const consoleTemplate = [
          { type: "PC", name: "PC Gaming", icon: Monitor, iconColor: "#7c3aed" },
          { type: "PS5", name: "PlayStation 5", icon: Tv, iconColor: "#2563eb" },
          { type: "Xbox", name: "Xbox Series", icon: Gamepad, iconColor: "#059669" },
          { type: "VR", name: "VR Gaming", icon: Headset, iconColor: "#ea580c" },
        ]
        
        const availableConsoles = consoleTemplate.map(template => {
          const matchedConsole = data.games?.find((game: any) => {
            const apiName = (game.console_name || '').toLowerCase()
            const templateType = template.type.toLowerCase()
            
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
        }).filter(Boolean) as ConsoleType[]
        
        if (!isMounted) return
        setAvailableConsoles(availableConsoles)

        if (availableConsoles.length === 0) {
          if (isMounted) {
            setAllSlots({})
            setIsLoading(false)
          }
          return
        }

        const slotsData: { [key: string]: any[] } = {}

        const dates = []
        for (let i = 0; i < 3; i++) {
          const today = new Date()
          const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
          
          const year = targetDate.getFullYear()
          const month = String(targetDate.getMonth() + 1).padStart(2, '0')
          const day = String(targetDate.getDate()).padStart(2, '0')
          
          const dateString = `${year}-${month}-${day}`
          const formattedDate = `${year}${month}${day}`
          
          dates.push({ dateString, formattedDate })
        }

        for (const { dateString, formattedDate } of dates) {
          if (!isMounted) return
          
          const daySlots: any[] = []
          
          for (const gameConsole of availableConsoles) {
            if (!gameConsole.id || !isMounted) continue
            
            try {
              const apiUrl = `${BOOKING_URL}/api/getSlots/vendor/${vendorId}/game/${gameConsole.id}/${formattedDate}`
              
              const slotsResponse = await fetch(apiUrl)
              
              if (!isMounted) return
              
              if (slotsResponse.ok) {
                const slotData = await slotsResponse.json()
                
                if (slotData.slots && Array.isArray(slotData.slots)) {
                  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
                  
                  const processedSlots = slotData.slots.map((slot: any) => {
                    const processedSlot = {
                      ...slot,
                      console_id: gameConsole.id,
                      console_name: gameConsole.name,
                      date: dateString,
                      is_available: slot.is_available
                    }
                    
                    if (dateString === dates[0].dateString) {
                      const slotEndTime = new Date(`${dateString}T${slot.end_time}+05:30`)
                      const isPast = nowIST >= slotEndTime
                      
                      if (isPast) {
                        processedSlot.is_available = false
                      }
                    }
                    
                    return processedSlot
                  })
                  
                  daySlots.push(...processedSlots)
                }
              }
            } catch (error) {
              console.error(`Error fetching slots for ${gameConsole.name}:`, error)
            }
          }
          
          slotsData[dateString] = daySlots
        }

        if (isMounted) {
          setAllSlots(slotsData)
        }

        if (isMounted) {
          setRecentBookings([])
        }

      } catch (error) {
        console.error('Error in fetchData:', error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchDataOnce()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const handleBookingUpdated = () => {
      window.location.reload()
    }

    window.addEventListener('refresh-dashboard', handleBookingUpdated)
    return () => window.removeEventListener('refresh-dashboard', handleBookingUpdated)
  }, [])

  const handleSlotSelect = (slot: SelectedSlot) => {
    const isSelected = selectedSlots.some(s => s.slot_id === slot.slot_id)

    if (isSelected) {
      setSelectedSlots(selectedSlots.filter(s => s.slot_id !== slot.slot_id))
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
    window.location.reload()
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-300">Loading slot data...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto w-full max-w-[1600px] p-6 md:p-8">
        <TopBar selectedSlots={selectedSlots} onNewBooking={handleNewBooking} />
        <ConsoleFilter selectedConsole={selectedConsole} onConsoleChange={setSelectedConsole} />
        <ScheduleGrid
          availableConsoles={availableConsoles}
          selectedConsole={selectedConsole}
          selectedSlots={selectedSlots}
          onSlotSelect={handleSlotSelect}
          allSlots={allSlots}
          isLoading={isLoading}
        />
        <RecentBookings bookings={recentBookings} />
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
