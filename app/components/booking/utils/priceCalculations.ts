// utils/priceCalculations.ts
import { SelectedSlot, SelectedMeal } from '../types/booking.types'
import { getCurrentISTTime } from './dataHelpers'

export const calculateAutoWaiveOff = (slots: SelectedSlot[]): number => {
  if (!slots || slots.length === 0) return 0
  
  const now = getCurrentISTTime()
  
  return Math.round(
    slots.reduce((total, slot) => {
      // ✅ Guard against missing data
      if (!slot || !slot.date || !slot.start_time || !slot.end_time || !slot.console_price) {
        console.warn('⚠️ Invalid slot data:', slot)
        return total
      }
      
      const slotStart = new Date(`${slot.date}T${slot.start_time}+05:30`)
      const slotEnd = new Date(`${slot.date}T${slot.end_time}+05:30`)
      
      if (now < slotStart || now >= slotEnd) return total
      
      const elapsed = now.getTime() - slotStart.getTime()
      const duration = slotEnd.getTime() - slotStart.getTime()
      const percentage = elapsed / duration
      
      return total + (slot.console_price * percentage)
    }, 0)
  )
}

export const calculateConsoleTotal = (slots: SelectedSlot[]): number => {
  if (!slots || slots.length === 0) return 0
  
  return slots.reduce((sum, slot) => {
    // ✅ Handle both consoleprice and console_price (with/without underscore)
    const price = slot.console_price ?? (slot as any).consoleprice ?? 0
    return sum + price
  }, 0)
}

export const calculateMealsTotal = (meals: SelectedMeal[]): number => {
  if (!meals || meals.length === 0) return 0
  
  return meals.reduce((sum, meal) => {
    // ✅ Fallback to 0 if total is undefined
    return sum + (meal?.total ?? 0)
  }, 0)
}

export const calculateTotalAmount = (
  consoleTotal: number,
  mealsTotal: number,
  waiveOff: number,
  autoWaiveOff: number,
  extraFare: number
): number => {
  // ✅ Convert to numbers and handle NaN
  const safeConsoleTotal = Number(consoleTotal) || 0
  const safeMealsTotal = Number(mealsTotal) || 0
  const safeWaiveOff = Number(waiveOff) || 0
  const safeAutoWaiveOff = Number(autoWaiveOff) || 0
  const safeExtraFare = Number(extraFare) || 0
  
  const total = safeConsoleTotal - safeWaiveOff - safeAutoWaiveOff + safeExtraFare + safeMealsTotal
  
  console.log('💰 Total calculation:', {
    consoleTotal: safeConsoleTotal,
    mealsTotal: safeMealsTotal,
    waiveOff: safeWaiveOff,
    autoWaiveOff: safeAutoWaiveOff,
    extraFare: safeExtraFare,
    total
  })
  
  return Math.max(0, total)
}
