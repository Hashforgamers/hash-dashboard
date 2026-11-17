// components/SlotManagement/index.tsx
'use client'

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'
import { Loader2 } from 'lucide-react'

import { useSlotData } from '../hooks/useSlotData'
import { TopBar } from './TopBar'
import { ConsoleFilter } from './ConsoleFilter'
import { ScheduleGrid } from './ScheduleGrid'
import { SlotBookingForm } from './SlotManagement/index'
import { cacheService } from '../services/api/cacheService'
import { useAccess } from '@/app/context/AccessContext'
import { readCafeShortcuts, type CafeShortcutPlatform } from '@/app/lib/cafe-shortcuts'

import type { ConsoleFilter as ConsoleFilterType, SelectedSlot } from '../types/booking.types'

export default function SlotManagement() {
  const [vendorId, setVendorId] = useState<number | null>(null)
  const [selectedConsole, setSelectedConsole] = useState<ConsoleFilterType>('PC')
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([])
  const [showBookingForm, setShowBookingForm] = useState(false)
  const { selectedCafeId } = useAccess()

  // Get vendor ID from JWT
  useEffect(() => {
    const token = localStorage.getItem('jwtToken')
    if (token) {
      try {
        const decoded = jwtDecode<{ sub: { id: number } }>(token)
        setVendorId(decoded.sub.id)
      } catch (error) {
        console.error('❌ Error decoding token:', error)
      }
    }
  }, [])

  // Fetch slot data
  const { consoles, slots, isLoading, error, refetch, dates } = useSlotData(vendorId)

  useEffect(() => {
    if (!selectedCafeId) return
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.shiftKey || event.metaKey || !event.ctrlKey) return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || target?.closest('input, textarea, select, [role="dialog"]')) return
      const shortcuts = readCafeShortcuts(selectedCafeId)
      const platform = (Object.keys(shortcuts) as CafeShortcutPlatform[]).find(
        (key) => shortcuts[key] === event.key.toLowerCase()
      )
      if (!platform || (platform !== 'All' && !consoles.some((item) => item.type === platform))) return
      event.preventDefault()
      setSelectedConsole(platform)
      setSelectedSlots([])
      setShowBookingForm(false)
      document.querySelector('[data-booking-schedule]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [selectedCafeId, consoles])

  // Handle dashboard refresh event
  useEffect(() => {
    const handleRefresh = () => {
      cacheService.clear()
      refetch()
      setSelectedSlots([])
      setShowBookingForm(false)
    }

    window.addEventListener('refresh-dashboard', handleRefresh)
    return () => window.removeEventListener('refresh-dashboard', handleRefresh)
  }, [refetch])

  const handleSlotSelect = (slot: SelectedSlot) => {
    const isSelected = selectedSlots.some(
      (s) => s.slot_id === slot.slot_id && s.date === slot.date
    )

    if (isSelected) {
      setSelectedSlots(selectedSlots.filter(
        (s) => !(s.slot_id === slot.slot_id && s.date === slot.date)
      ))
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
    refetch()
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-zinc-300">Loading slot data...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Error loading data: {error.message}</p>
          <button onClick={refetch} className={cn(buttonVariants({ variant: "default" }), "mt-4")}>
            Retry
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div data-booking-schedule className="mx-auto w-full max-w-[1600px] p-6 md:p-8">
        <TopBar 
          selectedSlots={selectedSlots} 
          onNewBooking={handleNewBooking}
        />
        
        <ConsoleFilter 
          selectedConsole={selectedConsole}
          onConsoleChange={setSelectedConsole}
        />
        
        <ScheduleGrid
          availableConsoles={consoles}
          selectedConsole={selectedConsole}
          selectedSlots={selectedSlots}
          onSlotSelect={handleSlotSelect}
          allSlots={slots}
          dates={Object.keys(slots)}
        />
      </div>

      <SlotBookingForm
        isOpen={showBookingForm}
        onClose={() => setShowBookingForm(false)}
        selectedSlots={selectedSlots}
        onBookingComplete={handleBookingComplete}
        availableConsoles={consoles}
      />
    </main>
  )
}
