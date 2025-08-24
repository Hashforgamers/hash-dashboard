"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check, Clock, IndianRupee, User, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BOOKING_URL } from '@/src/config/env'

interface PayAtCafeNotification {
  event_id: string
  emitted_at: string
  bookingId: number
  slotId: number
  vendorId: number
  userId: number
  username: string
  game: {
    vendor_id: number
    single_slot_price: number
    game_name: string
  }
  game_id: number
  consoleType: string
  consoleNumber: string
  date: string
  slot_price: {
    vendor_id: number
    single_slot_price: number
    game_name: string
  }
  status: string
  statusLabel: string
  booking_status: string
  time: string
  processed_time: string
}

interface NotificationPanelProps {
  vendorId: number | null
  isOpen: boolean
  onClose: () => void
  notifications: PayAtCafeNotification[]
  onRemoveNotification: (bookingId: number) => void
}

export function NotificationPanel({ 
  vendorId, 
  isOpen, 
  onClose,
  notifications,
  onRemoveNotification
}: NotificationPanelProps) {
  const [processingBookings, setProcessingBookings] = useState<Set<number>>(new Set())

  // Accept booking using separate API
  const handleAccept = async (notification: PayAtCafeNotification) => {
    if (processingBookings.has(notification.bookingId)) return
    
    try {
      setProcessingBookings(prev => new Set([...prev, notification.bookingId]))
      
      const response = await fetch(`${BOOKING_URL}/api/pay-at-cafe/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: notification.bookingId,
          vendor_id: vendorId
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        onRemoveNotification(notification.bookingId)
        showToast('✅ Booking accepted and confirmed! Customer can visit the cafe.', 'success')
        console.log(`✅ Booking ${notification.bookingId} confirmed successfully`)
      } else {
        throw new Error(result.message || 'Failed to accept booking')
      }
    } catch (error) {
      console.error('Error accepting booking:', error)
      showToast('❌ Error accepting booking. Please try again.', 'error')
    } finally {
      setProcessingBookings(prev => {
        const newSet = new Set(prev)
        newSet.delete(notification.bookingId)
        return newSet
      })
    }
  }

  // Reject booking using separate API (NO PROMPT - DIRECT REJECTION)
  const handleReject = async (notification: PayAtCafeNotification) => {
    if (processingBookings.has(notification.bookingId)) return
    
    // No prompt - directly reject with default reason
    const reason = 'Rejected by vendor'
    
    try {
      setProcessingBookings(prev => new Set([...prev, notification.bookingId]))
      
      const response = await fetch(`${BOOKING_URL}/api/pay-at-cafe/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: notification.bookingId,
          vendor_id: vendorId,
          rejection_reason: reason
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        onRemoveNotification(notification.bookingId)
        showToast('✅ Booking rejected and cancelled successfully!', 'success')
        console.log(`❌ Booking ${notification.bookingId} cancelled successfully`)
      } else {
        throw new Error(result.message || 'Failed to reject booking')
      }
    } catch (error) {
      console.error('Error rejecting booking:', error)
      showToast('❌ Error rejecting booking. Please try again.', 'error')
    } finally {
      setProcessingBookings(prev => {
        const newSet = new Set(prev)
        newSet.delete(notification.bookingId)
        return newSet
      })
    }
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-xl z-[10000] text-white font-medium transform transition-all duration-300 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
        <span>${message}</span>
      </div>
    `
    
    document.body.appendChild(toast)
    setTimeout(() => document.body.removeChild(toast), 4000)
  }

  // Format booking date for display
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-IN', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric'
      })
    }
  }

  const notificationCount = notifications.length

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />
          
          {/* Notification Panel */}
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-16 right-4 left-4 md:left-auto md:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 max-h-[85vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Pay at Cafe Requests</h3>
                {notificationCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {notificationCount}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-full hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                    <Bell className="w-8 h-8 text-muted-foreground opacity-50" />
                  </div>
                  <h4 className="font-medium text-foreground mb-2">No payment requests</h4>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    When customers choose "Pay at Cafe" for their bookings, you'll see their requests here for approval.
                  </p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification, index) => {
                    const isProcessing = processingBookings.has(notification.bookingId)
                    
                    return (
                      <motion.div
                        key={notification.event_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 ${index !== notifications.length - 1 ? 'border-b border-border' : ''} ${
                          isProcessing ? 'opacity-75 pointer-events-none' : ''
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">Pay at Cafe Request</p>
                              <p className="text-xs text-muted-foreground">
                                {formatRelativeTime(notification.emitted_at)}
                              </p>
                            </div>
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                          </div>

                          {/* Customer Name */}
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">{notification.username}</span>
                            <span className="text-xs text-muted-foreground">wants to book</span>
                          </div>

                          {/* Time and Date */}
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-foreground">{notification.time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className="text-foreground">{formatDisplayDate(notification.date)}</span>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground text-center mb-1">
                              Amount to be collected at cafe
                            </p>
                            <div className="text-center">
                              <span className="text-2xl font-bold text-green-600">
                                ₹{notification.game.single_slot_price}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAccept(notification)}
                              disabled={isProcessing}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9 text-sm"
                            >
                              {isProcessing ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              ) : (
                                <Check className="w-4 h-4 mr-2" />
                              )}
                              Accept
                            </Button>
                            <Button
                              onClick={() => handleReject(notification)}
                              disabled={isProcessing}
                              variant="destructive"
                              className="flex-1 h-9 text-sm"
                            >
                              {isProcessing ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              ) : (
                                <X className="w-4 h-4 mr-2" />
                              )}
                              Reject
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
