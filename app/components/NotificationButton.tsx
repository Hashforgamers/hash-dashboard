"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationPanel } from './NotificationPanel'
import { io, Socket } from 'socket.io-client'
import { BOOKING_URL } from '@/src/config/env'

interface NotificationButtonProps {
  vendorId: number | null
}

export function NotificationButton({ vendorId }: NotificationButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'joined_room'>('disconnected')
  const [notifications, setNotifications] = useState([])
  
  // Use useRef to persist socket connection across renders
  const socketRef = useRef<Socket | null>(null)

  // Fetch existing pending bookings on component mount
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

  // Socket.IO connection - Connect once and keep alive
  useEffect(() => {
    // Only create socket if we don't have one and vendorId exists
    if (!socketRef.current && vendorId) {
      console.log(`🔌 Creating persistent Socket.IO connection for vendor ${vendorId}...`)
      
      const newSocket = io('wss://hfg-booking-hmnx.onrender.com', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000
      })
      
      // Connection events
      newSocket.on('connect', () => {
        console.log('✅ Socket.IO connected')
        setConnectionStatus('connected')
        
        // Join vendor-specific room
        newSocket.emit('connect_vendor', { vendor_id: vendorId })
        console.log(`🏪 Emitted connect_vendor for vendor ${vendorId}`)
      })
      
      newSocket.on('disconnect', () => {
        console.log('❌ Socket.IO disconnected')
        setConnectionStatus('disconnected')
      })

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error)
        setConnectionStatus('disconnected')
      })

      // Listen for booking events (real-time pay-at-cafe notifications)
      newSocket.on('booking', (data) => {
        console.log('📥 Received booking event:', data)
        
        // Check if it's a pay at cafe booking for this vendor
        if (data.vendorId === vendorId && data.status === 'pending_acceptance') {
          console.log('🔔 Pay at cafe notification:', data)
          
          // Add to notifications array (avoid duplicates)
          setNotifications(prev => {
            const exists = prev.some(n => n.bookingId === data.bookingId)
            if (!exists) {
              return [data, ...prev]
            }
            return prev
          })
          
          // Update unread count
          setUnreadCount(prev => prev + 1)
          setConnectionStatus('joined_room')
          
          // Show browser notification if permission granted
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
      })

      // Listen for acceptance/rejection events to decrease count
      newSocket.on('pay_at_cafe_accepted', (data) => {
        console.log('✅ Booking accepted:', data)
        setNotifications(prev => prev.filter(n => n.bookingId !== data.bookingId))
        setUnreadCount(prev => Math.max(0, prev - 1))
      })

      newSocket.on('pay_at_cafe_rejected', (data) => {
        console.log('❌ Booking rejected:', data)
        setNotifications(prev => prev.filter(n => n.bookingId !== data.bookingId))
        setUnreadCount(prev => Math.max(0, prev - 1))
      })
      
      // Store socket in ref
      socketRef.current = newSocket
      
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission:', permission)
        })
      }
    }
    
    // Cleanup only when component unmounts or vendorId changes
    return () => {
      if (socketRef.current) {
        console.log('🧹 Cleaning up Socket.IO connection...')
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [vendorId])

  // Fetch pending bookings when vendorId is available
  useEffect(() => {
    if (vendorId) {
      fetchPendingBookings()
    }
  }, [vendorId])

  // Handle panel close
  const handleClose = () => {
    setIsOpen(false)
    // Reset unread count when panel is closed (assuming user has seen notifications)
    setUnreadCount(0)
  }

  // Handle notification removal (for accept/reject actions)
  const handleRemoveNotification = (bookingId: number) => {
    setNotifications(prev => prev.filter(n => n.bookingId !== bookingId))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  // Get connection status color and text
  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case 'joined_room':
        return { color: 'bg-green-500', title: 'Connected to vendor room - Live notifications active' }
      case 'connected':
        return { color: 'bg-yellow-500', title: 'Connected to server - Joining vendor room...' }
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
        
        {/* Connection Status Indicator */}
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
      />
    </>
  )
}
