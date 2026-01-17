// hooks/usePassValidation.ts
import { useState, useCallback } from 'react'
import { bookingService } from '../services/api/bookingService'
import type { Pass } from '../types/booking.types'

export const usePassValidation = (vendorId: number | null) => {
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState('')

  const validate = useCallback(async (passUid: string, requiredHours: number): Promise<Pass | null> => {
    if (!vendorId || !passUid.trim()) return null

    setIsValidating(true)
    setError('')

    try {
      const result = await bookingService.validatePass(vendorId, passUid)

      if (result.valid && result.pass) {
        if (requiredHours > result.pass.remaining_hours) {
          setError(`Insufficient hours. Need ${requiredHours} hrs, available ${result.pass.remaining_hours} hrs`)
          return null
        }
        
        return result.pass
      } else {
        setError(result.error || 'Invalid pass')
        return null
      }
    } catch (err) {
      setError('Failed to validate pass')
      return null
    } finally {
      setIsValidating(false)
    }
  }, [vendorId])

  return { validate, isValidating, error, setError }
}
