// types/booking.types.ts
export type ConsoleFilter = "PC" | "PS5" | "Xbox" | "VR"
export type PaymentType = 'Cash' | 'UPI' | 'Pass'

export interface ConsoleType {
  id: number
  type: ConsoleFilter
  name: string
  price: number
  icon?: string
}

export interface SelectedSlot {
  slot_id: number
  date: string
  start_time: string
  end_time: string
  console_id: number
  console_name: string
  console_price: number
}

export interface SelectedMeal {
  menu_item_id: number
  name: string
  price: number
  quantity: number
  total: number
  category: string
}

export interface UserSuggestion {
  name: string
  email: string
  phone: string
}

export interface Pass {
  pass_uid: string
  remaining_hours: number
  user_name: string
  user_email: string
  user_phone: string
}

export interface SlotData {
  [date: string]: {
    [consoleId: number]: Array<{
      slot_id: number
      start_time: string
      end_time: string
      status: string
      price: number
    }>
  }
}

export interface BookingFormState {
  name: string
  email: string
  phone: string
  paymentType: PaymentType
  passUid: string
  validatedPass: Pass | null
  isPrivateMode: boolean
  waiveOffAmount: number
  extraControllerFare: number
  selectedMeals: SelectedMeal[]
  errors: Record<string, string>
}

export type BookingFormAction =
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'SET_VALIDATED_PASS'; pass: Pass | null }
  | { type: 'TOGGLE_PRIVATE_MODE' }
  | { type: 'SET_MEALS'; meals: SelectedMeal[] }
  | { type: 'RESET_FORM' }

export interface BookingPayload {
  consoleType: string
  name: string
  email: string
  phone: string
  bookedDate: string
  slotId: number[]
  paymentType: PaymentType
  waiveOffAmount: number
  extraControllerFare: number
  selectedMeals: Array<{ menu_item_id: number; quantity: number }>
  bookingMode: 'private' | 'regular'
}
