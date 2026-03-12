import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

export interface AnnouncementEvent {
    id: string;
    title: string;
    content: string;
    attachments: any;
    teacherName: string;
    groupNames: string[];
    createdAt: string;
}

/**
 * Hook to listen for real-time announcement notifications.
 * Connects to the /notifications WebSocket namespace.
 */
export const useNotificationSocket = (onNewAnnouncement?: (announcement: AnnouncementEvent) => void) => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const callbackRef = useRef(onNewAnnouncement);

    // Keep callback ref fresh
    useEffect(() => {
        callbackRef.current = onNewAnnouncement;
    }, [onNewAnnouncement]);

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
        if (!token) return;

        const socket = io(`${SOCKET_URL}/notifications`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 3000,
            withCredentials: true,
            auth: { token }
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[NotificationSocket] Connected');
            setIsConnected(true);
        });

        socket.on('new_announcement', (data: AnnouncementEvent) => {
            console.log('[NotificationSocket] New announcement:', data.title);
            callbackRef.current?.(data);
        });

        socket.on('disconnect', (reason) => {
            console.log('[NotificationSocket] Disconnected:', reason);
            setIsConnected(false);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    const disconnect = useCallback(() => {
        socketRef.current?.disconnect();
    }, []);

    return { isConnected, disconnect };
};
