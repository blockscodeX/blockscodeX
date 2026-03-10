"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";
import { Eye, Lock } from "lucide-react";
import ExamDetailsModal from "@/app/components/Features/Exams/ExamDetailsModal";
import { TeacherService } from "@/services/api/TeacherService";
import { AuthService } from "@/services/api/AuthService";

export default function TeacherExamsPage() {
    const [activeTab, setActiveTab] = useState("all");
    const [viewingExam, setViewingExam] = useState<any>(null);
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        const user = AuthService.getUser();
        setUserData(user);

        async function load() {
            try {
                const data = await TeacherService.getExams();
                setExams(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const orgPermissions = userData?.features || { canCreateExams: true };

    const filteredExams = exams.filter(e => {
        if (activeTab === 'all') return true;
        if (activeTab === 'live') return e.isActive;
        if (activeTab === 'draft') return !e.isActive;
        return true;
    });

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[var(--brand-light)] selection:text-[var(--brand-dark)]">
            <Navbar userRole="teacher" />

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Exam Management</h1>
                        <p className="text-slate-400 font-bold text-sm mt-1">Create, monitor and evaluate student assessments.</p>
                    </div>
                    {orgPermissions.canCreateExams ? (
                        <Link href="/dashboard/teacher/exams/new" className="px-8 py-4 bg-[var(--brand)] text-white font-black text-sm rounded-2xl shadow-xl shadow-[var(--brand)]/20 hover:scale-105 transition-all active:scale-95">
                            New Examination
                        </Link>
                    ) : (
                        <div className="px-8 py-4 bg-slate-100 text-slate-400 font-black text-sm rounded-2xl flex items-center gap-3 cursor-not-allowed opacity-50">
                            <Lock size={18} />
                            Creation Locked
                        </div>
                    )}
                </div>

                {/* TABS CONTROLS */}
                <div className="flex items-center gap-8 border-b border-slate-100 mb-10 overflow-x-auto no-scrollbar">
                    <TabItem active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All Exams" count={exams.length} />
                    <TabItem active={activeTab === 'live'} onClick={() => setActiveTab('live')} label="Live Now" count={exams.filter(e => e.isActive).length} />
                    <TabItem active={activeTab === 'draft'} onClick={() => setActiveTab('draft')} label="Drafts" count={exams.filter(e => !e.isActive).length} />
                </div>

                {/* EXAMS TABLE */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <DashboardSkeleton type="list" userRole="teacher" noNavbar />
                    ) : filteredExams.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-black uppercase tracking-widest">No Exams Found</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Exam Details</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Questions</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredExams.map((exam) => (
                                    <tr key={exam.id} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="px-8 py-6">
                                            <p className="text-base font-black text-slate-800">{exam.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{exam.slug}</p>
                                                {exam.testCode && (
                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500">
                                                        <Lock size={10} /> {exam.testCode}
                                                    </div>
                                                )}
                                                {exam.examMode && (
                                                    <div className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${exam.examMode === 'App' ? 'bg-indigo-50 text-indigo-500' : 'bg-blue-50 text-blue-500'}`}>
                                                        {exam.examMode}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="text-sm font-black text-slate-700">{Array.isArray(exam.questions) ? exam.questions.length : 0} Sections</div>
                                            <div className="flex items-center justify-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-bold text-slate-400">{exam.duration} mins</span>
                                                {exam.totalMarks && <span className="text-[10px] font-black text-[var(--brand)]">{exam.totalMarks} Marks</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center">
                                                <StatusBadge status={exam.isActive ? 'Published' : 'Draft'} />
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <ExamAction
                                                    onClick={() => setViewingExam(exam)}
                                                    label="View"
                                                    icon={<Eye size={14} strokeWidth={2.5} />}
                                                />
                                                <Link href={`/dashboard/teacher/exams/${exam.id}/edit`}>
                                                    <ExamAction
                                                        label="Edit"
                                                        variant="brand"
                                                        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>}
                                                    />
                                                </Link>
                                                <Link href={`/dashboard/teacher/exams/${exam.id}/monitor`}>
                                                    <ExamAction
                                                        label="Monitor"
                                                        variant="accent"
                                                        active={exam.isActive}
                                                        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>}
                                                    />
                                                </Link>
                                                <Link href={`/dashboard/teacher/exams/${exam.id}/results`}>
                                                    <ExamAction
                                                        label="Results"
                                                        variant="success"
                                                        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>}
                                                    />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* MODAL OVERLAY */}
                {viewingExam && (
                    <ExamDetailsModal exam={viewingExam} onClose={() => setViewingExam(null)} userRole="teacher" />
                )}

                <style jsx>{`
                    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes zoom-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                    .animate-fade-in { animation: fade-in 0.3s ease-out; }
                    .animate-zoom-in { animation: zoom-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
                `}</style>
            </main>
        </div>
    );
}

function TabItem({ active, onClick, label, count }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 pb-4 transition-all border-b-2 relative whitespace-nowrap ${active ? 'border-[var(--brand)] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
            <span className="text-sm font-black uppercase tracking-widest">{label}</span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'bg-slate-50 text-slate-400'}`}>
                {count}
            </span>
        </button>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        Published: "bg-emerald-50 text-emerald-600 border-emerald-100",
        Monitor: "bg-[var(--brand-light)] text-[var(--brand)] border-[var(--brand-light)] animate-pulse",
        Draft: "bg-slate-50 text-slate-400 border-slate-100"
    };
    return (
        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>
            {status}
        </span>
    )
}

function ExamAction({ label, icon, active, variant = 'default', onClick }: any) {
    const variants: any = {
        default: 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600',
        brand: 'bg-[var(--brand-light)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white',
        accent: 'bg-[var(--brand-light)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white',
        success: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white',
    };

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all relative group shadow-sm border border-black/5 ${active ? 'bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/20 border-transparent' : variants[variant]}`}
        >
            {icon}
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </button>
    );
}
