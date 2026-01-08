// hooks/useSlotData.ts
import { useState, useEffect, useRef, useMemo } from 'react'
import { slotService } from '../services/api/slotService'
import { getNext3Days } from '../utils/dataHelpers'
import type { ConsoleType, SlotData } from '../types/booking.types'

export const useSlotData = (vendorId: number | null) => {
  const [consoles, setConsoles] = useState<ConsoleType[]>([])
  const [slots, setSlots] = useState<SlotData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const hasFetchedRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const dates = useMemo(() => getNext3Days(), [])

  const fetchData = async () => {
    if (!vendorId) return
    
    hasFetchedRef.current = true
    abortControllerRef.current = new AbortController()
    
    try {
      setIsLoading(true)
      setError(null)
      
      const [consolesData] = await Promise.all([
        slotService.fetchConsoles(vendorId)
      ])
      
      setConsoles(consolesData)
      
      // Fetch slots for all consoles
      const gameIds = consolesData.map(c => c.id)
      const slotsData = await slotService.fetchSlotsBatch(vendorId, gameIds, dates)
      
      setSlots(slotsData)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err)
        console.error('❌ Error in useSlotData:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!vendorId || hasFetchedRef.current) return
    
    fetchData()

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [vendorId])

  const refetch = () => {
    hasFetchedRef.current = false
    fetchData()
  }

  return { consoles, slots, isLoading, error, refetch, dates }
}
