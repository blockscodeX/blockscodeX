"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/app/components/Navbar";
import { TeacherService, Student } from "@/services/api/TeacherService";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";
import { useToast } from "@/app/components/Common/Toast";
import { io, Socket } from 'socket.io-client';

// PeerJS dynamic import usage in useEffect

interface Feedback {
    id: string;
    userName: string;
    userEmail: string;
    rating: number;
    comment: string;
    time: string;
    isSeen: boolean;
}

interface ExamMonitorViewProps {
    examId: string;
    userRole?: 'admin' | 'teacher';
}

export default function ExamMonitorView({ examId, userRole = 'teacher' }: ExamMonitorViewProps) {
    const [view, setView] = useState<'monitor' | 'feedback' | 'ai-proctoring'>('monitor');
    const { success, error, warning, info } = useToast();
    const socketRef = React.useRef<Socket | null>(null);
    const peerRef = React.useRef<any>(null); // Peer instance
    const [violations, setViolations] = useState<any[]>([]);
    const [activeStream, setActiveStream] = useState<{ studentId: string; stream: MediaStream } | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            // ... existing data loading ...
            try {
                const studentData = await TeacherService.getMonitoredStudents(examId);
                setStudents(studentData);
                const feedbackData = await TeacherService.getFeedbacks(examId);
                setFeedbacks(feedbackData);
            } catch (e) {
                console.error("Failed to load monitor data", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
        const interval = setInterval(loadData, 5000); // 5s poll
        return () => clearInterval(interval);
    }, [examId]);

    // --- AI PROCTORING LOGIC ---
    useEffect(() => {
        if (view !== 'ai-proctoring') return;

        // 1. Socket Init
        const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';
        const socket = io(`${SOCKET_URL}/proctoring`, {
            transports: ['websocket'],
            reconnection: true,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Monitor] Connected to socket');
            socket.emit('join_exam', {
                examId,
                userId: 'teacher-' + Math.random().toString(36).substr(2, 9),
                role: 'teacher'
            });
        });

        // 2. PeerJS Init
        const initPeer = async () => {
            if (peerRef.current) return;
            try {
                const { Peer } = await import('peerjs');
                const peer = new Peer();

                peer.on('open', (id: string) => {
                    console.log('[Monitor] My Peer ID:', id);
                    peerRef.current = peer;
                });

                peer.on('call', (call: any) => {
                    console.log('[Monitor] Incoming Call');
                    call.answer(); // Answer automatically
                    call.on('stream', (remoteStream: MediaStream) => {
                        console.log('[Monitor] Stream received');
                        // Find who is calling? 
                        // Simplified: Just show the stream
                        setActiveStream({ studentId: 'Unknown', stream: remoteStream });
                    });
                });
            } catch (e) {
                console.error("Peer init failed", e);
            }
        };
        initPeer();

        // 3. Listeners
        socket.on('live_violation', async (data: any) => {
            console.log("Live Violation Received (RAW):", data);
            if (data.details) console.log("Details Type:", typeof data.details, "Length:", data.details.length);

            // Check for Redis Reference
            if (data.details && data.details.startsWith('violation_img:')) {
                // Fetch Image Async
                socket.emit('get_violation_image', { imageKey: data.details }, (response: any) => {
                    if (response && response.imageData) {
                        // Update the violation object with the real image
                        setViolations(prev => {
                            const updated = [...prev];
                            // Find if we already added it (race condition safety)
                            const existingIndex = updated.findIndex(v => v.timestamp === data.timestamp && v.userId === data.userId);

                            if (existingIndex >= 0) {
                                updated[existingIndex] = { ...updated[existingIndex], details: response.imageData };
                                return updated;
                            } else {
                                // Add new with image
                                return [{ ...data, details: response.imageData }, ...prev];
                            }
                        });
                    }
                });

                // Add placeholder initially?
                // For simplicity, let's just add it, and if the fetch works, we update. 
                // BUT updating state async is tricky.

                // Let's Add it to state with the Key, and have a separate Effect or component resolve it?
                // Or just do it here:

                // Add initially with key (it will fail string check in render, showing text, which is fine)
                setViolations(prev => [data, ...prev]);

            } else {
                setViolations(prev => [data, ...prev]);
            }

            warning(`Violation: ${data.userId} - ${data.type}`);
        });

        return () => {
            socket.disconnect();
            if (peerRef.current) peerRef.current.destroy();
            peerRef.current = null;
        };
    }, [view, examId, warning]);

    // Stream Video Effect
    useEffect(() => {
        if (activeStream && videoRef.current) {
            videoRef.current.srcObject = activeStream.stream;
        }
    }, [activeStream]);

    const requestStream = (studentId: string) => {
        if (!socketRef.current || !peerRef.current) {
            error("Connection not ready");
            return;
        }
        info(`Requesting stream from ${studentId}...`);
        socketRef.current.emit('request_stream', {
            targetUserId: studentId,
            examId,
            teacherPeerId: peerRef.current.id // Pass my Peer ID
        });
    };

    const stats = [
        { label: "Total Students", value: students.length, color: "text-slate-800" },
        { label: "Active Now", value: students.filter(s => s.status === 'In Progress').length, color: "text-[var(--brand)]" },
        { label: "VM Detected", value: students.filter(s => s.vmDetected).length, color: "text-rose-600" },
        { label: "Flagged", value: students.filter(s => s.isHighRisk).length, color: "text-rose-500" },
        { label: "Completed", value: students.filter(s => s.status === 'Completed').length, color: "text-emerald-600" },
    ];

    const unseenCount = feedbacks.filter(f => !f.isSeen).length;

    const markAsSeen = (id: string) => {
        setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, isSeen: true } : f));
    };

    const brandColor = '#fc751b'; // Global Brand Orange
    const activeBorderClass = 'border-[var(--brand)]';
    const activeTextClass = 'text-[var(--brand)]';
    const activeBgClass = 'bg-[var(--brand)]';
    const activeShadowClass = 'shadow-[var(--brand)]/20';
    const buttonHoverClass = 'hover:text-[var(--brand)] hover:border-[var(--brand-light)]';

    if (isLoading && students.length === 0) {
        return <DashboardSkeleton type="list" userRole={userRole} noNavbar />;
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8 animate-fade-in">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <button
                                onClick={() => setView('monitor')}
                                className={`text-2xl font-extrabold tracking-tight transition-all ${view === 'monitor' ? `text-slate-900 border-b-4 ${activeBorderClass}` : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Student Activity Monitor
                            </button>
                            <span className={`px-2.5 py-0.5 text-[10px] text-white font-black rounded-lg uppercase tracking-wider animate-pulse ${activeBgClass}`}>Live</span>
                        </div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Exam: <span className="text-slate-600">JavaScript Fundamentals</span> • ID: {examId}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setView('ai-proctoring')}
                            className={`relative flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${view === 'ai-proctoring' ? `${activeBgClass} text-white border-transparent shadow-xl ${activeShadowClass}` : `bg-white border-slate-100 text-slate-600 hover:border-[var(--brand-light)] shadow-sm`}`}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 10l5 5-5 5" /><path d="M4 4v7a4 4 0 0 0 4 4h12" /></svg>
                            <span className="text-[11px] font-black uppercase tracking-widest">AI Proctoring</span>
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 animate-pulse border-2 border-white"></div>
                        </button>

                        {/* Feedback Toggle Button */}
                        <button
                            onClick={() => setView('feedback')}
                            className={`relative flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${view === 'feedback' ? `${activeBgClass} text-white border-transparent shadow-xl ${activeShadowClass}` : `bg-white border-slate-100 text-slate-600 hover:border-[var(--brand-light)] shadow-sm`}`}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                            <span className="text-[11px] font-black uppercase tracking-widest">Feedback Center</span>
                            {unseenCount > 0 && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full animate-bounce"></div>
                            )}
                        </button>

                        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Synced • <span className="text-slate-800">{new Date().toLocaleTimeString()}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {view === 'monitor' ? (
                    <>
                        {/* KPI Grid - 5 Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                            {stats.map(s => (
                                <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">{s.label}</p>
                                    <p className={`text-2xl font-black ${s.color === 'text-indigo-600' && userRole === 'admin' ? 'text-orange-600' : s.color}`}>{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Monitor Table */}
                        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 min-w-[280px]">Student Info</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Tab Out</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Tab In</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center uppercase">VM Detection</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {students.map((student) => (
                                            <tr key={student.id} className={`group transition-colors ${student.isHighRisk ? 'bg-rose-50/10 hover:bg-rose-50/20' : 'hover:bg-slate-50/30'}`}>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm ring-1 ring-black/5 ${student.vmDetected ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                                                            {student.name[0]}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-black text-slate-800 leading-none truncate mb-1">{student.name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{student.rollNumber}</span>
                                                                <span className="text-[10px] font-bold text-slate-300">•</span>
                                                                <span className="text-[10px] font-bold text-slate-400 truncate">{student.email}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-block ${student.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : student.status === 'Terminated' ? 'bg-rose-50 text-rose-600' : `bg-[var(--brand-light)] ${activeTextClass} animate-pulse`}`}>
                                                        {student.status}
                                                    </span>
                                                    <p className="text-[11px] font-black text-slate-500 uppercase mt-1.5">{student.lastActivity}</p>
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                    <MetricBadge value={student.tabOuts} danger={student.tabOuts > 0} />
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                    <MetricBadge value={student.tabIns} danger={student.tabIns > 0} />
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                    {student.vmDetected ? (
                                                        <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-[9px] font-black border border-rose-100 uppercase tracking-widest">
                                                            DETECTED
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase">SAFE</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setSelectedStudent(student)}
                                                            className={`p-2 bg-white border border-slate-100 rounded-lg text-slate-400 ${buttonHoverClass} transition-all shadow-sm`}
                                                            title="View Detailed Log"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedStudent(student)}
                                                            className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm"
                                                            title="Force Terminate Session"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    /* FEEDBACK VIEW */
                    <div className="animate-in slide-in-from-right duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-slate-800">Student Feedbacks</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{unseenCount} New Feedbacks</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {feedbacks.map((f) => (
                                <div
                                    key={f.id}
                                    onClick={() => markAsSeen(f.id)}
                                    className={`relative p-8 rounded-[32px] border transition-all cursor-pointer ${f.isSeen ? 'bg-white border-slate-100 hover:shadow-lg hover:shadow-slate-100/50' : 'bg-[var(--brand-lighter)] border-[var(--brand-light)] shadow-xl shadow-[var(--brand)]/5'}`}
                                >
                                    {!f.isSeen && (
                                        <div className={`absolute top-8 right-8 w-2.5 h-2.5 rounded-full ${activeBgClass}`}></div>
                                    )}

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-lg text-slate-400 uppercase">
                                            {f.userName[0]}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-slate-800 leading-none mb-1">{f.userName}</h3>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{f.time} • {f.userEmail}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-1 mb-4">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <svg
                                                key={star}
                                                width="16" height="16"
                                                viewBox="0 0 24 24"
                                                fill={star <= f.rating ? "#f59e0b" : "#e2e8f0"}
                                                stroke={star <= f.rating ? "#f59e0b" : "#e2e8f0"}
                                            >
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                        ))}
                                    </div>

                                    <p className="text-slate-600 text-sm font-medium leading-relaxed italic">
                                        "{f.comment}"
                                    </p>

                                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${f.isSeen ? 'text-slate-300' : 'text-[var(--brand)]'}`}>
                                            {f.isSeen ? 'Message Noted' : 'Mark as Read'}
                                        </span>
                                        <button className={`text-[10px] font-black text-slate-400 hover:text-[var(--brand)] transition-colors uppercase tracking-widest`}>
                                            Reply →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'ai-proctoring' && (
                    <div className="animate-in slide-in-from-right duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
                        {/* Left: Violation Feed */}
                        <div className="lg:col-span-1 bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Live Violations</h3>
                                <span className="bg-rose-100 text-rose-600 px-2 py-1 rounded-lg text-[10px] font-black">{violations.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {violations.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                                        <span className="text-xs font-bold uppercase tracking-widest">No Violations Yet</span>
                                    </div>
                                )}
                                {violations.map((v, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => requestStream(v.userId)}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500">
                                                {v.userId[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-800">{v.userId}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{new Date(v.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                            <span className="ml-auto text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">{v.type}</span>
                                        </div>
                                        <p className="text-xs font-medium text-slate-600 mb-3">{v.message}</p>
                                        {v.details && typeof v.details === 'string' && v.details.startsWith('data:image') && (
                                            <div className="rounded-xl overflow-hidden border border-slate-100 relative group-hover:ring-2 ring-[var(--brand)] transition-all">
                                                <img src={v.details} alt="Evidence" className="w-full h-auto object-cover opacity-80 group-hover:opacity-100" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <span className="text-[9px] font-black text-white bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">CLICK TO VIEW LIVE</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Live Stage */}
                        <div className="lg:col-span-2 bg-black rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col">
                            <div className="flex-1 relative bg-slate-900 flex items-center justify-center">
                                {activeStream ? (
                                    <video ref={videoRef} autoPlay className="w-full h-full object-contain" />
                                ) : (
                                    <div className="text-slate-600 flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center animate-pulse">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-widest text-slate-500">Select a student/violation to view live feed</p>
                                    </div>
                                )}
                            </div>

                            {/* Controls / Info Bar */}
                            <div className="h-16 bg-slate-800/80 backdrop-blur-md border-t border-slate-700 flex items-center justify-between px-6">
                                {activeStream ? (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-lg shadow-rose-500/50"></div>
                                            <span className="text-xs font-black text-white uppercase tracking-widest">Live Connection</span>
                                        </div>
                                        <button onClick={() => { setActiveStream(null); if (videoRef.current) videoRef.current.srcObject = null; }} className="text-[10px] font-black bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl uppercase tracking-widest transition-colors">
                                            End Session
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-xs font-bold text-slate-500">Waiting for connection...</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Legend/Info */}
                <div className="mt-6 flex flex-wrap gap-8 px-4">
                    <LegendItem dot="bg-rose-500" label="VM Detected / Security Alert" />
                    <LegendItem dot="bg-[var(--brand)]" label="Active Session" />
                    <LegendItem dot="bg-emerald-500" label="Successfully Completed" />
                </div>
            </main>

            {/* Detailed Student Modal (Existing) */}
            {selectedStudent && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedStudent(null)}></div>
                    <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-6">
                                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black text-2xl ${selectedStudent.vmDetected ? 'bg-rose-100 text-rose-600 shadow-xl shadow-rose-100/50' : `${activeBgClass} text-white shadow-xl ${activeShadowClass} shadow-indigo-100/50`}`}>
                                    {selectedStudent.name[0]}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 leading-none mb-1">{selectedStudent.name}</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedStudent.id} • {selectedStudent.appVersion}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                <InfoItem label="Monitors" value={`${selectedStudent.monitors} Display`} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>} />
                                <InfoItem label="Client IP" value={selectedStudent.ip} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>} />
                                <InfoItem label="Login Count" value={`${selectedStudent.loginCount} Sessions`} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" /></svg>} />
                                <InfoItem label="Sleep Duration" value={selectedStudent.sleepDuration} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>} />
                            </div>

                            {/* VM & Time Strip */}
                            <div className="flex flex-wrap gap-4 items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-[32px]">
                                <div className="flex items-center gap-4">
                                    <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${selectedStudent.vmDetected ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                                        VM: {selectedStudent.vmDetected ? `DETECTED (${selectedStudent.vmType})` : 'NONE'}
                                    </div>
                                    <div className="h-6 w-[1px] bg-slate-200"></div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase text-slate-300">Started</span>
                                            <span className="text-xs font-black text-slate-700">{selectedStudent.startTime}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase text-slate-300">Ends At</span>
                                            <span className="text-xs font-black text-slate-700">{selectedStudent.endTime}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-400">Current Health:</span>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className={`w-3 h-1.5 rounded-full ${i <= (selectedStudent.vmDetected ? 2 : 5) ? (selectedStudent.vmDetected ? 'bg-rose-400' : 'bg-emerald-400') : 'bg-slate-200'}`}></div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Event Logs */}
                            <div>
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Comprehensive Event Logs</span>
                                    <div className="h-[1px] flex-1 bg-slate-100"></div>
                                </div>
                                <div className="space-y-4">
                                    {selectedStudent.logs.map((log, idx) => (
                                        <div key={idx} className="flex items-start gap-6 p-5 rounded-[24px] border border-slate-50 bg-white hover:border-slate-100 hover:shadow-sm transition-all group">
                                            <span className="text-xs font-black text-slate-400 tabular-nums min-w-[100px]">{log.time}</span>
                                            <div className="flex-1">
                                                <p className={`text-sm font-black mb-0.5 ${log.event === 'VM Detection' || (log.event === 'Tab Switch' && log.description.includes('Out')) ? 'text-rose-600' : 'text-slate-800'}`}>
                                                    {log.event}
                                                </p>
                                                <p className="text-xs font-bold text-slate-400">{log.description}</p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className={`text-[9px] font-black uppercase bg-[var(--brand-light)] px-2.5 py-1 rounded-lg ${activeTextClass}`}>Verified</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-slate-100 bg-white flex justify-end">
                            <button
                                onClick={async () => {
                                    if (selectedStudent.status === 'Terminated') {
                                        if (confirm('Are you sure you want to un-terminate this session? The student will be able to log in again.')) {
                                            try {
                                                await TeacherService.unterminateSession(examId, selectedStudent.id);
                                                success(`Session for ${selectedStudent.name} restored successfully`);
                                                setSelectedStudent(null);
                                                const studentData = await TeacherService.getMonitoredStudents(examId);
                                                setStudents(studentData);
                                            } catch (e) {
                                                error('Failed to un-terminate session');
                                            }
                                        }
                                    } else {
                                        if (confirm('Are you sure you want to terminate this student session? They will be logged out immediately.')) {
                                            try {
                                                await TeacherService.terminateSession(examId, selectedStudent.id);
                                                success(`Session for ${selectedStudent.name} terminated successfully`);
                                                setSelectedStudent(null);
                                                const studentData = await TeacherService.getMonitoredStudents(examId);
                                                setStudents(studentData);
                                            } catch (e) {
                                                error('Failed to terminate session');
                                            }
                                        }
                                    }
                                }}
                                className={`px-10 py-3.5 text-white font-black text-[11px] uppercase tracking-[0.1em] rounded-2xl hover:scale-105 transition-all shadow-xl active:scale-95 ${selectedStudent.status === 'Terminated' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-rose-600 shadow-rose-200'}`}
                            >
                                {selectedStudent.status === 'Terminated' ? 'Restore & Unblock Session' : 'Terminate & Block Session'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

function MetricBadge({ value, danger, highlight }: any) {
    if (value === 0 && !highlight) return <span className="text-slate-300 font-bold text-xs ring-1 ring-slate-100 px-2.5 py-1 rounded-lg">0</span>;
    return (
        <span className={`px-4 py-1.5 rounded-xl font-black text-xs shadow-sm ring-1 ${danger
            ? 'bg-rose-50 text-rose-600 ring-rose-100'
            : 'bg-slate-50 text-slate-600 ring-slate-100'
            }`}>
            {value}
        </span>
    )
}

function LegendItem({ dot, label }: any) {
    return (
        <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${dot}`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        </div>
    )
}

function InfoItem({ label, value, icon }: any) {
    return (
        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white transition-all group">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-white text-slate-400 group-hover:text-[var(--brand)] transition-colors shadow-sm">
                    {icon}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            </div>
            <p className="text-base font-black text-slate-800">{value}</p>
        </div>
    )
}
