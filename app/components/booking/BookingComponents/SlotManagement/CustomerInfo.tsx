// components/SlotManagement/SlotBookingForm/CustomerInfo.tsx
import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import type { UserSuggestion } from '../../types/booking.types'

interface CustomerInfoProps {
  name: string
  email: string
  phone: string
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPhoneChange: (value: string) => void
  suggestions: UserSuggestion[]
  focusedField: string
  onFocus: (field: string, value: string) => void
  onBlur: () => void
  onSuggestionSelect: (user: UserSuggestion) => void
  errors: Record<string, string>
}

export const CustomerInfo = memo(({
  name,
  email,
  phone,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  suggestions,
  focusedField,
  onFocus,
  onBlur,
  onSuggestionSelect,
  errors
}: CustomerInfoProps) => {
  return (
    <Card className="p-6 bg-gray-50 dark:bg-gray-700/30">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded">
          <User className="w-4 h-4 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Customer Information</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Email Input */}
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onFocus={() => onFocus('email', email)}
            onBlur={onBlur}
            autoComplete="off"
            placeholder="Email"
            className={cn(
              'w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border rounded-lg transition-all duration-200',
              errors.email
                ? 'border-red-500 focus:border-red-500'
                : focusedField === 'email'
                ? 'border-emerald-500 focus:border-emerald-500'
                : 'border-gray-300 dark:border-gray-600 focus:border-emerald-500',
              'focus:outline-none focus:ring-1 focus:ring-emerald-500/20'
            )}
          />
          <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          
          <AnimatePresence>
            {focusedField === 'email' && suggestions.length > 0 && (
              <SuggestionList
                suggestions={suggestions}
                onSelect={onSuggestionSelect}
              />
            )}
          </AnimatePresence>
          
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        {/* Phone Input */}
        <div className="relative">
          <input
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            onFocus={() => onFocus('phone', phone)}
            onBlur={onBlur}
            autoComplete="off"
            placeholder="Phone"
            className={cn(
              'w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border rounded-lg transition-all duration-200',
              errors.phone
                ? 'border-red-500 focus:border-red-500'
                : focusedField === 'phone'
                ? 'border-emerald-500 focus:border-emerald-500'
                : 'border-gray-300 dark:border-gray-600 focus:border-emerald-500',
              'focus:outline-none focus:ring-1 focus:ring-emerald-500/20'
            )}
          />
          <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          
          <AnimatePresence>
            {focusedField === 'phone' && suggestions.length > 0 && (
              <SuggestionList
                suggestions={suggestions}
                onSelect={onSuggestionSelect}
              />
            )}
          </AnimatePresence>
          
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>

        {/* Name Input */}
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onFocus={() => onFocus('name', name)}
            onBlur={onBlur}
            placeholder="Full name"
            className={cn(
              'w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border rounded-lg transition-all duration-200',
              errors.name
                ? 'border-red-500 focus:border-red-500'
                : focusedField === 'name'
                ? 'border-emerald-500 focus:border-emerald-500'
                : 'border-gray-300 dark:border-gray-600 focus:border-emerald-500',
              'focus:outline-none focus:ring-1 focus:ring-emerald-500/20'
            )}
          />
          <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          
          <AnimatePresence>
            {focusedField === 'name' && suggestions.length > 0 && (
              <SuggestionList
                suggestions={suggestions}
                onSelect={onSuggestionSelect}
              />
            )}
          </AnimatePresence>
          
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>
      </div>
    </Card>
  )
})

CustomerInfo.displayName = 'CustomerInfo'

// Suggestion List Component
const SuggestionList = memo(({ 
  suggestions, 
  onSelect 
}: { 
  suggestions: UserSuggestion[]
  onSelect: (user: UserSuggestion) => void 
}) => (
  <motion.ul
    initial={{ opacity: 0, y: -5 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -5 }}
    className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full mt-1 max-h-40 overflow-y-auto"
  >
    {suggestions.slice(0, 5).map((user, idx) => (
      <motion.li
        key={idx}
        whileHover={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
        className="px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
        onMouseDown={() => onSelect(user)}
      >
        <div className="flex items-center gap-2">
          <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
            <User className="w-3 h-3 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-gray-800 dark:text-white text-sm">{user.name}</p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">{user.email}</p>
          </div>
        </div>
      </motion.li>
    ))}
  </motion.ul>
))

SuggestionList.displayName = 'SuggestionList'
