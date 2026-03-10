"use client";
import React from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    const { isAuthorized } = useRoleGuard(['TEACHER']);

    if (!isAuthorized) return <DashboardSkeleton type="main" userRole="teacher" />;

    return (
        <div className="min-h-screen">
            {children}
        </div>
    );
}
