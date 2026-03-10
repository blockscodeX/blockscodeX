import { useEffect, useRef } from 'react';
import { MonitoringService } from '@/services/api/MonitoringService';
import { MonitoringEvent, ViolationEvent } from '@/types/monitoring';

export function useElectronMonitoring(examId: string, studentId: string) {
    const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

    // --- Added Electron Listener Logic ---
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            console.log('[ElectronMonitoring] Electron API detected');
            const api = (window as any).electronAPI;

            // Listen for VM Detection
            const removeVMListener = api.onVMDetected ? api.onVMDetected((_event: any, data: any) => {
                console.warn('[ElectronMonitoring] VM Detected:', data);
                logViolation('VM_DETECTED', `Virtual Machine detected: ${data?.message || 'Unknown'}`, data);
            }) : null;

            // Listen for Tab Switches (if Electron sends them specifically)
            const removeTabListener = api.onTabSwitch ? api.onTabSwitch((_event: any, data: any) => {
                console.warn('[ElectronMonitoring] Tab Switch (Electron):', data);
                logViolation('TAB_SWITCH', `Tab switch detected via Electron`, data);
            }) : null;

            // Listen for Proctoring Warnings
            const removeWarningListener = api.onProctoringWarning ? api.onProctoringWarning((_event: any, data: any) => {
                console.warn('[ElectronMonitoring] Proctoring Warning:', data);
                logEvent('proctor_warning', data.message || 'Proctoring Warning', data);
            }) : null;

            return () => {
                // Cleanup if the API supports it (usually returning a removal function)
                if (removeVMListener && typeof removeVMListener === 'function') removeVMListener();
                if (removeTabListener && typeof removeTabListener === 'function') removeTabListener();
                if (removeWarningListener && typeof removeWarningListener === 'function') removeWarningListener();
            };
        }
    }, [examId, studentId]);

    // Heartbeat now managed via WebSockets in useExamSocket.ts

    const logEvent = (eventType: string, message: string, data?: any) => {
        const event: MonitoringEvent = {
            examId,
            studentId,
            eventType,
            eventMessage: message,
            eventData: { ...data, timestamp: new Date().toISOString() },
            browserInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform
            }
        };
        MonitoringService.logEvent(event);
    };

    const logViolation = (type: string, message: string, details?: any) => {
        const violation: ViolationEvent = {
            examId,
            studentId,
            violationType: type,
            violationMessage: message,
            violationSeverity: 'critical',
            violationDetails: details,
            autoDetected: true
        };
        MonitoringService.logViolation(violation);
    };

    return {
        logEvent,
        logViolation
    };
}
