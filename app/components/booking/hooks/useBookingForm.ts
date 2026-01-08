// hooks/useBookingForm.ts
import { useReducer, useCallback, useMemo } from 'react'
import { validateBookingForm } from '../utils/validators'
import type { BookingFormState, BookingFormAction, SelectedSlot } from '../types/booking.types'

const initialState: BookingFormState = {
  name: '',
  email: '',
  phone: '',
  paymentType: 'Cash',
  passUid: '',
  validatedPass: null,
  isPrivateMode: false,
  waiveOffAmount: 0,
  extraControllerFare: 0,
  selectedMeals: [],
  errors: {}
}

function formReducer(state: BookingFormState, action: BookingFormAction): BookingFormState {
  switch (action.type) {
    case 'SET_FIELD':
      console.log(`📝 Field updated: ${action.field} =`, action.value)
      return { 
        ...state, 
        [action.field]: action.value,
        errors: { ...state.errors, [action.field]: '' }
      }
    
    case 'SET_ERRORS':
      console.log('❌ Validation errors:', action.errors)
      return { ...state, errors: action.errors }
    
    case 'SET_VALIDATED_PASS':
      console.log('✅ Pass validated:', action.pass)
      return { 
        ...state, 
        validatedPass: action.pass,
        errors: { ...state.errors, pass: '' }
      }
    
    case 'TOGGLE_PRIVATE_MODE':
      console.log('🔄 Private mode toggled:', !state.isPrivateMode)
      return { ...state, isPrivateMode: !state.isPrivateMode }
    
    case 'SET_MEALS':
      console.log('🍽️ Meals updated:', action.meals)
      return { ...state, selectedMeals: action.meals }
    
    case 'RESET_FORM':
      console.log('🔄 Form reset')
      return initialState
    
    default:
      return state
  }
}

export const useBookingForm = (selectedSlots: SelectedSlot[]) => {
  const [state, dispatch] = useReducer(formReducer, initialState)

  const setField = useCallback((field: string, value: any) => {
    dispatch({ type: 'SET_FIELD', field, value })
  }, [])

  const setValidatedPass = useCallback((pass: any) => {
    dispatch({ type: 'SET_VALIDATED_PASS', pass })
  }, [])

  const togglePrivateMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_PRIVATE_MODE' })
  }, [])

  const setMeals = useCallback((meals: any[]) => {
    dispatch({ type: 'SET_MEALS', meals })
  }, [])

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM' })
  }, [])

  const validate = useCallback((): boolean => {
    const errors = validateBookingForm({
      name: state.name,
      email: state.email,
      phone: state.phone,
      paymentType: state.paymentType,
      validatedPass: state.validatedPass,
      selectedSlots
    })

    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors })
      return false
    }
    
    console.log('✅ Validation passed')
    return true
  }, [state, selectedSlots])

  return {
    state,
    setField,
    setValidatedPass,
    togglePrivateMode,
    setMeals,
    resetForm,
    validate,
    dispatch
  }
}
