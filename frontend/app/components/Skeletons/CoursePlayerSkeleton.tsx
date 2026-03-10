"use client";
import React from "react";
import Navbar from "@/app/components/Navbar";

interface CoursePlayerSkeletonProps {
    isExamMode?: boolean;
    hasSidebar?: boolean;
}

export default function CoursePlayerSkeleton({ isExamMode = false, hasSidebar = true }: CoursePlayerSkeletonProps) {
    return (
        <div className="h-screen bg-white flex flex-col overflow-hidden font-sans">
            {/* Navbar (hidden in strict exam mode if needed, but typically there's some header) */}
            {!isExamMode && <Navbar />}

            <div className="flex-1 flex overflow-hidden relative border-t border-slate-100">
                {/* Left Sidebar Skeleton (e.g. UnitSidebar or ExamSidebar) */}
                {hasSidebar && (
                    <div className="w-[300px] h-full bg-slate-50 border-r border-slate-200 hidden md:flex flex-col">
                        <div className="p-6 border-b border-slate-200 space-y-3">
                            <div className="w-24 h-4 bg-slate-200 rounded-lg animate-pulse"></div>
                            <div className="w-48 h-6 bg-slate-300 rounded-lg animate-pulse"></div>
                        </div>
                        <div className="p-4 space-y-2 flex-1 overflow-hidden">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm animate-pulse">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
                                    <div className="space-y-2 flex-1">
                                        <div className="w-full h-3 bg-slate-200 rounded"></div>
                                        <div className="w-2/3 h-2 bg-slate-100 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Content Area Skeleton */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                    {/* Header/Nav inside player */}
                    <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white">
                        <div className="flex items-center gap-4 hidden md:flex">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse"></div>
                            <div className="w-32 h-4 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-2 mx-auto md:mx-0">
                            <div className="w-32 h-8 bg-slate-100 rounded-xl animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-3 hidden md:flex">
                            <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse"></div>
                            <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse"></div>
                        </div>
                    </div>

                    {/* Problem Statement & Editor Split Skeleton */}
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                        {/* Left/Top Area (Problem Description) */}
                        <div className="flex-1 lg:max-w-[50%] p-8 lg:p-12 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-slate-100">
                            <div className="space-y-6 max-w-2xl mx-auto lg:mx-0">
                                <div className="flex gap-2 mb-8">
                                    <div className="w-16 h-6 bg-emerald-100 rounded-full animate-pulse"></div>
                                    <div className="w-20 h-6 bg-blue-100 rounded-full animate-pulse"></div>
                                </div>
                                <div className="w-3/4 h-10 bg-slate-200 rounded-xl animate-pulse"></div>
                                <div className="w-full h-2 rounded-full bg-slate-100 animate-pulse my-8"></div>

                                <div className="space-y-4">
                                    <div className="w-full h-4 bg-slate-100 rounded animate-pulse"></div>
                                    <div className="w-full h-4 bg-slate-100 rounded animate-pulse"></div>
                                    <div className="w-5/6 h-4 bg-slate-100 rounded animate-pulse"></div>
                                    <div className="w-full h-4 bg-slate-100 rounded animate-pulse mt-4"></div>
                                    <div className="w-4/5 h-4 bg-slate-100 rounded animate-pulse"></div>
                                    <div className="w-2/3 h-4 bg-slate-100 rounded animate-pulse"></div>
                                </div>

                                <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100 animate-pulse">
                                    <div className="w-32 h-5 bg-slate-200 rounded mb-4"></div>
                                    <div className="space-y-2">
                                        <div className="w-full h-4 bg-slate-200 rounded"></div>
                                        <div className="w-full h-4 bg-slate-200 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right/Bottom Area (Editor/Options) */}
                        <div className="flex-1 bg-slate-50 relative flex flex-col">
                            {/* Editor Tabs Fake */}
                            <div className="h-12 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2 shrink-0">
                                <div className="w-24 h-8 bg-white border border-slate-200 rounded-md animate-pulse"></div>
                                <div className="w-24 h-8 bg-slate-200/50 rounded-md animate-pulse"></div>
                            </div>
                            {/* Editor Body Fake */}
                            <div className="flex-1 p-6 space-y-3">
                                <div className="w-32 h-4 bg-slate-200/50 rounded animate-pulse"></div>
                                <div className="w-48 h-4 bg-slate-200/50 rounded animate-pulse pl-4"></div>
                                <div className="w-40 h-4 bg-slate-200/50 rounded animate-pulse pl-8"></div>
                                <div className="w-24 h-4 bg-slate-200/50 rounded animate-pulse pl-4"></div>
                                <div className="w-16 h-4 bg-slate-200/50 rounded animate-pulse"></div>
                            </div>
                            {/* Action Bar Fake */}
                            <div className="h-16 bg-white border-t border-slate-200 flex items-center justify-between px-6 shrink-0">
                                <div className="w-20 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
                                <div className="flex gap-3">
                                    <div className="w-24 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
                                    <div className="w-32 h-10 bg-indigo-100 rounded-xl animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
