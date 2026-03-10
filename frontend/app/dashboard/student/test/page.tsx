"use client";
import React, { useState, useEffect } from "react";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";
import Navbar from "@/app/components/Navbar";
import { StudentService } from "@/services/api/StudentService";

export default function TestAttemptsPage() {
    const [attempts, setAttempts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadAttempts() {
            try {
                const data = await StudentService.getAttempts();
                setAttempts(data);
            } catch (error) {
                console.error('Failed to load attempts', error);
            } finally {
                setLoading(false);
            }
        }
        loadAttempts();
    }, []);

    if (loading) {
        return <DashboardSkeleton type="list" userRole="student" />;
    }
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[var(--brand-light)] selection:text-[var(--brand-dark)]">
            <Navbar />

            {/* SUB-HEADER / TAB SECTION */}
            <div className="border-b border-slate-100">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex items-center gap-10">
                    <button className="py-4 text-sm font-black text-[var(--brand)] border-b-2 border-[var(--brand)] px-1">
                        Test Attempts
                    </button>
                </div>
            </div>

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8 animate-fade-in">

                {/* TABLE CONTAINER */}
                <div className="overflow-hidden bg-white border border-slate-100 rounded-xl shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 w-1/2">
                                    <div className="flex items-center gap-2">
                                        Tests
                                        <SortIcon />
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">
                                    <div className="flex items-center gap-2">
                                        Scores
                                        <SortIcon />
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">
                                    Time taken
                                </th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">
                                    <div className="flex items-center gap-2">
                                        Submitted
                                        <SortIcon />
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {attempts.length > 0 ? attempts.map((att) => (
                                <tr key={att.id} className="hover:bg-slate-50/40 transition-colors group">
                                    <td className="px-6 py-5">
                                        {att.isPublished ? (
                                            <a
                                                href={`/dashboard/student/test/${att.id}/result`}
                                                className="text-sm font-bold text-[var(--brand-dark)] hover:text-[var(--brand)] cursor-pointer transition-colors block"
                                            >
                                                {att.examTitle}
                                            </a>
                                        ) : (
                                            <span className="text-sm font-bold text-slate-400 cursor-not-allowed block" title="Results pending">
                                                {att.examTitle}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`text-sm font-bold ${att.score === 'Hidden' ? 'text-slate-300 italic' : 'text-slate-700'}`}>
                                            {att.score || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-sm font-medium text-slate-500">{att.duration} min</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-sm font-medium text-slate-500">
                                            {att.startedAt ? new Date(att.startedAt).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        {att.isPublished ? (
                                            <a
                                                href={`/dashboard/student/test/${att.id}/result`}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[var(--brand)] bg-[var(--brand-light)]/10 hover:bg-[var(--brand-light)]/20 rounded-lg transition-colors"
                                            >
                                                View Result
                                            </a>
                                        ) : (
                                            <span className="text-xs font-medium text-slate-400 italic">
                                                Pending
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-medium">
                                        No test attempts found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                <div className="mt-8 flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                        <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <div className="w-8 h-8 rounded-lg bg-white border-2 border-[var(--brand)] flex items-center justify-center text-[var(--brand)] font-black text-sm">
                            1
                        </div>
                        <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                        <div className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors">
                            <span className="text-xs font-bold text-slate-600">10 / page</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function SortIcon() {
    return (
        <div className="flex flex-col gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </div>
    );
}
