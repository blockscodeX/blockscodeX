import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '../app/components/Common/Toast';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

export const useExamSocket = (examId: string, userId: string, sessionId: string, isNotFound: boolean = false) => {
    const socketRef = useRef<Socket | null>(null);
    const [activeSocket, setActiveSocket] = useState<Socket | null>(null);
    const { error: toastError, warning } = useToast();
    const isKicked = useRef(false);

    // Unique Identity (Stable across lifecycle, generated if missing)
    const [identity] = useState(() => {
        if (typeof window === 'undefined') return { deviceId: 'unknown', tabId: 'unknown' };

        let dId = localStorage.getItem('deviceId');
        if (!dId) {
            dId = 'dev_' + Math.random().toString(36).substring(2, 12);
            localStorage.setItem('deviceId', dId);
        }

        let tId = sessionStorage.getItem('exam_tab_id');
        if (!tId) {
            tId = 'tab_' + Math.random().toString(36).substring(2, 12);
            sessionStorage.setItem('exam_tab_id', tId);
        }

        return { deviceId: dId, tabId: tId };
    });

    useEffect(() => {
        // Do NOT connect socket if exam is not found or if critical params are missing
        if (!examId || !userId || isKicked.current || isNotFound) {
            console.log('[Socket] Skipping connection:', { examId, userId, isNotFound });
            return;
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';

        // Initialize Socket
        const socket = io(`${SOCKET_URL}/proctoring`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            withCredentials: true,
            auth: {
                token: token
            }
        });

        socketRef.current = socket;
        setActiveSocket(socket);

        socket.on('connect', () => {
            console.log(`[Socket] Connected to Proctoring Gateway (${socket.id})`);
            socket.emit('join_exam', {
                examId,
                userId,
                role: 'student',
                deviceId: identity.deviceId,
                tabId: identity.tabId
            });
        });

        socket.on('error', (data: any) => {
            console.error('Socket Error:', data);
            const msg = data.message || '';

            // Terminal displacement errors
            if (
                msg.includes('Another instance') ||
                msg.includes('Another session') ||
                msg.includes('identity mismatch') ||
                msg.includes('New login')
            ) {
                isKicked.current = true;
                toastError(msg || 'This session has been terminated due to another login.');

                // Immediately stop all socket activity
                socket.disconnect();
                if (socketRef.current) socketRef.current.disconnect();

                // Definitive redirect
                setTimeout(() => {
                    window.location.href = `/exam/login?slug=${examId}&error=duplicate_login`;
                }, 100);
            } else if (msg.includes('ACCOUNT_SUSPENDED')) {
                isKicked.current = true;
                socket.disconnect();
                window.location.href = `/exam/login?slug=${examId}&error=suspended`;
            } else if (msg.includes('EXAM_TERMINATED')) {
                isKicked.current = true;
                socket.disconnect();
                // We use a custom query param handling for this in login page
                window.location.href = `/exam/login?slug=${examId}&error=terminated`;
            } else {
                toastError(msg || 'Connection Error');
            }
        });

        // Listen for explicit force terminate event
        socket.on('force_terminate', (data: any) => {
            console.log('[Socket] Received force_terminate command');
            isKicked.current = true;
            socket.disconnect();
            if (socketRef.current) socketRef.current.disconnect();
            window.location.href = `/exam/login?slug=${examId}&error=terminated`;
        });


        socket.on('disconnect', (reason) => {
            console.warn('Disconnected:', reason);
            if (reason === 'io server disconnect' || isKicked.current) {
                console.log('Forcefully disconnected (Takeover). No auto-reconnect.');
            } else if (reason === 'transport close' || reason === 'ping timeout') {
                // For network issues, try to reconnect
                socket.connect();
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [examId, userId, toastError, identity]);

    // WebSocket Heartbeat
    useEffect(() => {
        if (!activeSocket || !sessionId || isKicked.current) return;

        const heartbeatInterval = setInterval(() => {
            if (activeSocket.connected) {
                activeSocket.emit('heartbeat', { sessionId, timestamp: Date.now() });
            }
        }, 30000);

        return () => clearInterval(heartbeatInterval);
    }, [activeSocket, sessionId]);

    const saveAnswer = useCallback((questionId: string, answer: any) => {
        if (!isKicked.current && socketRef.current?.connected && sessionId) {
            socketRef.current.emit('save_answer', { sessionId, answer: { [questionId]: answer } });
        }
    }, [sessionId]);

    const logViolation = useCallback((type: string, message: string, details?: any) => {
        if (!isKicked.current && socketRef.current?.connected && sessionId) {
            socketRef.current.emit('log_violation', {
                sessionId,
                examId,
                userId,
                type,
                message,
                details,
                timestamp: new Date()
            });
        }
    }, [sessionId, examId, userId]);

    const saveReviewStatus = useCallback((questionId: string, isReviewed: boolean) => {
        if (!isKicked.current && socketRef.current?.connected && sessionId) {
            socketRef.current.emit('save_answer', {
                sessionId,
                answer: { [`_rev_${questionId}`]: isReviewed }
            });
        }
    }, [sessionId]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
    }, []);

    return {
        socket: activeSocket,
        saveAnswer,
        logViolation,
        saveReviewStatus,
        disconnect,
        isConnected: activeSocket?.connected && !isKicked.current
    };
};
