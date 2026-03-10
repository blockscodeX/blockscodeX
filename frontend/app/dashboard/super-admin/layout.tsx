"use client";
import React from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const { isAuthorized } = useRoleGuard(['SUPER_ADMIN']);

    if (!isAuthorized) return <DashboardSkeleton type="main" userRole="super-admin" />;

    return (
        <div className="min-h-screen">
            {children}
        </div>
    );
}
