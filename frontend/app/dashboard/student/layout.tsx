"use client";
import React from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const { isAuthorized } = useRoleGuard(['STUDENT', 'TEACHER']);

    if (!isAuthorized) return <DashboardSkeleton type="main" userRole="student" />;

    return (
        <div className="min-h-screen">
            {children}
        </div>
    );
}
