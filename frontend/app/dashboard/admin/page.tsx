"use client";
import React, { useEffect, useState } from "react";
import AdminDashboardView from "@/app/components/Features/Admin/AdminDashboardView";
import { requireAuthClient } from "@/hooks/requireAuthClient";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";

export default function AdminDashboardPage() {
    const [authChecked, setAuthChecked] = useState(false);
    useEffect(() => {
        if (!requireAuthClient("/login")) return;
        setAuthChecked(true);
    }, []);
    if (!authChecked) return <DashboardSkeleton type="main" userRole="admin" />;
    return <AdminDashboardView />;
}
