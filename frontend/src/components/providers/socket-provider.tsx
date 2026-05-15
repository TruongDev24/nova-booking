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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSocket(null);
      }
      return;
    }

    // If socket already exists, don't reconnect
    if (socket?.connected) return;

    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketInstance.on("connect", () => {
      console.log("✅ Real-time system connected");
      setSocket(socketInstance);
    });

    socketInstance.on("disconnect", () => {
      console.log("❌ Real-time system disconnected");
      setSocket(null);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    return () => {
      socketInstance.disconnect();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSocket(null);
    };
  }, [pathname]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}
