import { useState, useEffect } from 'react';

export interface NetworkStatus {
    isOnline: boolean;
    downlink: number; // Mbps
    effectiveType: string;
    rtt: number;
}

export function useNetworkMonitor() {
    const [status, setStatus] = useState<NetworkStatus>({
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        downlink: 0,
        effectiveType: 'unknown',
        rtt: 0
    });

    useEffect(() => {
        let intervalId: any = null;

        const measureFallbackSpeed = async () => {
            if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.onLine) return;

            try {
                const startedAt = performance.now();
                const res = await fetch(`/api/proxy/exam/app-config?ts=${Date.now()}`, {
                    method: 'GET',
                    cache: 'no-store',
                });
                const text = await res.text();
                const endedAt = performance.now();

                const durationSec = Math.max((endedAt - startedAt) / 1000, 0.05);
                const bytes = new TextEncoder().encode(text).length;
                const calculatedMbps = Number(((bytes * 8) / (durationSec * 1_000_000)).toFixed(2));

                if (calculatedMbps > 0) {
                    setStatus(prev => ({
                        ...prev,
                        downlink: calculatedMbps,
                        rtt: Math.round(durationSec * 1000)
                    }));
                }
            } catch {
                // Silent fallback - keep previous status
            }
        };

        const updateStatus = () => {
            const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
            const connectionDownlink = conn && typeof conn.downlink === 'number' ? conn.downlink : 0;
            setStatus({
                isOnline: navigator.onLine,
                downlink: connectionDownlink,
                effectiveType: conn ? conn.effectiveType : 'unknown',
                rtt: conn ? conn.rtt : 0
            });

            if (navigator.onLine && connectionDownlink <= 0) {
                measureFallbackSpeed();
            }
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);

        const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (conn) {
            conn.addEventListener('change', updateStatus);
        }

        updateStatus();

        intervalId = setInterval(() => {
            const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
            const hasNativeDownlink = conn && typeof conn.downlink === 'number' && conn.downlink > 0;
            if (navigator.onLine && !hasNativeDownlink) {
                measureFallbackSpeed();
            }
        }, 15000);

        return () => {
            window.removeEventListener('online', updateStatus);
            window.removeEventListener('offline', updateStatus);
            if (conn) {
                conn.removeEventListener('change', updateStatus);
            }
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, []);

    return status;
}
