// components/SlotManagement/ScheduleGrid.tsx
import React, { useMemo } from 'react'
import { Loader2, CalendarDays, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDateDisplay } from '../utils/dataHelpers'
import type { ConsoleType, SelectedSlot, SlotData, ConsoleFilter } from '../types/booking.types'

interface ScheduleGridProps {
  availableConsoles: ConsoleType[]
  selectedConsole: ConsoleFilter
  selectedSlots: SelectedSlot[]
  onSlotSelect: (slot: SelectedSlot) => void
  allSlots: SlotData
  dates: string[]
}

export const ScheduleGrid = ({
  availableConsoles,
  selectedConsole,
  selectedSlots,
  onSlotSelect,
  allSlots,
  dates
}: ScheduleGridProps) => {
  
  // Get unique times from all slots
  const uniqueTimes = useMemo(() => {
    const allTimes = new Set<string>()
    
    Object.values(allSlots).forEach((dateSlots: any) => {
      if (Array.isArray(dateSlots)) {
        dateSlots.forEach((slot: any) => {
          const startTime = slot.start_time || slot.starttime
          if (startTime) {
            allTimes.add(startTime.slice(0, 5))
          }
        })
      }
    })
    
    return Array.from(allTimes).sort((a, b) => {
      const [aHour, aMin] = a.split(':').map(Number)
      const [bHour, bMin] = b.split(':').map(Number)
      return (aHour * 60 + aMin) - (bHour * 60 + bMin)
    })
  }, [allSlots])

  // Filter consoles by selected type
  const filteredConsoles = availableConsoles.filter(
    (gameConsole) => selectedConsole === 'All' || gameConsole.type === selectedConsole
  )

  const isSlotSelected = (slotId: number, date: string) => {
    return selectedSlots.some((slot) => slot.slot_id === slotId && slot.date === date)
  }

  const handleSlotClick = (dateKey: string, time: string, gameConsole: ConsoleType) => {
    const dateSlots = allSlots[dateKey]
    if (!Array.isArray(dateSlots)) return

    const matchingSlot = dateSlots.find((slot: any) => {
      const slotStartTime = (slot.start_time || slot.starttime)?.slice(0, 5)
      const slotConsoleId = slot.console_id || slot.consoleid
      const isAvailable = slot.is_available ?? slot.isavailable
      return slotStartTime === time && slotConsoleId === gameConsole.id && isAvailable
    })

    if (!matchingSlot) return

    const selectedSlot: SelectedSlot = {
      slot_id: matchingSlot.slot_id || matchingSlot.slotid,
      date: dateKey,
      start_time: matchingSlot.start_time || matchingSlot.starttime,
      end_time: matchingSlot.end_time || matchingSlot.endtime,
      console_id: gameConsole.id,
      console_name: gameConsole.name,
      console_price: matchingSlot.single_slot_price || matchingSlot.singleslotprice || gameConsole.price
    }

    onSlotSelect(selectedSlot)
  }

  if (uniqueTimes.length === 0) {
    return (
      <Card className="rounded-lg border border-border bg-muted/30 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No slots available</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="rounded-lg border border-border bg-muted/30 backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header */}
          <div
            className="grid gap-2 p-4 pb-3 bg-muted/50"
            style={{
              gridTemplateColumns: `80px repeat(${uniqueTimes.length}, minmax(110px, 1fr))`
            }}
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase">Date</div>
            {uniqueTimes.map((time) => (
              <div key={time} className="text-sm font-semibold text-foreground text-center">
                {time}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="border-t border-border">
            {dates.map((dateKey) => {
              const dateSlots = allSlots[dateKey] || []
              
              return (
                <div
                  key={dateKey}
                  className="grid gap-2 p-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                  style={{
                    gridTemplateColumns: `80px repeat(${uniqueTimes.length}, minmax(110px, 1fr))`
                  }}
                >
                  {/* Date Label */}
                  <div className="flex items-center text-sm font-semibold text-white bg-muted/50 rounded-lg px-2 py-2 justify-center">
                    {formatDateDisplay(dateKey)}
                  </div>

                  {/* Time Slots */}
                  {uniqueTimes.map((time) => {
                    const timeSlots: React.ReactNode[] = []

                    filteredConsoles.forEach((gameConsole) => {
                      const consoleSlots = Array.isArray(dateSlots)
                        ? dateSlots.filter((slot: any) => {
                            const slotStartTime = (slot.start_time || slot.starttime)?.slice(0, 5)
                            const slotConsoleId = slot.console_id || slot.consoleid
                            return slotStartTime === time && slotConsoleId === gameConsole.id
                          })
                        : []

                      if (consoleSlots.length === 0) return

                      const availableSlots = consoleSlots.filter((slot: any) => 
                        slot.is_available ?? slot.isavailable ?? true
                      )
                      
                      const bookedSlots = consoleSlots.filter((slot: any) => {
                        const isAvail = slot.is_available ?? slot.isavailable ?? true
                        return !isAvail
                      })

                      availableSlots.forEach((slot: any) => {
                        const slotId = slot.slot_id || slot.slotid
                        const isSelected = isSlotSelected(slotId, dateKey)
                        
                        timeSlots.push(
                          <button
                            key={`${dateKey}-${slotId}`}
                            onClick={() => handleSlotClick(dateKey, time, gameConsole)}
                            className={cn(
                              'w-full h-full min-h-[40px] flex items-center justify-center rounded-md text-xs font-semibold uppercase tracking-wide',
                              'transition-all duration-200 cursor-pointer',
                              isSelected
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg'
                                : 'bg-primary text-white hover:bg-primary'
                            )}
                          >
                            <span className="truncate">{gameConsole.name}</span>
                          </button>
                        )
                      })

                      bookedSlots.forEach((slot: any, index: number) => {
                        timeSlots.push(
                          <div
                            key={`booked-${dateKey}-${gameConsole.id}-${index}`}
                            className="w-full h-full min-h-[40px] flex items-center justify-center bg-red-600 text-white rounded-md"
                          >
                            <X className="h-5 w-5 stroke-[3]" />
                          </div>
                        )
                      })
                    })

                    return (
                      <div
                        key={`${dateKey}-${time}`}
                        className="flex flex-col gap-1 items-stretch h-full p-1 min-h-[44px] rounded-lg border border-border bg-muted/50 backdrop-blur-sm"
                      >
                        {timeSlots.length > 0 ? timeSlots : (
                          <div className="text-xs text-muted-foreground text-center py-2">-</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}
