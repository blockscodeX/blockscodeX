"use client";
import React, { useState } from "react";
import Navbar from "@/app/components/Navbar";
import { siteConfig } from "@/app/config/site";
import { Save, Globe2, Building2, MapPin, Mail, Phone, CreditCard, Shield, User, Smartphone, Map, Globe, Database, HardDrive, Layout, ChevronDown, Palette, Camera } from "lucide-react";
import { useRouter } from "next/navigation";

import { SuperAdminService } from "@/services/api/SuperAdminService";

export default function CreateOrganizationView() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<{
        name: string;
        subdomain: string;
        adminName: string;
        adminEmail: string;
        adminPassword: string;
        phone: string;
        supportEmail: string;
        address: string;
        city: string;
        country: string;
        plan: string;
        maxUsers: string;
        maxStorage: string;
        canCreateExams: boolean;
        allowAppExams: boolean;
        allowAIProctoring: boolean;
        canCreateCourses: boolean;
        allowCourseTests: boolean;
        canManageUsers: boolean;
        primaryColor: string;
        logo: string | File; // Allow File object
    }>({
        // Identity
        name: "",
        subdomain: "",

        // Contact
        adminName: "",
        adminEmail: "",
        adminPassword: "",
        phone: "",
        supportEmail: "",
        address: "",
        city: "",
        country: "Nepal",

        // Configuration
        plan: "Enterprise",
        maxUsers: "1000",
        maxStorage: "500", // GB

        // Feature Permissions
        canCreateExams: true,
        allowAppExams: true,
        allowAIProctoring: true,
        canCreateCourses: true,
        allowCourseTests: true,
        canManageUsers: true,

        // Branding - default
        primaryColor: "#fc751b",
        logo: ""
    });

    const handleSave = async () => {
        if (!formData.name) return alert("Organization name is required");
        if (formData.adminEmail && !formData.adminPassword) return alert("Please set a password for the admin");

        setIsSaving(true);
        try {
            await SuperAdminService.createOrganization({
                name: formData.name,
                domain: formData.subdomain ? `${formData.subdomain}.${siteConfig.domain}` : undefined,
                logo: formData.logo,
                maxUsers: formData.maxUsers,
                maxCourses: 10, // Default or map if exists
                storageLimit: formData.maxStorage,
                status: 'Active',
                // Branding
                primaryColor: formData.primaryColor,
                // Feature Permissions
                canCreateExams: formData.canCreateExams,
                allowAppExams: formData.allowAppExams,
                allowAIProctoring: formData.allowAIProctoring,
                canCreateCourses: formData.canCreateCourses,
                allowCourseTests: formData.allowCourseTests,
                canManageUsers: formData.canManageUsers,
                // Contact (for future use)
                adminName: formData.adminName,
                adminEmail: formData.adminEmail,
                adminPassword: formData.adminPassword
            });
            router.push('/dashboard/super-admin/organizations');
        } catch (error) {
            console.error("Failed to create organization", error);
            alert("Failed to create organization");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            {/* Navbar set to Super Admin context */}
            <Navbar basePath="/dashboard/super-admin" userRole="super-admin" />

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Provision New Tenant</h1>
                        <p className="text-slate-400 font-bold text-sm mt-1">Create a new organization instance and configure initial settings.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        className="px-8 py-4 bg-[var(--brand)] text-white font-black text-sm rounded-2xl shadow-xl shadow-[var(--brand)]/20 flex items-center gap-3 hover:scale-105 transition-all active:scale-95"
                    >
                        {isSaving ? <span className="animate-pulse">Provisioning...</span> : <><Save size={18} /> Create Organization</>}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left Column: Form Sections */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 1. Identity Section */}
                        <SettingsSection icon={<Building2 size={24} />} title="Organization Identity" desc="Basic information and portal identification.">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputGroup label="Organization Name">
                                    <input
                                        type="text"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 outline-none focus:border-[var(--brand)] transition-all shadow-inner placeholder:text-slate-300"
                                        placeholder="e.g. Acme University"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </InputGroup>
                                <InputGroup label="Subdomain Prefix">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full pl-5 pr-32 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-[var(--brand)] outline-none focus:border-[var(--brand)] transition-all shadow-inner uppercase tracking-wider placeholder:normal-case placeholder:text-slate-300"
                                            placeholder="acme"
                                            value={formData.subdomain}
                                            onChange={e => setFormData({ ...formData, subdomain: e.target.value })}
                                        />
                                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">.{siteConfig.domain}</span>
                                    </div>
                                </InputGroup>
                            </div>
                        </SettingsSection>

                        {/* 2. Primary Contact & Location */}
                        <SettingsSection icon={<MapPin size={24} />} title="Contact & Location" desc="Physical address and administrative contact details.">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputGroup label="Primary Administrator">
                                    <div className="relative">
                                        <User size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[var(--brand)] transition-all shadow-inner placeholder:text-slate-300"
                                            placeholder="Full Name"
                                            value={formData.adminName}
                                            onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                                        />
                                    </div>
                                </InputGroup>
                                <InputGroup label="Admin Email">
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="email"
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[var(--brand)] transition-all shadow-inner placeholder:text-slate-300"
                                            placeholder="admin@acme.edu"
                                            value={formData.adminEmail}
                                            onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                                        />
                                    </div>
                                </InputGroup>
                                <InputGroup label="Admin Password">
                                    <div className="relative">
                                        <Shield size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="password"
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[var(--brand)] transition-all shadow-inner placeholder:text-slate-300"
                                            placeholder="Set initial password"
                                            value={formData.adminPassword}
                                            onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                                        />
                                    </div>
                                </InputGroup>
                                <InputGroup label="Official Phone">
                                    <div className="relative">
                                        <Smartphone size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="tel"
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[var(--brand)] transition-all shadow-inner placeholder:text-slate-300"
                                            placeholder="+91..."
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </InputGroup>
                                <InputGroup label="Support Email">
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="email"
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[var(--brand)] transition-all shadow-inner placeholder:text-slate-300"
                                            placeholder="support@acme.edu"
                                            value={formData.supportEmail}
                                            onChange={e => setFormData({ ...formData, supportEmail: e.target.value })}
                                        />
                                    </div>
                                </InputGroup>

                                <div className="md:col-span-2 border-t border-slate-50 pt-6 mt-2">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                        <Map size={14} /> Organization Address
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <input
                                                type="text"
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[var(--brand)] transition-all shadow-inner placeholder:text-slate-300"
                                                placeholder="Street Address, Campus Building..."
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[var(--brand)] transition-all shadow-inner placeholder:text-slate-300"
                                            placeholder="City"
                                            value={formData.city}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[var(--brand)] transition-all shadow-inner placeholder:text-slate-300"
                                            placeholder="Country"
                                            value={formData.country}
                                            onChange={e => setFormData({ ...formData, country: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </SettingsSection>

                        {/* 3. Visual Branding */}
                        <SettingsSection icon={<Palette size={24} />} title="Visual Identity" desc="Customize themes and logos to match brand style.">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Primary Brand Color</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl shadow-lg border-4 border-white shrink-0" style={{ backgroundColor: formData.primaryColor }}></div>
                                        <input
                                            type="text"
                                            className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono font-bold text-slate-600 outline-none focus:border-[var(--brand)] transition-all uppercase"
                                            value={formData.primaryColor}
                                            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        {['#6366f1', '#fc751b', '#0ea5e9', '#10b981', '#f43f5e'].map(c => (
                                            <button key={c} onClick={() => setFormData({ ...formData, primaryColor: c })} className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform" style={{ backgroundColor: c }}></button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Institution Logo</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    // Store the File object directly for upload
                                                    setFormData({ ...formData, logo: file });
                                                }
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className={`flex items-center gap-4 p-4 border-2 border-dashed ${formData.logo ? 'border-[var(--brand)] bg-[var(--brand-light)]/10' : 'border-slate-100 bg-slate-50/50'} rounded-3xl hover:bg-slate-50 transition-all cursor-pointer`}>
                                            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-slate-300 group-hover:text-[var(--brand)] shadow-sm transition-all overflow-hidden">
                                                {formData.logo ? (
                                                    typeof formData.logo === 'string' ? (
                                                        <img src={formData.logo} alt="Preview" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <img src={URL.createObjectURL(formData.logo)} alt="Preview" className="w-full h-full object-contain" />
                                                    )
                                                ) : <Camera size={24} />}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{formData.logo ? 'Change Logo' : 'Upload Logo'}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{formData.logo ? 'Logo Selected' : 'SVG, PNG or JPG (Max 2MB)'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SettingsSection>

                        {/* 4. Plan & Limits */}
                        <SettingsSection icon={<CreditCard size={24} />} title="Plan Configuration" desc="Set subscription tier and resource limits.">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <InputGroup label="License Plan">
                                    <div className="relative">
                                        <select
                                            className="w-full px-5 py-4 bg-[var(--brand-light)] border border-[var(--brand-light)] rounded-2xl text-sm font-black text-[var(--brand-dark)] outline-none focus:border-[var(--brand)] transition-all shadow-sm appearance-none cursor-pointer"
                                            value={formData.plan}
                                            onChange={e => setFormData({ ...formData, plan: e.target.value })}
                                        >
                                            <option>Enterprise</option>
                                            <option>Pro</option>
                                            <option>Starter</option>
                                            <option>Custom</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--brand)] pointer-events-none" />
                                    </div>
                                </InputGroup>
                                <InputGroup label="Max User Capacity">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 outline-none focus:border-[var(--brand)] transition-all shadow-inner"
                                            value={formData.maxUsers}
                                            onChange={e => {
                                                const val = parseInt(e.target.value);
                                                if (val >= 0 || e.target.value === '') setFormData({ ...formData, maxUsers: e.target.value });
                                            }}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Users</span>
                                    </div>
                                </InputGroup>
                                <InputGroup label="Storage Limit">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 outline-none focus:border-[var(--brand)] transition-all shadow-inner"
                                            value={formData.maxStorage}
                                            onChange={e => {
                                                const val = parseInt(e.target.value);
                                                if (val >= 0 || e.target.value === '') setFormData({ ...formData, maxStorage: e.target.value });
                                            }}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">GB</span>
                                    </div>
                                </InputGroup>
                            </div>
                        </SettingsSection>

                        {/* 5. Feature Permissions */}
                        <SettingsSection icon={<Shield size={24} className="text-rose-500" />} title="Super Admin Controls" desc="Governance, permissions and feature entitlements.">
                            <div className="space-y-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Feature Permissions (Teachers & Admins)</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Exam Permissions Group */}
                                    <div className="space-y-4">
                                        <PermissionToggle
                                            label="Create Examinations"
                                            active={formData.canCreateExams}
                                            onClick={() => setFormData({ ...formData, canCreateExams: !formData.canCreateExams })}
                                        />
                                        {formData.canCreateExams && (
                                            <div className="ml-6 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-left-2 duration-300">
                                                <PermissionToggle
                                                    label="App Examination"
                                                    active={formData.allowAppExams}
                                                    onClick={() => setFormData({ ...formData, allowAppExams: !formData.allowAppExams })}
                                                    isSub={true}
                                                />
                                                <PermissionToggle
                                                    label="AI Proctoring"
                                                    active={formData.allowAIProctoring}
                                                    onClick={() => setFormData({ ...formData, allowAIProctoring: !formData.allowAIProctoring })}
                                                    isSub={true}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Course Permissions Group */}
                                    <div className="space-y-4">
                                        <PermissionToggle
                                            label="Create Courses"
                                            active={formData.canCreateCourses}
                                            onClick={() => setFormData({ ...formData, canCreateCourses: !formData.canCreateCourses })}
                                        />
                                        {formData.canCreateCourses && (
                                            <div className="ml-6 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-left-2 duration-300">
                                                <PermissionToggle
                                                    label="Create Tests"
                                                    active={formData.allowCourseTests}
                                                    onClick={() => setFormData({ ...formData, allowCourseTests: !formData.allowCourseTests })}
                                                    isSub={true}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* User Management */}
                                    <div className="md:col-span-2">
                                        <PermissionToggle
                                            label="Manage Users"
                                            active={formData.canManageUsers}
                                            onClick={() => setFormData({ ...formData, canManageUsers: !formData.canManageUsers })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </SettingsSection>
                    </div>

                    {/* Right Column: Summary Card */}
                    <div className="space-y-8">
                        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 sticky top-32">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">Summary Preview</h3>

                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-[var(--brand)] flex items-center justify-center text-white shadow-lg shadow-[var(--brand)]/20">
                                        <span className="font-black text-lg">{formData.name ? formData.name[0] : 'O'}</span>
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-slate-900 leading-tight">{formData.name || "Organization Name"}</p>
                                        <p className="text-xs font-bold text-slate-400 mt-1">{formData.subdomain ? `${formData.subdomain}.${siteConfig.domain}` : `subdomain.${siteConfig.domain}`}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-slate-50">
                                    <SummaryItem label="Plan Tier" value={formData.plan} />
                                    <SummaryItem label="Resource Alloc" value={`${formData.maxUsers || 0} Users • ${formData.maxStorage || 0} GB`} />
                                    <SummaryItem label="Primary Admin" value={formData.adminEmail || "Not Set"} />
                                    <SummaryItem label="Location" value={`${formData.city || 'City'}, ${formData.country}`} />
                                    <SummaryItem
                                        label="Feature Set"
                                        value={[
                                            formData.canCreateExams ? 'Exams' : null,
                                            formData.canCreateCourses ? 'Courses' : null,
                                            formData.allowAppExams ? 'App Mode' : null,
                                            formData.allowAIProctoring ? 'AI Shield' : null
                                        ].filter(Boolean).join(' • ') || 'None'}
                                    />
                                </div>

                                <div className="pt-6 border-t border-slate-50">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-2 text-[var(--brand)]">
                                            <Shield size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Provisioning Actions</span>
                                        </div>
                                        <ul className="space-y-2">
                                            <CheckItem label="Initialize Database Shard" />
                                            <CheckItem label="Deploy Access Gateway" />
                                            <CheckItem label="Send Admin Invite" />
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
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

function InputGroup({ label, children }: any) {
    return (
        <div className="space-y-2 w-full">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
            {children}
        </div>
    )
}

function SummaryItem({ label, value }: any) {
    return (
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            <p className="text-sm font-bold text-slate-700 truncate">{value}</p>
        </div>
    )
}

function CheckItem({ label }: any) {
    return (
        <li className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            {label}
        </li>
    )
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
