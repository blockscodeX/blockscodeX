"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/app/components/Navbar";
import { siteConfig } from "@/app/config/site";
import { Search, Globe, Shield, Filter, Mail, Ban, CheckCircle2, MoreVertical, Building2, Users, UserCog, Trash2, Power, ChevronLeft, ChevronRight } from "lucide-react";
import { SuperAdminService } from "@/services/api/SuperAdminService";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";
import { useToast } from "@/app/components/Common/Toast";
import AlertModal from "@/app/components/Common/AlertModal";

const ROLE_LABELS: Record<string, string> = {
    'SUPER_ADMIN': 'Super Admin',
    'ADMIN': 'Organization Admin',
    'TEACHER': 'Instructor',
    'STUDENT': 'Student'
};

export default function SuperAdminUsersPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { success, error: toastError } = useToast();

    // Delete Modal State
    const [userToDelete, setUserToDelete] = useState<any | null>(null);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await SuperAdminService.getUsers(page, 10, debouncedSearch);
            // Handle response format change: { data: [], total: 100, ... }
            if (response.data) {
                setUsers(response.data);
                setTotalPages(response.totalPages);
                setTotalUsers(response.total);
            } else {
                // Fallback
                setUsers(response);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
            toastError("Unable to retrieve global user index.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page, debouncedSearch]);

    const handleToggleStatus = async (user: any) => {
        setActionLoading(user.id);
        try {
            await SuperAdminService.updateUser(user.id, { isActive: !user.isActive });
            setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
            success(
                `User account ${!user.isActive ? 'activated' : 'suspended'} successfully.`,
                "Permissions Updated"
            );
        } catch (error: any) {
            toastError(error.message || "Failed to update user status");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;
        setLoading(true);
        try {
            await SuperAdminService.deleteUser(userToDelete.id);
            setUsers(users.filter(u => u.id !== userToDelete.id));
            success("User account permanently deleted.", "Account Removed");
        } catch (error: any) {
            toastError(error.message || "Failed to delete user");
        } finally {
            setLoading(false);
            setUserToDelete(null);
        }
    };

    // Removed client-side filtering
    // const filteredUsers = ...

    if (loading && users.length === 0) return <DashboardSkeleton type="list" userRole="super-admin" />;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            <Navbar userRole="super-admin" />

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Global User Index</h1>
                        <p className="text-slate-400 font-bold text-sm mt-1">Universal user control across all platform tenants.</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                        <Users size={20} className="text-[var(--brand)]" />
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-300 leading-none mb-1">Total Users</p>
                            <p className="text-lg font-black text-slate-800 leading-none">{totalUsers}</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input
                            type="text"
                            placeholder="Universal search by name, email, org or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-[var(--brand)] shadow-sm transition-all placeholder:text-slate-300"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">User Identity</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Auth Role</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Organization Tenant</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/30 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm overflow-hidden">
                                                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">{u.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${u.role === 'SUPER_ADMIN' ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                {ROLE_LABELS[u.role] || u.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Building2 size={14} className="text-slate-300" />
                                                <span className="text-xs font-black uppercase tracking-wider">{u.organization?.name || siteConfig.adminUserOrgFallback}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${u.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {u.isActive ? 'Active' : 'Suspended'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleStatus(u)}
                                                    disabled={actionLoading === u.id}
                                                    className={`p-2 rounded-xl transition-all flex items-center gap-2 ${u.isActive ? 'text-slate-300 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                    title={u.isActive ? "Suspend Account" : "Activate Account"}
                                                >
                                                    {actionLoading === u.id ? <div className="w-4.5 h-4.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : (u.isActive ? <Ban size={18} /> : <CheckCircle2 size={18} />)}
                                                </button>
                                                <button
                                                    onClick={() => setUserToDelete(u)}
                                                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                    title="Permanently Delete"
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

                {users.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-slate-100 mt-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                            <Search size={32} className="text-slate-200" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800">No users found</h3>
                        <p className="text-sm font-medium text-slate-400 mt-2 text-center max-w-xs">
                            We couldn't find any users matching "{searchQuery}" in the global register.
                        </p>
                    </div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                    <p className="text-xs font-bold text-slate-400">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-xl bg-white border border-slate-100 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                        >
                            <ChevronLeft size={16} className="text-slate-600" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-xl bg-white border border-slate-100 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                        >
                            <ChevronRight size={16} className="text-slate-600" />
                        </button>
                    </div>
                </div>
            </main>

            <AlertModal
                isOpen={!!userToDelete}
                title="Delete User Account?"
                message={`Are you sure you want to permanently delete ${userToDelete?.name}? This action cannot be undone and will remove all their associated data across all platforms.`}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setUserToDelete(null)}
                type="danger"
                confirmLabel="Delete Permanently"
            />
        </div>
    );
}
