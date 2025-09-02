"use client";


import { SOCKET_URL } from '@/src/config/env'
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  joinVendor: (vendorId: number) => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log('🔌 Creating single socket connection...')
    
    console.log(`Trying to connect ${SOCKET_URL}`)
    const newSocket = io(`${SOCKET_URL}`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 20000,
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("💥 Connection error:", error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      console.log("🧹 Cleaning up socket...");
      newSocket.close();
    };
  }, []);

  const joinVendor = (vendorId: number) => {
    if (socket?.connected) {
      console.log(`🏪 Joining vendor room: ${vendorId}`);
      socket.emit("dashboard_join_vendor", { vendor_id: vendorId });
    } else {
      console.warn("⚠️ Cannot join vendor, socket not connected");
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinVendor }}>
      {children}
    </SocketContext.Provider>
  );
};
