"use client";
import React, { useState } from "react";
import Navbar from "@/app/components/Navbar";
import { siteConfig } from "@/app/config/site";
import { UserPlus, Search, Filter, Mail, UserMinus, ChevronRight, Laptop, Trash2, AlertTriangle, X, CheckCircle, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import UserManagementModal from "@/app/components/Common/UserManagementModal";

import { AdminService } from "@/services/api/AdminService";
import { AuthService } from "@/services/api/AuthService";
import { useEffect } from "react";
import { useToast } from "@/app/components/Common/Toast";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    rollNumber?: string | null;
    department?: string | null;
    dept?: string | null; // For compatibility
}

interface AdminUsersViewProps {
    basePath?: string;
    organizationId?: string;
}

export default function AdminUsersView({ basePath, organizationId }: AdminUsersViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const router = useRouter();
    const { success, error: toastError } = useToast();

    useEffect(() => {
        const user = AuthService.getUser();
        setUserData(user);

        async function load() {
            try {
                const data = await AdminService.getUsers(organizationId);
                setUsers(data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        }
        load();
    }, [organizationId]);

    const canManageUsers = userData?.features?.canManageUsers !== false;

    const handleImpersonate = (user: any) => {
        // Save impersonation state
        localStorage.setItem("impersonation_active", "true");
        localStorage.setItem("impersonation_target", JSON.stringify({
            id: user.id,
            name: user.name,
            role: user.role
        }));
        localStorage.setItem("impersonation_origin", window.location.pathname);

        // Update current role to target role so dynamic UI (Navbar) switches
        localStorage.setItem("user-role", user.role.toLowerCase());

        // Dispatch event for components listening in the same window
        window.dispatchEvent(new Event("impersonation_change"));

        // Redirect to target dashboard
        router.push(`/dashboard/${user.role.toLowerCase()}`);
    };

    const handleToggleStatus = async (user: any) => {
        if (!canManageUsers) return;
        try {
            await AdminService.toggleUserStatus(user.id);
            setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
            success(
                `User ${!user.isActive ? 'activated' : 'suspended'} successfully`,
                "Status Updated"
            );
        } catch (e: any) {
            console.error('Failed to update status:', e);
            toastError(e.message || "Failed to update status", "Error");
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            <Navbar basePath={basePath} userRole="admin" />

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
                        <p className="text-slate-400 font-bold text-sm mt-1">Manage institutional users and their platform access.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {canManageUsers ? (
                            <button
                                onClick={() => setIsUserModalOpen(true)}
                                className="px-8 py-4 bg-[var(--brand)] text-white font-black text-sm rounded-2xl shadow-xl shadow-[var(--brand)]/20 flex items-center gap-3 hover:scale-105 transition-all active:scale-95"
                            >
                                <UserPlus size={18} />
                                Add/Import Users
                            </button>
                        ) : (
                            <div className="px-8 py-4 bg-slate-100 text-slate-400 font-black text-sm rounded-2xl flex items-center gap-3 cursor-not-allowed opacity-50 border border-slate-200">
                                <Lock size={18} />
                                Management Locked
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, email or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-[var(--brand)] shadow-sm transition-all"
                            disabled={!canManageUsers && filteredUsers.length === 0}
                        />
                    </div>
                    <div className="flex gap-2">
                        <FilterButton label="All Roles" />
                        <FilterButton label="Active Only" />
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Identity</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Role & Dept</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Account Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-[var(--brand-light)] transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-sm font-black text-slate-400">
                                                    {user.name?.[0] || "?"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">{user.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md">{user.rollNumber || "NO ID"}</span>
                                                        <p className="text-[11px] font-bold text-slate-400 lowercase tracking-tight">{user.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 mb-1">
                                                <RoleBadge role={user.role} />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.department || user.dept || "No"} Department</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                <span className={`text-[11px] font-black uppercase tracking-widest ${user.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {user.isActive ? 'Active' : 'Suspended'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 text-slate-300 hover:text-[var(--brand)] hover:bg-[var(--brand-light)] rounded-xl transition-all" title="Send Email">
                                                    <Mail size={18} />
                                                </button>
                                                <button
                                                    onClick={() => canManageUsers && handleToggleStatus(user)}
                                                    className={`p-2 transition-all rounded-xl ${!canManageUsers ? 'opacity-30 cursor-not-allowed text-slate-300' : user.isActive
                                                        ? "text-slate-300 hover:text-amber-600 hover:bg-amber-50"
                                                        : "text-amber-600 bg-amber-50 hover:bg-amber-100"
                                                        }`}
                                                    title={!canManageUsers ? "Management Locked" : user.isActive ? "Suspend User" : "Activate User"}
                                                >
                                                    {user.isActive ? <UserMinus size={18} /> : <CheckCircle size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => canManageUsers && setUserToDelete(user)}
                                                    className={`p-2 transition-all rounded-xl ${!canManageUsers ? 'opacity-30 cursor-not-allowed text-slate-300' : 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'}`}
                                                    title={!canManageUsers ? "Management Locked" : "Delete User"}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleImpersonate(user)}
                                                    className="p-2 text-slate-300 hover:text-[var(--brand)] bg-slate-50 hover:bg-[var(--brand-light)] rounded-xl transition-all group/imp relative"
                                                >
                                                    <ChevronRight size={18} className="group-hover/imp:translate-x-0.5 transition-transform" />

                                                    {/* Tooltip - Fixed to right to prevent horizontal scroll/slider */}
                                                    <div className="absolute -top-10 right-0 px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 invisible group-hover/imp:opacity-100 group-hover/imp:visible transition-all whitespace-nowrap z-50 shadow-2xl pointer-events-none">
                                                        View as {user.role === 'Organization Admin' ? 'Admin' : user.role}
                                                        {/* Little Arrow */}
                                                        <div className="absolute -bottom-1 right-3 w-2 h-2 bg-slate-900 rotate-45" />
                                                    </div>
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

            <UserManagementModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                orgName={siteConfig.adminSettingsOrgName}
                onImport={(data: any[]) => setUsers(prev => [...data, ...prev])}
            />

            <DeleteUserModal
                user={userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={async (id) => {
                    try {
                        await AdminService.deleteUser(id);
                        setUsers(users.filter(u => u.id !== id));
                        setUserToDelete(null);
                        success("User deleted successfully", "Cleanup Process");
                    } catch (e: any) {
                        console.error('Failed to delete user:', e);
                        toastError(e.message || "Failed to delete user", "Error");
                    }
                }}
            />
        </div>
    );
}

function RoleBadge({ role }: { role: string }) {
    const normalizedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    const styles: any = {
        Student: "bg-[var(--brand-light)] text-[var(--brand)] border-[var(--brand-light)]",
        Teacher: "bg-emerald-50 text-emerald-600 border-emerald-100",
        Admin: "bg-rose-50 text-rose-600 border-rose-100",
    };
    return (
        <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${styles[normalizedRole] || styles.Student}`}>
            {normalizedRole}
        </span>
    );
}

function FilterButton({ label }: { label: string }) {
    return (
        <button className="px-6 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-all shadow-sm">
            {label}
        </button>
    );
}

function DeleteUserModal({ user, onClose, onConfirm }: { user: any | null, onClose: () => void, onConfirm: (id: string) => void }) {
    const [confirmText, setConfirmText] = useState("");
    const isValid = confirmText === "DELETE";

    if (!user) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
                {/* Header */}
                <div className="p-8 pb-0 flex justify-between items-start">
                    <div className="w-16 h-16 rounded-[24px] bg-rose-50 flex items-center justify-center text-rose-500">
                        <AlertTriangle size={32} />
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 pt-6">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-3">Permanent Deletion</h2>
                    <p className="text-sm font-bold text-slate-400 mb-8">
                        You are about to remove <span className="text-slate-900">{user.name}</span>. This action is irreversible and all associated data will be lost.
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
                                onClick={() => onConfirm(user.id)}
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
