// components/SlotManagement/SlotBookingForm/SuccessModal.tsx
import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SelectedSlot, SelectedMeal } from '../../types/booking.types'

interface SuccessModalProps {
  selectedSlots: SelectedSlot[]
  selectedMeals: SelectedMeal[]
  totalAmount: number
  onClose: () => void
}

export const SuccessModal = ({
  selectedSlots,
  selectedMeals,
  totalAmount,
  onClose
}: SuccessModalProps) => {
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
            <span className="font-medium text-gray-800 dark:text-white">
              {selectedSlots[0]?.console_name}
            </span>
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
          onClick={onClose}
          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
        >
          Create Another Booking
        </Button>
      </motion.div>
    </div>
  )
}
