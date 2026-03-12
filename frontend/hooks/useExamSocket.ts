import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '../app/components/Common/Toast';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';
const HEARTBEAT_INTERVAL = 30000;      // 30 s
const MAX_MISSED_HEARTBEATS = 3;
const MAX_RECONNECT_ATTEMPTS = 8;      // total retries before giving up
const BASE_RECONNECT_DELAY = 2000;     // 2 s base, doubles each attempt (capped)
const MAX_RECONNECT_DELAY = 30000;     // 30 s cap

export const useExamSocket = (
    examId: string,
    userId: string,
    sessionId: string,
    isNotFound: boolean = false,
) => {
    const socketRef = useRef<Socket | null>(null);
    const [activeSocket, setActiveSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [missedHeartbeats, setMissedHeartbeats] = useState(0);
    // 'connecting' = waiting for first confirmed connect (or reconnecting)
    // 'connected'  = socket is live and joined the exam room
    // 'failed'     = all retry attempts exhausted before ever connecting
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');

    const { error: toastError, warning } = useToast();

    // --- Persistent refs (never stale in callbacks) ---
    const isKicked            = useRef(false);
    const hasEverConnected    = useRef(false);  // tracks if socket confirmed connected at least once
    const lastHeartbeatAck    = useRef<number>(Date.now());
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectTimerRef   = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts   = useRef(0);
    const missedHeartbeatsRef = useRef(0);      // ref mirror so callbacks read latest value
    const examIdRef           = useRef(examId);
    const userIdRef           = useRef(userId);
    const sessionIdRef        = useRef(sessionId);

    // Keep refs in sync with props
    useEffect(() => { examIdRef.current   = examId;   }, [examId]);
    useEffect(() => { userIdRef.current   = userId;   }, [userId]);
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

    // --- Stable identity per device/tab ---
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

    // ─────────────────────────────────────────────────────────────────────────
    // Redirect helpers
    // ─────────────────────────────────────────────────────────────────────────
    const redirectToLogin = useCallback((errorCode: string) => {
        window.location.href = `/exam/login?slug=${examIdRef.current}&error=${errorCode}`;
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // Heartbeat management
    // ─────────────────────────────────────────────────────────────────────────
    const stopHeartbeat = useCallback(() => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
    }, []);

    const startHeartbeat = useCallback((socket: Socket) => {
        stopHeartbeat();

        lastHeartbeatAck.current = Date.now();
        missedHeartbeatsRef.current = 0;
        setMissedHeartbeats(0);

        heartbeatIntervalRef.current = setInterval(() => {
            const sid = sessionIdRef.current;
            if (!sid || isKicked.current) return;

            if (socket.connected) {
                socket.emit('heartbeat', { sessionId: sid, timestamp: Date.now() });

                const timeSinceAck = Date.now() - lastHeartbeatAck.current;
                if (timeSinceAck > HEARTBEAT_INTERVAL + 5000) {
                    missedHeartbeatsRef.current += 1;
                    setMissedHeartbeats(missedHeartbeatsRef.current);
                    console.warn(`[Socket] Missed heartbeat #${missedHeartbeatsRef.current}`);

                    if (missedHeartbeatsRef.current >= MAX_MISSED_HEARTBEATS) {
                        console.error('[Socket] Max missed heartbeats. Redirecting to login.');
                        stopHeartbeat();
                        warning('Connection lost. Please log in again.', 'Connection Issue', 3000);
                        setTimeout(() => redirectToLogin('connection_lost'), 1500);
                    }
                }
            } else {
                // Socket is disconnected — count against missed heartbeats
                missedHeartbeatsRef.current += 1;
                setMissedHeartbeats(missedHeartbeatsRef.current);
                console.warn(`[Socket] Disconnected. Missed heartbeat #${missedHeartbeatsRef.current}`);

                if (missedHeartbeatsRef.current >= MAX_MISSED_HEARTBEATS) {
                    console.error('[Socket] Max missed heartbeats (disconnected). Redirecting to login.');
                    stopHeartbeat();
                    warning('Connection lost. Please log in again.', 'Connection Issue', 3000);
                    setTimeout(() => redirectToLogin('connection_lost'), 1500);
                }
            }
        }, HEARTBEAT_INTERVAL);
    }, [stopHeartbeat, warning, redirectToLogin]);

    // ─────────────────────────────────────────────────────────────────────────
    // Socket factory — creates a brand-new socket and wires all events
    // ─────────────────────────────────────────────────────────────────────────
    const initSocket = useCallback(() => {
        if (isKicked.current) return;
        if (!examIdRef.current || !userIdRef.current) return;

        // Tear down any existing socket first
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';

        const socket = io(`${SOCKET_URL}/proctoring`, {
            // Allow polling as fallback so we can upgrade; prevents hard failure
            // when websocket is briefly blocked by a proxy during initial handshake.
            transports: ['websocket', 'polling'],
            // Disable socket.io's built-in reconnection entirely — we manage it
            // ourselves so we can create a FRESH socket (required after
            // 'io server disconnect' which permanently sets skipReconnect).
            reconnection: false,
            withCredentials: true,
            auth: { token },
        });

        socketRef.current = socket;
        setActiveSocket(socket);

        // ── connect ─────────────────────────────────────────────────────────
        socket.on('connect', () => {
            console.log(`[Socket] Connected (${socket.id})`);
            reconnectAttempts.current = 0;    // reset on successful connect
            hasEverConnected.current  = true; // mark that we've confirmed a live connection
            setIsConnected(true);
            setConnectionStatus('connected');
            lastHeartbeatAck.current = Date.now();
            missedHeartbeatsRef.current = 0;
            setMissedHeartbeats(0);

            socket.emit('join_exam', {
                examId: examIdRef.current,
                userId: userIdRef.current,
                role: 'student',
                deviceId: identity.deviceId,
                tabId: identity.tabId,
            });

            // Restart heartbeat bound to this fresh socket
            if (sessionIdRef.current) startHeartbeat(socket);
        });

        // ── heartbeat ack ───────────────────────────────────────────────────
        socket.on('heartbeat_ack', () => {
            lastHeartbeatAck.current = Date.now();
            missedHeartbeatsRef.current = 0;
            setMissedHeartbeats(0);
        });

        // ── auth error (server rejects connection due to bad token) ──────────
        // We receive this BEFORE the server calls socket.disconnect(true),
        // so we know it's an auth failure, not a proxy kill.
        socket.on('auth_error', () => {
            console.error('[Socket] Auth error received. Token may have expired.');
            // Don't retry — the token is invalid. Send to login.
            isKicked.current = true;
            stopHeartbeat();
            redirectToLogin('auth_error');
        });

        // ── error (application-level, e.g. kicked / terminated) ─────────────
        socket.on('error', (data: any) => {
            console.error('[Socket] App error:', data);
            const msg: string = data?.message || '';

            if (
                msg.includes('Another instance') ||
                msg.includes('Another session') ||
                msg.includes('identity mismatch') ||
                msg.includes('New login')
            ) {
                isKicked.current = true;
                stopHeartbeat();
                toastError(msg || 'This session has been terminated due to another login.');
                socket.disconnect();
                setTimeout(() => redirectToLogin('duplicate_login'), 100);

            } else if (msg.includes('ACCOUNT_SUSPENDED')) {
                isKicked.current = true;
                stopHeartbeat();
                socket.disconnect();
                redirectToLogin('suspended');

            } else if (msg.includes('EXAM_TERMINATED')) {
                isKicked.current = true;
                stopHeartbeat();
                socket.disconnect();
                redirectToLogin('terminated');

            } else {
                toastError(msg || 'Connection Error');
            }
        });

        // ── force_terminate ─────────────────────────────────────────────────
        socket.on('force_terminate', () => {
            console.log('[Socket] force_terminate received');
            isKicked.current = true;
            stopHeartbeat();
            socket.disconnect();
            redirectToLogin('terminated');
        });

        // ── disconnect ──────────────────────────────────────────────────────
        socket.on('disconnect', (reason) => {
            console.warn(`[Socket] Disconnected: ${reason}`);
            setIsConnected(false);
            stopHeartbeat();

            // 1. Intentional kicks — do NOT reconnect
            if (isKicked.current) {
                console.log('[Socket] Kicked — no reconnect.');
                return;
            }

            // 2. io server disconnect — server explicitly closed the connection.
            //    socket.io sets skipReconnect=true internally so we MUST create
            //    a brand-new socket.  This also covers production proxy hard-kills.
            if (reason === 'io server disconnect') {
                setConnectionStatus('connecting');
                scheduleReconnect();
                return;
            }

            // 3. Network-level disconnect — schedule reconnect as well
            if (reason === 'transport close' || reason === 'ping timeout' || reason === 'transport error') {
                setConnectionStatus('connecting');
                scheduleReconnect();
                return;
            }

            // 4. io client disconnect (we called socket.disconnect()) — no reconnect
            console.log('[Socket] Client-side disconnect — no reconnect.');
        });

        // ── connect_error ───────────────────────────────────────────────────
        socket.on('connect_error', (err) => {
            console.error('[Socket] connect_error:', err.message);
            setIsConnected(false);
            setConnectionStatus('connecting');
            scheduleReconnect();
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [identity, startHeartbeat, stopHeartbeat, toastError, redirectToLogin]);

    // ─────────────────────────────────────────────────────────────────────────
    // Reconnect scheduler — exponential backoff, fresh socket each time
    // ─────────────────────────────────────────────────────────────────────────
    const scheduleReconnect = useCallback(() => {
        if (isKicked.current) return;

        reconnectAttempts.current += 1;

        if (reconnectAttempts.current > MAX_RECONNECT_ATTEMPTS) {
            if (!hasEverConnected.current) {
                // Never successfully connected — show the error wall in the exam page
                // so the student can retry without losing their session.
                console.error('[Socket] Initial connection failed after max attempts. Showing error wall.');
                setConnectionStatus('failed');
            } else {
                // Was connected mid-exam, then permanently dropped — integrity
                // may be compromised, send back to login.
                console.error('[Socket] Lost connection permanently. Redirecting to login.');
                warning('Connection lost. Please log in again.', 'Connection Issue', 4000);
                setTimeout(() => redirectToLogin('connection_lost'), 1500);
            }
            return;
        }

        const delay = Math.min(
            BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current - 1),
            MAX_RECONNECT_DELAY,
        );

        console.log(`[Socket] Reconnect attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);

        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
            initSocket();
        }, delay);
    }, [warning, redirectToLogin, initSocket]);

    // ─────────────────────────────────────────────────────────────────────────
    // Main effect — initialise socket when params are ready
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!examId || !userId || isKicked.current || isNotFound) {
            setIsConnected(false);
            return;
        }

        // Reset all counters on clean init (e.g. userId just arrived after page load)
        reconnectAttempts.current  = 0;
        hasEverConnected.current   = false;
        setConnectionStatus('connecting');
        initSocket();

        return () => {
            // Component unmount — clean up without triggering reconnect
            stopHeartbeat();
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (socketRef.current) {
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    // Re-run only when the stable identity params change (examId, userId, isNotFound).
    // scheduleReconnect/initSocket are stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examId, userId, isNotFound]);

    // ─────────────────────────────────────────────────────────────────────────
    // Start heartbeat as soon as we have a sessionId + active socket
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (activeSocket && sessionId && activeSocket.connected && !isKicked.current) {
            startHeartbeat(activeSocket);
        }
        return stopHeartbeat;
    }, [activeSocket, sessionId, startHeartbeat, stopHeartbeat]);

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────
    const saveAnswer = useCallback((questionId: string, answer: any) => {
        if (!isKicked.current && socketRef.current?.connected && sessionIdRef.current) {
            socketRef.current.emit('save_answer', {
                sessionId: sessionIdRef.current,
                answer: { [questionId]: answer },
            });
        }
    }, []);

    const logViolation = useCallback((type: string, message: string, details?: any) => {
        if (!isKicked.current && socketRef.current?.connected && sessionIdRef.current) {
            socketRef.current.emit('log_violation', {
                sessionId: sessionIdRef.current,
                examId: examIdRef.current,
                userId: userIdRef.current,
                type,
                message,
                details,
                timestamp: new Date(),
            });
        }
    }, []);

    const saveReviewStatus = useCallback((questionId: string, isReviewed: boolean) => {
        if (!isKicked.current && socketRef.current?.connected && sessionIdRef.current) {
            socketRef.current.emit('save_answer', {
                sessionId: sessionIdRef.current,
                answer: { [`_rev_${questionId}`]: isReviewed },
            });
        }
    }, []);

    const disconnect = useCallback(() => {
        isKicked.current = true;   // prevent auto-reconnect on manual disconnect
        stopHeartbeat();
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
        }
    }, [stopHeartbeat]);

    // Manual retry — used by the error wall in the exam page.
    // Resets all counters and creates a fresh socket.
    const retryConnection = useCallback(() => {
        if (isKicked.current) return;
        reconnectAttempts.current = 0;
        hasEverConnected.current  = false;
        setConnectionStatus('connecting');
        initSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initSocket]);

    return {
        socket: activeSocket,
        saveAnswer,
        logViolation,
        saveReviewStatus,
        disconnect,
        retryConnection,
        isConnected,
        connectionStatus,
        missedHeartbeats,
    };
};

