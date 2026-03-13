// components/SlotManagement/SlotBookingForm/index.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { jwtDecode } from 'jwt-decode'
import { DASHBOARD_URL } from '@/src/config/env'

import { useBookingForm } from '../../hooks/useBookingForm'
import { useUserSuggestions } from '../../hooks/useUserSuggestions'
import { usePassValidation } from '../../hooks/usePassValidation'
import { bookingService } from '../../services/api/bookingService'
import { calculateAutoWaiveOff, calculateConsoleTotal, calculateMealsTotal, calculateTotalAmount } from '../../utils/priceCalculations'

import { CustomerInfo } from './CustomerInfo'
import { PaymentSection } from './PaymentSection'
import { PricingSummary } from './PricingSummary'
import { SuccessModal } from './SuccessModal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import MealSelector from './mealSelector'

import type { SelectedSlot, SelectedMeal, ConsoleType, BookingPayload } from '../../types/booking.types'

// ✅ ROBUST date formatter - handles all formats
const formatDateForDisplay = (dateStr: any): string => {
  if (!dateStr) {
    console.warn('⚠️ Empty date provided')
    return 'No Date'
  }

  const str = String(dateStr).trim()
  console.log('📅 Formatting date:', str)

  try {
    // Format 1: "20260108" (YYYYMMDD)
    if (/^\d{8}$/.test(str)) {
      const year = str.slice(0, 4)
      const month = str.slice(4, 6)
      const day = str.slice(6, 8)
      const isoDate = `${year}-${month}-${day}`
      const date = new Date(isoDate)
      
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB')
      }
    }
    
    // Format 2: "2026-01-08" (ISO format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const date = new Date(str)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB')
      }
    }
    
    // Format 3: "08/01/2026" (already formatted)
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      return str
    }

    // Last resort: try direct parse
    const date = new Date(str)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-GB')
    }

    console.error('❌ Could not parse date:', str)
    return str // Return original if all fails
    
  } catch (error) {
    console.error('❌ Date formatting error:', error)
    return str
  }
}

interface SlotBookingFormProps {
  isOpen: boolean
  onClose: () => void
  selectedSlots: SelectedSlot[]
  onBookingComplete: () => void
  availableConsoles: ConsoleType[]
}

interface ControllerTierRule {
  quantity: number
  total_price: number
}

interface ControllerPricingConfig {
  base_price: number
  tiers: ControllerTierRule[]
}

const normalizeControllerType = (name: string | undefined): 'ps5' | 'xbox' | null => {
  const value = (name || '').toLowerCase()
  if (value.includes('ps')) return 'ps5'
  if (value.includes('xbox')) return 'xbox'
  return null
}

