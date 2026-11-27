// utils/priceCalculations.ts
import { SelectedSlot, SelectedMeal } from '../types/booking.types'

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
  extraFare: number
): number => {
  // ✅ Convert to numbers and handle NaN
  const safeConsoleTotal = Number(consoleTotal) || 0
  const safeMealsTotal = Number(mealsTotal) || 0
  const safeWaiveOff = Number(waiveOff) || 0
  const safeExtraFare = Number(extraFare) || 0
  
  const total = safeConsoleTotal - safeWaiveOff + safeExtraFare + safeMealsTotal
  
  console.log('💰 Total calculation:', {
    consoleTotal: safeConsoleTotal,
    mealsTotal: safeMealsTotal,
    waiveOff: safeWaiveOff,
    extraFare: safeExtraFare,
    total
  })
  
  return Math.max(0, total)
}
