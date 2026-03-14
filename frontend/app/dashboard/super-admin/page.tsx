"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { Building2, Users, ShieldAlert, ArrowUpRight, Plus, Activity, Zap, Trash2, Bug, CheckCircle2, X, ArrowLeft, Download } from "lucide-react";
import { SuperAdminService } from "@/services/api/SuperAdminService";
import { requireAuthClient } from "@/hooks/requireAuthClient";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";

export default function SuperAdminDashboardPage() {
    const [statsData, setStatsData] = useState<any>(null);
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [bugReports, setBugReports] = useState<any[]>([]);
    const [bugFilter, setBugFilter] = useState<'OPEN' | 'FIXED'>('OPEN');
    const [selectedBug, setSelectedBug] = useState<any | null>(null);
    const [selectedImage, setSelectedImage] = useState<{ url: string; name?: string } | null>(null);
    const [loadingBugs, setLoadingBugs] = useState(true);
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

    useEffect(() => {
        if (!authChecked) return;
        async function loadBugs() {
            setLoadingBugs(true);
            try {
                const response = await SuperAdminService.getBugReports({ status: bugFilter, limit: 50 });
                setBugReports(response?.data || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingBugs(false);
            }
        }
        loadBugs();
    }, [authChecked, bugFilter]);

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

                <div className="mt-10 bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Reported Bugs</h3>
                            <p className="text-xs font-bold text-slate-400 mt-1">User-submitted issues from student, teacher, and organization admin profiles.</p>
                        </div>
                        <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-xl">
                            <button
                                onClick={() => setBugFilter('OPEN')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${bugFilter === 'OPEN' ? 'bg-white text-[var(--brand)] border border-[var(--brand-light)]' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Open
                            </button>
                            <button
                                onClick={() => setBugFilter('FIXED')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${bugFilter === 'FIXED' ? 'bg-white text-emerald-600 border border-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Fixed
                            </button>
                        </div>
                    </div>

                    {loadingBugs ? (
                        <div className="space-y-3">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-24 rounded-2xl bg-slate-50 animate-pulse" />
                            ))}
                        </div>
                    ) : bugReports.length === 0 ? (
                        <div className="text-center py-14 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                            <Bug size={28} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-sm font-black text-slate-500">No {bugFilter === 'OPEN' ? 'open' : 'fixed'} bug reports</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bugReports.map((bug) => {
                                return (
                                    <div key={bug.id} className="p-6 rounded-3xl border border-slate-100 hover:border-[var(--brand-light)] transition-all">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                                    <h4 className="text-sm font-black text-slate-800">{bug.title}</h4>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${bug.status === 'FIXED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                                        {bug.status}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-400 mb-2">
                                                    {bug.reporter?.name || 'Unknown'} • {bug.reporter?.role || bug.reporterRole} • {bug.reporter?.organization?.name || 'No org'}
                                                </p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Topic only • Open to view full report</p>
                                            </div>

                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                                                    {new Date(bug.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </p>

                                                <button
                                                    onClick={() => setSelectedBug(bug)}
                                                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                                >
                                                    View Full Bug
                                                </button>

                                                {bug.status !== 'FIXED' && (
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                await SuperAdminService.markBugReportFixed(bug.id);
                                                                setBugReports((prev) => prev.map((b) => b.id === bug.id ? { ...b, status: 'FIXED', fixedAt: new Date().toISOString() } : b));
                                                            } catch (error) {
                                                                alert('Failed to mark as fixed');
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                                    >
                                                        <CheckCircle2 size={12} /> Mark Fixed
                                                    </button>
                                                )}

                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Delete this bug report?')) return;
                                                        try {
                                                            await SuperAdminService.deleteBugReport(bug.id);
                                                            setBugReports((prev) => prev.filter((b) => b.id !== bug.id));
                                                        } catch (error) {
                                                            alert('Failed to delete bug report');
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors flex items-center gap-1"
                                                >
                                                    <Trash2 size={12} /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {selectedBug && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedBug(null)} />
                    <div className="relative z-10 w-full max-w-4xl bg-white rounded-[36px] border border-slate-100 shadow-2xl p-8 max-h-[88vh] overflow-y-auto custom-scrollbar">
                        <button
                            onClick={() => setSelectedBug(null)}
                            className="absolute top-5 right-5 w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 flex items-center justify-center"
                        >
                            <X size={18} />
                        </button>

                        <div className="pr-12">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                <h3 className="text-xl font-black text-slate-900">{selectedBug.title}</h3>
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${selectedBug.status === 'FIXED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                    {selectedBug.status}
                                </span>
                            </div>
                            <p className="text-xs font-bold text-slate-400 mb-6">
                                {selectedBug.reporter?.name || 'Unknown'} • {selectedBug.reporter?.role || selectedBug.reporterRole} • {selectedBug.reporter?.organization?.name || 'No org'} • {new Date(selectedBug.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </p>
                        </div>

                        <div
                            className="prose prose-slate max-w-none text-sm font-medium text-slate-700"
                            dangerouslySetInnerHTML={{ __html: selectedBug.description }}
                        />

                        {Array.isArray(selectedBug.attachments) && selectedBug.attachments.length > 0 && (
                            <div className="mt-8">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Attached Images</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {selectedBug.attachments.map((att: any, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedImage({ url: att.url, name: att.name || `Attachment ${idx + 1}` })}
                                            className="relative rounded-xl overflow-hidden border border-slate-100 bg-slate-50 h-32 text-left"
                                        >
                                            <img src={att.url} alt={att.name || `Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedImage && (
                <div className="fixed inset-0 z-[1300] bg-slate-950/95 flex flex-col">
                    <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/10">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
                        >
                            <ArrowLeft size={14} /> Back
                        </button>
                        <a
                            href={selectedImage.url}
                            download={selectedImage.name || 'bug-report-image'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
                        >
                            <Download size={14} /> Download
                        </a>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                        <img src={selectedImage.url} alt={selectedImage.name || 'Bug attachment'} className="max-h-full max-w-full object-contain" />
                    </div>
                </div>
            )}
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
