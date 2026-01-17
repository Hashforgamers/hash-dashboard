// components/SlotManagement/SlotBookingForm/PricingSummary.tsx
import React, { memo } from 'react'
import { Wallet, Minus, Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface PricingSummaryProps {
  consoleTotal: number
  mealsTotal: number
  waiveOffAmount: number
  autoWaiveOffAmount: number
  extraControllerFare: number
  totalAmount: number
  onWaiveOffChange: (amount: number) => void
  onExtraFareChange: (amount: number) => void
  onMealsClick: () => void
  selectedMealsCount: number
}

export const PricingSummary = memo(({
  consoleTotal,
  mealsTotal,
  waiveOffAmount,
  autoWaiveOffAmount,
  extraControllerFare,
  totalAmount,
  onWaiveOffChange,
  onExtraFareChange,
  onMealsClick,
  selectedMealsCount
}: PricingSummaryProps) => {
  return (
    <Card className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded">
          <Wallet className="w-4 h-4 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Pricing Summary</h3>
      </div>

      <div className="space-y-3">
        {/* Console Total */}
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-700 dark:text-gray-300">Console Charges</span>
          <span className="font-medium text-gray-800 dark:text-white">₹{consoleTotal}</span>
        </div>

        {/* Meals */}
        <div className="flex justify-between items-center py-2">
          <button
            type="button"
            onClick={onMealsClick}
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline text-sm"
          >
            Meals & Extras {selectedMealsCount > 0 && `(${selectedMealsCount})`}
          </button>
          <span className="font-medium text-gray-800 dark:text-white">₹{mealsTotal}</span>
        </div>

        {/* Manual Waive Off */}
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-700 dark:text-gray-300">Manual Waive-off</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onWaiveOffChange(Math.max(0, waiveOffAmount - 10))}
              className="h-7 w-7 p-0"
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="font-medium text-gray-800 dark:text-white w-16 text-center">
              -₹{waiveOffAmount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onWaiveOffChange(waiveOffAmount + 10)}
              className="h-7 w-7 p-0"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Auto Waive Off */}
        {autoWaiveOffAmount > 0 && (
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700 dark:text-gray-300">Auto Waive-off (Late Entry)</span>
            <span className="font-medium text-orange-600 dark:text-orange-400">-₹{autoWaiveOffAmount}</span>
          </div>
        )}

        {/* Extra Controller */}
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-700 dark:text-gray-300">Extra Controller</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onExtraFareChange(Math.max(0, extraControllerFare - 10))}
              className="h-7 w-7 p-0"
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="font-medium text-gray-800 dark:text-white w-16 text-center">
              +₹{extraControllerFare}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onExtraFareChange(extraControllerFare + 10)}
              className="h-7 w-7 p-0"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Total */}
        <div className="pt-3 border-t-2 border-emerald-300 dark:border-emerald-700">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-gray-800 dark:text-white">Total Amount</span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ₹{totalAmount}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
})

PricingSummary.displayName = 'PricingSummary'
