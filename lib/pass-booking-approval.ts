import { BOOKING_URL } from '@/src/config/env'
import { creditAuthHeaders } from '@/lib/credit-auth'
import { httpJson } from '@/lib/http-client'

/** Customer approval for the older booking forms; debit happens with booking creation. */
export async function approvePassBooking(vendorId: number, passUid: string): Promise<string> {
  const post = (path: string, body: object) => httpJson<any>(`${BOOKING_URL}/api${path}`, {
    method: 'POST', headers: creditAuthHeaders(), body: JSON.stringify(body), retries: 0, timeoutMs: 15000,
  })
  const validated = await post('/pass/validate', { vendor_id: vendorId, pass_uid: passUid })
  if (!validated.valid || !validated.pass?.user_id) throw new Error(validated.error || 'Pass is not valid')
  const sent = await post('/pass/dashboard/otp/send', {
    vendor_id: vendorId, user_id: validated.pass.user_id, pass_uid: passUid,
  })
  const code = window.prompt(`Enter the customer's pass approval code sent to ${sent.masked_email || 'their registered email'}.`)
  if (!code?.trim()) throw new Error('Pass approval was cancelled. No hours were deducted.')
  const verified = await post('/pass/dashboard/otp/verify', { otp_request_id: sent.otp_request_id, otp: code.trim() })
  if (!verified.pass_verification_token) throw new Error(verified.message || 'Unable to verify pass approval')
  return verified.pass_verification_token
}
