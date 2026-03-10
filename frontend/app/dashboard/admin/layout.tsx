"use client";
import React from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isAuthorized } = useRoleGuard(['ADMIN']);

    if (!isAuthorized) return <DashboardSkeleton type="main" userRole="admin" />;

    return (
        <div className="min-h-screen">
            {children}
        </div>
    );
}
