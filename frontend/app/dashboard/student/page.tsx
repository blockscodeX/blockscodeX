"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { StudentService, StudentModule, StudentStats } from "@/services/api/StudentService";
import { requireAuthClient } from "@/hooks/requireAuthClient";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";
import { useQuery } from "@/hooks/useQuery";
import { useDebounce } from "@/hooks/useDebounce";

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Auth Check
  useEffect(() => { requireAuthClient("/login"); }, []);

  // Optimized Data Fetching with Cache
  const { data: dashboardData, isLoading: loading } = useQuery('student-dashboard', async () => {
    const [stats, courses] = await Promise.all([
      StudentService.getStats(),
      StudentService.getCourses()
    ]);
    return { stats, courses };
  });

  const stats = dashboardData?.stats || null;
  const modules: StudentModule[] = dashboardData?.courses || [];

  const filteredModules = modules.filter((m) =>
    m.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  // Show loading only if no data at all (first load)
  if (loading && !stats) return <DashboardSkeleton type="main" userRole="student" />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-orange-100 selection:text-orange-900">
      <Navbar userRole="student" />

      <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in">

        <div className="flex flex-col lg:flex-row gap-12">

          {/* LEFT: MODULES LIST (Horizontal Rows) */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black tracking-tight text-slate-800">Course Modules</h2>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search modules..."
                  className="w-72 pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[var(--brand)] transition-all shadow-sm"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {filteredModules.length > 0 ? filteredModules.map((m) => (
                <Link key={m.slug} href={`/dashboard/student/module/${m.slug}`} className="block bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:border-[var(--brand-light)] hover:shadow-md transition-all">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-slate-800 mb-1">{m.title}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{m.sections} Learning Units</p>
                    </div>

                    <div className="flex items-center gap-8 w-1/2">
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                          <span>{m.status}</span>
                          <span className="text-[var(--brand)]">{m.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden shadow-inner">
                          {/* Removed Green: Consistency with --brand */}
                          <div className={`h-full bg-[var(--brand)] transition-all duration-1000 rounded-full`} style={{ width: `${m.percent}%` }} />
                        </div>
                      </div>
                      <div className="text-slate-300">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                      </div>
                    </div>
                  </div>
                </Link>
              )) : (
                <div className="text-center py-12 text-slate-400 font-bold">No modules available found.</div>
              )}
            </div>
          </div>

          {/* RIGHT: SIDEBAR */}
          <aside className="w-full lg:w-80 space-y-6">
            {/* STREAK CARD RESTORED */}
            <div className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] rounded-[32px] p-8 text-white shadow-xl shadow-[var(--brand)]/20 text-center relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-orange-100/80">Daily Streak</p>
                <div className="text-7xl font-black mb-4 group-hover:scale-110 transition-transform">{stats?.streak || 0}</div>
                <p className="text-sm font-bold opacity-80">
                  {(() => {
                    const s = stats?.streak || 0;
                    if (s === 0) return "Start your learning journey today!";
                    if (s < 5) return "Great start! Keep the momentum going.";
                    if (s < 10) return "You're on fire! Consistency is key.";
                    if (s < 20) return "Unstoppable! You're building a solid habit.";
                    if (s < 50) return "Incredible dedication! You're a learning machine.";
                    return "Legendary streak! You're mastering the art of consistency.";
                  })()}
                </p>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-light)] text-[var(--brand)] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="m17 17-5 5-5-5" /><path d="m17 7-5-5-5-5" /></svg>
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Quick Access</h3>
              </div>

              <div className="space-y-3">
                <Link href="/dashboard/student/test" className="block">
                  <QuickLink icon="📊" label="My Results" sub="Performance history" />
                </Link>
                <Link href="/dashboard/student/bookmarks" className="block">
                  <QuickLink icon="🔖" label="Bookmarks" sub="Saved content" />
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
}

function QuickLink({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-left group">
      <div className={`text-2xl group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-black text-slate-800 leading-none mb-1">{label}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{sub}</p>
      </div>
    </button>
  );
}
