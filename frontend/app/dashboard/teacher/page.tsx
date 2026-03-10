"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import EnrollmentModal from "@/app/components/Common/EnrollmentModal";
import CourseDetailsView from "@/app/components/Features/Courses/CourseDetailsView";
import { TeacherService } from "@/services/api/TeacherService";
import { requireAuthClient } from "@/hooks/requireAuthClient";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";
import { AuthService } from "@/services/api/AuthService";
import { useQuery } from "@/hooks/useQuery";

export default function TeacherDashboardPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [tab, setTab] = useState<'Published' | 'Draft'>('Published');
    const [enrollmentModal, setEnrollmentModal] = useState<{ isOpen: boolean; courseTitle: string; courseId: string }>({
        isOpen: false,
        courseTitle: "",
        courseId: ""
    });
    const [viewingCourse, setViewingCourse] = useState<any | null>(null);
    const [userData, setUserData] = useState<any>(null);

    // Auth
    useEffect(() => {
        requireAuthClient("/login");
        setUserData(AuthService.getUser());
    }, []);

    const { data, isLoading: loading } = useQuery('teacher-dashboard', async () => {
        const [modulesData, statsData, recentData] = await Promise.all([
            TeacherService.getModules(),
            TeacherService.getStats(),
            TeacherService.getRecentSubmissions()
        ]);
        return {
            modules: modulesData,
            stats: statsData,
            recent: recentData
        };
    });

    const modules: any[] = data?.modules || [];
    const stats = data?.stats || null;
    const recentParams = data?.recent || [];

    const filteredModules = modules
        .filter((m: any) => m.status === tab)
        .filter((m: any) => m.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading && !stats) return <DashboardSkeleton type="main" userRole="teacher" />;

    const canCreateCourses = userData?.features?.canCreateCourses !== false;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[var(--brand-light)] selection:text-[var(--brand-dark)]">
            <Navbar userRole="teacher" />

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in">

                <div className="flex flex-col lg:flex-row gap-12">

                    {/* LEFT: MODULES MANAGEMENT */}

                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-2xl font-black tracking-tight text-slate-800">My Modules</h2>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search modules..."
                                        className="w-64 pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[var(--brand)] transition-all shadow-sm"
                                    />
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                    </span>
                                </div>
                                {canCreateCourses ? (
                                    <Link href="/dashboard/teacher/courses/create" className="px-6 py-3 bg-[var(--brand)] text-white font-black text-sm rounded-2xl shadow-lg shadow-[var(--brand)]/20 hover:scale-105 transition-all active:scale-95">
                                        Create New Module
                                    </Link>
                                ) : (
                                    <div className="px-6 py-3 bg-slate-100 text-slate-400 font-black text-sm rounded-2xl flex items-center gap-3 cursor-not-allowed opacity-50 border border-slate-200">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                        Creation Locked
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs for Published/Drafts */}
                        <div className="flex gap-4 mb-6">
                            <button
                                className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${tab === 'Published' ? 'bg-[var(--brand)] text-white' : 'bg-slate-100 text-slate-500'}`}
                                onClick={() => setTab('Published')}
                            >
                                Published
                            </button>
                            <button
                                className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${tab === 'Draft' ? 'bg-[var(--brand)] text-white' : 'bg-slate-100 text-slate-500'}`}
                                onClick={() => setTab('Draft')}
                            >
                                Drafts
                            </button>
                        </div>

                        <div className="space-y-4">
                            {filteredModules.length === 0 ? (
                                <div className="text-slate-400 text-sm font-bold">No {tab === 'Published' ? 'published' : 'draft'} modules found.</div>
                            ) : filteredModules.map((m) => (
                                <div key={m.slug} className="block bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:border-[var(--brand-light)] hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-black text-slate-800">{m.title}</h3>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${m.status === 'Published' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {m.status}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{m.students} Students Enrolled • Updated {m.lastUpdated}</p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <ActionBtn
                                                label="View"
                                                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
                                                onClick={() => setViewingCourse({ ...m, studentsCount: m.students })}
                                            />
                                            <Link href={`/dashboard/teacher/courses/${m.id}/edit`}>
                                                <ActionBtn label="Edit" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>} />
                                            </Link>
                                            <ActionBtn
                                                label="Enroll"
                                                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>}
                                                onClick={() => setEnrollmentModal({ isOpen: true, courseTitle: m.title, courseId: m.id })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: SIDEBAR */}
                    <aside className="w-full lg:w-80 space-y-6">
                        <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">Recent Submissions</h3>
                            <div className="space-y-6">
                                <div className="space-y-6">
                                    {recentParams.length > 0 ? recentParams.map((sub: any) => (
                                        <SubmissionItem key={sub.id} name={sub.name} module={sub.module} time={sub.time ? new Date(sub.time).toLocaleTimeString() : 'Just now'} status={sub.status} />
                                    )) : <div className="text-slate-400 text-sm font-bold">No recent activity.</div>}
                                </div>
                            </div>
                            <button className="w-full mt-8 py-3 bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-colors">
                                View All Activity
                            </button>
                        </div>
                    </aside>

                </div>
            </main>

            <EnrollmentModal
                isOpen={enrollmentModal.isOpen}
                onClose={() => setEnrollmentModal({ ...enrollmentModal, isOpen: false })}
                courseTitle={enrollmentModal.courseTitle}
                courseId={enrollmentModal.courseId}
                onEnroll={(students) => {
                    console.log("Enrolling students:", students);
                    // Refresh modules if needed
                }}
            />

            <CourseDetailsView
                isOpen={!!viewingCourse}
                onClose={() => setViewingCourse(null)}
                course={viewingCourse}
                userRole="teacher"
            />
        </div>
    );
}

function ActionBtn({ label, icon, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-[var(--brand-light)] hover:text-[var(--brand)] transition-all text-xs font-black uppercase tracking-widest group"
        >
            {icon}
            {label}
        </button>
    )
}

function SubmissionItem({ name, module, time, status }: any) {
    const displayName = name || "Unknown User";
    const initial = displayName.charAt(0);

    return (
        <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs shrink-0">
                {initial}
            </div>
            <div>
                <p className="text-sm font-black text-slate-800 leading-none mb-1">{displayName}</p>
                <p className="text-[10px] font-bold text-slate-400 mb-2">{module}</p>
                <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-slate-300 uppercase">{time}</span>
                    <span className={`text-[9px] font-black uppercase ${status === 'Pending' ? 'text-amber-500' : 'text-emerald-500'}`}>{status}</span>
                </div>
            </div>
        </div>
    )
}
