"use client";
import { useEffect, useState } from "react";
import { requireAuthClient } from "@/hooks/requireAuthClient";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";
import { redirect } from "next/navigation";
import { AuthService } from "@/services/api/AuthService";

export default function DashboardPage() {
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        if (!requireAuthClient("/login")) return;
        setAuthChecked(true);

        const role = AuthService.getRole();
        if (role === 'TEACHER') redirect("/dashboard/teacher");
        else if (role === 'ADMIN') redirect("/dashboard/admin");
        else if (role === 'SUPER_ADMIN') redirect("/dashboard/super-admin");
        else redirect("/dashboard/student");
    }, []);

    if (!authChecked) return <DashboardSkeleton type="main" userRole="student" />;
    return null;
}
