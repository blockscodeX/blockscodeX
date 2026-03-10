"use client";
import React, { useState, useMemo, useEffect } from "react";
import Navbar from "@/app/components/Navbar";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";
import { useSearchParams, useRouter } from "next/navigation";
import { StudentService } from "@/services/api/StudentService";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    AreaChart,
    Area,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis
} from "recharts";

interface Attempt {
    id: string;
    date: string;
    testCases: string;
    status: 'success' | 'failed';
}

interface Question {
    id: number;
    unitId: string;
    title: string;
    course: string;
    type: string;
    status: string;
    attempts: Attempt[];
}

export default function AnalyticsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const studentNameParam = searchParams.get("studentName");

    const [activeTab, setActiveTab] = useState<'overview' | 'attempts'>('overview');
    const [expandedIds, setExpandedIds] = useState<number[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("All Courses");

    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [questions, setQuestions] = useState<Question[]>([]);

    useEffect(() => {
        async function loadAnalytics() {
            try {
                const studentId = searchParams.get("studentId");
                let data;
                let attemptsData;

                if (studentId) {
                    // Fetch as teacher
                    const { TeacherService } = await import("@/services/api/TeacherService");
                    const [analyticsResult, attemptsResult] = await Promise.all([
                        TeacherService.getStudentAnalytics(studentId),
                        TeacherService.getStudentUnitSubmissions(studentId)
                    ]);
                    data = analyticsResult;
                    attemptsData = attemptsResult;
                } else {
                    // Fetch as student
                    const [analyticsResult, attemptsResult] = await Promise.all([
                        StudentService.getAnalytics(),
                        StudentService.getUnitAttempts()
                    ]);
                    data = analyticsResult;
                    attemptsData = attemptsResult;
                }

                setAnalyticsData(data);

                // Group submissions by unitId for the detailed table
                const unitMap = new Map<string, Question>();
                attemptsData.forEach((sub: any) => {
                    const unitId = sub.unitId;
                    if (!unitMap.has(unitId)) {
                        unitMap.set(unitId, {
                            id: unitMap.size + 1,
                            unitId: unitId,
                            title: sub.unitTitle,
                            course: sub.courseTitle,
                            type: sub.unitType,
                            status: sub.status === "COMPLETED" ? "Submitted" : sub.status,
                            attempts: []
                        });
                    }

                    const unit = unitMap.get(unitId)!;

                    // If any attempt is COMPLETED, mark the whole unit as Submitted
                    if (sub.status === "COMPLETED") {
                        unit.status = "Submitted";
                    }

                    unit.attempts.push({
                        id: sub.id,
                        date: new Date(sub.createdAt).toLocaleString(),
                        testCases: sub.testCases || (sub.score !== null ? `${sub.score}/100` : "N/A"),
                        status: sub.status === "COMPLETED" ? "success" : "failed"
                    });
                });

                const mappedQuestions = Array.from(unitMap.values());
                setQuestions(mappedQuestions);
            } catch (error) {
                console.error("Failed to load analytics", error);
            } finally {
                setLoading(false);
            }
        }
        loadAnalytics();
    }, []);

    const stats = useMemo(() => {
        if (!analyticsData) return {
            totalQuestions: 0,
            totalAttempts: 0,
            totalExecutions: 0,
            passedAttempts: 0,
            failedAttempts: 0,
            successRate: 0,
            avgAttempts: 0,
            streak: 0,
            exams: { total: 0, passed: 0, failed: 0 }
        };

        const passedExams = questions.filter(q => q.status === 'Submitted' || q.status === 'COMPLETED').length;

        return {
            totalQuestions: analyticsData.stats.totalQuestions,
            totalAttempts: analyticsData.stats.totalAttempts,
            totalExecutions: analyticsData.stats.totalAttempts, // Using actual attempts as executions count
            passedAttempts: analyticsData.stats.passedAttempts,
            failedAttempts: analyticsData.stats.totalAttempts - analyticsData.stats.passedAttempts,
            successRate: analyticsData.stats.successRate,
            avgAttempts: analyticsData.stats.totalQuestions > 0
                ? (analyticsData.stats.totalAttempts / analyticsData.stats.totalQuestions).toFixed(1)
                : 0,
            streak: analyticsData.stats.streak || 0,
            exams: {
                total: questions.length,
                passed: passedExams,
                failed: questions.length - passedExams
            }
        };
    }, [analyticsData, questions]);

    const availableCourses = useMemo(() => {
        const courses = new Set(questions.map(q => q.course));
        return ["All Courses", ...Array.from(courses)];
    }, [questions]);

    const filteredQuestions = useMemo(() => {
        return questions.filter(q => selectedCourse === "All Courses" || q.course === selectedCourse);
    }, [questions, selectedCourse]);

    const examPieData = [
        { name: 'Succeeded', value: stats.passedAttempts },
        { name: 'Failed', value: stats.failedAttempts },
    ];

    const toggleExpand = (id: number) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    if (loading) {
        return <DashboardSkeleton type="main" userRole={studentNameParam ? 'teacher' : 'student'} />;
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-[var(--brand-light)]">
            <Navbar userRole={studentNameParam ? 'teacher' : undefined} />

            {/* TEACHER VIEW BANNER */}
            {studentNameParam && (
                <div className="bg-[var(--brand)] text-white px-6 py-3 sticky top-[73px] z-40 shadow-md flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                        </div>
                        <span className="font-bold text-sm tracking-wide">
                            Viewing Analytics for <span className="font-black text-white px-1">{decodeURIComponent(studentNameParam)}</span>
                        </span>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                    >
                        Exit Teacher View
                    </button>
                </div>
            )}

            {/* COMPACT STICKY SUB-HEADER */}
            <div className="sticky top-[61px] z-40 bg-white border-b border-slate-200/60 shadow-sm transition-all duration-300">
                <div className="max-w-[1440px] mx-auto px-8 py-4 flex items-center justify-between">
                    <div className="flex flex-col">
                        <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">Performance Analytics</h1>
                        <p className="text-[10px] font-bold text-slate-400">Tracking progress across all coding modules</p>
                    </div>

                    <div className="flex items-center">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative group ${activeTab === 'overview' ? 'text-[var(--brand)]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <span className="relative z-10">Overview</span>
                            {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--brand)] rounded-t-full" />}
                            <div className="absolute inset-x-2 inset-y-2 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl -z-0" />
                        </button>
                        <button
                            onClick={() => setActiveTab('attempts')}
                            className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative group ${activeTab === 'attempts' ? 'text-[var(--brand)]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <span className="relative z-10">Detailed Attempts</span>
                            {activeTab === 'attempts' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--brand)] rounded-t-full" />}
                            <div className="absolute inset-x-2 inset-y-2 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl -z-0" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1440px] mx-auto px-8 py-10">
                {activeTab === 'overview' ? (
                    <div className="space-y-8 animate-in fade-in duration-500">

                        {/* COMPACT STAT BAR */}
                        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-3.5 flex flex-wrap items-center justify-between gap-4">
                            <StatItem label="Questions" value={stats.totalQuestions} icon="✓" color="indigo" />
                            <div className="w-px h-10 bg-slate-100 hidden sm:block" />
                            <StatItem label="Attempts" value={stats.totalAttempts} icon="⚡" color="indigo" />
                            <div className="w-px h-10 bg-slate-100 hidden sm:block" />
                            <StatItem label="Executions" value={stats.totalExecutions} icon="⚙" color="slate" />
                            <div className="w-px h-10 bg-slate-100 hidden sm:block" />
                            <StatItem label="Success" value={`${stats.successRate}%`} icon="🎯" color="emerald" />
                            <div className="w-px h-10 bg-slate-100 hidden sm:block" />
                            <StatItem label="Avg Attempts" value={stats.avgAttempts} icon="🔄" color="amber" />
                            <div className="w-px h-10 bg-slate-100 hidden sm:block" />
                            <StatItem label="Daily Streak" value={`${stats.streak} Days`} icon="🔥" color="rose" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Activity Chart */}
                            <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">Activity Trend</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Daily Performance Streak Analysis</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Passed</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Failed</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[320px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analyticsData.weeklyActivity}>
                                            <defs>
                                                <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="day"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                                            />
                                            <Area type="monotone" dataKey="attempts" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAttempts)" />
                                            <Area type="monotone" dataKey="passed" stroke="#10b981" strokeWidth={3} fill="transparent" />
                                            <Area type="monotone" dataKey="failed" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" fill="transparent" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Status Distribution */}
                            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
                                <h3 className="text-lg font-black text-slate-800 mb-8">Submission Distribution</h3>
                                <div className="h-[250px] w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={examPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {examPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-2xl font-black text-slate-800">{stats.exams.total > 0 ? Math.round((stats.exams.passed / stats.exams.total) * 100) : 0}%</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cleared</span>
                                    </div>
                                </div>
                                <div className="mt-8 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                            <span className="text-xs font-bold text-slate-600">Succeeded</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-800">{stats.passedAttempts} Attempts</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-rose-500" />
                                            <span className="text-xs font-bold text-slate-600">Failed</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-800">{stats.failedAttempts} Attempts</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COURSE MASTERY & STRENGTHS */}
                        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                                <div className="lg:col-span-1">
                                    <h3 className="text-xl font-black text-slate-900 mb-4">Course Mastery</h3>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                                        Visualize your strengths across enrolled courses. Your proficiency is calculated based on module accuracy and attempt efficiency.
                                    </p>
                                    <div className="space-y-4">
                                        {analyticsData.courseMastery.map((course: any, idx: number) => (
                                            <MasteryIndicator
                                                key={idx}
                                                label={course.subject}
                                                score={Math.round((course.A / 150) * 100)}
                                                color={idx % 4 === 0 ? "indigo" : idx % 4 === 1 ? "emerald" : idx % 4 === 2 ? "amber" : "rose"}
                                            />
                                        ))}
                                        {analyticsData.courseMastery.length === 0 && (
                                            <p className="text-xs text-slate-400 font-bold italic">No course data available</p>
                                        )}
                                    </div>
                                </div>
                                <div className="lg:col-span-2 h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analyticsData.courseMastery}>
                                            <PolarGrid stroke="#f1f5f9" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                            <Radar
                                                name="Current Proficiency"
                                                dataKey="A"
                                                stroke="#6366f1"
                                                fill="#6366f1"
                                                fillOpacity={0.6}
                                            />
                                            <Radar
                                                name="Benchmark"
                                                dataKey="B"
                                                stroke="#10b981"
                                                fill="#10b981"
                                                fillOpacity={0.3}
                                            />
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} />
                                            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '20px' }} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Filter Section */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Filter Course</span>
                                <div className="relative">
                                    <select
                                        value={selectedCourse}
                                        onChange={(e) => setSelectedCourse(e.target.value)}
                                        className="appearance-none bg-white border border-slate-200 rounded-xl px-5 py-2.5 pr-12 text-xs font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-[var(--brand-light)] transition-all cursor-pointer shadow-sm"
                                    >
                                        {availableCourses.map(course => (
                                            <option key={course} value={course}>{course}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="relative w-full md:w-96">
                                <input
                                    type="text"
                                    placeholder="Search assessment results..."
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-6 text-xs font-bold placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/5 transition-all shadow-sm"
                                />
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </div>
                        </div>

                        {/* Detailed Table */}
                        <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                            <div className="flex items-center px-10 py-5 bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <div className="flex-1">Questions</div>
                                <div className="w-40 text-center">Category</div>
                                <div className="w-40 text-right mr-10">Latest Status</div>
                            </div>

                            <div className="divide-y divide-slate-50">
                                {filteredQuestions.map((q) => (
                                    <div key={q.id} className="bg-white">
                                        <div
                                            onClick={() => toggleExpand(q.id)}
                                            className={`flex items-center px-10 py-6 hover:bg-slate-50/30 cursor-pointer transition-all duration-300 group ${expandedIds.includes(q.id) ? 'bg-slate-50/20' : ''}`}
                                        >
                                            <div className="flex-1 flex items-center gap-6">
                                                <span className={`text-[12px] font-black w-6 transition-colors ${expandedIds.includes(q.id) ? 'text-[var(--brand)]' : 'text-slate-300'}`}>{q.id}.</span>
                                                <div>
                                                    <span className="text-sm font-black text-slate-800 group-hover:text-[var(--brand)] transition-colors">{q.title}</span>
                                                    <div className="flex gap-2 mt-1">
                                                        {q.attempts.length > 0 && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{q.attempts.length} attempts</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-40 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg inline-block self-center mx-auto">
                                                {q.type}
                                            </div>
                                            <div className="w-40 flex items-center justify-end gap-3 text-right mr-10">
                                                <span className={`text-[11px] font-black px-3 py-1 rounded-lg ${q.status === 'Submitted' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>{q.status}</span>
                                                <div className={`p-2 rounded-xl transition-all ${expandedIds.includes(q.id) ? 'rotate-180 bg-[var(--brand-light)] text-[var(--brand)]' : 'text-slate-300'}`}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
                                                </div>
                                            </div>
                                        </div>

                                        {expandedIds.includes(q.id) && (
                                            <div className="px-10 pb-10 pt-4 bg-slate-50/10">
                                                {q.attempts.length > 0 ? (
                                                    <div className="max-w-4xl mx-auto space-y-4">
                                                        <div className="flex items-center justify-center gap-8 mb-6">
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Success: {q.attempts.filter((a: Attempt) => a.status === 'success').length}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                                                                <div className="w-2 h-2 rounded-full bg-rose-500" /> Failed: {q.attempts.filter((a: Attempt) => a.status === 'failed').length}
                                                            </div>
                                                        </div>

                                                        <div className="border border-slate-100 rounded-[24px] bg-white overflow-hidden shadow-sm">
                                                            <div className="grid grid-cols-3 px-8 py-3 bg-slate-50/50 border-b border-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">
                                                                <div>Date & Time</div>
                                                                <div>Test Cases</div>
                                                                <div>Outcome</div>
                                                            </div>
                                                            <div className="divide-y divide-slate-50">
                                                                {q.attempts.map((attempt: Attempt, idx: number) => {
                                                                    const isTeacherView = !!searchParams.get("studentId");
                                                                    return (
                                                                        <div
                                                                            key={idx}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (!isTeacherView) {
                                                                                    router.push(`/dashboard/student/unit/${q.unitId}?attemptId=${attempt.id}`);
                                                                                }
                                                                            }}
                                                                            className={`grid grid-cols-3 px-8 py-4 text-[11px] font-bold text-slate-600 items-center text-center transition-colors ${!isTeacherView ? 'cursor-pointer hover:bg-slate-50/50' : ''}`}
                                                                        >
                                                                            <div className="font-mono text-slate-400">{attempt.date}</div>
                                                                            <div className="text-slate-800">{attempt.testCases}</div>
                                                                            <div>
                                                                                <span className={`px-3 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest ${attempt.status === 'success' ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}>
                                                                                    {attempt.status}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-12 rounded-[24px] bg-white border-2 border-dashed border-slate-100 flex flex-col items-center">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl mb-4 text-slate-300">∅</div>
                                                        <p className="text-xs font-bold text-slate-400 italic">No attempt logs found for this specific assessment.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {questions.length === 0 && (
                                    <div className="px-10 py-10 text-center text-slate-500 font-bold uppercase tracking-widest text-[11px]">No assessment history found</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function MasteryIndicator({ label, score, color }: { label: string, score: number, color: string }) {
    const colorClasses = {
        indigo: "bg-indigo-600",
        emerald: "bg-emerald-500",
        amber: "bg-amber-500",
        rose: "bg-rose-500"
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{label}</span>
                <span className="text-[11px] font-black text-slate-400">{score}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ${(colorClasses as any)[color]}`}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
}

function StatItem({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
    const colorClasses = {
        indigo: "text-indigo-600 bg-indigo-50",
        emerald: "text-emerald-600 bg-emerald-50",
        amber: "text-amber-600 bg-amber-50",
        rose: "text-rose-600 bg-rose-50",
        slate: "text-slate-600 bg-slate-50"
    };

    return (
        <div className="flex-1 min-w-[120px] flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors group">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-transform group-hover:scale-110 ${(colorClasses as any)[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-sm font-black text-slate-900 leading-none">{value}</p>
            </div>
        </div>
    );
}
