"use client";
import React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BRAND } from "./constants/brand";
import { useOrganization } from "./context/OrganizationContext";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";
import PlaygroundSkeleton from "@/app/components/Skeletons/PlaygroundSkeleton";
import CoursePlayerSkeleton from "@/app/components/Skeletons/CoursePlayerSkeleton";

function BrandedSpinner() {
    const { organization } = useOrganization();
    const displayLogo = organization?.logo || BRAND.logoImage;
    const displayText = organization?.name ? organization.name[0] : BRAND.logoText;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
            <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute w-20 h-20 border-4 border-t-[var(--brand)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <div className="absolute flex items-center justify-center">
                    <div className={`w-12 h-12 relative flex items-center justify-center overflow-hidden transition-all duration-500 ${!displayLogo ? 'bg-[var(--brand)] rounded-xl shadow-lg shadow-[var(--brand)]/30 p-1.5' : ''} animate-pulse`}>
                        {displayLogo ? (
                            <Image src={displayLogo} alt="Logo" fill sizes="48px" className="object-contain" priority />
                        ) : (
                            <span className="text-white font-black text-xs">{displayText}</span>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-8 text-center">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Syncing your journey</h2>
                <div className="flex items-center justify-center gap-1 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-bounce"></div>
                </div>
            </div>
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-50 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent w-full animate-[loading-bar_1.5s_infinite]"></div>
            </div>
            <style jsx>{`
                @keyframes loading-bar {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}

export default function Loading() {
    const pathname = usePathname();

    // Public pages (homepage, about, contact, login, forgot-password) → branded spinner
    if (!pathname || pathname === "/" || pathname === "/about" || pathname === "/contact" || pathname === "/login" || pathname === "/forgot-password") {
        return <BrandedSpinner />;
    }

    // Playground routes → editor skeleton
    if (pathname.startsWith("/playground")) {
        return <PlaygroundSkeleton />;
    }

    // Exam routes → branded spinner (no Navbar to avoid auth redirect)
    if (pathname.startsWith("/exam/")) {
        return <BrandedSpinner />;
    }

    // Unit/course player routes → course player skeleton
    if (pathname.includes("/unit/") || pathname.includes("/test/")) {
        return <CoursePlayerSkeleton hasSidebar={true} isExamMode={false} />;
    }

    // Detect role from path for dashboard skeletons
    let userRole: 'student' | 'teacher' | 'admin' | 'super-admin' | undefined;
    if (pathname.startsWith("/dashboard/super-admin")) userRole = 'super-admin';
    else if (pathname.startsWith("/dashboard/admin")) userRole = 'admin';
    else if (pathname.startsWith("/dashboard/teacher")) userRole = 'teacher';
    else if (pathname.startsWith("/dashboard/student")) userRole = 'student';

    // Default → dashboard skeleton
    return <DashboardSkeleton type="main" userRole={userRole} />;
}
