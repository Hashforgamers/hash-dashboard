"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { useTimeFormat } from "@/app/hooks/useTimeFormat"
import type { TimeFormat } from "@/lib/time-format"

type TimeFieldProps = {
  /** Always "HH:mm" (24-hour), the same value a native time input gives, or "". */
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  minuteStep?: number
  "aria-label"?: string
  id?: string
  /** Force a format; defaults to the cafe's dashboard setting. */
  format?: TimeFormat
}

const pad = (n: number) => String(n).padStart(2, "0")

function split(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value || "")
  if (!match) return { hour: null as number | null, minute: null as number | null }
  return { hour: Number(match[1]) % 24, minute: Number(match[2]) }
}

/**
 * Time entry that follows the cafe's 12/24-hour setting instead of the
 * browser's locale (a native <input type="time"> ignores the setting).
 * Uses plain selects so it behaves the same on every desktop and tablet browser.
 */
export function TimeField({ value, onValueChange, disabled, className, minuteStep = 5, id, format: forced, ...rest }: TimeFieldProps) {
  const { format: cafeFormat } = useTimeFormat()
  const format = forced ?? cafeFormat
  const parsed = split(value)
  const [hour, setHour] = useState<number | null>(parsed.hour)
  const [minute, setMinute] = useState<number | null>(parsed.minute)
  const [meridiem, setMeridiem] = useState<"AM" | "PM">(parsed.hour !== null && parsed.hour >= 12 ? "PM" : "AM")

  useEffect(() => {
    const next = split(value)
    setHour(next.hour)
    setMinute(next.minute)
    if (next.hour !== null) setMeridiem(next.hour >= 12 ? "PM" : "AM")
  }, [value])

  const minutes = useMemo(() => {
    const step = Math.max(1, Math.min(30, Math.floor(minuteStep)))
    const list: number[] = []
    for (let m = 0; m < 60; m += step) list.push(m)
    if (minute !== null && !list.includes(minute)) list.push(minute)
    return list.sort((a, b) => a - b)
  }, [minuteStep, minute])

  const emit = (h: number | null, m: number | null) => {
    setHour(h)
    setMinute(m)
    if (h !== null) onValueChange(`${pad(h)}:${pad(m ?? 0)}`)
  }

  const selectClass = "h-9 rounded-lg border border-transparent bg-[rgba(118,118,128,0.18)] px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
  const label = rest["aria-label"] || "Time"
  const hour12 = hour === null ? "" : String(hour % 12 || 12)

  return (
    <div id={id} role="group" aria-label={label} className={cn("inline-flex items-center gap-1", className)}>
      {format === "24h" ? (
        <select aria-label={`${label} hour`} className={selectClass} disabled={disabled} value={hour === null ? "" : String(hour)}
          onChange={(e) => emit(e.target.value === "" ? null : Number(e.target.value), minute)}>
          {hour === null && <option value="">--</option>}
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{pad(h)}</option>)}
        </select>
      ) : (
        <select aria-label={`${label} hour`} className={selectClass} disabled={disabled} value={hour12}
          onChange={(e) => {
            if (e.target.value === "") return emit(null, minute)
            const h12 = Number(e.target.value) % 12
            emit(h12 + (meridiem === "PM" ? 12 : 0), minute)
          }}>
          {hour === null && <option value="">--</option>}
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      )}
      <span aria-hidden className="text-muted-foreground">:</span>
      <select aria-label={`${label} minute`} className={selectClass} disabled={disabled} value={minute === null ? "" : String(minute)}
        onChange={(e) => emit(hour, e.target.value === "" ? null : Number(e.target.value))}>
        {minute === null && <option value="">--</option>}
        {minutes.map((m) => <option key={m} value={m}>{pad(m)}</option>)}
      </select>
      {format === "12h" && (
        <select aria-label={`${label} AM or PM`} className={selectClass} disabled={disabled} value={meridiem}
          onChange={(e) => {
            const next = e.target.value === "PM" ? "PM" : "AM"
            setMeridiem(next)
            if (hour !== null) emit((hour % 12) + (next === "PM" ? 12 : 0), minute)
          }}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      )}
    </div>
  )
}