const calculateControllerFare = (config: ControllerPricingConfig, quantity: number): number => {
  if (quantity <= 0) return 0

  const base = Number(config.base_price || 0)
  const tiers = (config.tiers || [])
    .filter((tier) => Number(tier.quantity) >= 2)
    .map((tier) => ({
      quantity: Number(tier.quantity),
      total_price: Number(tier.total_price || 0)
    }))
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

export const SlotBookingForm = ({
  isOpen,
  onClose,
  selectedSlots,
  onBookingComplete,
  availableConsoles
}: SlotBookingFormProps) => {
  const [vendorId, setVendorId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [autoWaiveOffAmount, setAutoWaiveOffAmount] = useState(0)
  const [isMealSelectorOpen, setIsMealSelectorOpen] = useState(false)
  const [controllerPricingConfig, setControllerPricingConfig] = useState<ControllerPricingConfig>({
    base_price: 0,
    tiers: []
  })
  const [isControllerPricingLoading, setIsControllerPricingLoading] = useState(false)

  const { state, setField, setValidatedPass, togglePrivateMode, setMeals, validate, resetForm } = useBookingForm(selectedSlots)
  
  const { 
    suggestions, 
    focusedField, 
    handleInputChange, 
    handleFocus, 
    handleBlur, 
    handleSuggestionClick 
  } = useUserSuggestions(vendorId, isOpen)

  const { validate: validatePass, isValidating: isValidatingPass, error: passError, setError: setPassError } = usePassValidation(vendorId)

  // Get vendor ID from JWT
  useEffect(() => {
    const token = localStorage.getItem('jwtToken')
    if (token) {
      try {
        const decoded = jwtDecode<{ sub: { id: number } }>(token)
        setVendorId(decoded.sub.id)
        console.log('✅ Vendor ID:', decoded.sub.id)
      } catch (error) {
        console.error('❌ Error decoding token:', error)
      }
    }
  }, [])

  // Calculate auto waive-off
  useEffect(() => {
    if (selectedSlots.length > 0) {
      const autoWaiveOff = calculateAutoWaiveOff(selectedSlots)
      setAutoWaiveOffAmount(autoWaiveOff)
      console.log('🧮 Auto waive-off:', autoWaiveOff)
    } else {
      setAutoWaiveOffAmount(0)
    }
  }, [selectedSlots])

  const selectedControllerType = normalizeControllerType(selectedSlots[0]?.console_name)
  const isControllerPricingSupported = selectedControllerType !== null

  useEffect(() => {
    const fetchControllerPricing = async () => {
      if (!vendorId || !isOpen || !selectedControllerType) {
        setControllerPricingConfig({ base_price: 0, tiers: [] })
        if (!selectedControllerType && state.extraControllerQty > 0) {
          setField('extraControllerQty', 0)
          setField('extraControllerFare', 0)
        }
        return
      }

      setIsControllerPricingLoading(true)
      try {
        const response = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/controller-pricing`)
        if (!response.ok) throw new Error('Failed to fetch controller pricing')

        const data = await response.json()
        const pricing = data?.pricing?.[selectedControllerType]

        const config: ControllerPricingConfig = {
          base_price: Number(pricing?.base_price ?? 0),
          tiers: Array.isArray(pricing?.tiers)
            ? pricing.tiers.map((tier: any) => ({
                quantity: Number(tier?.quantity ?? 2),
                total_price: Number(tier?.total_price ?? 0)
              }))
            : []
        }
        setControllerPricingConfig(config)
      } catch (error) {
        console.error('❌ Failed to fetch controller pricing:', error)
        setControllerPricingConfig({ base_price: 0, tiers: [] })
      } finally {
        setIsControllerPricingLoading(false)
      }
    }

    fetchControllerPricing()
  }, [vendorId, isOpen, selectedControllerType])

  useEffect(() => {
    if (!isControllerPricingSupported) return
    const nextFare = calculateControllerFare(
      controllerPricingConfig,
      Number(state.extraControllerQty || 0)
    )

    if (nextFare !== state.extraControllerFare) {
      setField('extraControllerFare', nextFare)
    }
  }, [
    controllerPricingConfig,
    state.extraControllerQty,
    state.extraControllerFare,
    isControllerPricingSupported,
    setField
  ])

  const handlePassValidation = async () => {
    const requiredHours = selectedSlots.length * 0.5
    const pass = await validatePass(state.passUid, requiredHours)
    setValidatedPass(pass)
  }

  const handleMealSelectorConfirm = (meals: SelectedMeal[]) => {
    console.log('🍽️ Meals confirmed:', meals)
    setMeals(meals)
    setIsMealSelectorOpen(false)
  }

  const handleMealSelectorClose = () => {
    console.log('🍽️ Meal selector closed')
    setIsMealSelectorOpen(false)
  }

// In your SlotBookingForm/index.tsx handleSubmit function

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  console.log('📋 Form submission started')
  console.log('📊 Current state:', state)
  console.log('🎰 Selected slots:', selectedSlots)

  if (!validate() || !vendorId) {
    console.log('❌ Validation failed or no vendor ID')
    return
  }

  setIsSubmitting(true)

  try {
    // Redeem pass if payment type is Pass
    if (state.paymentType === 'Pass' && state.validatedPass) {
      console.log('🎫 Redeeming pass...')
      const hoursToDeduct = selectedSlots.length * 0.5
      
      await bookingService.redeemPass(
        vendorId,
        state.passUid,
        hoursToDeduct,
        selectedSlots[0]?.start_time.slice(0, 5) || '',
        selectedSlots[selectedSlots.length - 1]?.end_time.slice(0, 5) || '',
        `Booking for ${selectedSlots[0]?.console_name} - ${selectedSlots.length} slots`
      )
      console.log('✅ Pass redeemed successfully')
    }

    // ✅ FIXED: Match the exact format from your working code
    const totalWaiveOff = Number(state.waiveOffAmount || 0) + Number(autoWaiveOffAmount || 0)
    
    const bookingPayload: BookingPayload = {
      consoleType: selectedSlots[0]?.console_name || '', // ✅ Keep as console_name
      name: state.name.trim(),
      email: state.email.trim(),
      phone: state.phone.trim(),
      bookedDate: selectedSlots[0]?.date || '',
      slotId: selectedSlots.map(slot => slot.slot_id), // ✅ Keep as slot_id
      paymentType: state.paymentType,
      waiveOffAmount: Number(totalWaiveOff.toFixed(2)),
      extraControllerQty: Number(state.extraControllerQty || 0),
      extraControllerFare: Number((state.extraControllerFare || 0).toFixed(2)),
      selectedMeals: state.selectedMeals.map(meal => ({
        menu_item_id: meal.menu_item_id, // ✅ Keep as menu_item_id
        quantity: meal.quantity
      })),
      bookingType: 'direct',
      bookingMode: state.isPrivateMode ? 'private' : 'regular',
      squadDetails: {
        enabled: false,
        playerCount: 1,
        suggestedExtraControllerQty: 0,
        members: []
      }
    }

    console.log('📤 Booking payload:', JSON.stringify(bookingPayload, null, 2))

    const result = await bookingService.createBooking(vendorId, bookingPayload)

    console.log('📥 API Response:', result)

    if (result.success) {
      console.log('✅ Booking created successfully!')
      setIsSubmitted(true)
      
      // Dispatch refresh event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refresh-dashboard'))
      }
      
      // Update user cache if new user
      const cachedUsers = localStorage.getItem('userList')
      if (cachedUsers) {
        try {
          const { data } = JSON.parse(cachedUsers)
          const isNewUser = !data.some((u: any) => u.email === state.email || u.phone === state.phone)
          
          if (isNewUser) {
            const users = await bookingService.fetchUsers(vendorId)
            localStorage.setItem('userList', JSON.stringify({ data: users, timestamp: Date.now() }))
          }
        } catch (err) {
          console.error('❌ Error updating user cache:', err)
        }
      }
    } else {
      // ✅ Show detailed error message
      const errorMsg = result.message || 'Unknown error'
      const failedSlots = result.failed_slots ? ` (Failed slots: ${result.failed_slots.join(', ')})` : ''
      
      console.error('❌ Booking failed:', result)
      alert(`Booking Error: ${errorMsg}${failedSlots}\n\nPlease refresh the page and try again.`)
      
      // ✅ Auto-refresh on failed slots (they might be booked by someone else)
      if (result.failed_slots && result.failed_slots.length > 0) {
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    }
  } catch (error: any) {
    console.error('❌ Error submitting booking:', error)
    
    // ✅ Show more detailed error
    const errorMsg = error?.message || error?.toString() || 'Unknown error'
    alert(`Failed to create booking: ${errorMsg}`)
  } finally {
    setIsSubmitting(false)
  }
}


  const handleClose = () => {
    if (isSubmitted) {
      onBookingComplete()
      resetForm()
      setIsSubmitted(false)
    }
    onClose()
  }

  // ✅ Calculate totals with proper error handling
  const consoleTotal = calculateConsoleTotal(selectedSlots)
  const mealsTotal = calculateMealsTotal(state.selectedMeals)
  const totalAmount = calculateTotalAmount(
    consoleTotal,
    mealsTotal,
    state.waiveOffAmount,
    autoWaiveOffAmount,
    state.extraControllerFare
  )

  const handleExtraControllerQtyChange = (qty: number) => {
    const safeQty = Math.max(0, Math.min(8, Number(qty) || 0))
    setField('extraControllerQty', safeQty)
  }

  if (isSubmitted) {
    return (
      <SuccessModal
        selectedSlots={selectedSlots}
        selectedMeals={state.selectedMeals}
        totalAmount={totalAmount}
        onClose={handleClose}
      />
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
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">New Slot Booking</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selected Slots Display */}
              <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700">
                <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 mb-3">
                  Selected Time Slots
                </h3>
                <div className="space-y-2">
                  {selectedSlots.map((slot, index) => {
                    // ✅ Debug slot data
                    console.log(`🎰 Slot ${index}:`, slot)
                    
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 rounded-lg p-3"
                      >
                        <span className="text-gray-700 dark:text-gray-300">
                          <strong>{formatDateForDisplay(slot.date)}</strong> •{' '}
                          {slot.start_time?.slice(0, 5) || 'N/A'}-{slot.end_time?.slice(0, 5) || 'N/A'} • {slot.console_name || 'Unknown'}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          ₹{slot.console_price || 0}
                        </span>
                      </div>
                    )
                  })}
                  <div className="text-right pt-2 border-t border-emerald-200 dark:border-emerald-700">
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                      Slots Total: ₹{consoleTotal}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Customer Info */}
              <CustomerInfo
                name={state.name}
                email={state.email}
                phone={state.phone}
                onNameChange={(val: string) => {
                  setField('name', val)
                  handleInputChange('name', val)
                }}
                onEmailChange={(val: string) => {
                  setField('email', val)
                  handleInputChange('email', val)
                }}
                onPhoneChange={(val: string) => {
                  setField('phone', val)
                  handleInputChange('phone', val)
                }}
                suggestions={suggestions}
                focusedField={focusedField}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onSuggestionSelect={(user) => {
                  const selected = handleSuggestionClick(user)
                  setField('name', selected.name)
                  setField('email', selected.email)
                  setField('phone', selected.phone)
                }}
                errors={state.errors}
              />

              {/* Payment Section */}
              <PaymentSection
                paymentType={state.paymentType}
                isPrivateMode={state.isPrivateMode}
                passUid={state.passUid}
                validatedPass={state.validatedPass}
                isValidatingPass={isValidatingPass}
                passError={passError}
                onPaymentTypeChange={(val: string) => setField('paymentType', val)}
                onPrivateModeToggle={togglePrivateMode}
                onPassUidChange={(val: string) => {
                  setField('passUid', val)
                  setPassError('')
                }}
                onPassValidate={handlePassValidation}
                errors={state.errors}
              />

              {/* Pricing Summary */}
              <PricingSummary
                consoleTotal={consoleTotal}
                mealsTotal={mealsTotal}
                waiveOffAmount={state.waiveOffAmount}
                autoWaiveOffAmount={autoWaiveOffAmount}
                extraControllerQty={state.extraControllerQty}
                extraControllerFare={state.extraControllerFare}
                totalAmount={totalAmount}
                controllerPricingSupported={isControllerPricingSupported}
                controllerPricingLoading={isControllerPricingLoading}
                controllerBasePrice={controllerPricingConfig.base_price}
                controllerTiers={controllerPricingConfig.tiers}
                onWaiveOffChange={(val: number) => {
                  console.log('💵 Wave off changed to:', val)
                  setField('waiveOffAmount', val)
                }}
                onExtraQtyChange={(qty: number) => {
                  console.log('🎮 Extra controller qty changed to:', qty)
                  handleExtraControllerQtyChange(qty)
                }}
                onMealsClick={() => setIsMealSelectorOpen(true)}
                selectedMealsCount={state.selectedMeals.length}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 h-12 text-lg font-semibold"
              >
                {isSubmitting ? 'Creating Booking...' : 'Confirm Booking'}
              </Button>
            </form>
          </div>
        </motion.div>

        {/* Meal Selector Modal */}
        {vendorId && (
          <MealSelector
            vendorId={vendorId}
            isOpen={isMealSelectorOpen}
            onClose={handleMealSelectorClose}
            onConfirm={handleMealSelectorConfirm}
            initialSelectedMeals={state.selectedMeals}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
