"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        const token = Cookies.get('access_token');
        if (!token) return;

        const socketInstance = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });

        socketInstance.on('connect', () => {
            console.log('✅ Real-time system connected');
            setSocket(socketInstance);
        });

        socketInstance.on('disconnect', () => {
            console.log('❌ Real-time system disconnected');
            setSocket(null);
        });

        socketInstance.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        return () => {
            socketInstance.disconnect();
            setSocket(null);
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    return useContext(SocketContext);
};
