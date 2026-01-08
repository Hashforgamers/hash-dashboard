// services/api/bookingService.ts
import { BOOKING_URL } from '../../../../../src/config/env'
import type { BookingPayload, UserSuggestion, Pass } from '../../types/booking.types'

class BookingService {
  private baseURL = BOOKING_URL

  async createBooking(vendorId: number, payload: BookingPayload) {
    try {
      const response = await fetch(`${this.baseURL}/api/newBooking/vendor/${vendorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Failed to create booking')
      }

      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Booking created successfully')
        
        // Dispatch event for dashboard refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('refresh-dashboard'))
        }
      }
      
      return result
    } catch (error) {
      console.error('❌ Error creating booking:', error)
      throw error
    }
  }

  async fetchUsers(vendorId: number): Promise<UserSuggestion[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/vendor/${vendorId}/users`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      
      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      return []
    }
  }

  async validatePass(vendorId: number, passUid: string): Promise<{ valid: boolean; pass?: Pass; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/pass/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass_uid: passUid.trim(), vendor_id: vendorId })
      })

      const data = await response.json()
      
      if (response.ok && data.valid) {
        return { valid: true, pass: data.pass }
      }
      
      return { valid: false, error: data.error || 'Invalid pass' }
    } catch (error) {
      console.error('❌ Error validating pass:', error)
      return { valid: false, error: 'Failed to validate pass' }
    }
  }

  async redeemPass(vendorId: number, passUid: string, hoursToDeduct: number, sessionStart: string, sessionEnd: string, notes: string) {
    try {
      const response = await fetch(`${this.baseURL}/api/pass/redeem/dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pass_uid: passUid.trim(),
          vendor_id: vendorId,
          hours_to_deduct: hoursToDeduct,
          session_start: sessionStart,
          session_end: sessionEnd,
          notes
        })
      })

      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to redeem pass')
      }
      
      return data
    } catch (error) {
      console.error('❌ Error redeeming pass:', error)
      throw error
    }
  }
}

export const bookingService = new BookingService()
