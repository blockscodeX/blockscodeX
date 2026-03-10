"use client";
import React, { Suspense } from 'react';
import ExamBuilder from '@/app/components/Authoring/ExamBuilder';
import DashboardSkeleton from '@/app/components/Skeletons/DashboardSkeleton';
import { AuthService } from '@/services/api/AuthService';

export default function CreateExamPage() {
    const [userData, setUserData] = React.useState<any>(null);

    React.useEffect(() => {
        setUserData(AuthService.getUser());
    }, []);

    return (
        <Suspense fallback={<DashboardSkeleton type="form" userRole="teacher" />}>
            <div className="min-h-screen bg-white">
                <ExamBuilder orgPermissions={userData?.features} />
            </div>
        </Suspense>
    );
}
