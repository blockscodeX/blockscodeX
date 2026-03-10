"use client";
import React from "react";
import Navbar from "@/app/components/Navbar";

export default function PlaygroundSkeleton() {
    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
            <Navbar />

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Tab Bar Skeleton */}
                    <div className="h-12 border-b border-slate-100 flex items-center px-4 justify-between bg-white">
                        <div className="flex items-center gap-3 h-full">
                            <div className="w-24 h-8 bg-slate-100 rounded-lg animate-pulse"></div>
                            <div className="w-1 h-6 bg-slate-100"></div>
                            <div className="w-28 h-8 bg-slate-50 rounded-lg animate-pulse"></div>
                            <div className="w-8 h-8 bg-slate-50 rounded-md animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-50 rounded-md animate-pulse"></div>
                            <div className="w-24 h-8 bg-blue-50 rounded-md animate-pulse"></div>
                        </div>
                    </div>

                    {/* Split Pane Skeleton */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Editor Area */}
                        <div className="flex-[55] bg-white p-6 space-y-3 border-r border-slate-100">
                            <div className="w-40 h-4 bg-slate-100 rounded animate-pulse"></div>
                            <div className="w-64 h-4 bg-slate-50 rounded animate-pulse pl-4"></div>
                            <div className="w-48 h-4 bg-slate-50 rounded animate-pulse pl-8"></div>
                            <div className="w-56 h-4 bg-slate-100 rounded animate-pulse pl-4"></div>
                            <div className="w-32 h-4 bg-slate-50 rounded animate-pulse pl-8"></div>
                            <div className="w-20 h-4 bg-slate-50 rounded animate-pulse"></div>
                            <div className="w-72 h-4 bg-slate-100 rounded animate-pulse mt-4"></div>
                            <div className="w-44 h-4 bg-slate-50 rounded animate-pulse pl-4"></div>
                            <div className="w-36 h-4 bg-slate-50 rounded animate-pulse pl-8"></div>
                        </div>

                        {/* Terminal Area */}
                        <div className="flex-[45] bg-slate-50 flex flex-col">
                            <div className="h-10 border-b border-slate-200 flex items-center px-4 gap-2">
                                <div className="w-20 h-5 bg-slate-200 rounded animate-pulse"></div>
                            </div>
                            <div className="flex-1 p-4 space-y-2">
                                <div className="w-48 h-3 bg-slate-200/60 rounded animate-pulse"></div>
                                <div className="w-32 h-3 bg-slate-200/40 rounded animate-pulse"></div>
                            </div>
                            <div className="h-24 border-t border-slate-200 p-4">
                                <div className="w-16 h-3 bg-slate-200 rounded animate-pulse mb-2"></div>
                                <div className="w-full h-12 bg-white border border-slate-200 rounded-lg animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
