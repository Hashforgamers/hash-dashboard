"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationPanel } from './NotificationPanel'
import { useSocket } from '../context/SocketContext'
import { BOOKING_URL } from '@/src/config/env'

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
        setNotifications(data.notifications)
        setUnreadCount(data.notifications.length)
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
    if (latestBookingEvent.vendorId === vendorId && latestBookingEvent.status === 'pending_acceptance') {
      console.log('🔔 NotificationButton: Processing pay at cafe notification for vendor:', vendorId)

      setNotifications(prev => {
        const exists = prev.some(n => n.bookingId === latestBookingEvent.bookingId)
        if (!exists) {
          console.log('📥 NotificationButton: Adding new notification from Dashboard event')
          const newNotifications = [latestBookingEvent, ...prev]
          console.log('📄 NotificationButton: New notification data:', JSON.stringify(latestBookingEvent, null, 2))
          return newNotifications
        }
        console.log('⚠️ NotificationButton: Notification already exists, skipping')
        return prev
      })

      setUnreadCount(prev => {
        const newCount = prev + 1
        console.log('📊 NotificationButton: Updated unread count from', prev, 'to', newCount)
        return newCount
      })

      // Show browser notification
      if (Notification.permission === 'granted') {
        try {
          const notification = new Notification('New Pay at Cafe Request', {
            body: `${latestBookingEvent.username} wants to book ${latestBookingEvent.game?.game_name || 'a game'} for ₹${latestBookingEvent.game?.single_slot_price || latestBookingEvent.slot_price?.single_slot_price}`,
            icon: '/favicon.ico',
            tag: `pay_at_cafe_${latestBookingEvent.bookingId}`,
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
        const filtered = prev.filter(n => n.bookingId !== data.bookingId)
        console.log('📉 NotificationButton: Removed accepted booking. Count:', prev.length, '->', filtered.length)
        return filtered
      })
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const handlePayAtCafeRejected = (data: any) => {
      console.log('❌ NotificationButton: Booking rejected via socket event:', data)
      setNotifications(prev => {
        const filtered = prev.filter(n => n.bookingId !== data.bookingId)
        console.log('📉 NotificationButton: Removed rejected booking. Count:', prev.length, '->', filtered.length)
        return filtered
      })
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    // Only listen to removal events via socket (new notifications come via props)
    socket.on('pay_at_cafe_accepted', handlePayAtCafeAccepted)
    socket.on('pay_at_cafe_rejected', handlePayAtCafeRejected)

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
    }
  }, [socket, isConnected, vendorId, joinVendor])

  // Fetch pending bookings when vendorId is available
  useEffect(() => {
    if (vendorId) {
      fetchPendingBookings()
    }
  }, [vendorId])

  // Handle panel close
  const handleClose = () => {
    setIsOpen(false)
    setUnreadCount(0)
  }

  // Handle notification removal
  const handleRemoveNotification = (bookingId: number) => {
    console.log('🗑️ NotificationButton: Manually removing notification:', bookingId)
    setNotifications(prev => {
      const filtered = prev.filter(n => n.bookingId !== bookingId)
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
