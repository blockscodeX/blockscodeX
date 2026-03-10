"use client";
import React, { useState, useEffect } from "react";
import { SuperAdminService } from "@/services/api/SuperAdminService";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";
import { Search, Building2, Plus, Filter, MoreVertical, Globe, Users, Settings2, Trash2, Edit3, ShieldCheck } from "lucide-react";
import { useToast } from "@/app/components/Common/Toast";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";

export default function SuperAdminOrganizationsPage() {
    const [searchQuery, setSearchQuery] = useState("");

    const [organizations, setOrganizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOrgs() {
            try {
                const data = await SuperAdminService.getOrganizations();
                setOrganizations(data);
            } catch (error) {
                console.error("Failed to fetch organizations", error);
            } finally {
                setLoading(false);
            }
        }
        fetchOrgs();
    }, []);

    const filteredOrgs = organizations.filter(org =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (org.domain && org.domain.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const [orgToDelete, setOrgToDelete] = useState<any | null>(null);
    const { success, error: toastError } = useToast();

    const handleDelete = async (id: string) => {
        try {
            await SuperAdminService.deleteOrganization(id);
            setOrganizations(organizations.filter(org => org.id !== id));
            setOrgToDelete(null);
            success("Organization permanently deleted", "Cleanup Complete");
        } catch (error: any) {
            toastError(error.message || "Failed to delete organization");
        }
    };

    if (loading) return <DashboardSkeleton type="list" userRole="super-admin" />;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            <Navbar userRole="super-admin" />

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Organizations Registry</h1>
                        <p className="text-slate-400 font-bold text-sm mt-1">Manage institutional tenants and their subscriptions.</p>
                    </div>
                    <Link href="/dashboard/super-admin/organizations/new">
                        <button className="px-8 py-4 bg-[var(--brand)] text-white font-black text-sm rounded-2xl shadow-xl shadow-[var(--brand)]/20 flex items-center gap-3 hover:scale-105 transition-all active:scale-95">
                            <Plus size={18} />
                            Register Organization
                        </button>
                    </Link>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input
                            type="text"
                            placeholder="Find organization by name, domain or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-[var(--brand)] shadow-sm transition-all"
                        />
                    </div>
                </div>

                {/* Organizations Table */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Organization Identity</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Portal Domain</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">User Load</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">License Plan</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredOrgs.map((org) => (
                                    <tr key={org.id} className="hover:bg-slate-50/50 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                    {org.logo ? <img src={org.logo} className="w-full h-full object-cover rounded-2xl" /> : <Building2 size={24} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">{org.name}</p>
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mt-1">
                                                        Admin: {org.contact?.adminEmail || org.admin || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-[var(--brand)]">
                                                <Globe size={14} />
                                                <span className="text-xs font-black uppercase tracking-wider">{org.domain || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <Users size={14} className="text-slate-300" />
                                                <span className="text-xs font-black text-slate-700">{org._count?.users || org.userCount || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${org.plan === 'Enterprise' ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'bg-slate-100 text-slate-500'}`}>
                                                {org.plan || 'Standard'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/dashboard/super-admin/organizations/${org.id}/dashboard`}>
                                                    <button className="px-4 py-2 bg-[var(--brand-light)] text-[var(--brand)] rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--brand)] hover:text-white transition-all shadow-sm">
                                                        <ShieldCheck size={14} /> Impersonate
                                                    </button>
                                                </Link>
                                                <Link href={`/dashboard/super-admin/organizations/${org.id}/settings`}>
                                                    <button className="p-2 text-slate-300 hover:text-[var(--brand)] hover:bg-slate-50 rounded-xl transition-all" title="Configure Organization">
                                                        <Settings2 size={18} />
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => setOrgToDelete(org)}
                                                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <DeleteOrganizationModal
                org={orgToDelete}
                onClose={() => setOrgToDelete(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}

function DeleteOrganizationModal({ org, onClose, onConfirm }: { org: any | null, onClose: () => void, onConfirm: (id: string) => void }) {
    const [confirmText, setConfirmText] = useState("");
    const isValid = confirmText === "DELETE";

    if (!org) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
                {/* Header */}
                <div className="p-8 pb-0 flex justify-between items-start">
                    <div className="w-16 h-16 rounded-[24px] bg-rose-50 flex items-center justify-center text-rose-500">
                        <Trash2 size={32} />
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                        <Settings2 size={24} className="rotate-45" />
                    </button>
                </div>

                <div className="p-8 pt-6">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-3">Delete Organization</h2>
                    <p className="text-sm font-bold text-slate-400 mb-8">
                        You are about to permanently delete <span className="text-slate-900">{org.name}</span>. This will remove ALL associated users, courses, and data. This action is irreversible.
                    </p>

                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-100">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Type "DELETE" to confirm</label>
                            <input
                                autoFocus
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="DELETE"
                                className="w-full bg-transparent text-sm font-black text-rose-600 outline-none placeholder:text-slate-200"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all border border-transparent"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onConfirm(org.id)}
                                disabled={!isValid}
                                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-rose-100 ${isValid ? 'bg-rose-600 text-white hover:scale-[1.02] active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
