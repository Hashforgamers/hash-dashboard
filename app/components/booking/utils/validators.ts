// utils/validators.ts
export const isValidEmail = (email: string): boolean => {
  return /\S+@\S+\.\S+/.test(email)
}

export const isValidPhone = (phone: string): boolean => {
  return /^\d{10}$/.test(phone)
}

export const validateBookingForm = (data: {
  name: string
  email: string
  phone: string
  paymentType: string
  validatedPass: any
  selectedSlots: any[]
}): Record<string, string> => {
  const errors: Record<string, string> = {}

  if (!data.name.trim()) {
    errors.name = 'Name is required'
  }

  if (!data.email.trim()) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Invalid email format'
  }

  if (!data.phone.trim()) {
    errors.phone = 'Phone is required'
  } else if (!isValidPhone(data.phone)) {
    errors.phone = 'Phone must be 10 digits'
  }

  if (data.selectedSlots.length === 0) {
    errors.slots = 'Please select at least one slot'
  }

  if (data.paymentType === 'Pass' && !data.validatedPass) {
    errors.pass = 'Please validate the pass first'
  }

  return errors
}
