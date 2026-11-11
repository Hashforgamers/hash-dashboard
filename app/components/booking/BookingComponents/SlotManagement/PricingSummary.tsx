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
  extraControllerQty: number
  extraControllerFare: number
  totalAmount: number
  controllerPricingSupported: boolean
  controllerPricingLoading: boolean
  controllerBasePrice: number
  controllerTiers: Array<{ quantity: number; total_price: number }>
  onWaiveOffChange: (amount: number) => void
  onExtraQtyChange: (qty: number) => void
  onMealsClick: () => void
  selectedMealsCount: number
}

export const PricingSummary = memo(({
  consoleTotal,
  mealsTotal,
  waiveOffAmount,
  autoWaiveOffAmount,
  extraControllerQty,
  extraControllerFare,
  totalAmount,
  controllerPricingSupported,
  controllerPricingLoading,
  controllerBasePrice,
  controllerTiers,
  onWaiveOffChange,
  onExtraQtyChange,
  onMealsClick,
  selectedMealsCount
}: PricingSummaryProps) => {
  return (
    <Card className="p-6 bg-emerald-50/70 dark:bg-emerald-900/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded">
          <Wallet className="w-4 h-4 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-white">Pricing Summary</h3>
      </div>

      <div className="space-y-3">
        {/* Console Total */}
        <div className="flex justify-between items-center py-2">
          <span className="text-zinc-700 dark:text-zinc-300">Console Charges</span>
          <span className="font-medium text-zinc-800 dark:text-white">₹{consoleTotal}</span>
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
          <span className="font-medium text-zinc-800 dark:text-white">₹{mealsTotal}</span>
        </div>

        {/* Manual Waive Off */}
        <div className="flex justify-between items-center py-2">
          <span className="text-zinc-700 dark:text-zinc-300">Manual Waive-off</span>
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
            <span className="font-medium text-zinc-800 dark:text-white w-16 text-center">
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
            <span className="text-zinc-700 dark:text-zinc-300">Auto Waive-off (Late Entry)</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">-₹{autoWaiveOffAmount}</span>
          </div>
        )}

        {controllerPricingSupported && (
          <>
        {/* Extra Controller */}
        <div className="flex justify-between items-center py-2">
          <span className="text-zinc-700 dark:text-zinc-300">Extra Controller</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onExtraQtyChange(Math.max(0, extraControllerQty - 1))}
              className="h-7 w-7 p-0"
              disabled={controllerPricingLoading}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="font-medium text-zinc-800 dark:text-white min-w-[72px] text-center">
              {extraControllerQty} qty
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onExtraQtyChange(extraControllerQty + 1)}
              className="h-7 w-7 p-0"
              disabled={controllerPricingLoading}
            >
              <Plus className="w-3 h-3" />
            </Button>
            <span className="font-medium text-zinc-800 dark:text-white min-w-[90px] text-right">
              +₹{extraControllerFare}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-white/60 dark:bg-zinc-900/40 p-3">
          <p className="text-xs font-semibold tracking-wide text-zinc-700 dark:text-zinc-300">
            Controller Rules
          </p>
          {controllerPricingLoading ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Loading pricing rules...</p>
          ) : (
            <div className="mt-1 space-y-1">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Base (1 controller): ₹{controllerBasePrice}
              </p>
              {controllerTiers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {controllerTiers.map((tier) => (
                    <span
                      key={tier.quantity}
                      className="rounded-full border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300"
                    >
                      {tier.quantity} = ₹{tier.total_price}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">No bundle tiers configured</p>
              )}
            </div>
          )}
        </div>
          </>
        )}

        {/* Total */}
        <div className="pt-3 border-t-2 border-emerald-300 dark:border-emerald-700">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-zinc-800 dark:text-white">Total Amount</span>
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
