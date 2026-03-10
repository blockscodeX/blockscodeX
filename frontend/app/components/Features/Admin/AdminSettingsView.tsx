"use client";
import React, { useState } from "react";
import Navbar from "@/app/components/Navbar";
import { siteConfig } from "@/app/config/site";
import { Settings, Globe, Palette, Mail, UserPlus, Save, Globe2, Link as LinkIcon, Camera, Layout, ShieldAlert, Lock, PauseCircle, PlayCircle } from "lucide-react";

interface AdminSettingsViewProps {
    basePath?: string;
    userRole?: 'admin' | 'teacher' | 'super-admin';
    isSuperAdminView?: boolean;
    initialData?: any;
    onSave?: (data: any) => Promise<void>;
}

export default function AdminSettingsView({ basePath = '/dashboard/admin', userRole = 'admin', isSuperAdminView = false, initialData, onSave }: AdminSettingsViewProps) {
    const [branding, setBranding] = useState(initialData || {
        name: siteConfig.adminSettingsOrgName,
        subdomain: "bcu",
        primaryColor: "#fc751b",
        email: siteConfig.contactEmail,
        contact: "+91 98765 43210",
        maxUsers: "2000",
        status: "Active",
        permissions: {
            canCreateExams: true,
            allowAppExams: true,
            allowAIProctoring: true,
            canCreateCourses: true,
            allowCourseTests: true,
            canManageUsers: true,
        }
    });

    React.useEffect(() => {
        if (initialData) {
            setBranding(initialData);
        }
    }, [initialData]);

    const [isSaving, setIsSaving] = useState(false);

    const togglePermission = (key: string) => {
        setBranding((prev: any) => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [key]: !prev.permissions[key]
            }
        }));
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            <Navbar basePath={basePath} userRole={userRole} />

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Organization Settings</h1>
                        <p className="text-slate-400 font-bold text-sm mt-1">Configure {isSuperAdminView ? "this" : "your"} organization's identity and platform limits.</p>
                    </div>
                    <button
                        onClick={async () => {
                            if (onSave) {
                                setIsSaving(true);
                                try {
                                    await onSave(branding);
                                } finally {
                                    setIsSaving(false);
                                }
                            }
                        }}
                        className="px-8 py-4 bg-[var(--brand)] text-white font-black text-sm rounded-2xl shadow-xl shadow-[var(--brand)]/20 flex items-center gap-3 hover:scale-105 transition-all active:scale-95"
                    >
                        {isSaving ? <span className="animate-pulse">Saving...</span> : <><Save size={18} /> Save Changes</>}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left: Settings Forms */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Super Admin Controls Area */}
                        {isSuperAdminView && (
                            <SettingsSection icon={<ShieldAlert size={24} className="text-rose-500" />} title="Super Admin Controls" desc="Governance, permissions and state management.">
                                <div className="space-y-8">
                                    {/* Status Control */}
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-black text-slate-800">Organization Status</p>
                                            <p className="text-[11px] font-bold text-slate-400 mt-1">
                                                Currently <span className={`uppercase font-black ${branding.status === 'Active' ? 'text-emerald-600' : 'text-rose-600'}`}>{branding.status}</span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setBranding({ ...branding, status: branding.status === 'Active' ? 'Paused' : 'Active' })}
                                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${branding.status === 'Active' ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
                                        >
                                            {branding.status === 'Active' ? <><PauseCircle size={16} /> Pause Org</> : <><PlayCircle size={16} /> Activate Org</>}
                                        </button>
                                    </div>

                                    {/* Permissions Grid */}
                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Feature Permissions (Teachers & Admins)</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Exam Permissions Group */}
                                            <div className="space-y-4">
                                                <PermissionToggle
                                                    label="Create Examinations"
                                                    active={branding.permissions.canCreateExams}
                                                    onClick={() => togglePermission('canCreateExams')}
                                                />
                                                {branding.permissions.canCreateExams && (
                                                    <div className="ml-6 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-left-2 duration-300">
                                                        <PermissionToggle
                                                            label="App Examination"
                                                            active={branding.permissions.allowAppExams}
                                                            onClick={() => togglePermission('allowAppExams')}
                                                            isSub={true}
                                                        />
                                                        <PermissionToggle
                                                            label="AI Proctoring"
                                                            active={branding.permissions.allowAIProctoring}
                                                            onClick={() => togglePermission('allowAIProctoring')}
                                                            isSub={true}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Course Permissions Group */}
                                            <div className="space-y-4">
                                                <PermissionToggle
                                                    label="Create Courses"
                                                    active={branding.permissions.canCreateCourses}
                                                    onClick={() => togglePermission('canCreateCourses')}
                                                />
                                                {branding.permissions.canCreateCourses && (
                                                    <div className="ml-6 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-left-2 duration-300">
                                                        <PermissionToggle
                                                            label="Create Tests"
                                                            active={branding.permissions.allowCourseTests}
                                                            onClick={() => togglePermission('allowCourseTests')}
                                                            isSub={true}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* User Management */}
                                            <div className="md:col-span-2">
                                                <PermissionToggle
                                                    label="Manage Users"
                                                    active={branding.permissions.canManageUsers}
                                                    onClick={() => togglePermission('canManageUsers')}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SettingsSection>
                        )}

                        {/* Identity & Subdomain */}
                        <SettingsSection icon={<Globe2 size={24} />} title="Platform Identity" desc="Primary identification for your organization portal.">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Organization Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 outline-none focus:border-[var(--brand)] transition-all shadow-inner"
                                        value={branding.name}
                                        onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subdomain</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full pl-5 pr-32 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-[var(--brand)] outline-none focus:border-[var(--brand)] transition-all shadow-inner uppercase tracking-wider"
                                            value={branding.subdomain}
                                            onChange={(e) => setBranding({ ...branding, subdomain: e.target.value })}
                                        />
                                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">.{siteConfig.domain}</span>
                                    </div>
                                </div>
                            </div>
                        </SettingsSection>

                        {/* Visual Branding */}
                        <SettingsSection icon={<Palette size={24} />} title="Visual Identity" desc="Customize themes and logos to match your brand style.">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Primary Brand Color</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl shadow-lg border-4 border-white shrink-0" style={{ backgroundColor: branding.primaryColor }}></div>
                                        <input
                                            type="text"
                                            className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono font-bold text-slate-600 outline-none focus:border-[var(--brand)] transition-all uppercase"
                                            value={branding.primaryColor}
                                            onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        {['#6366f1', '#fc751b', '#0ea5e9', '#10b981', '#f43f5e'].map(c => (
                                            <button key={c} onClick={() => setBranding({ ...branding, primaryColor: c })} className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform" style={{ backgroundColor: c }}></button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Institution Logo</label>
                                    <div className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group">
                                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-slate-300 group-hover:text-[var(--brand)] shadow-sm transition-all">
                                            <Camera size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Update Logo</p>
                                            <p className="text-[10px] font-bold text-slate-400">SVG, PNG or JPG (Max 2MB)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SettingsSection>

                        {/* Contact & Limits */}
                        <SettingsSection icon={<Mail size={24} />} title="Contact & Governance" desc="Official communication channels and institutional limits.">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Official Support Email</label>
                                    <input
                                        type="email"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 outline-none focus:border-[var(--brand)] transition-all shadow-inner"
                                        value={branding.email}
                                        onChange={(e) => setBranding({ ...branding, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">User Capacity Limit <span className="text-[var(--brand)]">*</span></label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            readOnly={!isSuperAdminView} // Editable only for Super Admin
                                            className={`w-full pl-5 pr-16 py-4 border rounded-2xl text-sm font-black outline-none transition-all ${isSuperAdminView ? 'bg-white border-slate-200 text-slate-800 focus:border-[var(--brand)]' : 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed'}`}
                                            value={branding.maxUsers}
                                            onChange={(e) => {
                                                if (!isSuperAdminView) return;
                                                const val = parseInt(e.target.value);
                                                if (val < 0) return;
                                                setBranding({ ...branding, maxUsers: e.target.value })
                                            }}
                                        />
                                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Users</span>
                                    </div>
                                    {!isSuperAdminView && <p className="text-[9px] font-black text-[var(--brand)] uppercase tracking-widest mt-1 ml-1">Contact Super Admin to increase limit</p>}
                                </div>
                            </div>
                        </SettingsSection>
                    </div>

                    {/* Right: Preview Card */}
                    <div className="space-y-8">
                        <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden h-fit sticky top-32">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-10">Live Portal Preview</p>

                            <div className="space-y-8 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-2xl" style={{ backgroundColor: branding.primaryColor }}>
                                        <span className="text-white font-black text-sm">{branding.name ? branding.name.split(' ').map((w: any) => w[0]).join('') : 'L'}</span>
                                    </div>
                                    <div>
                                        <p className="text-lg font-black tracking-tight">{branding.name}</p>
                                        <p className="text-[10px] font-bold text-white/40">{branding.subdomain}.{siteConfig.domain}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="h-2 w-3/4 bg-white/10 rounded-full"></div>
                                    <div className="h-2 w-1/2 bg-white/10 rounded-full"></div>
                                    <div className="h-10 w-full rounded-2xl bg-white flex items-center justify-center text-slate-900 text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: branding.primaryColor, color: '#fff' }}>
                                        Sample Action Button
                                    </div>
                                </div>
                            </div>

                            <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full blur-[60px]" style={{ backgroundColor: branding.primaryColor + '33' }}></div>
                        </div>

                        {/* Quick Stats (Only for Settings View) - Removed as per user request */}
                    </div>
                </div>
            </main>
        </div>
    );
}

function SettingsSection({ icon, title, desc, children }: any) {
    return (
        <div className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm">
            <div className="flex items-start gap-6 mb-10">
                <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    {icon}
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-2">{title}</h3>
                    <p className="text-sm font-bold text-slate-400">{desc}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

function PermissionToggle({ label, active, onClick, isSub = false }: { label: string, active: boolean, onClick: () => void, isSub?: boolean }) {
    return (
        <div
            onClick={onClick}
            className={`cursor-pointer p-4 rounded-xl border flex items-center justify-between transition-all ${isSub ? 'py-3 px-4 border-transparent hover:bg-white' : active ? 'bg-[var(--brand-light)] border-[var(--brand-light)] shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
        >
            <span className={`font-black uppercase tracking-wider ${isSub ? 'text-[10px] text-slate-500' : 'text-xs ' + (active ? 'text-[var(--brand-dark)]' : 'text-slate-400')}`}>{label}</span>
            <div className={`${isSub ? 'w-8 h-5' : 'w-10 h-6'} rounded-full relative transition-colors ${active ? 'bg-[var(--brand)]' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 left-1 ${isSub ? 'w-3 h-3 translate-x-0' : 'w-4 h-4'} bg-white rounded-full shadow-md transition-transform ${active ? (isSub ? 'translate-x-3' : 'translate-x-4') : ''}`}></div>
            </div>
        </div>
    )
}
