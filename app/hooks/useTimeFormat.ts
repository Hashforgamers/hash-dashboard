"use client"

import { useCallback, useEffect, useState } from "react"
import { useAccess } from "@/app/context/AccessContext"
import {
  DEFAULT_TIME_FORMAT,
  TIME_FORMAT_EVENT,
  formatClock,
  formatClockRange,
  readTimeFormat,
  timeFormatStorageKey,
  writeTimeFormat,
  type TimeFormat,
} from "@/lib/time-format"

/** The selected cafe's 12/24-hour preference, live across tabs and components. */
export function useTimeFormat() {
  const { selectedCafeId } = useAccess()
  const [format, setFormatState] = useState<TimeFormat>(DEFAULT_TIME_FORMAT)

  useEffect(() => {
    setFormatState(readTimeFormat(selectedCafeId))
    if (!selectedCafeId) return
    const onLocal = (event: Event) => {
      const detail = (event as CustomEvent<{ cafeId: string; format: TimeFormat }>).detail
      if (detail?.cafeId === selectedCafeId) setFormatState(detail.format)
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === timeFormatStorageKey(selectedCafeId)) setFormatState(readTimeFormat(selectedCafeId))
    }
    window.addEventListener(TIME_FORMAT_EVENT, onLocal)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener(TIME_FORMAT_EVENT, onLocal)
      window.removeEventListener("storage", onStorage)
    }
  }, [selectedCafeId])

  const setFormat = useCallback((next: TimeFormat) => {
    setFormatState(next)
    if (selectedCafeId) writeTimeFormat(selectedCafeId, next)
  }, [selectedCafeId])

  const time = useCallback((value: unknown, fallback?: string) => formatClock(value, format, { fallback }), [format])
  const range = useCallback((value: unknown) => formatClockRange(value, format), [format])

  return { format, setFormat, is24h: format === "24h", time, range }
}
