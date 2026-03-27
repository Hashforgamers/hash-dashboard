"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationPanel } from './NotificationPanel'
import { useSocket } from '../context/SocketContext'
import { BOOKING_URL } from '@/src/config/env'
import { DASHBOARD_URL } from '@/src/config/env'

type NotificationKind = "pay_at_cafe" | "meals_added" | "document_rejected"

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

interface DocumentRejectedNotification {
  kind: "document_rejected"
  notification_id: string
  emitted_at?: string
  vendorId: number
  title: string
  message: string
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

  const normalizeId = (value: any) => {
    if (value === null || value === undefined) return ""
    return String(value).trim()
  }

  const normalizeVendorId = (value: any): number | null => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const getPayAtCafeGroupKey = (notification: any) => {
    const batchId = normalizeId(notification?.batch_id || notification?.squad_details?.batch_id)
    if (batchId) return `batch:${batchId}`
    const bookingId = normalizeId(notification?.bookingId || notification?.booking_id)
    return bookingId ? `booking:${bookingId}` : ""
  }

  const isPendingPayAtCafeEvent = useCallback((payload: any) => {
    if (!payload || !vendorId) return false
    const incomingVendorId = normalizeVendorId(payload?.vendorId ?? payload?.vendor_id)
    if (incomingVendorId === null || incomingVendorId !== vendorId) return false

    const machineStatus = String(payload?.status ?? "").toLowerCase()
    const bookingStatus = String(payload?.booking_status ?? "").toLowerCase()
    const paymentUseCase = String(
      payload?.payment_use_case ?? payload?.paymentUseCase ?? payload?.mode_of_payment ?? ""
    ).toLowerCase()

    const isPendingRequest = machineStatus === "pending_acceptance" || bookingStatus === "pending_acceptance"
    const isPayAtCafe = paymentUseCase
      ? paymentUseCase.includes("pay_at_cafe") || paymentUseCase === "cash"
      : true

    return isPendingRequest && isPayAtCafe
  }, [vendorId])

