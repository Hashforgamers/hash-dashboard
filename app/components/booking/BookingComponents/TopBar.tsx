// components/SlotManagement/TopBar.tsx
import React from 'react'
import { Plus, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SelectedSlot } from '../types/booking.types'

interface TopBarProps {
  selectedSlots: SelectedSlot[]
  onNewBooking: () => void
}

export const TopBar = ({ selectedSlots, onNewBooking }: TopBarProps) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Slot Management</h1>
        <p className="text-sm text-gray-400 mt-1">Manage and monitor console bookings</p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={onNewBooking}
          disabled={selectedSlots.length === 0}
          className={cn(
            'rounded-lg text-white shadow-lg transition-all duration-200',
            'px-5 py-2 text-sm font-semibold',
            selectedSlots.length > 0
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-500 cursor-not-allowed'
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Booking
          {selectedSlots.length > 0 && ` (${selectedSlots.length})`}
        </Button>

        <Button variant="outline" size="icon" className="rounded-lg border-gray-600 bg-gray-700 hover:bg-gray-600">
          <MoreVertical className="h-4 w-4 text-gray-300" />
        </Button>
      </div>
    </div>
  )
}
