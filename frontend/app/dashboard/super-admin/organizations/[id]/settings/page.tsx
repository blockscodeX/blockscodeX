"use client";
import React, { useState, useEffect, use } from 'react';
import AdminSettingsView from '@/app/components/Features/Admin/AdminSettingsView';
import { SuperAdminService } from '@/services/api/SuperAdminService';
import { siteConfig } from '@/app/config/site';
import DashboardSkeleton from '@/app/components/Skeletons/DashboardSkeleton';

export default function SuperAdminOrganizationSettings({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [orgData, setOrgData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                console.log('[SuperAdminOrganizationSettings] Loading org:', resolvedParams.id);
                const data = await SuperAdminService.getOrganization(resolvedParams.id);
                console.log('[SuperAdminOrganizationSettings] Received data:', data);

                if (!data) {
                    throw new Error('Organization not found');
                }

                // Map DB schema to view's expected format
                const mappedData = {
                    ...data,
                    subdomain: data.domain?.split('.')[0] || '',
                    contact: data.contact?.phone || '',
                    email: data.contact?.supportEmail || data.contact?.adminEmail || '',
                    permissions: data.features || {
                        canCreateExams: true,
                        allowAppExams: true,
                        allowAIProctoring: true,
                        canCreateCourses: true,
                        allowCourseTests: true,
                        canManageUsers: true,
                    }
                };

                console.log('[SuperAdminOrganizationSettings] Mapped data:', mappedData);
                setOrgData(mappedData);
            } catch (e: any) {
                console.error('[SuperAdminOrganizationSettings] Error loading org:', e);
                setError(e.message || 'Failed to load organization');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [resolvedParams.id]);

    const handleSave = async (updatedData: any) => {
        try {
            console.log('[SuperAdminOrganizationSettings] Saving data:', updatedData);

            // Map back to Prisma schema
            const payload = {
                name: updatedData.name,
                domain: updatedData.subdomain ? `${updatedData.subdomain}.${siteConfig.domain}` : orgData.domain,
                status: updatedData.status,
                maxUsers: Number(updatedData.maxUsers) || 100,
                primaryColor: updatedData.primaryColor || '#fc751b',
                logo: updatedData.logo || null,
                features: updatedData.permissions,
                contact: {
                    ...orgData.contact,
                    phone: updatedData.contact || null,
                    supportEmail: updatedData.email || null,
                    adminEmail: updatedData.email || null
                }
            };

            console.log('[SuperAdminOrganizationSettings] Payload:', payload);
            await SuperAdminService.updateOrganization(resolvedParams.id, payload);
            alert('Settings saved successfully!');

            // Reload data
            const refreshedData = await SuperAdminService.getOrganization(resolvedParams.id);
            setOrgData({
                ...refreshedData,
                subdomain: refreshedData.domain?.split('.')[0] || '',
                contact: refreshedData.contact?.phone || '',
                email: refreshedData.contact?.supportEmail || refreshedData.contact?.adminEmail || '',
                permissions: refreshedData.features || updatedData.permissions
            });
        } catch (e: any) {
            console.error('[SuperAdminOrganizationSettings] Save error:', e);
            alert('Failed to save settings: ' + (e.message || 'Unknown error'));
        }
    };

    if (loading) return <DashboardSkeleton type="form" userRole="super-admin" />;

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Organization</h1>
                    <p className="text-slate-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <AdminSettingsView
            basePath="/dashboard/super-admin"
            userRole="super-admin"
            isSuperAdminView={true}
            initialData={orgData}
            onSave={handleSave}
        />
    );
}
