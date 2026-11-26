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
    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-white">Slot Management</h1>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={onNewBooking}
          disabled={selectedSlots.length === 0}
          className={cn(
            'rounded-lg text-white shadow-lg transition-all duration-200',
            'px-5 py-2 text-sm font-semibold',
            selectedSlots.length > 0
              ? 'bg-primary hover:bg-primary'
              : 'bg-muted cursor-not-allowed'
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Booking
          {selectedSlots.length > 0 && ` (${selectedSlots.length})`}
        </Button>

        <Button variant="outline" size="icon" className="rounded-lg border-border bg-muted hover:bg-muted">
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  )
}
