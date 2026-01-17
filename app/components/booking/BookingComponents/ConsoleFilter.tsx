// components/SlotManagement/ConsoleFilter.tsx
import React from 'react'
import { Monitor, MonitorPlay, Gamepad, Headset } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ConsoleFilter as ConsoleFilterType } from '../types/booking.types'

interface ConsoleFilterProps {
  selectedConsole: ConsoleFilterType
  onConsoleChange: (console: ConsoleFilterType) => void
}

const CONSOLE_OPTIONS = [
  { type: 'PC' as ConsoleFilterType, icon: Monitor, label: 'PC Gaming' },
  { type: 'PS5' as ConsoleFilterType, icon: MonitorPlay, label: 'PlayStation 5' },
  { type: 'Xbox' as ConsoleFilterType, icon: Gamepad, label: 'Xbox Series' },
  { type: 'VR' as ConsoleFilterType, icon: Headset, label: 'VR Gaming' }
]

export const ConsoleFilter = ({ selectedConsole, onConsoleChange }: ConsoleFilterProps) => {
  return (
    <Card className="rounded-xl border border-gray-700 bg-gray-800/50 backdrop-blur-sm p-4 mb-6">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-400 uppercase">Select Console</span>
        
        <div className="flex flex-wrap items-center gap-2">
          {CONSOLE_OPTIONS.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => onConsoleChange(type)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium uppercase',
                'transition-all duration-200',
                selectedConsole === type
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {type}
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}