  // Fetch existing pending bookings
  const fetchPendingBookings = useCallback(async () => {
    if (!vendorId) return

    try {
      console.log(`🔍 NotificationButton: Fetching pending bookings for vendor ${vendorId}...`)
      let docNotifications: DocumentRejectedNotification[] = []
      try {
        const dashboardRes = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/dashboard`)
        const dashboardJson = await dashboardRes.json().catch(() => ({}))
        const alerts = Array.isArray(dashboardJson?.documentAlerts) ? dashboardJson.documentAlerts : []
        docNotifications = alerts.map((alert: any, idx: number) => ({
          kind: "document_rejected",
          notification_id: `doc_rejected_${vendorId}_${idx}_${encodeURIComponent(String(alert?.message || ""))}`,
          emitted_at: new Date().toISOString(),
          vendorId: Number(vendorId),
          title: String(alert?.title || "Document Rejected"),
          message: String(alert?.message || "One or more documents were rejected by Hash verification team."),
        }))
      } catch (docErr) {
        console.warn("NotificationButton: failed to fetch document alerts", docErr)
      }

      const response = await fetch(`${BOOKING_URL}/api/pay-at-cafe/pending/${vendorId}`)
      const data = await response.json()

      if (data.success && data.notifications) {
        console.log(`📋 NotificationButton: Loaded ${data.notifications.length} pending bookings from API`)
        const deduped = new Map<string, any>()
        data.notifications.forEach((n: any) => {
          const key = getPayAtCafeGroupKey(n) || `pay:${n.event_id || n.bookingId || Date.now()}`
          if (deduped.has(key)) return
          deduped.set(key, {
            ...n,
            kind: "pay_at_cafe",
            notification_id: `pay_${key}`,
          })
        })
        const mapped = Array.from(deduped.values())
        setNotifications((prev) => {
          const mealNotices = prev.filter((n: any) => n.kind === "meals_added")
          const merged = [...mapped, ...mealNotices, ...docNotifications]
          setUnreadCount(merged.length)
          return merged
        })
      } else {
        console.log('📋 NotificationButton: No pending bookings found')
        setNotifications((prev) => {
          const mealNotices = prev.filter((n: any) => n.kind === "meals_added")
          const merged = [...mealNotices, ...docNotifications]
          setUnreadCount(merged.length)
          return merged
        })
      }
    } catch (error) {
      console.error('❌ NotificationButton: Error fetching pending bookings:', error)
    }
  }, [vendorId])

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
    if (isPendingPayAtCafeEvent(latestBookingEvent)) {
      console.log('🔔 NotificationButton: Processing pay at cafe notification for vendor:', vendorId)
      // Always refetch pending list so batch totals + amount are accurate.
      void fetchPendingBookings()

      // Show browser notification
      if (typeof window !== "undefined" && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const gameName =
            latestBookingEvent?.game?.game_name ||
            (typeof latestBookingEvent?.game === "string" ? latestBookingEvent.game : null) ||
            'a game'
          const username = latestBookingEvent?.username || latestBookingEvent?.user_name || "A customer"
          const fallbackAmount =
            latestBookingEvent?.total_amount ??
            latestBookingEvent?.slot_price?.single_slot_price ??
            latestBookingEvent?.slot_price ??
            latestBookingEvent?.game?.single_slot_price
          const notification = new Notification('New Pay at Cafe Request', {
          body: `${username} wants to book ${gameName} for ₹${fallbackAmount ?? 0}`,
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
        eventVendorId: latestBookingEvent.vendorId ?? latestBookingEvent.vendor_id,
        ourVendorId: vendorId,
        status: latestBookingEvent.status ?? latestBookingEvent.booking_status,
        expectedStatus: 'pending_acceptance'
      })
    }
  }, [latestBookingEvent, vendorId, fetchPendingBookings, isPendingPayAtCafeEvent])

  // Fallback: consume booking events directly in case parent event handoff misses a payload variation.
  useEffect(() => {
    if (!socket || !isConnected || !vendorId) return

    const handleIncomingBooking = (payload: any) => {
      if (!isPendingPayAtCafeEvent(payload)) return
      console.log('🔔 NotificationButton: Received direct booking socket event; refreshing pending list')
      void fetchPendingBookings()
    }

    socket.on('booking', handleIncomingBooking)
    return () => {
      socket.off('booking', handleIncomingBooking)
    }
  }, [socket, isConnected, vendorId, fetchPendingBookings, isPendingPayAtCafeEvent])

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
        const acceptedBatchId = normalizeId(data?.batch_id)
        const acceptedBookingId = normalizeId(data?.bookingId || data?.booking_id)
        const filtered = prev.filter((n: any) => {
          if (n.kind !== "pay_at_cafe") return true
          const nBatchId = normalizeId(n?.batch_id || n?.squad_details?.batch_id)
          const nBookingId = normalizeId(n?.bookingId || n?.booking_id)
          if (acceptedBatchId && nBatchId) return nBatchId !== acceptedBatchId
          return nBookingId !== acceptedBookingId
        })
        console.log('📉 NotificationButton: Removed accepted booking. Count:', prev.length, '->', filtered.length)
        setUnreadCount(filtered.length)
        return filtered
      })
      fetchPendingBookings()
    }

    const handlePayAtCafeRejected = (data: any) => {
      console.log('❌ NotificationButton: Booking rejected via socket event:', data)
      setNotifications(prev => {
        const rejectedBatchId = normalizeId(data?.batch_id)
        const rejectedBookingId = normalizeId(data?.bookingId || data?.booking_id)
        const filtered = prev.filter((n: any) => {
          if (n.kind !== "pay_at_cafe") return true
          const nBatchId = normalizeId(n?.batch_id || n?.squad_details?.batch_id)
          const nBookingId = normalizeId(n?.bookingId || n?.booking_id)
          if (rejectedBatchId && nBatchId) return nBatchId !== rejectedBatchId
          return nBookingId !== rejectedBookingId
        })
        console.log('📉 NotificationButton: Removed rejected booking. Count:', prev.length, '->', filtered.length)
        setUnreadCount(filtered.length)
        return filtered
      })
      fetchPendingBookings()
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
  }, [socket, isConnected, vendorId, joinVendor, fetchPendingBookings])

  // Fetch pending bookings when vendorId is available
  useEffect(() => {
    if (vendorId) {
      void fetchPendingBookings()
    }
  }, [vendorId, fetchPendingBookings])

  // Refresh when opening panel so the user always sees the latest pending requests.
  useEffect(() => {
    if (!isOpen || !vendorId) return
    void fetchPendingBookings()
  }, [isOpen, vendorId, fetchPendingBookings])

  // Poll periodically as a resilience fallback if socket delivery is delayed.
  useEffect(() => {
    if (!vendorId) return
    const timer = window.setInterval(() => {
      void fetchPendingBookings()
    }, 30000)
    return () => window.clearInterval(timer)
  }, [vendorId, fetchPendingBookings])

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
  }, [vendorId, fetchPendingBookings])

  // Handle panel close
  const handleClose = () => {
    setIsOpen(false)
    setUnreadCount(0)
  }

  // Handle notification removal
  const handleRemoveNotification = (bookingId: number | string) => {
    console.log('🗑️ NotificationButton: Manually removing notification:', bookingId)
    const target = normalizeId(bookingId)
    setNotifications(prev => {
      const filtered = prev.filter((n: any) => {
        const bookingMatch = normalizeId(n?.bookingId || n?.booking_id)
        const notifMatch = normalizeId(n?.notification_id)
        const batchMatch = normalizeId(n?.batch_id || n?.squad_details?.batch_id)
        return bookingMatch !== target && notifMatch !== target && batchMatch !== target
      })
      console.log('📉 NotificationButton: Manual removal. Count:', prev.length, '->', filtered.length)
      setUnreadCount(filtered.length)
      return filtered
    })
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
