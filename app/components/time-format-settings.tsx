"use client"

import { useState } from "react"
import { useAccess } from "@/app/context/AccessContext"
import { useTimeFormat } from "@/app/hooks/useTimeFormat"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatMinutes, type TimeFormat } from "@/lib/time-format"

const OPTIONS: { value: TimeFormat; title: string; sample: string }[] = [
  { value: "12h", title: "12-hour (AM/PM)", sample: `${formatMinutes(9 * 60 + 30, "12h")} · ${formatMinutes(21 * 60 + 30, "12h")}` },
  { value: "24h", title: "24-hour", sample: `${formatMinutes(9 * 60 + 30, "24h")} · ${formatMinutes(21 * 60 + 30, "24h")}` },
]

export function TimeFormatSettings() {
  const { selectedCafeId } = useAccess()
  const { format, setFormat } = useTimeFormat()
  const [message, setMessage] = useState("")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time format</CardTitle>
        <CardDescription>
          Choose how booking times are shown and typed in this dashboard: slots, new bookings, booking lists, live sessions and receipts.
          Only the display changes. Bookings, the gamer app and kiosks are not affected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedCafeId ? <p className="text-sm text-muted-foreground">Select a café to choose a time format.</p> : <>
          <div role="radiogroup" aria-label="Time format" className="grid gap-3 sm:grid-cols-2">
            {OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={format === option.value}
                onClick={() => {
                  setFormat(option.value)
                  setMessage(`Saved. Booking times now show in ${option.title.toLowerCase()} format for this café on this device.`)
                }}
                className={cn(
                  "rounded-md border p-4 text-left transition-colors",
                  format === option.value ? "border-blue-400/60 bg-blue-500/15" : "hover:bg-white/5",
                )}
              >
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="mt-1 block font-mono text-lg">{option.sample}</span>
              </button>
            ))}
          </div>
          {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        </>}
      </CardContent>
    </Card>
  )
}
