"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationPanel } from './NotificationPanel'
import { useSocket } from '../context/SocketContext'
import { BOOKING_URL } from '@/src/config/env'

interface NotificationButtonProps {
  vendorId: number | null
  onBookingAccepted?: (bookingData: any) => void // ✅ ADDED: Callback for upstream booking updates
}

export function NotificationButton({ 
  vendorId, 
  onBookingAccepted 
}: NotificationButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'joined_room'>('disconnected')
  const [notifications, setNotifications] = useState([])
  
  const { socket, isConnected, joinVendor } = useSocket()

  // Fetch existing pending bookings
  const fetchPendingBookings = async () => {
    if (!vendorId) return
    
    try {
      console.log(`🔍 Fetching pending bookings for vendor ${vendorId}...`)
      
      const response = await fetch(`${BOOKING_URL}/api/pay-at-cafe/pending/${vendorId}`)
      const data = await response.json()
      
      if (data.success && data.notifications) {
        console.log(`📋 Loaded ${data.notifications.length} pending bookings from API`)
        setNotifications(data.notifications)
        setUnreadCount(data.notifications.length)
      } else {
        console.log('📋 No pending bookings found')
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('❌ Error fetching pending bookings:', error)
    }
  }

  // ✅ FIXED: Socket event handling with immediate updates and booking acceptance
  useEffect(() => {
    if (!socket || !isConnected || !vendorId) {
      setConnectionStatus('disconnected')
      return
    }

    console.log(`🔌 Setting up notification events for vendor ${vendorId}...`)
    
    setConnectionStatus('connected')
    joinVendor(vendorId)
    setConnectionStatus('joined_room')

    // ✅ FIXED: Immediate notification updates
    const handleBooking = (data: any) => {
      console.log('📥 Received booking event via bridge:', data)
      
      if (data.vendorId === vendorId && data.status === 'pending_acceptance') {
        console.log('🔔 Pay at cafe notification:', data)
        
        // ✅ Add notification immediately
        setNotifications(prev => {
          const exists = prev.some((n: any) => n.bookingId === data.bookingId)
          if (!exists) {
            console.log('📥 Adding notification immediately')
            return [data, ...prev]
          }
          return prev
        })
        
        // ✅ Update count immediately
        setUnreadCount(prev => prev + 1)
        
        // Show browser notification
        if (Notification.permission === 'granted') {
          const notification = new Notification('New Pay at Cafe Request', {
            body: `${data.username} wants to book ${data.game?.game_name || 'a game'} for ₹${data.game?.single_slot_price || data.slot_price?.single_slot_price}`,
            icon: '/favicon.ico',
            tag: `pay_at_cafe_${data.bookingId}`,
            requireInteraction: true
          })
          
          setTimeout(() => notification.close(), 10000)
        }
      }
    }

    // ✅ ADDED: Listen for booking acceptance events from NotificationPanel
    const handleBookingAccepted = (data: any) => {
      console.log('✅ Booking accepted event received from NotificationPanel:', data)
      
      // Remove from notifications
      setNotifications(prev => prev.filter((n: any) => n.bookingId !== data.bookingId))
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      // ✅ CRITICAL: Trigger upstream booking update (for upcoming bookings)
      if (onBookingAccepted) {
        console.log('📅 Triggering upstream booking update')
        onBookingAccepted(data)
      }
    }

    // ✅ FIXED: Immediate acceptance/rejection updates
    const handlePayAtCafeAccepted = (data: any) => {
      console.log('✅ Booking accepted via bridge:', data)
      setNotifications(prev => prev.filter((n: any) => n.bookingId !== data.bookingId))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const handlePayAtCafeRejected = (data: any) => {
      console.log('❌ Booking rejected via bridge:', data)
      setNotifications(prev => prev.filter((n: any) => n.bookingId !== data.bookingId))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    // Register event listeners
    socket.on('booking', handleBooking)
    socket.on('booking_accepted', handleBookingAccepted) // ✅ ADDED: Listen for acceptance events from panel
    socket.on('pay_at_cafe_accepted', handlePayAtCafeAccepted)
    socket.on('pay_at_cafe_rejected', handlePayAtCafeRejected)
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission)
      })
    }

    // Cleanup
    return () => {
      socket.off('booking', handleBooking)
      socket.off('booking_accepted', handleBookingAccepted) // ✅ ADDED
      socket.off('pay_at_cafe_accepted', handlePayAtCafeAccepted)
      socket.off('pay_at_cafe_rejected', handlePayAtCafeRejected)
    }
  }, [socket, isConnected, vendorId, joinVendor, onBookingAccepted]) // ✅ ADDED onBookingAccepted dependency

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
    setNotifications(prev => prev.filter((n: any) => n.bookingId !== bookingId))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  // ✅ ADDED: Handle booking acceptance from NotificationPanel
  const handleBookingAcceptedFromPanel = (bookingData: any) => {
    console.log('🎯 Booking accepted from NotificationPanel:', bookingData)
    
    // ✅ CRITICAL: Emit socket event for real-time updates across components
    if (socket) {
      console.log('📡 Emitting booking_accepted event via socket')
      socket.emit('booking_accepted', bookingData)
    }
    
    // ✅ CRITICAL: Also trigger upstream callback for parent components
    if (onBookingAccepted) {
      console.log('📅 Triggering upstream callback for booking acceptance')
      onBookingAccepted(bookingData)
    }
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
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 h-10 w-10 rounded-lg border-border hover:bg-muted transition-colors duration-200"
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
        socket={socket} // ✅ ADDED: Pass socket to NotificationPanel
        onBookingAccepted={handleBookingAcceptedFromPanel} // ✅ ADDED: Handle booking acceptance
      />
    </>
  )
}
