// hooks/useUserSuggestions.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { bookingService } from '../services/api/bookingService'
import type { UserSuggestion } from '../types/booking.types'

const USER_CACHE_KEY = 'userList'
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

export const useUserSuggestions = (vendorId: number | null, isOpen: boolean) => {
  const [userList, setUserList] = useState<UserSuggestion[]>([])
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([])
  const [focusedField, setFocusedField] = useState<string>('')
  
  const blurTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isOpen || !vendorId) return

    const loadUsers = async () => {
      // Check cache first
      const cached = localStorage.getItem(USER_CACHE_KEY)
      
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached)
          
          if (Date.now() - timestamp < CACHE_DURATION) {
            setUserList(data)
            console.log('✅ Using cached user data')
            return
          }
        } catch (err) {
          console.error('❌ Cache parse error:', err)
        }
      }

      // Fetch fresh data
      try {
        const users = await bookingService.fetchUsers(vendorId)
        setUserList(users)
        
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify({
          data: users,
          timestamp: Date.now()
        }))
        
        console.log('✅ User data fetched and cached')
      } catch (error) {
        console.error('❌ Error loading users:', error)
      }
    }

    loadUsers()
  }, [isOpen, vendorId])

  const getSuggestions = useCallback((field: keyof UserSuggestion, value: string) => {
    if (!value.trim()) return userList

    return userList.filter(user =>
      user[field].toLowerCase().includes(value.toLowerCase())
    )
  }, [userList])

  const handleInputChange = useCallback((field: keyof UserSuggestion, value: string) => {
    const filtered = getSuggestions(field, value)
    setSuggestions(filtered)
    setFocusedField(field)
  }, [getSuggestions])

  const handleFocus = useCallback((field: string, value: string) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    
    const filtered = getSuggestions(field as keyof UserSuggestion, value)
    setSuggestions(filtered)
    setFocusedField(field)
  }, [getSuggestions])

  const handleBlur = useCallback(() => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setSuggestions([])
      setFocusedField('')
    }, 150)
  }, [])

  const handleSuggestionClick = useCallback((user: UserSuggestion) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }
    
    setSuggestions([])
    setFocusedField('')
    
    return user
  }, [])

  return {
    suggestions,
    focusedField,
    handleInputChange,
    handleFocus,
    handleBlur,
    handleSuggestionClick
  }
}
