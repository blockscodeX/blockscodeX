"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/app/components/Navbar";
import { useRouter } from "next/navigation";
import { TeacherService } from "@/services/api/TeacherService";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";
import { useToast } from "@/app/components/Common/Toast";
import { useDebounce } from "@/hooks/useDebounce";
import { Users, GraduationCap, X, Search, Filter, Mail, Calendar, CheckCircle2, Trash2, ClipboardList, Megaphone } from "lucide-react";
import GroupsTab from "@/app/components/Teacher/GroupsTab";
import AnnouncementsTab from "@/app/components/Teacher/AnnouncementsTab";

type Tab = "roster" | "groups" | "announcements";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "roster", label: "Student Roster", icon: <GraduationCap size={15} /> },
    { key: "groups", label: "Groups", icon: <Users size={15} /> },
    { key: "announcements", label: "Announcements", icon: <Megaphone size={15} /> },
];

export default function TeacherStudentsPage() {
    const { error: toastError } = useToast();
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>("roster");
    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            try {
                const data = await TeacherService.getStudents();
                setStudents(data);
            } catch (error) {
                console.error("Failed to fetch data", error);
                toastError("Could not load student data");
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    const filteredStudents = students.filter(st =>
        st.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        st.course.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );

    const handleUnenroll = async (courseId: string, studentId: string) => {
        if (!confirm("Are you sure you want to unenroll this student from the course?")) return;

        try {
            await TeacherService.unenrollStudent(courseId, studentId);

            // Update selected student state immediately
            if (selectedStudent) {
                const updatedCourses = selectedStudent.courses.filter((c: any) => c.id !== courseId);
                setSelectedStudent({ ...selectedStudent, courses: updatedCourses });
            }

            // Refresh the main list
            const data = await TeacherService.getStudents();
            setStudents(data);

        } catch (error) {
            console.error("Failed to unenroll", error);
            toastError("Failed to unenroll student");
        }
    };

    const handlePreviewProgress = (student: any) => {
        setSelectedStudent(student);
    };

    const handleViewAnalytics = (student: any) => {
        router.push(`/dashboard/student/analytics?studentId=${student.id}&studentName=${encodeURIComponent(student.name)}`);
    };

    if (isLoading) return <DashboardSkeleton type="list" userRole="teacher" />;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[var(--brand-light)] selection:text-[var(--brand-dark)]">
            <Navbar userRole="teacher" />

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Students &amp; Groups</h1>
                        <p className="text-slate-400 font-bold text-sm mt-1">Manage students, groups, and announcements.</p>
                    </div>
                </div>

                {/* ─── TABS ─── */}
                <div className="flex items-center gap-1 mb-10 bg-white/60 border border-slate-100 rounded-2xl p-1.5 w-fit shadow-sm backdrop-blur-sm">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                activeTab === tab.key
                                    ? "bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/20"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ─── GROUPS TAB ─── */}
                {activeTab === "groups" && <GroupsTab />}

                {/* ─── ANNOUNCEMENTS TAB ─── */}
                {activeTab === "announcements" && <AnnouncementsTab />}

                {/* ─── ROSTER TAB ─── */}
                {activeTab === "roster" && (
                <>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-sm">
                            <Users size={18} className="text-slate-400" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Total Students</p>
                                <p className="text-lg font-black text-slate-800 leading-none mt-1">{students.length}</p>
                            </div>
                        </div>
                    </div>
                    <button className="px-6 py-4 bg-white border border-slate-200 text-slate-600 font-black text-xs rounded-2xl hover:bg-slate-50 transition-all active:scale-95 uppercase tracking-widest shadow-sm">
                        Export PDF
                    </button>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden z-0 relative">
                    <div className="px-8 py-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/20">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <GraduationCap size={18} className="text-[var(--brand)]" />
                            Enrolled Students
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} strokeWidth={3} />
                                <input
                                    type="text"
                                    placeholder="Search by name or course..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/5 transition-all w-64 md:w-80"
                                />
                            </div>
                            <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[var(--brand)] transition-colors">
                                <Filter size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-slate-50/30">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Student Profile</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Primary Course</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Progress</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Activity</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredStudents.map((st) => (
                                    <tr key={st.id} className="hover:bg-slate-50/40 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-500 text-base shadow-inner border border-white">
                                                    {st.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">{st.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1 uppercase tracking-tighter">
                                                        <Mail size={10} /> ID: {st.id.substring(0, 8)}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter w-fit border ${st.course !== 'Not Enrolled' ? 'bg-[var(--brand-light)] border-[var(--brand-light)] text-[var(--brand-dark)]' : 'bg-slate-100 border-slate-100 text-slate-400'}`}>
                                                {st.course}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 max-w-[140px] h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className={`h-full transition-all duration-1000 rounded-full shadow-sm ${st.progress === 100 ? 'bg-emerald-500' : 'bg-[var(--brand)]'}`}
                                                        style={{ width: `${st.progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-black text-slate-700">{st.progress}%</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-1 text-[10px] font-black text-slate-300 uppercase mb-1">
                                                <Calendar size={10} /> Updated
                                            </div>
                                            <p className="text-xs font-bold text-slate-500">{st.lastActive}</p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => handlePreviewProgress(st)}
                                                className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-600 hover:bg-[var(--brand-light)] hover:text-[var(--brand)] transition-all text-[11px] font-black uppercase tracking-widest shadow-sm hover:shadow-md active:scale-95"
                                            >
                                                Full Progress
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                </>
                )}
            </main>

            {/* PREVIEW POPUP */}
            {selectedStudent && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 pt-[73px]">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedStudent(null)} />
                    <div className="bg-white w-full max-w-xl rounded-[48px] p-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom-8 duration-500">
                        <button
                            onClick={() => setSelectedStudent(null)}
                            className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-400 transition-all hover:scale-110 active:scale-95"
                        >
                            <X size={20} strokeWidth={3} />
                        </button>

                        <div className="mb-10 items-center flex gap-6">
                            <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] flex items-center justify-center font-black text-white text-4xl shadow-2xl shadow-[var(--brand)]/30">
                                {selectedStudent.name[0]}
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedStudent.name}</h2>
                                <p className="text-slate-500 font-bold text-base mt-1">Student Performance Insights</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                            <div>
                                <div className="flex items-center justify-between mb-3 px-2">
                                    <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">Enrolled Curriculums</h4>
                                    <span className="text-[10px] font-black text-[var(--brand)] uppercase bg-[var(--brand-light)] px-3 py-1 rounded-lg">Verified Enrollment</span>
                                </div>
                                <div className="space-y-4">
                                    {selectedStudent.courses && selectedStudent.courses.length > 0 ? (
                                        selectedStudent.courses.map((course: any) => (
                                            <div key={course.id} className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-[var(--brand)] transition-colors group/course">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-[var(--brand)] shadow-inner">
                                                            <BookOpen size={24} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-slate-800 text-sm leading-tight">{course.title}</h4>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{course.completedUnits}/{course.totalUnits} Units Completed</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUnenroll(course.id, selectedStudent.id)}
                                                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover/course:opacity-100"
                                                        title="Unenroll Student"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[var(--brand)] rounded-full transition-all duration-1000"
                                                            style={{ width: `${course.progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                {/* Test Marks */}
                                                {course.tests && course.tests.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-slate-50">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                                            <ClipboardList size={10} /> Test Scores
                                                        </p>
                                                        <div className="space-y-1.5">
                                                            {course.tests.map((test: any) => (
                                                                <div key={test.id} className="flex items-center justify-between">
                                                                    <span className="text-[11px] font-bold text-slate-500 truncate max-w-[60%]">{test.title}</span>
                                                                    {test.attempted ? (
                                                                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${test.score >= 70 ? 'bg-emerald-50 text-emerald-600' : test.score >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500'}`}>
                                                                            {test.correctAnswers}/{test.totalQuestions} &nbsp;({test.score}%)
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[11px] font-bold text-slate-300 px-2 py-0.5 rounded-lg bg-slate-50">Not attempted</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-6 rounded-2xl bg-white border border-slate-100 text-center">
                                            <p className="text-sm font-bold text-slate-400">No courses enrolled under your management.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Submissions</p>
                                    <p className="text-2xl font-black text-slate-800">{selectedStudent.submissions}</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Status</p>
                                    <div className="flex items-center gap-2 text-emerald-500">
                                        <CheckCircle2 size={16} strokeWidth={3} />
                                        <p className="text-sm font-black uppercase tracking-tighter">Active</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 flex gap-4">
                            <button
                                onClick={() => {
                                    handleViewAnalytics(selectedStudent);
                                    setSelectedStudent(null);
                                }}
                                className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-slate-200"
                            >
                                Detailed Analytics
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function BookOpen({ size }: { size: number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>;
}
