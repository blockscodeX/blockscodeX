"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { StudentService, StudentModule, StudentStats } from "@/services/api/StudentService";
import { requireAuthClient } from "@/hooks/requireAuthClient";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";
import { useQuery } from "@/hooks/useQuery";
import { useDebounce } from "@/hooks/useDebounce";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { useToast } from "@/app/components/Common/Toast";
import { Megaphone, X, FileText, ImageIcon, File, Download } from "lucide-react";

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { success: toastSuccess } = useToast();

  // Announcements state
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);

  // Auth Check
  useEffect(() => { requireAuthClient("/login"); }, []);

  // Load announcements
  const loadAnnouncements = useCallback(async () => {
    try {
      const [annData, countData] = await Promise.all([
        StudentService.getAnnouncements(),
        StudentService.getUnreadAnnouncementCount()
      ]);
      setAnnouncements(annData);
      setUnreadCount(countData.count || 0);
    } catch (err) {
      console.error("Failed to load announcements", err);
    }
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  // Real-time notifications
  useNotificationSocket((announcement) => {
    toastSuccess(`New announcement: ${announcement.title}`);
    loadAnnouncements();
  });

  const handleOpenAnnouncement = async (ann: any) => {
    setSelectedAnnouncement(ann);
    if (!ann.isRead) {
      try {
        await StudentService.markAnnouncementRead(ann.id);
        setUnreadCount(prev => Math.max(prev - 1, 0));
        setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, isRead: true } : a));
      } catch (err) { /* silent */ }
    }
  };

  const handleDownload = (url: string, name: string) => {
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name || 'download')}`;
    window.open(proxyUrl, '_self');
  };

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

            {/* ANNOUNCEMENTS CARD */}
            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-light)] text-[var(--brand)] flex items-center justify-center">
                    <Megaphone size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Announcements</h3>
                </div>
              </div>

              {announcements.length === 0 ? (
                <p className="text-xs font-bold text-slate-400 text-center py-4">No announcements yet.</p>
              ) : (
                <div className="space-y-3">
                  {announcements.slice(0, 2).map(ann => (
                    <button
                      key={ann.id}
                      onClick={() => handleOpenAnnouncement(ann)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all hover:border-[var(--brand-light)] hover:shadow-sm active:scale-[0.98] ${
                        ann.isRead ? 'bg-white border-slate-100' : 'bg-[var(--brand-light)]/30 border-[var(--brand-light)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          ann.isRead ? 'bg-slate-100 text-slate-400' : 'bg-[var(--brand)] text-white shadow-sm'
                        }`}>
                          <Megaphone size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-black truncate ${ann.isRead ? 'text-slate-600' : 'text-slate-800'}`}>{ann.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                            {new Date(ann.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {ann.teacher?.name && ` • ${ann.teacher.name}`}
                          </p>
                        </div>
                        {!ann.isRead && (
                          <div className="w-2 h-2 rounded-full bg-[var(--brand)] flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </button>
                  ))}
                  {announcements.length > 2 && (
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center pt-2">
                      +{announcements.length - 2} more
                    </p>
                  )}
                </div>
              )}
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

      {/* ANNOUNCEMENT DETAIL POPUP */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 pt-[73px]">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedAnnouncement(null)} />
          <div className="bg-white w-full max-w-2xl rounded-[48px] p-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom-8 duration-500 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setSelectedAnnouncement(null)}
              className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-400 transition-all hover:scale-110 active:scale-95"
            >
              <X size={20} strokeWidth={3} />
            </button>

            <div className="flex items-start gap-5 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--brand)]/20">
                <Megaphone size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{selectedAnnouncement.title}</h2>
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>{new Date(selectedAnnouncement.createdAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                  {selectedAnnouncement.teacher?.name && (
                    <>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>{selectedAnnouncement.teacher.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Groups chips */}
            {selectedAnnouncement.groups && selectedAnnouncement.groups.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6">
                {selectedAnnouncement.groups.map((g: any) => (
                  <span key={g.id} className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-[var(--brand-light)] text-[var(--brand-dark)] border border-[var(--brand-light)]">
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Rich text content */}
            <div
              className="prose prose-sm max-w-none text-slate-700 mb-8 [&_p]:mb-3 [&_h1]:text-xl [&_h1]:font-black [&_h2]:text-lg [&_h2]:font-black [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_a]:text-[var(--brand)] [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--brand-light)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:rounded-2xl [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
            />

            {/* Attachments */}
            {Array.isArray(selectedAnnouncement.attachments) && selectedAnnouncement.attachments.length > 0 && (
              <div className="bg-slate-50 rounded-[24px] border border-slate-100 p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Attachments</p>
                <div className="space-y-2">
                  {selectedAnnouncement.attachments.map((att: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleDownload(att.url, att.name)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-100 hover:border-[var(--brand-light)] hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                        <AnnouncementAttachIcon type={att.type} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-black text-slate-700 truncate">{att.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {att.size ? `${(att.size / 1024).toFixed(0)} KB` : "File"}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-black text-[var(--brand)] uppercase tracking-widest"><Download size={12} /> Download</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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

function AnnouncementAttachIcon({ type }: { type: string }) {
  if (type?.startsWith("image/")) return <ImageIcon size={16} className="text-blue-500" />;
  if (type?.includes("pdf")) return <FileText size={16} className="text-rose-500" />;
  return <File size={16} className="text-slate-400" />;
}
