"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import DashboardSkeleton from "@/app/components/Skeletons/DashboardSkeleton";
import { CourseService } from '@/services/api/CourseService';
import { StudentService } from '@/services/api/StudentService';


type Attempt = { date: string; score: string; status: "success" | "failed" };
type Lesson = { id: number; type: string; title: string; done?: boolean; attempts?: Attempt[] };

export default function ModulePage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const params = React.use(paramsPromise);
  const slug = params.slug;

  const [course, setCourse] = useState<any | null>(null);
  const [progressData, setProgressData] = useState<{ totalUnits: number, completedUnitIds: string[], attempts: Record<string, Attempt[]> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"learning" | "attempts" | "tests">("learning");
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeTestIndex, setActiveTestIndex] = useState(0);

  // Performance Tab States
  const [expandedPerfIds, setExpandedPerfIds] = useState<string[]>([]);
  const [perfFilter, setPerfFilter] = useState<'all' | 'failed' | 'success'>('all');

  const scrollRef = useRef<HTMLDivElement>(null);
  const testScrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right', ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      const scrollAmount = 300;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateDuration = (start: Date, end: Date) => {
    const diffMs = end.getTime() - start.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHrs > 0) {
      return `${diffHrs}h ${diffMins}m`;
    }
    return `${diffMins} mins`;
  };

  const togglePerfExpand = (id: string) => {
    setExpandedPerfIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Flatten lessons (units) and test questions for performance view based on selected module and course tests
  const selectedModule = course?.modules?.[activeModuleIndex] || null;

  // Helper: map a test question object into the frontend UnitQuestion shape expected by UnitRenderer
  const mapTestQuestionToUnitQuestion = (rawQ: any) => {
    const content = rawQ.content || rawQ.unitContent || rawQ.body || rawQ || {};
    const description = content.problemStatement || content.description || content.body || rawQ.description || '';

    // Try to extract <pre> code blocks from description for readingContent fallback
    const extractCodeBlocksFromHtml = (html: string) => {
      const blocks: Array<any> = [];
      if (!html || typeof html !== 'string') return blocks;
      const codeRegex = /<pre[^>]*>(?:\s*<code[^>]*>)?([\s\S]*?)(?:<\/code>)?<\/pre>/gi;
      let m: RegExpExecArray | null;
      let i = 0;
      while ((m = codeRegex.exec(html)) !== null) {
        const code = m[1] || '';
        const preTag = m[0];
        let langMatch = /data-lang=["']?([a-z0-9-_]+)["']?/i.exec(preTag) || /class=["'][^"']*(language-|lang-)([a-z0-9-_]+)[^"']*["']/i.exec(preTag);
        const language = (langMatch && (langMatch[1] || langMatch[2])) || 'python';
        blocks.push({ id: `desc-code-${i++}`, type: 'code', codeConfig: { languageId: language.toLowerCase(), initialCode: decodeHtmlEntities(code.trim()) } });
      }
      return blocks;
    };

    function decodeHtmlEntities(text: string) {
      return (text || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    }

    // Normalize reading content if provided or infer from description
    let readingContent: any[] = [];
    if (Array.isArray(content.readingContent) && content.readingContent.length > 0) {
      readingContent = content.readingContent.map((b: any, idx: number) => {
        if ((b.type || '').toLowerCase() === 'code' || b.code || b.codeConfig) {
          const language = b.codeConfig?.languageId || b.language || 'python';
          const initialCode = b.codeConfig?.initialCode || b.code || b.content || '';
          return { id: b.id || `reading-${idx}`, type: 'code', codeConfig: { languageId: language, initialCode } };
        }
        return { id: b.id || `reading-${idx}`, type: 'text', content: b.content || b.html || b.text || '' };
      });
    }

    if ((readingContent.length === 0) && description && /<pre|<code/i.test(description)) {
      const parsed = extractCodeBlocksFromHtml(description);
      if (parsed.length > 0) readingContent = parsed;
    }

    const mapped = {
      id: rawQ.id,
      type: rawQ.type || content.type || 'Reading',
      title: rawQ.title || content.title || `Question`,
      description,
      difficulty: content.difficulty || undefined,
      topic: content.topic || undefined,
      codingConfig: (function () {
        const cc = content.codingConfig || content.codeConfig || content.coding || undefined;
        if (!cc) return undefined;
        const templates = cc.templates || cc.templatesMap || {};
        const keys = Object.keys(templates || {});
        const allowedLanguages = cc.allowedLanguages || cc.languages || (keys.length ? keys : undefined);
        const primary = cc.language || (Array.isArray(allowedLanguages) ? allowedLanguages[0] : keys[0]) || cc.languageId || 'javascript';
        const primaryTemplate = templates[primary] || {};
        const testCases = primaryTemplate.testCases || cc.testCases || cc.tests || [];
        return {
          languageId: primary,
          header: primaryTemplate.header || cc.header || '',
          initialCode: primaryTemplate.initialCode || cc.initialCode || cc.code || '',
          footer: primaryTemplate.footer || cc.footer || '',
          testCases,
          templates,
          allowedLanguages
        };
      })(),
      webConfig: (function () {
        const wc = content.webConfig || content.web || undefined;
        if (!wc) return undefined;
        return {
          initialHTML: wc.html || wc.initialHTML || wc.htmlCode || '',
          initialCSS: wc.css || wc.initialCSS || wc.cssCode || '',
          initialJS: wc.js || wc.initialJS || wc.jsCode || '',
          showFiles: wc.showFiles || { html: true, css: true, js: true },
          testCases: wc.testCases || []
        };
      })(),
      mcqOptions: Array.isArray(content.options) ? content.options.map((o: any) => ({ id: o.id, text: o.text })) : (Array.isArray(content.mcqOptions) ? content.mcqOptions.map((o: any) => ({ id: o.id, text: o.text })) : []),
      readingContent,
      notebookConfig: (function () { const nb = content.notebookConfig || content.notebook || undefined; if (!nb) return undefined; return { initialCode: nb.initialCode || nb.initial_code || '', language: nb.language || 'python' }; })(),
      // Provide moduleUnits for sidebar navigation (if available)
      moduleUnits: (selectedModule && Array.isArray(selectedModule.units)) ? selectedModule.units : [],
      moduleTitle: selectedModule?.title || course?.title || undefined
    };

    return mapped;
  };

  const performanceItems = selectedModule ? [
    ...(selectedModule.units || []).map((u: any, idx: number) => {
      const unitAttempts = progressData?.attempts?.[u.id] || [];
      const isCompleted = progressData?.completedUnitIds.includes(u.id);
      const status = isCompleted ? 'Completed' : (unitAttempts.length > 0 ? 'In Progress' : 'Not Attempted');

      return {
        id: `L-${u.id}`,
        // Use contiguous 1-based index within the module for display
        displayId: idx + 1,
        title: u.title || `Lesson ${idx + 1}`,
        type: u.type,
        status: status,
        attempts: unitAttempts
      };
    }),
    ...(course?.tests?.flatMap((t: any) => (t.questions || []).map((q: any, qi: number) => ({
      id: `T-${t.id}-${q.id}`,
      // Display question index within the test
      displayId: qi + 1,
      title: `${t.title || 'Test'}: ${q.title || `Question ${qi + 1}`}`,
      type: q.type || 'Test',
      status: 'Submitted',
      attempts: []
    }))) || [])
  ] : [];
  useEffect(() => {
    let mounted = true;
    async function loadCourse() {
      setLoading(true);
      setError(null);
      try {
        const [data, progress] = await Promise.all([
          CourseService.getCourse(slug),
          StudentService.getCourseProgress(slug)
        ]);
        if (!mounted) return;
        setCourse(data);
        setProgressData(progress);
      } catch (err: any) {
        console.error('Failed to load course/module:', err);
        setError(err?.message || 'Failed to load module');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadCourse();
    return () => { mounted = false; };
  }, [slug]);

  if (loading) return <DashboardSkeleton type="list" userRole="student" />;
  if (error) {
    const is404 = typeof error === 'string' && error.includes('status: 404');
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] items-center justify-center">
        <h3 className="text-lg font-black text-rose-500">{is404 ? 'Course not found' : 'Module not found'}.</h3>
        <p className="text-sm text-slate-500 mt-2">{error}</p>
        <div className="mt-6 flex gap-4">
          <button onClick={() => window.history.back()} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black">Go Back</button>
          <button onClick={() => window.location.href = '/dashboard/student'} className="px-6 py-3 bg-[var(--brand)] text-white rounded-xl font-black">My Courses</button>
        </div>
      </div>
    );
  }

  if (!course) return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] items-center justify-center">
      <h3 className="text-lg font-black text-rose-500">Module not found.</h3>
      <div className="mt-6">
        <button onClick={() => window.history.back()} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black">Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[var(--brand-light)] selection:text-[var(--brand-dark)]">
      <Navbar />

      {/* COMPACT STICKY HEADER BELOW NAVBAR */}
      <div className="sticky top-[61px] z-40 bg-white border-b border-slate-200/60 shadow-sm transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <h1 className="text-base font-black tracking-tight text-slate-900">{course.title}</h1>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{course.modules?.length || 0} Sections</span>
              </div>

              {/* COMPACT TAB SWITCHER */}
              <div className="flex items-center gap-6 mt-1.5">
                <TabLink active={activeTab === "learning"} onClick={() => setActiveTab("learning")} label="Learning Units" />
                {course.tests && course.tests.length > 0 && (
                  <TabLink active={activeTab === "tests"} onClick={() => setActiveTab("tests")} label="Tests" />
                )}
                <TabLink active={activeTab === "attempts"} onClick={() => setActiveTab("attempts")} label="My Performance" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-4">
              <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                <div className="h-full bg-[var(--brand)] rounded-full transition-all duration-1000" style={{ width: `${progressData && progressData.totalUnits > 0 ? Math.round((progressData.completedUnitIds.length / progressData.totalUnits) * 100) : 0}%` }} />
              </div>
              <span className="text-xs font-black text-[var(--brand)]">{progressData && progressData.totalUnits > 0 ? Math.round((progressData.completedUnitIds.length / progressData.totalUnits) * 100) : 0}% Mastery</span>
            </div>
            <button className="p-2 rounded-xl text-slate-400 hover:text-[var(--brand)] hover:bg-[var(--brand-lighter)] transition-all active:scale-95">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 lg:px-12 py-8 animate-fade-in">
        {activeTab === "learning" ? (
          <div className="space-y-10">

            <div className="relative group/carousel">
              <CardNav direction="left" onClick={() => scroll('left', scrollRef)} />

              <div
                ref={scrollRef}
                className="overflow-x-auto no-scrollbar flex gap-4 pb-12 snap-x snap-mandatory px-1"
              >
                {course.modules.map((m: any, i: number) => {
                  // Calculate module progress
                  const moduleUnits = m.units || [];
                  const completedCount = moduleUnits.filter((u: any) => progressData?.completedUnitIds.includes(u.id)).length;
                  const totalCount = moduleUnits.length;
                  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                  const isCompleted = totalCount > 0 && completedCount === totalCount;

                  return (
                    <div
                      key={m.id}
                      onClick={() => setActiveModuleIndex(i)}
                      className={`min-w-[240px] max-w-[240px] h-[170px] cursor-pointer snap-start rounded-[24px] border-2 p-6 transition-all duration-300 relative flex flex-col justify-between ${activeModuleIndex === i ? 'bg-white border-[var(--brand)] shadow-2xl shadow-[var(--brand)]/10' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${activeModuleIndex === i ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'bg-slate-50 text-slate-400'}`}>
                          {isCompleted ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-emerald-500"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : (
                            i + 1
                          )}
                        </div>
                        {isCompleted && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">Completed</span>}
                      </div>

                      <h4 className={`font-black text-[15px] leading-snug line-clamp-2 ${activeModuleIndex === i ? 'text-slate-900' : 'text-slate-600'}`}>{m.title}</h4>

                      <div className="flex items-center justify-between text-[10px] font-black text-slate-400 border-t border-slate-50 pt-3">
                        <div className="flex items-center gap-2 uppercase tracking-tighter">
                          {totalCount} Lessons
                        </div>
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full bg-[var(--brand)] transition-all opacity-30 ${activeModuleIndex === i ? 'opacity-100' : ''}`} style={{ width: `${progressPercent}%` }}></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <CardNav direction="right" onClick={() => scroll('right', scrollRef)} />
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-black text-slate-800 tracking-tight ml-2 mb-4">Unit Curriculum</h2>
              {(selectedModule?.units || []).map((u: any, uIdx: number) => {
                const isCompleted = progressData?.completedUnitIds.includes(u.id);
                return (
                  <div key={u.id} className="group">
                    <div
                      className={`px-8 py-5 rounded-[24px] border transition-all cursor-pointer flex items-center justify-between bg-white border-slate-100/80 hover:border-slate-300/50`}
                    >
                      <div
                        onClick={() => router.push(`/dashboard/student/unit/${u.id}`)}
                        className="flex items-center gap-10 flex-1"
                      >
                        <div className={`text-xs font-black w-6 text-center transition-colors text-slate-300`}>
                          {isCompleted ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                          ) : (
                            uIdx + 1
                          )}
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">{u.type}</p>
                          <h3 className={`text-[15px] font-bold transition-colors text-slate-700`}>{u.title || `Lesson ${uIdx + 1}`}</h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/student/unit/${u.id}`); }}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-[var(--brand)] hover:bg-[var(--brand-lighter)]"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === "tests" ? (
          <div className="space-y-10">
            {/* Top Carousel for Tests */}
            <div className="relative group/carousel">
              <CardNav direction="left" onClick={() => scroll('left', testScrollRef)} />

              <div
                ref={testScrollRef}
                className="overflow-x-auto no-scrollbar flex gap-4 pb-12 snap-x snap-mandatory px-1"
              >
                {course.tests?.map((t: any, i: number) => {
                  const now = new Date();
                  const start = new Date(t.startDate);
                  const end = new Date(t.endDate);
                  const isLocked = now < start;
                  const isExpired = now > end;

                  return (
                    <div
                      key={t.id}
                      onClick={() => { setActiveTestIndex(i); }}
                      className={`min-w-[240px] max-w-[240px] h-[170px] cursor-pointer snap-start rounded-[24px] border-2 p-6 transition-all duration-300 relative flex flex-col justify-between ${activeTestIndex === i ? 'bg-white border-[var(--brand)] shadow-2xl shadow-[var(--brand)]/10' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${activeTestIndex === i ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'bg-slate-50 text-slate-400'}`}>{i + 1}</div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <h4 className={`font-black text-[15px] leading-snug line-clamp-1 ${activeTestIndex === i ? 'text-slate-900' : 'text-slate-600'}`}>{t.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatTime(start)} - {formatTime(end)}</span>
                          <span className="text-[9px] font-bold text-[var(--brand)] bg-[var(--brand-light)]/30 px-1.5 py-0.5 rounded-md">{calculateDuration(start, end)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-black text-slate-400 border-t border-slate-50 pt-3">
                        <div className="flex items-center gap-2 uppercase tracking-tighter">
                          {t.items} Items
                        </div>
                      </div>

                      {/* Overlays for Locked/Expired */}
                      {(isLocked || isExpired) && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm bg-white/40 transition-all rounded-[22px]">
                          {isLocked && (
                            <div className="bg-white/90 px-4 py-2 rounded-xl shadow-lg border border-slate-100 flex flex-col items-center">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Opens On</span>
                              <span className="text-xs font-bold text-amber-500">{start.toLocaleDateString()}</span>
                              <span className="text-[10px] font-bold text-amber-500/60">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                          {isExpired && (
                            <div className="bg-slate-100/90 px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ended On</span>
                              <span className="text-xs font-bold text-slate-600">{end.toLocaleDateString()}</span>
                              <span className="text-[10px] font-bold text-slate-400">{end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <CardNav direction="right" onClick={() => scroll('right', testScrollRef)} />
            </div>

            {/* Bottom List for Selected Test */}
            <div className="space-y-3">
              {(() => {
                const activeTest = course.tests?.[activeTestIndex];
                if (!activeTest) return null;

                const now = new Date();
                const start = new Date(activeTest.startDate);
                const end = new Date(activeTest.endDate);
                const isLocked = now < start;
                const isExpired = now > end;
                const isActive = !isLocked && !isExpired;

                if (isLocked) {
                  return (
                    <>
                      {/* <h2 className="text-lg font-black text-slate-800 tracking-tight ml-2 mb-4">Test Details</h2> */}
                      <div className="p-12 text-center bg-slate-50/50 rounded-[24px] border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-sm mb-4 text-2xl">🔒</div>
                        <h3 className="text-slate-800 font-black text-lg mb-1">Test Locked</h3>
                        <p className="text-slate-400 font-bold text-xs">This content will be available on {start.toLocaleString()}</p>
                      </div>
                    </>
                  )
                }

                if (isExpired) {
                  return (
                    <div className="p-12 text-center bg-slate-50/50 rounded-[24px] border border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-sm mb-4 text-2xl">🏁</div>
                      <h3 className="text-slate-800 font-black text-lg mb-1">Test Ended</h3>
                      <p className="text-slate-400 font-bold text-xs">This assessment concluded on {end.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-4">Review content and results once released by instructor.</p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-3">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight ml-2 mb-4">Unit Curriculum</h2>

                    {activeTest.questions.map((q: any, qi: number) => (
                      <div key={q.id} className="group">
                        <div
                          className={`px-8 py-5 rounded-[24px] border transition-all cursor-pointer flex items-center justify-between bg-white border-slate-100/80 hover:border-slate-300/50`}
                        >
                          <div
                            onClick={() => router.push(`/dashboard/student/unit/${q.id}`)}
                            className="flex items-center gap-10 flex-1"
                          >
                            <div className={`text-xs font-black w-6 text-center transition-colors text-slate-300`}>{qi + 1}</div>
                            <div>
                              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">{q.type || 'Test'}</p>
                              <h3 className={`text-[15px] font-bold transition-colors text-slate-700`}>{q.title || `Question ${qi + 1}`}</h3>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                              {isActive && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/student/unit/${q.id}`); }}
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-[var(--brand)] hover:bg-[var(--brand-lighter)]"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        ) : (
          <div className="space-y-10 animate-fade-in">
            {/* Analytics Style Header */}
            <div>
              <h1 className="text-xl font-black text-slate-800 border-b-2 border-[var(--brand)] inline-block pb-1 mb-8">
                Attempts
              </h1>

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Course</span>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold text-slate-700">
                    {course.title}
                  </div>
                </div>

                <div className="relative w-full md:w-80">
                  <input
                    type="text"
                    placeholder="Search performance logs..."
                    className="w-full bg-white border-b border-slate-200 py-2 pl-8 text-xs font-medium placeholder:text-slate-300 focus:outline-none focus:border-[var(--brand)] transition-colors"
                  />
                  <svg className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </div>
              </div>
            </div>

            {/* Table Layout */}
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center px-8 py-4 bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex-1">Questions</div>
                <div className="w-32 text-center">Type</div>
                <div className="w-32 text-right mr-8">Status</div>
              </div>

              <div className="divide-y divide-slate-50">
                {performanceItems.map((q) => (
                  <div key={q.id} className="bg-white">
                    <div
                      onClick={() => togglePerfExpand(q.id)}
                      className="flex items-center px-8 py-5 hover:bg-slate-50/30 cursor-pointer transition-colors group"
                    >
                      <div className="flex-1 flex items-center gap-4">
                        <span className="text-[11px] font-black text-slate-300 w-4">{q.displayId}.</span>
                        <span className="text-xs font-bold text-slate-700 group-hover:text-[var(--brand)] transition-colors">{q.title}</span>
                      </div>
                      <div className="w-32 text-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        {q.type}
                      </div>
                      <div className="w-32 flex items-center justify-end gap-2 text-right mr-8">
                        <span className="text-[11px] font-bold text-slate-500">{q.status}</span>
                        <svg
                          className={`transition-transform duration-300 ${expandedPerfIds.includes(q.id) ? 'rotate-180 text-[var(--brand)]' : 'text-slate-300'}`}
                          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </div>
                    </div>

                    {expandedPerfIds.includes(q.id) && (
                      <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-4 duration-300">
                        {q.attempts.length > 0 ? (
                          <>
                            <div className="flex items-center justify-center gap-6 mb-8">
                              <button
                                onClick={(e) => { e.stopPropagation(); setPerfFilter('all'); }}
                                className={`flex items-center gap-2 text-[10px] font-bold transition-all px-3 py-1 rounded-full ${perfFilter === 'all' ? 'text-slate-800 bg-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                All ({q.attempts.length})
                              </button>
                            </div>

                            <div className="max-w-4xl mx-auto border border-slate-50 rounded-xl bg-slate-50/30 px-6 py-4">
                              <div className="flex items-center text-[9px] font-black uppercase text-slate-400 mb-4 border-b border-slate-100 pb-2">
                                <div className="flex-1 text-center">Attempts</div>
                                <div className="flex-1 text-center">Test Cases</div>
                                <div className="flex-1 text-center">Status</div>
                              </div>
                              <div className="space-y-4">
                                {q.attempts.map((attempt: any, idx: number) => (
                                  <div
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Extract unit ID from q.id (format: L-unitId or T-testId-unitId)
                                      const unitId = q.id.startsWith('L-') ? q.id.substring(2) : q.id.split('-').pop();
                                      router.push(`/dashboard/student/unit/${unitId}?attemptId=${attempt.id}`);
                                    }}
                                    className="flex items-center text-[11px] font-bold text-slate-600 hover:bg-slate-100 p-2 rounded-lg cursor-pointer transition-colors"
                                  >
                                    <div className="flex-1 text-center font-mono opacity-80">{attempt.date}</div>
                                    <div className={`flex-1 text-center ${attempt.status === 'success' ? 'text-emerald-500' : 'text-rose-400'}`}>{attempt.testCases}</div>
                                    <div className="flex-1 text-center">
                                      <span className={`px-2 py-0.5 rounded-md ${attempt.status === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {attempt.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 text-xs font-bold text-slate-400 italic">
                            No performance history recorded for this question.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main >
    </div >
  );
}

function TabLink({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-black transition-all border-b-2 pb-1.5 uppercase tracking-widest ${active ? "text-[var(--brand)] border-[var(--brand)]" : "text-slate-400 border-transparent hover:text-slate-600"}`}
    >
      {label}
    </button>
  );
}

function CardNav({ direction, onClick }: { direction: 'left' | 'right', onClick: () => void }) {
  const icon = direction === 'left' ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />;
  const style = direction === 'left' ? "left-[-24px]" : "right-[-24px]";

  return (
    <button
      onClick={onClick}
      className={`absolute ${style} top-[42%] -translate-y-1/2 w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[var(--brand)] hover:border-[var(--brand-light)] shadow-xl z-20 transition-all active:scale-90`}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
    </button>
  );
}
