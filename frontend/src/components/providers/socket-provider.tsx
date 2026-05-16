"use client";

import React, { createContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";

import { usePathname } from "next/navigation";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Only create a new socket if one doesn't exist
    if (socket) return;

    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"], // Add polling fallback
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log("✅ Real-time system connected");
      setSocket(socketInstance);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("❌ Real-time system disconnected:", reason);
      // Don't set null immediately to avoid aggressive reconnect loops
      // if it's a temporary network issue
      if (reason === "io server disconnect") {
        setSocket(null);
      }
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [pathname]); // Removed 'socket' from dependencies

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}
