"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BRAND } from '../../constants/brand';
import { useOrganization } from '../../context/OrganizationContext';

export default function ExamWaitingRoom() {
    const router = useRouter();
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const slug = searchParams?.get('slug');
    const { organization: orgContext } = useOrganization();

    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [examTitle, setExamTitle] = useState('Exam');
    const [loading, setLoading] = useState(true);

    // Use organization branding if available, otherwise fallback to BRAND
    const displayName = orgContext?.name || BRAND.name;
    const displayLogo = orgContext?.logo || BRAND.logoImage;
    const showSuffix = !orgContext; // Hide suffix if custom branding

    useEffect(() => {
        if (!slug) {
            setLoading(false);
            return;
        }

        const fetchStatus = async () => {
            try {
                // Determine API URL based on environment or import AuthService/ExamService
                // Assuming ExamService is available in global scope or imported.
                // We need to import ExamService.
                // Since I cannot change imports in this chunk easily without context, 
                // I will assume I can add the import at the top or use fetch directly.
                // using fetch directly for safety if imports are tricky in replace_block

                const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
                const res = await fetch(`${BASE_URL}/exam/${slug}/public-status`);
                if (res.ok) {
                    const data = await res.json();
                    setExamTitle(data.title);

                    const startTime = new Date(data.startTime).getTime();
                    const now = Date.now();
                    const diffSeconds = Math.floor((startTime - now) / 1000);

                    if (diffSeconds <= 0) {
                        router.push(`/exam/login?slug=${slug}`);
                        return; // Prevent setLoading(false)
                    } else {
                        setTimeLeft(diffSeconds);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                // If we are redirecting, we don't want to set loading to false
                // because it might cause a flicker before the next page loads.
                // However, router.push is async-ish in terms of effect.
                // In waiting room, it's safer to just let it be if it's already loading.
            }
            setLoading(false);
        };

        fetchStatus();
    }, [slug, router]);

    useEffect(() => {
        if (timeLeft === null) return;
        if (timeLeft <= 0) {
            router.push(`/exam/login?slug=${slug}`);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null || prev <= 0) return 0;
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, router, slug]);

    const formatTime = (seconds: number) => {
        if (seconds < 0) return "00:00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-screen w-full bg-slate-50 flex items-center justify-center font-sans overflow-hidden relative">

            {/* Minimal Header with Logo */}
            <div className="absolute top-0 left-0 w-full p-8 z-20">
                <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${!displayLogo ? 'bg-[var(--brand)]' : ''}`}>
                        {displayLogo ? (
                            <img src={displayLogo} alt="Logo" className="w-full h-full object-contain p-0.5" />
                        ) : (
                            <span className="text-white font-black text-xs">{BRAND.logoText}</span>
                        )}
                    </div>
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">
                        {displayName}
                        {showSuffix && <span className="text-[var(--brand)]">{BRAND.suffix}</span>}
                    </span>
                </div>
            </div>

            <div className="max-w-4xl w-full flex flex-col items-center justify-center text-center px-6 relative z-10">
                <div className="space-y-12">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold tracking-wider uppercase mb-8">
                            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                            Exam Waiting Room
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                            {examTitle} <br className="hidden md:block" /> starts in...
                        </h1>
                        <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto leading-relaxed">
                            {loading ? "Checking exam status..." : "Please stay on this page. You will be automatically redirected to the secure login portal when the timer hits zero."}
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Time Remaining</div>
                        <div className="inline-block relative">
                            <div className="text-8xl md:text-9xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                                {timeLeft !== null ? formatTime(timeLeft) : "--:--:--"}
                            </div>
                            {/* Static underline decoration */}
                            <div className="h-2 w-full bg-indigo-100 mt-4 rounded-full overflow-hidden mx-auto max-w-[50%]">
                                <div className="h-full bg-indigo-600 w-full rounded-full opacity-50" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 w-full text-center">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest opacity-60">
                    {displayName} {showSuffix && BRAND.suffix} © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
