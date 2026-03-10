"use client";
import React from 'react';
import { BRAND } from '../../constants/brand';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useOrganization } from '@/app/context/OrganizationContext';
import Loading from '@/app/loading';
import { examLoginAction } from '@/actions/examAuth';
import { ExamService } from '@/services/api/ExamService';

export default function ExamLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(false);
    const [isCheckingStatus, setIsCheckingStatus] = useState(true); // Start true to prevent flicker
    const [password, setPassword] = useState('');
    const [rollNo, setRollNo] = useState('');
    const [testCode, setTestCode] = useState('');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [section, setSection] = useState('');
    const [error, setError] = useState('');

    const { organization: orgContext } = useOrganization();
    const [examInfo, setExamInfo] = useState<any>(null);
    const slugFromQuery = searchParams?.get('slug');

    const displayName = orgContext?.name || BRAND.name;
    const displayLogo = orgContext?.logo || BRAND.logoImage;

    useEffect(() => {
        if (slugFromQuery) {
            const fetchExam = async () => {
                try {
                    const data = await ExamService.getExamPublicStatus(slugFromQuery!);
                    setExamInfo(data);

                    // Check if exam hasn't started yet
                    if (data.startTime) {
                        const start = new Date(data.startTime).getTime();
                        if (Date.now() < start) {
                            router.push(`/exam/waiting?slug=${slugFromQuery}`);
                            return; // Do NOT set isCheckingStatus to false, keep loading while redirecting
                        }
                    }
                    setIsCheckingStatus(false);
                } catch (err: any) {
                    if (err.status === 401 || err.message?.includes('401') || err.message?.includes('Access denied')) {
                        setError('Network Not Allowed.');
                    } else {
                        setError('Failed to load exam information. Please check the URL or try again later.');
                    }
                    setIsCheckingStatus(false);
                }
            };
            fetchExam();
        } else {
            setIsCheckingStatus(false);
        }
    }, [slugFromQuery]);

    React.useEffect(() => {
        const errorType = searchParams?.get('error');
        if (errorType === 'active_session') {
            setError('This exam is already active in another tab or device. Please close other instances and wait 2 minutes to retry.');
        } else if (errorType === 'duplicate_login') {
            setError('You have been logged out because a new session was started on another tab or device.');
        } else if (errorType === 'suspended') {
            setError('Your account has been suspended. Please contact the administrator.');
        } else if (errorType === 'terminated') {
            setError('Your exam session has been terminated by the administrator. Contact your teacher.');
        } else if (errorType === 'ip_blocked') {
            setError('Network Not Allowed.');
        } else if (errorType === 'not_student') {
            setError('Access Denied: Only Student accounts can access exams. Please log in with a student account or use an incognito window.');
        }
    }, [searchParams]);

    const handleLogin = async () => {
        if (!email || !testCode || !rollNo || !name) {
            setError('Email, Test Code, Roll Number, and Full Name are required');
            return;
        }
        setLoading(true);
        setError('');
        try {
            // Secure Server Action - Sets HttpOnly Cookie
            const result = await examLoginAction(email, testCode, password);

            if (!result.success) {
                throw new Error(result.error);
            }

            const data = result; // maintain structure

            // Store user object for client-side context (ExamPage checks this)
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            const targetSlug = data.exam?.slug || slugFromQuery;
            if (targetSlug) {
                // Store student metadata for session initialization (Non-sensitive display info)
                const metadata = { rollNumber: rollNo, name, section };
                localStorage.setItem(`exam_${targetSlug}_metadata`, JSON.stringify(metadata));

                // Set mandatory auth marker (just a UI flag, real auth is cookie)
                localStorage.setItem(`exam_${targetSlug}_auth`, 'true');

                // Use replace to prevent going back to login page
                router.replace(`/exam/${targetSlug}`);
            } else {
                router.push('/exam');
            }
        } catch (err: any) {
            if (err.message && (err.message.includes('EXAM_ALREADY_ACTIVE') || err.message.includes('409'))) {
                setError('This exam is already active on another device or tab. Please close other instances and wait 2 minutes to retry.');
            } else if (err.message && err.message.includes('EXAM_ALREADY_SUBMITTED')) {
                setError('You have already attempted and submitted this exam. Multiple attempts are not allowed.');
            } else if (err.message && err.message.includes('ACCOUNT_SUSPENDED')) {
                setError('Your account has been suspended. Please contact the administrator.');
            } else {
                setError(err.message || 'Login failed');
            }
        } finally {
            setLoading(false);
        }
    };



    if (isCheckingStatus) {
        return <Loading />;
    }

    return (
        <div className="h-screen w-full bg-slate-50 flex items-center justify-center font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col md:flex-row bg-white overflow-hidden shadow-2xl">
                {/* Left Side: Login Form */}
                <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white relative z-10">
                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-10">
                            {/* Brand Logo - Same as Navbar */}
                            <div className="flex items-center gap-2.5 mb-8">
                                {displayLogo ? (
                                    <img src={displayLogo} alt="Logo" className="w-10 h-10 object-contain shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-[var(--brand)] flex items-center justify-center overflow-hidden shrink-0">
                                        <span className="text-white font-black text-sm">{BRAND.logoText}</span>
                                    </div>
                                )}
                                <span className="text-2xl font-black text-slate-800 tracking-tighter">
                                    {displayName}
                                    {!orgContext && <span className="text-[var(--brand)]">{BRAND.suffix}</span>}
                                </span>
                            </div>

                            <h1 className="text-3xl font-black text-slate-900 mb-2">Student Login</h1>
                            <p className="text-slate-500 font-medium">Enter your details to access the exam</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-shake">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                {error}
                            </div>
                        )}

                        <form className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                                        Roll Number
                                    </label>
                                    <input
                                        type="text"
                                        value={rollNo}
                                        onChange={(e) => setRollNo(e.target.value)}
                                        className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-sm"
                                        placeholder="e.g. 210056"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                        Section
                                    </label>
                                    <input
                                        type="text"
                                        value={section}
                                        onChange={(e) => setSection(e.target.value)}
                                        className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-sm"
                                        placeholder="e.g. A"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-sm"
                                    placeholder="Type your full name"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your registered email"
                                    className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 tracking-widest text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
                                        Test Code
                                    </label>
                                    <input
                                        type="text"
                                        value={testCode}
                                        onChange={(e) => setTestCode(e.target.value)}
                                        className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-sm"
                                        placeholder="e.g. JS-TEST-01"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleLogin}
                                disabled={loading}
                                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? (
                                    <span>Verifying...</span>
                                ) : (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
                                        Start Exam
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Side: Info Panel & Illustration */}
                <div className="w-full md:w-1/2 bg-[#4F46E5] p-8 md:p-12 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                    <div className="relative z-10 w-full">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-wide mb-6">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
                            Secure Exam Portal
                        </div>
                        <h2 className="text-5xl font-black tracking-tight mb-2 leading-tight">
                            {examInfo?.title || "Secure Examination"}
                        </h2>
                        <p className="text-indigo-100 font-medium text-lg mb-10">Please authenticate to begin your examination</p>

                        {/* Exam Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 relative z-10 max-w-sm">
                            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                                <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Total Sections</p>
                                <p className="text-xl font-black">{examInfo?.totalSections || "--"}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                                <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Questions</p>
                                <p className="text-xl font-black">{examInfo?.totalQuestions || "--"}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                                <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Duration</p>
                                <p className="text-xl font-black">{examInfo?.duration || "--"} <span className="text-xs font-bold">MIN</span></p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                                <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Total Marks</p>
                                <p className="text-xl font-black">{examInfo?.totalMarks || "--"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Illustration */}
                    <div className="relative z-10 w-full flex justify-center mt-12">
                        <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm drop-shadow-2xl opacity-90">
                            {/* Browser Window */}
                            <rect x="50" y="50" width="300" height="200" rx="8" fill="#EEF2FF" />
                            <path d="M50 58C50 53.5817 53.5817 50 58 50H342C346.418 50 350 53.5817 350 58V70H50V58Z" fill="#E0E7FF" />
                            <circle cx="70" cy="60" r="3" fill="#A5B4FC" />
                            <circle cx="80" cy="60" r="3" fill="#A5B4FC" />
                            <circle cx="90" cy="60" r="3" fill="#A5B4FC" />

                            {/* Content Blocks */}
                            <rect x="80" y="90" width="140" height="8" rx="2" fill="#C7D2FE" />
                            <rect x="80" y="110" width="200" height="4" rx="2" fill="#E0E7FF" />
                            <rect x="80" y="120" width="180" height="4" rx="2" fill="#E0E7FF" />
                            <rect x="80" y="130" width="160" height="4" rx="2" fill="#E0E7FF" />

                            {/* Verified Shield Floating */}
                            <g transform="translate(260, 160)">
                                <circle cx="0" cy="0" r="30" fill="#4F46E5" stroke="white" strokeWidth="3" />
                                <path d="M-8 0 L-2 6 L 8 -6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </g>

                            {/* Decorative Elements */}
                            <circle cx="320" cy="80" r="4" fill="#818CF8" />
                            <path d="M300 220 L320 230 L310 240" stroke="#818CF8" strokeWidth="2" fill="none" />
                        </svg>
                    </div>

                    <div className="pt-8 border-t border-white/10 relative z-10">
                        <p className="text-xs text-indigo-300 leading-relaxed text-center opacity-70">
                            Protected by secure proctoring standards.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
