"use client";
import React, { useState } from "react";
import Navbar from "@/app/components/Navbar";
import { siteConfig } from "@/app/config/site";
import Link from "next/link";
import { Search, Filter, Shield, BookOpen, MoreVertical, Play, Eye, Edit3, CheckCircle2, AlertCircle, Users, Activity, UserPlus, Lock } from "lucide-react";
import CourseDetailsView from "@/app/components/Features/Courses/CourseDetailsView";
import ExamDetailsModal from "@/app/components/Features/Exams/ExamDetailsModal";
import EnrollmentModal from "@/app/components/Common/EnrollmentModal";

import { AdminService } from "@/services/api/AdminService";
import { AuthService } from "@/services/api/AuthService";
import { useEffect } from "react";

interface AdminExamsViewProps {
    basePath?: string;
    organizationId?: string;
    orgPermissions?: {
        canCreateExams?: boolean;
        canCreateCourses?: boolean;
        allowAppExams?: boolean;
        allowAIProctoring?: boolean;
        allowCourseTests?: boolean;
    };
}

export default function AdminExamsView({ basePath = '/dashboard/admin', organizationId }: AdminExamsViewProps) {
    const [activeTab, setActiveTab] = useState<'exams' | 'courses'>('exams');
    const [searchQuery, setSearchQuery] = useState("");
    const [viewingCourse, setViewingCourse] = useState<any | null>(null);
    const [viewingExam, setViewingExam] = useState<any | null>(null);
    const [enrollingCourse, setEnrollingCourse] = useState<any | null>(null);
    const [exams, setExams] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        const user = AuthService.getUser();
        setUserData(user);

        async function load() {
            try {
                const [ex, cr] = await Promise.all([
                    AdminService.getExams(organizationId),
                    AdminService.getCourses(organizationId)
                ]);
                setExams(ex);
                setCourses(cr);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [organizationId]);

    const orgPermissions = userData?.features || { canCreateExams: true, canCreateCourses: true, allowCourseTests: true };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            <Navbar basePath={basePath} userRole="admin" />

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Examinations & Content</h1>
                        <p className="text-slate-400 font-bold text-sm mt-1">Global control over all assessments and learning modules.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-8 border-b border-slate-100 mb-10">
                    <button
                        onClick={() => setActiveTab('exams')}
                        className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'exams' ? 'text-[var(--brand)]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Total Examinations
                        {activeTab === 'exams' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--brand)] rounded-full animate-fade-in" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('courses')}
                        className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'courses' ? 'text-[var(--brand)]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Active Courses
                        {activeTab === 'courses' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--brand)] rounded-full animate-fade-in" />}
                    </button>
                </div>

                {/* Search & Action Bar */}
                <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-[var(--brand)] shadow-sm transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-all shadow-sm">
                            <Filter size={14} /> Filter
                        </button>
                        {activeTab === 'exams' ? (
                            orgPermissions.canCreateExams ? (
                                <Link
                                    href={`${basePath}/exams/new`}
                                    className="px-8 py-4 bg-slate-900 text-white font-black text-sm rounded-2xl shadow-xl shadow-slate-200 flex items-center gap-3 hover:scale-105 transition-all active:scale-95"
                                >
                                    <Shield size={18} />
                                    Create Exam
                                </Link>
                            ) : (
                                <div className="px-8 py-4 bg-slate-100 text-slate-400 font-black text-sm rounded-2xl flex items-center gap-3 cursor-not-allowed opacity-50">
                                    <Lock size={18} />
                                    Exam Creation Locked
                                </div>
                            )
                        ) : (
                            (orgPermissions.canCreateCourses && orgPermissions.allowCourseTests) ? (
                                <Link
                                    href={`${basePath}/courses/create`}
                                    className="px-8 py-4 bg-slate-900 text-white font-black text-sm rounded-2xl shadow-xl shadow-slate-200 flex items-center gap-3 hover:scale-105 transition-all active:scale-95"
                                >
                                    <BookOpen size={18} />
                                    Create Course
                                </Link>
                            ) : (
                                <div className="px-8 py-4 bg-slate-100 text-slate-400 font-black text-sm rounded-2xl flex items-center gap-3 cursor-not-allowed opacity-50">
                                    <Lock size={18} />
                                    Course Creation Locked
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Content Table */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{activeTab === 'exams' ? 'Examination' : 'Course'}</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned In charge</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{activeTab === 'exams' ? 'Candidate Count' : 'Curriculum Size'}</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Current Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {activeTab === 'exams' ? (
                                    exams.filter(ex => ex.title.toLowerCase().includes(searchQuery.toLowerCase())).map((ex) => (
                                        <tr key={ex.id} className="hover:bg-slate-50/50 transition-all group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${ex.status === 'Live' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
                                                        <Shield size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-800">{ex.title}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ex.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-[10px] uppercase">
                                                        {(ex.creator?.name || 'S')[0]}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <p className="text-xs font-black text-slate-700 leading-none mb-0.5">{ex.creator?.name || 'System Admin'}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 lowercase">{ex.creator?.email || siteConfig.contactEmail}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-black text-slate-700">{ex._count?.submissions || 0} Attempts</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <StatusBadge status={ex.isActive ? 'Active' : 'Inactive'} subtext={new Date(ex.createdAt).toLocaleDateString()} />
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setViewingExam(ex)}
                                                        className="p-2 text-slate-300 hover:text-[var(--brand)] hover:bg-slate-50 rounded-xl transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <Link href={`${basePath}/exams/${ex.id}/monitor`}>
                                                        <button className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-rose-100 transition-all">
                                                            <Activity size={14} /> Monitor Live
                                                        </button>
                                                    </Link>
                                                    <Link href={`${basePath}/exams/${ex.id}/results`}>
                                                        <button className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Results">
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>
                                                        </button>
                                                    </Link>
                                                    <Link href={`${basePath}/exams/${ex.id}/edit`}>
                                                        <button className="p-2 text-slate-300 hover:text-[var(--brand)] hover:bg-slate-50 rounded-xl transition-all">
                                                            <Edit3 size={18} />
                                                        </button>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    courses.filter(cr => cr.title.toLowerCase().includes(searchQuery.toLowerCase())).map((cr) => (
                                        <tr key={cr.id} className="hover:bg-slate-50/50 transition-all group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-[var(--brand-light)] text-[var(--brand)] flex items-center justify-center">
                                                        <BookOpen size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-800">{cr.title}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cr.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-[10px] uppercase">
                                                        {(cr.creator?.name || 'S')[0]}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <p className="text-xs font-black text-slate-700 leading-none mb-0.5">{cr.creator?.name || 'System Admin'}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 lowercase">{cr.creator?.email || siteConfig.contactEmail}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-black text-slate-700">{cr._count?.modules || 0} Sections • {cr._count?.students || 0} Enrolled</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cr.status === 'Published' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {cr.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setViewingCourse(cr)}
                                                        className="p-2 text-slate-300 hover:text-[var(--brand)] hover:bg-slate-50 rounded-xl transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEnrollingCourse(cr)}
                                                        className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                        title="Enroll Users"
                                                    >
                                                        <UserPlus size={18} />
                                                    </button>
                                                    <Link href={`${basePath}/courses/${cr.id}/edit`}>
                                                        <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all" title="Edit Course">
                                                            <Edit3 size={18} />
                                                        </button>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
            <CourseDetailsView
                isOpen={!!viewingCourse}
                onClose={() => setViewingCourse(null)}
                course={viewingCourse}
                userRole="admin"
            />
            {viewingExam && (
                <ExamDetailsModal
                    exam={viewingExam}
                    onClose={() => setViewingExam(null)}
                    userRole="admin"
                />
            )}
            {enrollingCourse && (
                <EnrollmentModal
                    isOpen={!!enrollingCourse}
                    onClose={() => setEnrollingCourse(null)}
                    courseTitle={enrollingCourse.title}
                    courseId={enrollingCourse.id}
                    onEnroll={(data) => {
                        console.log('Admin Enrolled:', data);
                        setEnrollingCourse(null);
                    }}
                />
            )}
        </div>
    );
}

function StatusBadge({ status, subtext }: { status: string, subtext: string }) {
    const isLive = status === 'Live';
    const isComp = status === 'Completed';
    return (
        <div>
            <div className="flex items-center gap-2 mb-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-rose-500 animate-pulse' : isComp ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                <span className={`text-[11px] font-black uppercase tracking-widest ${isLive ? 'text-rose-600' : isComp ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {status}
                </span>
            </div>
            <p className="text-[10px] font-bold text-slate-300 uppercase leading-none">{subtext}</p>
        </div>
    );
}
