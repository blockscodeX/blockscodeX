"use client";
import React from "react";
import Navbar from "@/app/components/Navbar";

interface DashboardSkeletonProps {
    type?: 'main' | 'list' | 'form';
    userRole?: 'student' | 'teacher' | 'admin' | 'super-admin';
    noNavbar?: boolean;
}

export default function DashboardSkeleton({ type = 'main', userRole, noNavbar = false }: DashboardSkeletonProps) {
    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            {/* The Navbar remains visible and interactive (loading doesn't affect it) */}
            {!noNavbar && <Navbar userRole={userRole} />}

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between mb-10">
                    <div className="w-48 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
                    <div className="w-64 h-12 bg-slate-200 rounded-2xl animate-pulse"></div>
                </div>

                {type === 'main' && (
                    <div className="flex flex-col lg:flex-row gap-12">
                        {/* LEFT: Main Content Area */}
                        <div className="flex-1 space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col gap-4 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-3">
                                            <div className="w-56 h-6 bg-slate-200 rounded-lg animate-pulse"></div>
                                            <div className="w-32 h-4 bg-slate-100 rounded-md animate-pulse"></div>
                                        </div>
                                        <div className="w-24 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full mt-2 animate-pulse"></div>
                                </div>
                            ))}
                        </div>

                        {/* RIGHT: Sidebar Area */}
                        <aside className="w-full lg:w-80 space-y-6">
                            <div className="bg-slate-200 rounded-[32px] p-8 h-48 animate-pulse"></div>
                            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-4">
                                <div className="w-32 h-6 bg-slate-200 rounded-lg animate-pulse mb-6"></div>
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
                                        <div className="space-y-2">
                                            <div className="w-32 h-4 bg-slate-200 rounded-md animate-pulse"></div>
                                            <div className="w-20 h-3 bg-slate-100 rounded-md animate-pulse"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                )}

                {type === 'list' && (
                    <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
                        <div className="space-y-4">
                            {/* Table Header Row Skeleton */}
                            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                                <div className="w-32 h-4 bg-slate-200 rounded-md animate-pulse"></div>
                                <div className="w-24 h-4 bg-slate-200 rounded-md animate-pulse"></div>
                                <div className="flex gap-2">
                                    <div className="w-16 h-8 bg-slate-100 rounded-lg animate-pulse"></div>
                                </div>
                            </div>

                            {/* Table List Items Skeletons */}
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
                                        <div className="space-y-2">
                                            <div className="w-48 h-5 bg-slate-200 rounded-md animate-pulse"></div>
                                            <div className="w-32 h-3 bg-slate-100 rounded-md animate-pulse"></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-20 h-6 bg-slate-100 rounded-full animate-pulse"></div>
                                        <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {type === 'form' && (
                    <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
                        <div className="w-48 h-8 bg-slate-200 rounded-lg animate-pulse mb-8"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="space-y-3">
                                    <div className="w-24 h-4 bg-slate-200 rounded-md animate-pulse"></div>
                                    <div className="w-full h-12 bg-slate-100 rounded-xl animate-pulse"></div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 space-y-3">
                            <div className="w-32 h-4 bg-slate-200 rounded-md animate-pulse"></div>
                            <div className="w-full h-32 bg-slate-100 rounded-xl animate-pulse"></div>
                        </div>
                        <div className="mt-8 flex justify-end gap-4">
                            <div className="w-24 h-12 bg-slate-100 rounded-xl animate-pulse"></div>
                            <div className="w-32 h-12 bg-slate-200 rounded-xl animate-pulse"></div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
