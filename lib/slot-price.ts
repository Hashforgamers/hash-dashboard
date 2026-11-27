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

/**
 * Discount for time already gone in a started slot, for the whole session.
 *
 * calculateAutoWaiveOff measures the elapsed share on one console's slot price
 * (unitTotal). A PC squad pays unitTotal x players (less the squad discount),
 * so the old one-player figure under-discounted: 3 players at Rs 60, half the
 * slot gone, got Rs 30 off a Rs 180 session instead of Rs 90.
 */
export function elapsedDiscountForSession(unitDiscount: number, unitTotal: number, sessionNet: number): number {
  if (!(unitDiscount > 0) || !(unitTotal > 0) || !(sessionNet > 0)) return 0
  return Math.min(sessionNet, Math.round(unitDiscount * sessionNet / unitTotal * 100) / 100)
}
