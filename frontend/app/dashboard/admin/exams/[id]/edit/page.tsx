"use client";
import React, { useEffect, useState } from 'react';
import ExamEditor from '@/app/components/Features/Exams/ExamEditor';
import { TeacherService } from '@/services/api/TeacherService';
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";

export default function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = React.use(params);
    const [exam, setExam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const data = await TeacherService.getExam(resolvedParams.id);
                setExam(data);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to load exam");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [resolvedParams.id]);

    if (loading) return <DashboardSkeleton type="form" userRole="admin" />;
    if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;

    return <ExamEditor initialData={exam} userRole="admin" basePath="/dashboard/admin" />;
}
