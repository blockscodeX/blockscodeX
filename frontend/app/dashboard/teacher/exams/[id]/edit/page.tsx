"use client";
import React, { Suspense, useEffect, useState } from 'react';
import ExamBuilder from '@/app/components/Authoring/ExamBuilder';
import { useRouter } from 'next/navigation';
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";
import AlertModal from '@/app/components/Common/AlertModal';
import { TeacherService } from '@/services/api/TeacherService';

export default function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = React.use(params);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, type?: 'danger' | 'warning' | 'info' }>({ isOpen: false, title: '', message: '' });
    const [exam, setExam] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadExam() {
            try {
                const data = await TeacherService.getExam(id);
                setExam(data);
            } catch (e) {
                console.error("Failed to load exam", e);
            } finally {
                setLoading(false);
            }
        }
        loadExam();
    }, [id]);

    const handleDelete = async () => {
        try {
            await TeacherService.deleteExam(exam.id);
            setAlertConfig({
                isOpen: true,
                title: "Deleted",
                message: "Exam deleted successfully!",
                type: "info"
            });
            setTimeout(() => router.push("/dashboard/teacher/exams"), 1000);
        } catch (e) {
            console.error("Delete failed", e);
            alert("Delete failed");
        }
    };

    if (loading) return <DashboardSkeleton type="form" userRole="teacher" />;
    if (!exam) return <div className="p-12 text-center font-black uppercase tracking-widest text-rose-500">Exam Not Found</div>;

    return (
        <Suspense fallback={<DashboardSkeleton type="form" userRole="teacher" />}>
            <div className="min-h-screen bg-white">
                <ExamBuilder initialData={exam as any} onDelete={handleDelete} />
            </div>
            <AlertModal
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type || "info"}
                confirmLabel="Close"
                onConfirm={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                onCancel={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </Suspense>
    );
}
