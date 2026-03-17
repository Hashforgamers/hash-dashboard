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
  const joinedVendorsRef = React.useRef<Set<number>>(new Set());
  const lastPongRef = React.useRef<number>(Date.now());
  const heartbeatRef = React.useRef<number | null>(null);
  const lastForcedReconnectRef = React.useRef<number>(0);

  useEffect(() => {
    console.log('🔌 Creating single socket connection...')
    
    console.log(`Trying to connect ${SOCKET_URL}`)
    const newSocket = io(`${SOCKET_URL}`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    const markPong = () => {
      lastPongRef.current = Date.now();
    };

    const forceReconnect = (reason: string) => {
      const now = Date.now();
      if (now - lastForcedReconnectRef.current < 15000) return;
      lastForcedReconnectRef.current = now;
      console.warn(`🔁 Forcing socket reconnect (${reason})`);
      try {
        newSocket.disconnect();
      } catch (err) {
        console.warn("Socket disconnect failed:", err);
      }
      try {
        newSocket.connect();
      } catch (err) {
        console.warn("Socket connect failed:", err);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("socket-health-timeout"));
      }
    };

    const startHeartbeat = () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
      }
      heartbeatRef.current = window.setInterval(() => {
        if (!newSocket.connected) return;
        const now = Date.now();
        if (now - lastPongRef.current > 30000) {
          forceReconnect("pong_timeout");
          return;
        }
        try {
          newSocket.emit("ping_health", { ts: now }, (ack: any) => {
            if (ack?.ok) markPong();
          });
        } catch (err) {
          console.warn("Socket ping failed:", err);
        }
      }, 10000);
    };

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setIsConnected(true);
      markPong();
      startHeartbeat();
      joinedVendorsRef.current.forEach((vendorId) => {
        newSocket.emit("dashboard_join_vendor", { vendor_id: vendorId });
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("socket-reconnected"));
      }
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("💥 Connection error:", error);
      setIsConnected(false);
    });

    newSocket.on("pong_health", () => {
      markPong();
    });

    newSocket.io.on("reconnect", () => {
      console.log("🔁 Socket reconnected");
      markPong();
      joinedVendorsRef.current.forEach((vendorId) => {
        newSocket.emit("dashboard_join_vendor", { vendor_id: vendorId });
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("socket-reconnected"));
      }
    });

    const handleOnline = () => {
      if (!newSocket.connected) {
        console.log("🌐 Back online, reconnecting socket...");
        try {
          newSocket.connect();
        } catch (err) {
          console.warn("Socket connect failed:", err);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
    }

    setSocket(newSocket);

    return () => {
      console.log("🧹 Cleaning up socket...");
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
      }
      newSocket.close();
    };
  }, []);

  const joinVendor = (vendorId: number) => {
    joinedVendorsRef.current.add(vendorId);
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
