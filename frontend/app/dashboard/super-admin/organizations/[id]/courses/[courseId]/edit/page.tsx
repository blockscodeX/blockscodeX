"use client";
import React, { useEffect, useState } from "react";
import CourseEditor from "@/app/components/Features/Courses/CourseEditor";
import { useRouter } from "next/navigation";
import AlertModal from "@/app/components/Common/AlertModal";
import { TeacherService } from "@/services/api/TeacherService";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";

export default function SuperAdminOrganizationCourseEdit({ params }: { params: Promise<{ id: string, courseId: string }> }) {
    const { id, courseId } = React.use(params);
    const router = useRouter();
    const [course, setCourse] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, type?: 'danger' | 'warning' | 'info' }>({ isOpen: false, title: '', message: '' });

    useEffect(() => {
        async function load() {
            try {
                const data = await TeacherService.getCourse(courseId);
                setCourse(data);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to load course");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [courseId]);

    const handleDelete = async () => {
        try {
            await TeacherService.deleteCourse(courseId);
            setAlertConfig({
                isOpen: true,
                title: "Deleted",
                message: "Course deleted successfully!",
                type: "info"
            });
            setTimeout(() => router.push(`/dashboard/super-admin/organizations/${id}/courses`), 1000);
        } catch (e: any) {
            setAlertConfig({
                isOpen: true,
                title: "Error",
                message: e.message || "Failed to delete course",
                type: "danger"
            });
        }
    };

    if (loading) return <DashboardSkeleton type="form" userRole="super-admin" />;
    if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;

    return (
        <div>
            <CourseEditor
                initialData={course}
                onDelete={handleDelete}
                userRole="admin"
                basePath={`/dashboard/super-admin/organizations/${id}`}
                organizationId={id}
            />
            <AlertModal
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type || "info"}
                confirmLabel="Close"
                onConfirm={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                onCancel={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
