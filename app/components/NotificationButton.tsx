"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationPanel } from './NotificationPanel'
import { useSocket } from '../context/SocketContext'
import { BOOKING_URL } from '@/src/config/env'

type NotificationKind = "pay_at_cafe" | "meals_added"

interface MealsAddedNotification {
  kind: "meals_added"
  notification_id: string
  emitted_at?: string
  bookingId: number
  vendorId: number
  userId?: number
  username?: string
  amount_added?: number
  settlement_status?: string
}

interface NotificationButtonProps {
  vendorId: number | null
  onBookingAccepted?: (bookingData: any) => void
  latestBookingEvent?: any // ✅ NEW: Receive booking events from Dashboard
}

export function NotificationButton({
  vendorId,
  onBookingAccepted,
  latestBookingEvent // ✅ NEW: Booking events passed from Dashboard
}: NotificationButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'joined_room'>('disconnected')
  const [notifications, setNotifications] = useState<any[]>([])

  const { socket, isConnected, joinVendor } = useSocket()

  // Fetch existing pending bookings
  const fetchPendingBookings = async () => {
    if (!vendorId) return

    try {
      console.log(`🔍 NotificationButton: Fetching pending bookings for vendor ${vendorId}...`)

      const response = await fetch(`${BOOKING_URL}/api/pay-at-cafe/pending/${vendorId}`)
      const data = await response.json()

      if (data.success && data.notifications) {
        console.log(`📋 NotificationButton: Loaded ${data.notifications.length} pending bookings from API`)
        const mapped = data.notifications.map((n: any) => ({
          ...n,
          kind: "pay_at_cafe",
          notification_id: `pay_${n.batch_id || n.bookingId || n.event_id || Date.now()}`
        }))
        setNotifications(mapped)
        setUnreadCount(mapped.length)
      } else {
        console.log('📋 NotificationButton: No pending bookings found')
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('❌ NotificationButton: Error fetching pending bookings:', error)
    }
  }

  // Stable callback for when NotificationPanel accepts a booking
  const handleBookingAcceptedFromPanel = useCallback((bookingData: any) => {
    console.log('🎯 NotificationButton: Booking accepted from NotificationPanel:', bookingData)

    if (onBookingAccepted) {
      console.log('📅 NotificationButton: Triggering upstream callback for booking acceptance')
      onBookingAccepted(bookingData)
    }
  }, [onBookingAccepted])

  // ✅ CRITICAL FIX: Listen to latestBookingEvent from Dashboard (via props)
  useEffect(() => {
    if (!latestBookingEvent) return

    console.log('🔔 NotificationButton: Received booking event from Dashboard:', latestBookingEvent)

    // Check if this is a pay-at-cafe notification for our vendor
    const eventBatchId = latestBookingEvent.batch_id || latestBookingEvent?.squad_details?.batch_id
    if (latestBookingEvent.vendorId === vendorId && latestBookingEvent.status === 'pending_acceptance') {
      console.log('🔔 NotificationButton: Processing pay at cafe notification for vendor:', vendorId)
      // Always refetch pending list so batch totals + amount are accurate.
      fetchPendingBookings()

      // Show browser notification
      if (Notification.permission === 'granted') {
        try {
          const fallbackAmount =
            latestBookingEvent?.total_amount ??
            latestBookingEvent?.slot_price?.single_slot_price ??
            latestBookingEvent?.slot_price ??
            latestBookingEvent?.game?.single_slot_price
          const notification = new Notification('New Pay at Cafe Request', {
          body: `${latestBookingEvent.username} wants to book ${latestBookingEvent.game?.game_name || 'a game'} for ₹${fallbackAmount ?? 0}`,
          icon: '/favicon.ico',
          tag: `pay_at_cafe_${eventBatchId || latestBookingEvent.bookingId}`,
          requireInteraction: true
        })
          setTimeout(() => notification.close(), 10000)
        } catch (notifError) {
          console.log('NotificationButton: Browser notification failed:', notifError)
        }
      }
    } else {
      console.log('🚫 NotificationButton: Ignoring event - not a pay-at-cafe notification:', {
        eventVendorId: latestBookingEvent.vendorId,
        ourVendorId: vendorId,
        status: latestBookingEvent.status,
        expectedStatus: 'pending_acceptance'
      })
    }
  }, [latestBookingEvent, vendorId])

  // ✅ Socket event handling for removal events only (accept/reject)
  useEffect(() => {
    if (!socket || !isConnected || !vendorId) {
      setConnectionStatus('disconnected')
      return
    }

    console.log(`🔌 NotificationButton: Setting up notification removal events for vendor ${vendorId}...`)

    setConnectionStatus('connected')
    joinVendor(vendorId)
    setConnectionStatus('joined_room')

    // Handle acceptance/rejection events (for removing notifications)
    const handlePayAtCafeAccepted = (data: any) => {
      console.log('✅ NotificationButton: Booking accepted via socket event:', data)
      setNotifications(prev => {
        const batchId = data?.batch_id
        const filtered = batchId
          ? prev.filter(n => n.kind !== "pay_at_cafe" || (n.batch_id || n?.squad_details?.batch_id) !== batchId)
          : prev.filter(n => n.kind !== "pay_at_cafe" || n.bookingId !== data.bookingId)
        console.log('📉 NotificationButton: Removed accepted booking. Count:', prev.length, '->', filtered.length)
        return filtered
      })
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const handlePayAtCafeRejected = (data: any) => {
      console.log('❌ NotificationButton: Booking rejected via socket event:', data)
      setNotifications(prev => {
        const batchId = data?.batch_id
        const filtered = batchId
          ? prev.filter(n => n.kind !== "pay_at_cafe" || (n.batch_id || n?.squad_details?.batch_id) !== batchId)
          : prev.filter(n => n.kind !== "pay_at_cafe" || n.bookingId !== data.bookingId)
        console.log('📉 NotificationButton: Removed rejected booking. Count:', prev.length, '->', filtered.length)
        return filtered
      })
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const handleBookingPaymentUpdate = (data: any) => {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id)
      if (!eventVendorId || eventVendorId !== vendorId) return
      const eventType = String(data?.event || "").toLowerCase()
      if (eventType !== "meals_added") return
      const bookingId = Number(data?.bookingId ?? data?.booking_id)
      const amountAdded = Number(data?.amount_added || 0)
      const notification_id = data?.event_id || `meal_${bookingId}_${Date.now()}`
      setNotifications(prev => {
        const exists = prev.some(n =>
          n.kind === "meals_added" &&
          n.bookingId === bookingId &&
          Number(n.amount_added || 0) === amountAdded
        )
        if (exists) return prev
        return [
          {
            kind: "meals_added",
            notification_id,
            emitted_at: data?.emitted_at,
            bookingId,
            vendorId: eventVendorId,
            userId: data?.userId ?? data?.user_id,
            username: data?.username,
            amount_added: amountAdded,
            settlement_status: data?.settlement_status,
          },
          ...prev
        ]
      })
      setUnreadCount(prev => prev + 1)
    }

    // Only listen to removal events via socket (new notifications come via props)
    socket.on('pay_at_cafe_accepted', handlePayAtCafeAccepted)
    socket.on('pay_at_cafe_rejected', handlePayAtCafeRejected)
    socket.on('booking_payment_update', handleBookingPaymentUpdate)

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('NotificationButton: Notification permission:', permission)
      })
    }

    return () => {
      console.log('🧹 NotificationButton: Cleaning up socket event listeners')
      socket.off('pay_at_cafe_accepted', handlePayAtCafeAccepted)
      socket.off('pay_at_cafe_rejected', handlePayAtCafeRejected)
      socket.off('booking_payment_update', handleBookingPaymentUpdate)
    }
  }, [socket, isConnected, vendorId, joinVendor])

  // Fetch pending bookings when vendorId is available
  useEffect(() => {
    if (vendorId) {
      fetchPendingBookings()
    }
  }, [vendorId])

  useEffect(() => {
    setUnreadCount(Array.isArray(notifications) ? notifications.length : 0)
  }, [notifications])

  // Re-fetch pending list after socket reconnect to avoid stale notifications
  useEffect(() => {
    if (!vendorId) return
    const handleReconnected = () => {
      fetchPendingBookings()
    }
    window.addEventListener("socket-reconnected", handleReconnected)
    return () => window.removeEventListener("socket-reconnected", handleReconnected)
  }, [vendorId])

  // Handle panel close
  const handleClose = () => {
    setIsOpen(false)
    setUnreadCount(0)
  }

  // Handle notification removal
  const handleRemoveNotification = (bookingId: number | string) => {
    console.log('🗑️ NotificationButton: Manually removing notification:', bookingId)
    setNotifications(prev => {
      const filtered = prev.filter(n => n.bookingId !== bookingId && n.notification_id !== bookingId)
      console.log('📉 NotificationButton: Manual removal. Count:', prev.length, '->', filtered.length)
      return filtered
    })
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  // Get connection status color and text
  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case 'joined_room':
        return { color: 'bg-green-500', title: 'Connected - Live notifications active' }
      case 'connected':
        return { color: 'bg-yellow-500', title: 'Connected - Joining vendor room...' }
      case 'disconnected':
        return { color: 'bg-red-500', title: 'Disconnected - Attempting to reconnect...' }
      default:
        return { color: 'bg-gray-500', title: 'Unknown status' }
    }
  }

  const statusInfo = getConnectionStatusInfo()

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="relative h-10 w-10 rounded-full border-0 bg-transparent p-0 shadow-none hover:bg-emerald-500/10 transition-colors duration-200"
        >
          <Bell className={`w-4 h-4 ${
            unreadCount > 0
              ? 'text-orange-500 animate-pulse'
              : connectionStatus === 'joined_room'
                ? 'text-green-500'
                : 'text-muted-foreground'
          }`} />

          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold animate-bounce"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>

        <div
          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${statusInfo.color} ${
            connectionStatus === 'disconnected' ? 'animate-pulse' : ''
          }`}
          title={statusInfo.title}
        />
      </div>

      <NotificationPanel
        vendorId={vendorId}
        isOpen={isOpen}
        onClose={handleClose}
        notifications={notifications}
        onRemoveNotification={handleRemoveNotification}
        socket={socket}
        onBookingAccepted={handleBookingAcceptedFromPanel}
      />
    </>
  )
}
