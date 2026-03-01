"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check, Clock, User, Calendar, Wallet } from 'lucide-react'
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
  socket?: any
  onBookingAccepted?: (bookingData: any) => void
}


export function NotificationPanel({
  vendorId,
  isOpen,
  onClose,
  notifications,
  onRemoveNotification,
  socket,
  onBookingAccepted
}: NotificationPanelProps) {
  const [processingAction, setProcessingAction] = useState<{
    bookingId: number | null
    action: 'accept' | 'reject' | null
  }>({
    bookingId: null,
    action: null
  })


  const handleAccept = async (notification: PayAtCafeNotification) => {
    if (processingAction.bookingId) return

    try {
      setProcessingAction({ bookingId: notification.bookingId, action: 'accept' })

      console.log(`🔄 Processing accept for booking ${notification.bookingId}`)

      const response = await fetch(`${BOOKING_URL}/api/pay-at-cafe/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: notification.bookingId,
          vendor_id: vendorId
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        onRemoveNotification(notification.bookingId)

        if (socket) {
          console.log('📡 Emitting booking_accepted event for real-time update')
          socket.emit('booking_accepted', {
            bookingId:      notification.bookingId,
            vendorId:       vendorId,
            userId:         notification.userId,
            username:       notification.username,
            game_id:        notification.game_id,
            consoleType:    notification.consoleType,
            date:           notification.date,
            time:           notification.time,
            status:         'Confirmed',
            booking_status: 'upcoming'
          })
        }

        if (onBookingAccepted) {
          const bookingData = {
            bookingId:   notification.bookingId,
            slotId:      notification.slotId,
            username:    notification.username,
            userId:      notification.userId,
            game:        notification.game.game_name,
            game_id:     notification.game_id,
            consoleType: notification.consoleType,
            date:        notification.date,
            time:        notification.time,
            status:      'Confirmed',
            statusLabel: 'Confirmed'
          }
          console.log('📅 Triggering upcoming bookings update with:', bookingData)
          onBookingAccepted(bookingData)
        }

        // ✅ UPDATED: Toast correctly says payment is NOT done yet
        showToast('✅ Booking accepted! Collect ₹' + notification.game.single_slot_price + ' when customer arrives.', 'success')
        console.log(`✅ Booking ${notification.bookingId} confirmed — payment to be collected at cafe`)
      } else {
        throw new Error(result.message || 'Failed to accept booking')
      }
    } catch (error) {
      console.error('Error accepting booking:', error)
      showToast('❌ Error accepting booking. Please try again.', 'error')
    } finally {
      setProcessingAction({ bookingId: null, action: null })
    }
  }


  const handleReject = async (notification: PayAtCafeNotification) => {
    if (processingAction.bookingId) return

    try {
      setProcessingAction({ bookingId: notification.bookingId, action: 'reject' })

      console.log(`🔄 Processing reject for booking ${notification.bookingId}`)

      const response = await fetch(`${BOOKING_URL}/api/pay-at-cafe/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id:       notification.bookingId,
          vendor_id:        vendorId,
          rejection_reason: 'Rejected by vendor'
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
      setProcessingAction({ bookingId: null, action: null })
    }
  }


  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }


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


  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
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
                    const isThisBookingProcessing = processingAction.bookingId === notification.bookingId
                    const isAcceptProcessing = isThisBookingProcessing && processingAction.action === 'accept'
                    const isRejectProcessing = isThisBookingProcessing && processingAction.action === 'reject'

                    return (
                      <motion.div
                        key={notification.event_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 ${index !== notifications.length - 1 ? 'border-b border-border' : ''} ${
                          isThisBookingProcessing ? 'opacity-75' : ''
                        }`}
                      >
                        <div className="space-y-3">

                          {/* Header Row */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">Pay at Cafe Request</p>
                              <p className="text-xs text-muted-foreground">
                                {formatRelativeTime(notification.emitted_at)}
                              </p>
                            </div>
                            {/* ✅ CHANGED: "To Be Paid" badge instead of plain dot */}
                            <Badge
                              variant="outline"
                              className="text-xs border-orange-400 text-orange-500 bg-orange-500/10 flex items-center gap-1"
                            >
                              <Wallet className="w-3 h-3" />
                              To Be Paid
                            </Badge>
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

                          {/* ✅ CHANGED: Orange box clearly showing "To Be Paid", not green "Paid" */}
                          <div className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-3">
                            <p className="text-xs text-orange-500 font-medium text-center mb-1">
                              To Be Paid at Cafe
                            </p>
                            <div className="text-center">
                              <span className="text-2xl font-bold text-orange-500">
                                ₹{notification.game.single_slot_price}
                              </span>
                            </div>
                            {/* ✅ NEW: Subtle reminder so vendor knows what to do */}
                            <p className="text-xs text-muted-foreground text-center mt-1">
                              Collect cash when customer arrives
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAccept(notification)}
                              disabled={isThisBookingProcessing}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9 text-sm"
                            >
                              {isAcceptProcessing ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              ) : (
                                <Check className="w-4 h-4 mr-2" />
                              )}
                              {isAcceptProcessing ? 'Accepting...' : 'Accept'}
                            </Button>
                            <Button
                              onClick={() => handleReject(notification)}
                              disabled={isThisBookingProcessing}
                              variant="destructive"
                              className="flex-1 h-9 text-sm"
                            >
                              {isRejectProcessing ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              ) : (
                                <X className="w-4 h-4 mr-2" />
                              )}
                              {isRejectProcessing ? 'Rejecting...' : 'Reject'}
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
