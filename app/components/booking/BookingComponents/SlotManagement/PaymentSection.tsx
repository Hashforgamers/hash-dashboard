// components/SlotManagement/SlotBookingForm/PaymentSection.tsx
import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Lock, Users, CheckCircle, AlertCircle, Loader2, Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { PaymentType, Pass } from '../../types/booking.types'

interface PaymentSectionProps {
  paymentType: PaymentType
  isPrivateMode: boolean
  passUid: string
  validatedPass: Pass | null
  isValidatingPass: boolean
  passError: string
  onPaymentTypeChange: (type: PaymentType) => void
  onPrivateModeToggle: () => void
  onPassUidChange: (value: string) => void
  onPassValidate: () => void
  errors: Record<string, string>
}

const PAYMENT_OPTIONS: Array<{ value: PaymentType; label: string; icon: any }> = [
  { value: 'Cash', label: 'Cash', icon: CreditCard },
  { value: 'UPI', label: 'UPI', icon: CreditCard },
  { value: 'Pass', label: 'Pass', icon: Ticket }
]

export const PaymentSection = memo(({
  paymentType,
  isPrivateMode,
  passUid,
  validatedPass,
  isValidatingPass,
  passError,
  onPaymentTypeChange,
  onPrivateModeToggle,
  onPassUidChange,
  onPassValidate,
  errors
}: PaymentSectionProps) => {
  return (
    <div className="space-y-4">
      {/* Private Mode Toggle */}
      <Card className="p-4 bg-zinc-50 dark:bg-zinc-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg transition-all duration-300',
              isPrivateMode 
                ? 'bg-purple-500' 
                : 'bg-zinc-300 dark:bg-zinc-600'
            )}>
              {isPrivateMode ? (
                <Lock className="w-5 h-5 text-white" />
              ) : (
                <Users className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                {isPrivateMode ? (
                  <>
                    <span className="text-purple-600 dark:text-purple-400">Private Booking</span>
                    <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                      Manual Mode
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-zinc-700 dark:text-zinc-300">Regular Booking</span>
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                      Standard Mode
                    </span>
                  </>
                )}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                {isPrivateMode 
                  ? 'Walk-in or manual booking for internal tracking' 
                  : 'Online booking with standard workflow'}
              </p>
            </div>
          </div>
          
          <motion.button
            type="button"
            onClick={onPrivateModeToggle}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              isPrivateMode 
                ? 'bg-purple-600 focus:ring-purple-500' 
                : 'bg-zinc-300 dark:bg-zinc-600 focus:ring-zinc-400'
            )}
          >
            <motion.span
              animate={{ x: isPrivateMode ? 28 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg"
            />
          </motion.button>
        </div>

        <AnimatePresence>
          {isPrivateMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-600"
            >
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <p className="text-xs text-purple-800 dark:text-purple-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Private bookings are used for walk-in customers or manual entries that don't go through the standard online workflow.
                  </span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Payment Type Selection */}
      <Card className="p-6 bg-zinc-50 dark:bg-zinc-700/30">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded">
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-white">Payment Method</h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {PAYMENT_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <motion.button
                key={option.value}
                type="button"
                onClick={() => onPaymentTypeChange(option.value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2',
                  paymentType === option.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:border-emerald-300'
                )}
              >
                <Icon className={cn(
                  'w-6 h-6',
                  paymentType === option.value
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-600 dark:text-zinc-400'
                )} />
                <span className={cn(
                  'text-sm font-medium',
                  paymentType === option.value
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-zinc-700 dark:text-zinc-300'
                )}>
                  {option.label}
                </span>
              </motion.button>
            )
          })}
        </div>

        {errors.payment && <p className="text-red-500 text-xs mt-2">{errors.payment}</p>}
      </Card>

      {/* Pass Validation (if Pass payment selected) */}
      <AnimatePresence>
        {paymentType === 'Pass' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-6 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700">
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-4">
                Pass Validation
              </h3>

              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={passUid}
                    onChange={(e) => onPassUidChange(e.target.value)}
                    placeholder="Enter Pass UID"
                    className={cn(
                      'w-full px-4 py-3 bg-white dark:bg-zinc-800 border rounded-lg',
                      errors.pass || passError
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-zinc-300 dark:border-zinc-600 focus:border-purple-500',
                      'focus:outline-none focus:ring-1 focus:ring-purple-500/20'
                    )}
                  />
                </div>
                
                <Button variant="default"
                  type="button"
                  onClick={onPassValidate}
                  disabled={isValidatingPass || !passUid.trim()}>
                  {isValidatingPass ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Validate'
                  )}
                </Button>
              </div>

              {(errors.pass || passError) && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {errors.pass || passError}
                </p>
              )}

              {validatedPass && !passError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">Pass Validated</span>
                  </div>
                  <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                    <p><strong>User:</strong> {validatedPass.user_name}</p>
                    <p><strong>Remaining Hours:</strong> {validatedPass.remaining_hours} hrs</p>
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

PaymentSection.displayName = 'PaymentSection'
