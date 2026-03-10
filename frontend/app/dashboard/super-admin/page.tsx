"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { Building2, Users, ShieldAlert, Globe, ArrowUpRight, Plus, Activity, Zap, Trash2 } from "lucide-react";
import { SuperAdminService } from "@/services/api/SuperAdminService";
import { requireAuthClient } from "@/hooks/requireAuthClient";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";

export default function SuperAdminDashboardPage() {
    const [statsData, setStatsData] = useState<any>(null);
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        if (!requireAuthClient("/login")) return;
        setAuthChecked(true);
        async function load() {
            try {
                const [s, o] = await Promise.all([
                    SuperAdminService.getStats(),
                    SuperAdminService.getOrganizations()
                ]);
                setStatsData(s);
                setOrganizations(o);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        }
        load();
    }, []);

    const globalStats = [
        { label: "Total Organizations", value: statsData?.totalOrgs?.toString() || "0", change: "+2 this month", icon: <Building2 size={20} />, color: "bg-[var(--brand-light)] text-[var(--brand)]" },
        { label: "Global Users", value: statsData?.totalUsers?.toString() || "0", change: "+1.2k", icon: <Users size={20} />, color: "bg-emerald-50 text-emerald-600" },
        { label: "Active Nodes", value: statsData?.activeNodes?.toString() || "4", change: "Healthy", icon: <Activity size={20} />, color: "bg-blue-50 text-blue-600" },
        { label: "System Alerts", value: statsData?.alerts?.toString() || "0", change: "None", icon: <ShieldAlert size={20} />, color: "bg-slate-50 text-slate-400" },
    ];

    if (!authChecked || loading) return <DashboardSkeleton type="main" userRole="super-admin" />;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            <Navbar userRole="super-admin" />

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Infrastructure</h1>
                        <p className="text-slate-400 font-bold text-sm mt-1">Super-Admin control center for multi-tenant management.</p>
                    </div>
                    <Link href="/dashboard/super-admin/organizations/new">
                        <button className="px-8 py-4 bg-[var(--brand)] text-white font-black text-sm rounded-2xl shadow-xl shadow-[var(--brand)]/20 flex items-center gap-3 hover:scale-105 transition-all active:scale-95">
                            <Plus size={18} /> Deploy New Organization
                        </button>
                    </Link>
                </div>

                {/* Global Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {globalStats.map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.color}`}>
                                    {stat.icon}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.change}</span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-black text-slate-800">{stat.value}</h3>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Top Performing Organizations */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-8">Featured Organizations</h3>
                            <div className="space-y-4">
                                {organizations.length > 0 ? organizations.map((org: any) => (
                                    <OrgRow
                                        key={org.id}
                                        org={org}
                                        onDelete={async () => {
                                            if (confirm(`Are you sure you want to delete ${org.name}?`)) {
                                                try {
                                                    await SuperAdminService.deleteOrganization(org.id);
                                                    setOrganizations(prev => prev.filter(o => o.id !== org.id));
                                                } catch (e) { alert("Failed to delete organization"); }
                                            }
                                        }}
                                        onToggleStatus={async () => {
                                            try {
                                                const newStatus = org.status === 'Active' ? 'Suspended' : 'Active';
                                                await SuperAdminService.updateOrganization(org.id, { status: newStatus });
                                                setOrganizations(prev => prev.map(o => o.id === org.id ? { ...o, status: newStatus } : o));
                                            } catch (e) { alert("Failed to update status"); }
                                        }}
                                        color="bg-[var(--brand)]"
                                    />
                                )) : <div className="text-slate-400 font-bold text-sm">No organizations found.</div>}
                            </div>
                            <button className="w-full mt-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[var(--brand)] transition-colors">
                                View Full Directory
                            </button>
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-lg font-black tracking-tight mb-6">Service Health</h3>
                                <div className="space-y-4">
                                    <HealthMetric label="API Gateway" value="99.99%" status="Healthy" />
                                    <HealthMetric label="Database Cluster" value="12ms" status="Healthy" />
                                    <HealthMetric label="Auth Service" value="Provisioned" status="Healthy" />
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px]"></div>
                        </div>

                        <div className="bg-[var(--brand)] rounded-[40px] p-8 text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <Zap size={20} />
                                <h3 className="text-lg font-black tracking-tight">Provisioning</h3>
                            </div>
                            <p className="text-xs font-bold text-white/60 mb-6 leading-relaxed">System is ready for new deployments. Current resources allow for 4 additional organizations.</p>
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-white rounded-full transition-all" style={{ width: '75%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function OrgRow({ org, onDelete, onToggleStatus, color }: any) {
    const { name, userCount, status } = org;
    const users = userCount || 0;
    const load = "--";

    return (
        <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all group">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white font-black text-xs`}>
                    {name?.[0] || 'O'}
                </div>
                <div>
                    <p className="text-sm font-black text-slate-800">{name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{users} Users • {load} System Load</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
                    className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border transition-colors ${status === 'Active' ? 'text-emerald-500 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100' : 'text-slate-400 border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
                >
                    {status}
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/dashboard/super-admin/organizations/${org.id}/edit`}>
                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 hover:text-[var(--brand)] transition-all">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </div>
                    </Link>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
                <Link href={`/dashboard/admin/login?orgId=${org.id}`} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 group-hover:bg-[var(--brand)] group-hover:text-white transition-all ml-2">
                    <ArrowUpRight size={14} />
                </Link>
            </div>
        </div>
    );
}

function HealthMetric({ label, value, status }: any) {
    return (
        <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-white/60">{label}</p>
            <div className="text-right">
                <p className="text-[11px] font-black uppercase tracking-widest">{value}</p>
                <div className="flex items-center justify-end gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                    <span className="text-[8px] font-black uppercase text-emerald-500">{status}</span>
                </div>
            </div>
        </div>
    );
}
