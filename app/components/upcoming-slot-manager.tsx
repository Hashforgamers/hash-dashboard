"use client"

import { useEffect, useMemo, useState } from 'react'
import { useApiClient } from '@/app/hooks/useApiClient'
import { BOOKING_URL } from '@/src/config/env'
import { SlotBookingForm } from './newSlot'

type SavedSlot = { booking_id: number; slot_id: number; game_id: number; status: string; date: string; start_time: string; end_time: string }

export default function UpcomingSlotManager({ booking, vendorId, onRemove, onChanged }: {
  booking: any; vendorId: string | number; onRemove: (booking: any) => void; onChanged: () => void
}) {
  const api = useApiClient()
  const [slots, setSlots] = useState<SavedSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<SavedSlot | null>(null)
  const [mode, setMode] = useState<'add' | 'edit' | null>(null)
  const [date, setDate] = useState('')
  const [choices, setChoices] = useState<any[]>([])
  const [choiceLoading, setChoiceLoading] = useState(false)
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)
  const [newSlots, setNewSlots] = useState<any[]>([])
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('rbac_access_token_v1') || localStorage.getItem('jwtToken') || ''}` })
  const customer = useMemo(() => ({ name: booking.username || '', phone: booking.customer_phone || booking.phone || booking.user_phone || '', email: booking.customer_email || booking.email || booking.user_email || '' }), [booking])
  const gameId = editing?.game_id || slots[0]?.game_id
  const consoleName = booking.consoleType || booking.system || booking.game || 'Console'

  useEffect(() => {
    const controller = new AbortController()
    const ids = booking.merged_booking_ids?.length ? booking.merged_booking_ids : [booking.bookingId]
    setLoading(true)
    Promise.all(ids.map((id: number) => api.get<{ slot: SavedSlot }>(`${BOOKING_URL}/api/vendor/${vendorId}/upcoming/${id}/slot`, { headers: headers(), signal: controller.signal, retries: 0 })))
      .then(rows => { if (!controller.signal.aborted) setSlots(rows.map(row => row.slot)) })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || 'Could not load booking slots.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [api, booking, vendorId])

  useEffect(() => {
    if (!mode || !date || !gameId) return
    const controller = new AbortController()
    setChoices([]); setSelected(''); setChoiceLoading(true)
    api.get<any>(`${BOOKING_URL}/api/getSlots/vendor/${vendorId}/game/${gameId}/${date.replaceAll('-', '')}?refresh=1`, { signal: controller.signal, retries: 0 })
      .then(data => { if (!controller.signal.aborted) setChoices((data.slots || []).filter((slot: any) => slot.is_available && !slots.some(existing => existing.date === date && existing.slot_id === slot.slot_id))) })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || 'Could not load available slots.') })
      .finally(() => { if (!controller.signal.aborted) setChoiceLoading(false) })
    return () => controller.abort()
  }, [api, date, gameId, mode, slots, vendorId])

  const open = (next: 'add' | 'edit', slot?: SavedSlot) => {
    setError(''); setEditing(slot || null); setMode(next); setDate(slot?.date || slots[0]?.date || ''); setSelected('')
  }
  const save = async () => {
    if (saving || !selected) return
    const target = choices.find(slot => String(slot.slot_id) === selected)
    if (!target) return
    if (mode === 'add') {
      setNewSlots([{ ...target, date, console_id: gameId, console_name: consoleName, console_price: Number(target.single_slot_price || 0), available_count: target.available_slot }])
      return
    }
    if (!editing) return
    setSaving(true); setError('')
    try {
      const result = await api.put<{ slot: SavedSlot }, string>(`${BOOKING_URL}/api/vendor/${vendorId}/upcoming/${editing.booking_id}/slot`, JSON.stringify({ slot_id: Number(selected), date }), { headers: headers(), retries: 0, timeoutMs: 15_000 })
      setSlots(prev => prev.map(slot => slot.booking_id === editing.booking_id ? result.slot : slot))
      setMode(null); onChanged()
    } catch (err: any) {
      setError(err.message || 'Confirmation did not arrive. Refresh booking details before retrying.')
    } finally { setSaving(false) }
  }

  return <section className="space-y-3 border-t border-slate-700 pt-4" aria-label="Booking slots">
    <div className="flex items-center justify-between"><h3 className="font-semibold">Slots</h3><button type="button" disabled={loading || !slots.length || saving} onClick={() => open('add')} className="rounded border border-cyan-700 px-3 py-1 text-cyan-300 disabled:opacity-40">+ Add slot</button></div>
    {loading && <p role="status">Loading slots…</p>}
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {slots.map(slot => <div key={slot.booking_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900 p-3">
      <span>{slot.date} · {slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}</span>
      <div className="flex gap-3"><button type="button" disabled={saving || slot.status !== 'confirmed'} onClick={() => open('edit', slot)} className="text-cyan-300 disabled:opacity-40">Edit</button><button type="button" disabled={saving || slot.status !== 'confirmed'} onClick={() => onRemove({ ...booking, bookingId: slot.booking_id, merged_booking_ids: [slot.booking_id] })} className="text-red-300 disabled:opacity-40">Remove</button></div>
    </div>)}
    {mode && <div className="space-y-3 rounded-lg border border-slate-600 p-3">
      <h4 className="font-semibold">{mode === 'add' ? 'Add another slot' : 'Move slot'}</h4>
      <p className="text-xs text-slate-400">{mode === 'add' ? 'Review the price and payment method on the next screen.' : 'Choose the same duration. The original paid amount is retained.'}</p>
      <label className="block">Date<input aria-label="Slot date" type="date" value={date} disabled={saving} onChange={e => setDate(e.target.value)} className="ml-3 rounded bg-slate-800 p-2" /></label>
      <label className="block">Time<select aria-label="Available slot" value={selected} disabled={saving || choiceLoading} onChange={e => setSelected(e.target.value)} className="ml-3 rounded bg-slate-800 p-2"><option value="">{choiceLoading ? 'Loading…' : 'Choose a slot'}</option>{choices.map(slot => <option key={slot.slot_id} value={slot.slot_id}>{slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}</option>)}</select></label>
      {!choiceLoading && !choices.length && <p>No available slots for this date.</p>}
      <div className="flex gap-3"><button type="button" disabled={saving || choiceLoading || !selected} onClick={save} className="rounded bg-cyan-700 px-3 py-2 disabled:opacity-40">{saving ? 'Saving…' : mode === 'add' ? 'Continue to booking' : 'Save slot'}</button><button type="button" disabled={saving} onClick={() => setMode(null)}>Cancel</button></div>
    </div>}
    {newSlots.length > 0 && <SlotBookingForm isOpen overlayZIndex={1200} initialCustomer={customer} selectedSlots={newSlots} onClose={() => setNewSlots([])} onRemoveSelectedSlot={slot => setNewSlots(prev => prev.filter(s => s.slot_id !== slot.slot_id))} onSlotSelect={slot => setNewSlots(prev => [...prev, slot])} allSlots={{ [date]: choices.map(slot => ({ ...slot, console_id: gameId })) }} availableConsoles={[{ id: gameId, name: consoleName, type: consoleName, price: newSlots[0].console_price } as any]} onBookingComplete={(result) => {
        setNewSlots([]); setMode(null); onChanged()
        Promise.all((result?.booking_ids || []).map((id: number) => api.get<{slot: SavedSlot}>(`${BOOKING_URL}/api/vendor/${vendorId}/upcoming/${id}/slot`, {headers: headers(), retries: 0})))
          .then(rows => setSlots(prev => [...prev, ...rows.map(row => row.slot)]))
          .catch(() => setError('Slot added. Reopen booking details to refresh the list.'))
      }} />}
  </section>
}
