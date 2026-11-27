/**
 * Price of one selected slot in the desk booking form.
 *
 * The booking service charges the offer that covers the slot's own date and
 * time. Slot listings now return that price (single_slot_price) next to the
 * undiscounted base_slot_price. The cafe's "active pricing" is only what is on
 * offer at this moment, so using it for a slot later today, or tomorrow,
 * showed one total while newBooking stored another.
 */
export interface PricedSlot {
  console_name: string
  console_price: number
  base_price?: number
}

export interface ActiveOffer {
  console_type: string
  price: number
  is_offer?: boolean
  offer_name?: string
}

export function activeEntry(slot: PricedSlot, activePricing: Record<string, ActiveOffer>): ActiveOffer | undefined {
  const name = slot.console_name.toLowerCase()
  return activePricing[name] || Object.values(activePricing).find(p => p.console_type.toLowerCase() === name)
}

export function slotUnitPrice(slot: PricedSlot, activePricing: Record<string, ActiveOffer>): number {
  // Schedule-aware listing price (booking service with base_slot_price).
  if (slot.base_price != null) return slot.console_price
  // Older booking service: keep the previous behaviour.
  const entry = activeEntry(slot, activePricing)
  return entry ? entry.price : slot.console_price
}

export function slotOffer(slot: PricedSlot, activePricing: Record<string, ActiveOffer>) {
  const entry = activeEntry(slot, activePricing)
  if (slot.base_price != null) {
    const isOffer = slot.console_price < slot.base_price
    return { isOffer, basePrice: slot.base_price, name: isOffer ? (entry?.is_offer && entry.offer_name) || "Offer" : undefined }
  }
  return { isOffer: !!entry?.is_offer, basePrice: slot.console_price, name: entry?.is_offer ? entry.offer_name : undefined }
}
