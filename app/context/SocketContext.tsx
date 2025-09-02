"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { SOCKET_DASHBOARD_URL } from "@/src/config/env"
interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
  joinVendor: (vendorId: number) => void
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  joinVendor: () => {}
})

export const useSocket = () => useContext(SocketContext)

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    console.log('🔌 Creating single socket connection...')
    
    const newSocket = io(`${SOCKET_DASHBOARD_URL}`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 20000,
    })

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id)
      setIsConnected(true)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason)
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('💥 Connection error:', error)
      setIsConnected(false)
    })

    setSocket(newSocket)

    return () => {
      console.log('🧹 Cleaning up socket...')
      newSocket.close()
    }
  }, []) // Empty deps - create only once

  const joinVendor = (vendorId: number) => {
    if (socket && isConnected) {
      console.log(`🏪 Joining vendor room: ${vendorId}`)
      socket.emit('dashboard_join_vendor', { vendor_id: vendorId })
    }
  }

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinVendor }}>
      {children}
    </SocketContext.Provider>
  )
}
