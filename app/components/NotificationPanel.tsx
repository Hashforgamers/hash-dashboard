"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check, Clock, User, Calendar, Wallet, Gamepad2 } from 'lucide-react'
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
            className="fixed top-16 right-4 left-4 z-50 max-h-[85vh] overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-slate-900/95 via-slate-900/92 to-slate-950/95 shadow-[0_18px_60px_rgba(2,6,23,0.55)] md:left-auto md:w-[26rem]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/20 bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <h3 className="dash-title !text-base">Pay at Cafe Requests</h3>
                {notificationCount > 0 && (
                  <Badge className="border border-cyan-400/40 bg-cyan-500/15 text-cyan-200 text-xs">
                    {notificationCount}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 rounded-full p-0 text-slate-300 hover:bg-cyan-500/15 hover:text-cyan-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto bg-slate-900/40 p-2 sm:p-3">
              {notifications.length === 0 ? (
                <div className="rounded-xl border border-cyan-500/20 bg-slate-900/70 px-6 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-slate-800/70">
                    <Bell className="h-8 w-8 text-slate-400 opacity-70" />
                  </div>
                  <h4 className="mb-2 font-medium text-slate-100">No payment requests</h4>
                  <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-400">
                    When customers choose "Pay at Cafe" for their bookings, you'll see their requests here for approval.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
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
                        className={`rounded-xl border border-emerald-400/20 bg-gradient-to-r from-slate-800/80 to-slate-800/55 p-4 transition-all duration-200 hover:border-emerald-300/40 ${
                          isThisBookingProcessing ? 'opacity-75' : ''
                        }`}
                      >
                        <div className="space-y-3">

                          {/* Header Row */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-100">Pay at Cafe Request</p>
                              <p className="text-xs text-slate-400">
                                {formatRelativeTime(notification.emitted_at)}
                              </p>
                            </div>
                            {/* ✅ CHANGED: "To Be Paid" badge instead of plain dot */}
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1 border-orange-400/50 bg-orange-500/10 text-xs text-orange-300"
                            >
                              <Wallet className="w-3 h-3" />
                              To Be Paid
                            </Badge>
                          </div>

                          {/* Customer Name */}
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-100">{notification.username}</span>
                            <span className="text-xs text-slate-400">wants to book</span>
                          </div>

                          {/* Game + Console */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">
                              {notification.game?.game_name || "Gaming Session"}
                            </span>
                            <span className="flex items-center gap-1 rounded-full border border-slate-600/70 bg-slate-800/80 px-2 py-0.5 text-slate-300">
                              <Gamepad2 className="h-3 w-3 text-rose-400" />
                              {notification.consoleType || "Console"}
                            </span>
                          </div>

                          {/* Time and Date */}
                          <div className="flex items-center gap-4 text-sm text-slate-200">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{notification.time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{formatDisplayDate(notification.date)}</span>
                            </div>
                          </div>

                          {/* ✅ CHANGED: Orange box clearly showing "To Be Paid", not green "Paid" */}
                          <div className="rounded-lg border border-orange-400/40 bg-orange-500/10 p-3">
                            <p className="mb-1 text-center text-xs font-medium text-orange-300">
                              To Be Paid at Cafe
                            </p>
                            <div className="text-center">
                              <span className="text-2xl font-bold text-orange-300">
                                ₹{notification.game.single_slot_price}
                              </span>
                            </div>
                            {/* ✅ NEW: Subtle reminder so vendor knows what to do */}
                            <p className="mt-1 text-center text-xs text-slate-400">
                              Collect cash when customer arrives
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAccept(notification)}
                              disabled={isThisBookingProcessing}
                              className="h-9 flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-sm text-white hover:from-emerald-400 hover:to-cyan-400"
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
                              variant="outline"
                              className="h-9 flex-1 border-rose-400/45 bg-rose-500/10 text-sm text-rose-200 hover:bg-rose-500/20"
                            >
                              {isRejectProcessing ? (
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-rose-200 border-t-transparent" />
                              ) : (
                                <X className="mr-2 h-4 w-4" />
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
