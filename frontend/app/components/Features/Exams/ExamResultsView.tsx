"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AlertModal from "@/app/components/Common/AlertModal";
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { TeacherService } from "@/services/api/TeacherService";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Result {
    sessionId: string;
    rollNo: string;
    name: string;
    email: string;
    section: string;
    submittedAt: string;
    timeTaken: string;
    attempted: string;
    score: number;
    totalPossible: number;
    status: "Passed" | "Failed" | string;
}

interface ExamResultsViewProps {
    title?: string;
    examId: string;
    userRole?: 'admin' | 'teacher';
    basePath?: string;
}

export default function ExamResultsView({ title = "Exam Analysis", examId, userRole = 'teacher', basePath }: ExamResultsViewProps) {
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
    const [serverStats, setServerStats] = useState<any>(null);

    const [isResultsPublished, setIsResultsPublished] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, type?: 'danger' | 'warning' | 'info' }>({ isOpen: false, title: '', message: '' });

    useEffect(() => {
        async function loadResults() {
            try {
                setLoading(true);
                const data = await TeacherService.getExamResults(examId, pagination.page, pagination.limit);
                if (data.results) {
                    setResults(data.results);
                    setIsResultsPublished(data.resultsPublished);
                    if (data.pagination) setPagination(data.pagination);
                    if (data.stats) setServerStats(data.stats);
                } else {
                    setResults(data);
                }
            } catch (error) {
                console.error("Failed to load results", error);
            } finally {
                setLoading(false);
            }
        }
        loadResults();
    }, [examId, pagination.page]);

    const stats = useMemo(() => {
        if (serverStats) {
            return {
                avgScore: serverStats.avgScore || 0,
                avgTime: 0, // Not passed from backend yet, keeping 0/hidden
                passedCount: serverStats.passedCount || 0,
                failedCount: serverStats.failedCount || 0,
                distribution: serverStats.distribution || [],
                highScore: serverStats.highScore || 0
            };
        }

        if (results.length === 0) return { avgScore: 0, avgTime: 0, passedCount: 0, failedCount: 0, distribution: [], highScore: 0 };

        // Legacy fallback calculation
        const passedCount = results.filter(r => r.status === "Passed").length;
        const failedCount = results.filter(r => r.status === "Failed").length;

        const totalScorePct = results.reduce((acc, curr) => acc + (curr.score / (curr.totalPossible || 1)), 0);
        const avgScore = (totalScorePct / results.length) * 100;

        const totalTime = results.reduce((acc, curr) => acc + (parseInt(curr.timeTaken) || 0), 0);
        const avgTime = totalTime / results.length;

        const highScore = Math.max(...results.map(r => (r.score / (r.totalPossible || 1)) * 100));

        const distribution = [
            { score: '0-25%', count: results.filter(r => (r.score / r.totalPossible) < 0.25).length },
            { score: '25-50%', count: results.filter(r => (r.score / r.totalPossible) >= 0.25 && (r.score / r.totalPossible) < 0.5).length },
            { score: '50-75%', count: results.filter(r => (r.score / r.totalPossible) >= 0.5 && (r.score / r.totalPossible) < 0.75).length },
            { score: '75-100%', count: results.filter(r => (r.score / r.totalPossible) >= 0.75).length },
        ];

        return { avgScore, avgTime, passedCount, failedCount, distribution, highScore };
    }, [results, serverStats]);

    const brandColor = '#fc751b';
    const brandLightColor = 'var(--brand-light)';

    const pieData = results.length > 0
        ? [
            { name: 'Passed', value: stats.passedCount, color: brandColor },
            { name: 'Failed', value: stats.failedCount, color: '#f43f5e' },
        ]
        : [
            { name: 'No Data', value: 1, color: '#f1f5f9' }
        ];

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            await TeacherService.publishResults(examId);
            setIsResultsPublished(true);
            setAlertConfig({
                isOpen: true,
                title: "Results Published",
                message: "Exam results have been successfully shared with all students.",
                type: "info"
            });
        } catch (error) {
            console.error("Failed to publish results", error);
            setAlertConfig({
                isOpen: true,
                title: "Publication Failed",
                message: "There was an error publishing the results. Please try again.",
                type: "danger"
            });
        } finally {
            setIsPublishing(false);
        }
    };

    const updateScore = async (sessionId: string, newScore: string) => {
        const scoreVal = parseFloat(newScore) || 0;
        setResults(prev => prev.map(r => {
            if (r.sessionId === sessionId) {
                const status = (scoreVal / r.totalPossible) >= 0.4 ? "Passed" : "Failed";
                return { ...r, score: scoreVal, status };
            }
            return r;
        }));

        try {
            await TeacherService.updateSubmissionScore(examId, sessionId, scoreVal);
        } catch (error) {
            console.error("Failed to update score on server", error);
        }
    };

    const backLink = basePath ? `${basePath}/exams` : (userRole === 'admin' ? "/dashboard/admin/exams" : "/dashboard/teacher/exams");

    if (loading) return <div className="p-12 text-center font-black text-slate-300 uppercase tracking-widest animate-pulse">Loading Results...</div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8 animate-fade-in">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Assessment ID: {examId}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={backLink}>
                            <button className="p-3 bg-white border border-slate-100 text-slate-400 rounded-xl hover:text-slate-600 transition-all shadow-sm">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            </button>
                        </Link>
                        <button
                            onClick={handlePublish}
                            disabled={isPublishing || isResultsPublished}
                            className={`text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${isResultsPublished ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                            style={{ backgroundColor: isResultsPublished ? '#64748b' : brandColor, boxShadow: isResultsPublished ? 'none' : `0 10px 15px -3px ${brandColor}40` }}
                        >
                            {isPublishing ? "Publishing..." : isResultsPublished ? "Results Published" : "Publish Results"}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-10">
                    <div className="md:col-span-2 lg:col-span-2 bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pass/Fail Ratio</h3>
                            <span className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ color: brandColor, backgroundColor: brandLightColor }}>Live</span>
                        </div>
                        <div className="h-40 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={results.length > 0 ? 8 : 0} dataKey="value" isAnimationActive={results.length > 0}>
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black text-slate-800 leading-none">{results.length}</span>
                                <span className="text-[8px] font-black text-slate-300 uppercase">Total</span>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-center gap-6">
                            <MetricLabel color={brandColor} label="Pass" value={stats.passedCount} />
                            <MetricLabel color="#f43f5e" label="Fail" value={stats.failedCount} />
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-4">
                        <CompactStatTile
                            label="Avg Score"
                            value={`${stats.avgScore.toFixed(0)}%`}
                            sub={`High Score: ${stats.highScore.toFixed(0)}%`}
                            trend={stats.avgScore > 60 ? "up" : "down"}
                        />
                        <CompactStatTile
                            label="Time Taken"
                            value={`${stats.avgTime.toFixed(0)}m`}
                            sub={`Target: 45m`}
                            trend={stats.avgTime < 45 ? "up" : "down"}
                        />
                    </div>

                    <div className="md:col-span-2 lg:col-span-3 bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Point Distribution</h3>
                                <p className="text-[8px] font-bold text-slate-300 uppercase">Student frequency per score bracket</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: brandColor }}></div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Count</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`barGradient-${userRole}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={brandColor} stopOpacity={1} />
                                            <stop offset="100%" stopColor={brandColor} stopOpacity={0.8} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="score"
                                        fontSize={10}
                                        fontWeight={700}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        fontSize={10}
                                        fontWeight={700}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#cbd5e1' }}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            textTransform: 'uppercase'
                                        }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill={`url(#barGradient-${userRole})`}
                                        radius={[10, 10, 0, 0]}
                                        barSize={48}
                                        animationDuration={1500}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Student Submissions</h2>
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                                {results.slice(0, 5).map(r => (
                                    <div key={r.rollNo} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400 uppercase">
                                        {r.name[0]}
                                    </div>
                                ))}
                                {results.length > 5 && (
                                    <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400">
                                        +{results.length - 5}
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase">Total {results.length}</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-50 bg-slate-50/30">
                                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Student Info</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Section</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Timing</th>
                                    <th className="px-4 py-4 text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Progress</th>
                                    <th className="px-4 py-4 text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Score</th>
                                    <th className="px-4 py-4 text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                                    <th className="px-8 py-4 text-right text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r) => (
                                    <tr key={r.sessionId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-black text-[10px] text-slate-400">
                                                    {r.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-800 leading-none mb-1">{r.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{r.rollNo}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-[10px] font-bold text-slate-500">{r.section}</td>
                                        <td className="px-6 py-5">
                                            <p className="text-[10px] font-black text-slate-700 leading-none mb-1">{r.submittedAt}</p>
                                            <p className="text-[9px] font-bold text-slate-300 uppercase">{r.timeTaken} Taken</p>
                                        </td>
                                        <td className="px-4 py-5 text-center text-xs font-black text-slate-700">{r.attempted}</td>
                                        <td className="px-4 py-5 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <span className="text-[11px] font-black" style={{ color: brandColor }}>{r.score}</span>
                                                <span className="text-[10px] font-bold text-slate-300">/ {r.totalPossible}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-center">
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${r.status === 'Passed' ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'bg-rose-50 text-rose-600'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <Link href={basePath
                                                ? `${basePath}/exams/${examId}/submission/${r.sessionId}/preview`
                                                : (userRole === 'admin'
                                                    ? `/dashboard/admin/exams/${examId}/submission/${r.sessionId}/preview`
                                                    : `/dashboard/teacher/exams/${examId}/submission/${r.sessionId}/preview`)
                                            }>
                                                <button className="text-[9px] font-black uppercase text-slate-400 hover:text-[var(--brand)] transition-colors">
                                                    Preview →
                                                </button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                    <p className="text-xs font-bold text-slate-400">
                        Page {pagination.page} of {pagination.totalPages} ({pagination.total} students)
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                            disabled={pagination.page === 1}
                            className="p-2 rounded-xl bg-white border border-slate-100 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                        >
                            <ChevronLeft size={16} className="text-slate-600" />
                        </button>
                        <button
                            onClick={() => setPagination(p => ({ ...p, page: Math.min(pagination.totalPages, p.page + 1) }))}
                            disabled={pagination.page === pagination.totalPages}
                            className="p-2 rounded-xl bg-white border border-slate-100 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                        >
                            <ChevronRight size={16} className="text-slate-600" />
                        </button>
                    </div>
                </div>

                <AlertModal
                    isOpen={alertConfig.isOpen}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type || "info"}
                    confirmLabel="Close"
                    onConfirm={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                    onCancel={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                />
            </main>
        </div>
    );
}

function MetricLabel({ color, label, value }: any) {
    return (
        <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: color }}></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <span className="text-xs font-black text-slate-800">{value}</span>
        </div>
    );
}

function CompactStatTile({ label, value, sub, trend }: any) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm group hover:border-[var(--brand-light)] transition-all">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <div className="flex items-end gap-2">
                <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${trend === 'up' ? 'text-emerald-500 bg-emerald-50' : trend === 'down' ? 'text-rose-500 bg-rose-50' : 'text-slate-400 bg-slate-50'}`}>
                    {trend === 'up' ? '▲' : '▼'}
                </span>
            </div>
            <p className="text-[8px] font-bold text-slate-300 uppercase mt-2">{sub}</p>
        </div>
    );
}
