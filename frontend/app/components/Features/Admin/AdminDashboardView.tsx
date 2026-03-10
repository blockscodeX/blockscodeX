"use client";
import React from "react";
import Navbar from "@/app/components/Navbar";
import { Users, BookOpen, Shield, TrendingUp } from "lucide-react";
import Link from 'next/link';

interface QuickActionCardProps {
    title: string;
    desc: string;
    count: string;
    icon: any;
    color: string;
    link: string;
}

function QuickActionCard({ title, desc, count, icon, color, link }: QuickActionCardProps) {
    return (
        <Link href={link} className="block group">
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all h-full">
                <div className="flex items-start justify-between mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                        {icon}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center -mr-2 group-hover:bg-slate-100 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400 group-hover:text-slate-600">
                            <path d="M7 17L17 7" />
                            <path d="M7 7h10v10" />
                        </svg>
                    </div>
                </div>
                <div>
                    <h4 className="text-lg font-black text-slate-800 mb-1 group-hover:text-[var(--brand)] transition-colors">{title}</h4>
                    <p className="text-xs font-bold text-slate-400 mb-4">{desc}</p>
                    <span className="inline-block px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-100">
                        {count}
                    </span>
                </div>
            </div>
        </Link>
    );
}

interface AdminDashboardViewProps {
    basePath?: string;
    organizationId?: string;
}

import { AdminService } from "@/services/api/AdminService";
import { useEffect, useState } from "react";
import { useQuery } from "@/hooks/useQuery";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";

// ... (keep interface)

export default function AdminDashboardView({ basePath = '/dashboard/admin', organizationId }: AdminDashboardViewProps) {
    const { data: dashboardData, isLoading: loading } = useQuery(`admin-dashboard-${organizationId || 'default'}`, async () => {
        const [stats, analytics, logs] = await Promise.all([
            AdminService.getStats(organizationId),
            AdminService.getAnalytics(organizationId),
            AdminService.getSystemLogs(organizationId)
        ]);
        return { stats, analytics, logs };
    });

    const statsData = dashboardData?.stats;
    const analyticsData = dashboardData?.analytics;

    // Show loading ONLY if no data exists (first load)
    if (loading && !statsData) return <DashboardSkeleton type="main" userRole="admin" noNavbar />;

    const stats = [
        { label: "Total Users", value: statsData?.totalUsers?.toString() || "0", change: "Total", icon: <Users size={20} />, color: "bg-[var(--brand-light)] text-[var(--brand)]" },
        { label: "Total Exams", value: statsData?.totalExams?.toString() || "0", change: "Exams", icon: <BookOpen size={20} />, color: "bg-emerald-50 text-emerald-600" },
        { label: "Total Courses", value: statsData?.totalCourses?.toString() || "0", change: "Courses", icon: <Shield size={20} />, color: "bg-rose-50 text-rose-600" },
        { label: "Active Sessions", value: statsData?.activeSessions?.toString() || "0", change: "Live Now", icon: <TrendingUp size={20} />, color: "bg-amber-50 text-amber-600" },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[var(--brand-light)] selection:text-[var(--brand-dark)]">
            <Navbar basePath={basePath} userRole="admin" />

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Organization Admin</h1>
                        <p className="text-slate-400 font-bold text-sm mt-1">Manage your organization's academic environment.</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {stats.map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.color}`}>
                                    {stat.icon}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${stat.change.includes('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {stat.change}
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-black text-slate-800">{stat.value}</h3>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Analytics */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">Activity Overview</h3>
                                <select className="bg-slate-50 border-none text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-2 rounded-xl outline-none">
                                    <option>Last 7 Days</option>
                                    <option>Last 30 Days</option>
                                </select>
                            </div>
                            <div className="h-64 flex items-end justify-between gap-2 px-2">
                                {loading ? (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase tracking-widest">Loading Activity...</div>
                                ) : (
                                    (analyticsData?.activity || [0, 0, 0, 0, 0, 0, 0]).map((h: number, i: number) => {
                                        const max = Math.max(...(analyticsData?.activity || [1]), 1);
                                        const heightPercent = (h / max) * 100;
                                        return (
                                            <div key={i} className="flex-1 bg-[var(--brand-light)] rounded-t-xl relative group transition-all hover:bg-[var(--brand)]/20" style={{ height: `${heightPercent}%` }}>
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {h}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div className="flex justify-between mt-4 px-2">
                                {(analyticsData?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((d: string) => (
                                    <span key={d} className="text-[10px] font-black text-slate-300 uppercase">{d}</span>
                                ))}
                            </div>
                        </div>

                        {/* Quick View Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <QuickActionCard
                                title="Manage Teachers"
                                desc="View profiles and assigned courses"
                                count="42 Instructors"
                                icon={<Users size={24} />}
                                color="text-emerald-600 bg-emerald-50"
                                link={`${basePath}/users?type=teacher`}
                            />
                            <QuickActionCard
                                title="Organization Trends"
                                desc="Student engagement metrics"
                                count="+18.4% growth"
                                icon={<TrendingUp size={24} />}
                                color="text-[var(--brand)] bg-[var(--brand-light)]"
                                link={`${basePath}/analytics`}
                            />
                        </div>
                    </div>

                    {/* Right: Real-time Monitor Preview */}
                    <div className="bg-slate-900 rounded-[40px] p-8 text-white space-y-8 overflow-hidden relative">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black tracking-tight">Live Status</h3>
                                <div className="flex items-center gap-2 px-3 py-1 bg-rose-500 rounded-full animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Live Now</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Exam</span>
                                        <span className="text-[10px] font-black text-emerald-400">85% Attendance</span>
                                    </div>
                                    <h4 className="font-bold text-sm mb-1">Full Stack Development Final</h4>
                                    <p className="text-xs text-slate-400">Ends in 45 mins</p>
                                </div>

                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 opacity-60">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Up Next</span>
                                        <span className="text-[10px] font-black text-amber-400">Starts 2:00 PM</span>
                                    </div>
                                    <h4 className="font-bold text-sm mb-1">Python Basics Quiz</h4>
                                    <p className="text-xs text-slate-400">120 Students Enrolled</p>
                                </div>
                            </div>

                            <Link href={`${basePath}/exams`} className="block w-full py-4 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all text-center mt-6">
                                View Exam Monitor
                            </Link>
                        </div>

                        {/* Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand)]/20 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[80px] -ml-32 -mb-32 pointer-events-none"></div>
                    </div>
                </div>
            </main>
        </div>
    );
}
