"use client";
import React, { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import CoursePlayerSkeleton from '@/app/components/Skeletons/CoursePlayerSkeleton';
import UnitRenderer, { UnitQuestion } from '@/app/components/UnitRenderer';
import UnitNavHeader from '@/app/components/UnitNavHeader';
import UnitSidebar from '@/app/components/UnitSidebar';
import { CourseService } from '@/services/api/CourseService';
import { StudentService } from '@/services/api/StudentService';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/app/components/Common/Toast';

export default function StudentUnitPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = React.use(paramsPromise);
    const id = params.id;
    const searchParams = useSearchParams();
    const attemptIdParam = searchParams.get('attemptId');

    const [currentQuestion, setCurrentQuestion] = useState<UnitQuestion | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSidebar, setShowSidebar] = useState(false);
    const [activeTab, setActiveTab] = useState<"question" | "attempts">("question");
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [selectedAttemptId, setSelectedAttemptId] = useState<string | undefined>();
    const [attempts, setAttempts] = useState<any[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executedBlocks, setExecutedBlocks] = useState<Set<string>>(new Set());
    const { success: showSuccess, error: showError } = useToast();

    const [courseModules, setCourseModules] = useState<any[] | null>(null);
    const [courseTests, setCourseTests] = useState<any[] | null>(null);

    // Handle deep linking to specific attempt
    useEffect(() => {
        if (attemptIdParam && attempts.length > 0) {
            const attempt = attempts.find(a => a.id === attemptIdParam);
            if (attempt) {
                setSelectedAttemptId(attempt.id);
                // We don't switch tab to 'attempts' because UnitRenderer handles 
                // attempt viewing in the 'question' tab (via read-only editor/view)
                // But if we want to show the list, we'd switch. 
                // Usually "view attempt" means see the code/answer.
                // UnitRenderer uses `selectedAttemptId` to show read-only view in the main area.
                setActiveTab('question');
            }
        }
    }, [attemptIdParam, attempts]);

    useEffect(() => {
        async function loadUnit() {
            try {
                setLoading(true);
                const [unitData, bookmarks, attemptsData] = await Promise.all([
                    CourseService.getUnit(id),
                    StudentService.getBookmarks(),
                    StudentService.getUnitSubmissions(id)
                ]);
                setCurrentQuestion(unitData as UnitQuestion);
                setIsBookmarked(bookmarks.some((b: any) => b.unitId === id));

                // Process attempts to extract testCases from content if needed
                const processedAttempts = attemptsData.map((a: any) => {
                    let testCases = a.testCases;
                    let content = a.content;

                    // If content is an object (Prisma JSON), check for testCases inside
                    if (!testCases && content && typeof content === 'object' && !Array.isArray(content)) {
                        if (content.testCases) testCases = content.testCases;
                    }

                    return { ...a, testCases };
                });
                setAttempts(processedAttempts);

                // Fetch parent Course modules for section navigation if available
                const courseSlug = (unitData as any)?.module?.course?.slug;
                if (courseSlug) {
                    try {
                        const courseData = await CourseService.getCourse(courseSlug);
                        setCourseModules(courseData.modules || null);
                        setCourseTests(courseData.tests || null);
                    } catch (e) {
                        // silent fail - optional
                        console.warn('Failed to fetch parent course for module navigation', e);
                        setCourseModules(null);
                        setCourseTests(null);
                    }
                } else {
                    setCourseModules(null);
                    setCourseTests(null);
                }

            } catch (error) {
                console.error('Failed to load unit:', error);
            } finally {
                setLoading(false);
            }
        }
        loadUnit();
    }, [id]);

    const handleToggleBookmark = async () => {
        if (!currentQuestion) return;
        try {
            if (isBookmarked) {
                await StudentService.removeBookmark(id);
                setIsBookmarked(false);
            } else {
                await StudentService.addBookmark(id, {
                    title: currentQuestion.title,
                    type: currentQuestion.type,
                    moduleTitle: currentQuestion.moduleTitle || currentQuestion.module?.title,
                    courseTitle: currentQuestion.module?.course?.title
                });
                setIsBookmarked(true);
            }
        } catch (error) {
            console.error('Failed to toggle bookmark:', error);
        }
    };

    const handleRun = async (data: any) => {
        // In a real app, this would call Judge0 or similar
        console.log('Running code:', data);
        setIsExecuting(true);
        setTimeout(() => setIsExecuting(false), 2000);
    };

    const handleSubmit = async (data: any) => {
        if (!currentQuestion) return;
        try {
            // Determine status based on question type and data
            let status = 'IN_PROGRESS';
            let score = 0;
            let content = data;
            let testCases = undefined;

            // Simple mock evaluation logic for demo purposes
            if (currentQuestion.type === 'MCQ' || currentQuestion.type === 'MultiSelect') {
                // In a real app, the backend would evaluate this. 
                // For now, if they selected ANYTHING, we'll call it a success for testing, 
                // OR we could check for 'isCorrect' if we had it.
                // Since user specifically asked for "Success if choses right answer", 
                // we'll try to find 'isCorrect' in the options if it exists.
                const options = currentQuestion.mcqOptions || [];
                const correctIds = options.filter((o: any) => o.isCorrect).map((o: any) => o.id);

                if (correctIds.length > 0) {
                    const selectedIds = Array.isArray(data) ? data : [data];
                    const isCorrect = selectedIds.length === correctIds.length &&
                        selectedIds.every(id => correctIds.includes(id));
                    score = isCorrect ? 100 : 0;
                    status = isCorrect ? 'COMPLETED' : 'IN_PROGRESS';
                } else {
                    // Fallback: if no correct answer is defined, assume success if they submitted
                    score = 100;
                    status = 'COMPLETED';
                }
            } else if (currentQuestion.type === 'Coding') {
                // If data comes from UnitRenderer's handleSubmit, it's an object with score and code
                if (typeof data === 'object' && data.code !== undefined) {
                    score = data.score;
                    content = data.code;
                    testCases = data.testCases;

                    // Check completion based on test cases
                    if (typeof testCases === 'string') {
                        const [passed, total] = testCases.split('/').map(s => parseInt(s.trim()));
                        if (passed === total && total > 0) {
                            status = 'COMPLETED';
                        }
                    } else if (score === 100) {
                        status = 'COMPLETED';
                    }
                } else {
                    // Fallback for legacy or direct calls
                    score = (typeof data === 'string' && data.length > 10) ? 100 : 0;
                    content = data;
                    status = score === 100 ? 'COMPLETED' : 'IN_PROGRESS';
                }
            } else if (currentQuestion.type === 'Web' || currentQuestion.type === 'Notebook') {
                // Mark as completed on submission
                status = 'COMPLETED';
                score = 100;
            } else if (currentQuestion.type === 'Reading') {
                status = 'COMPLETED';
                score = 100;
                content = { completed: true };
            }

            const normalizedContent = (() => {
                if (currentQuestion.type === 'MCQ' || currentQuestion.type === 'MultiSelect') {
                    return Array.isArray(content) ? content : (content != null ? [content] : []);
                }

                if (currentQuestion.type === 'Coding') {
                    if (typeof data === 'object' && data !== null) {
                        return {
                            ...data,
                            code: data.code ?? content,
                            testCases: data.testCases ?? testCases,
                        };
                    }
                    return { code: content, testCases };
                }

                if (currentQuestion.type === 'Web' || currentQuestion.type === 'Notebook' || currentQuestion.type === 'Reading') {
                    return content;
                }

                return content;
            })();

            await StudentService.submitUnit(id, {
                status: status,
                content: normalizedContent,
                score: score,
                ...(testCases ? { testCases } : {})
            } as any);
            // Refresh attempts
            const newAttempts = await StudentService.getUnitSubmissions(id);

            // Process new attempts same as initial load
            const processedAttempts = newAttempts.map((a: any) => {
                let tc = a.testCases;
                let c = a.content;
                if (!tc && c && typeof c === 'object' && !Array.isArray(c)) {
                    if (c.testCases) tc = c.testCases;
                }
                return { ...a, testCases: tc };
            });

            setAttempts(processedAttempts);
            showSuccess('submitted answer..', 'Success');
        } catch (error) {
            console.error('Failed to submit:', error);
            showError('Failed to submit answer.', 'Error');
        }
    };

    // Auto-complete Reading units with no code blocks
    useEffect(() => {
        if (!currentQuestion || currentQuestion.type !== 'Reading') return;

        const hasCodeBlocks = currentQuestion.readingContent?.some((b: any) => b.type === 'code' || b.codeConfig);
        if (!hasCodeBlocks) {
            const isCompleted = attempts.some(a => a.status === 'COMPLETED');
            if (!isCompleted) {
                handleSubmit('READING_COMPLETED');
            }
        }
    }, [currentQuestion, attempts]);

    const handleCodeBlockRun = (blockId: string) => {
        if (!currentQuestion || currentQuestion.type !== 'Reading') return;

        setExecutedBlocks(prev => {
            const next = new Set(prev).add(blockId);

            // Check completion
            const codeBlocks = currentQuestion.readingContent?.filter((b: any) => b.type === 'code' || b.codeConfig) || [];
            if (codeBlocks.length > 0 && codeBlocks.every((b: any) => next.has(b.id))) {
                const isCompleted = attempts.some(a => a.status === 'COMPLETED');
                if (!isCompleted) {
                    handleSubmit('READING_ALL_BLOCKS_RUN');
                }
            }
            return next;
        });
    };

    const viewingAttempt = currentQuestion ? attempts.find(a => a.id === selectedAttemptId) : undefined;

    const handleAttemptSelect = (attempt: any) => {
        setSelectedAttemptId(attempt.id);
        setActiveTab('question');
    };

    const router = useRouter();

    const normalizeId = (x: any) => String(x || '').replace(/^q-/i, '');

    // Derive module units based on available data:
    // - If unit provides moduleUnits (tests), use those
    // - Else if unit belongs to a CourseTest, pick the section that contains this question (or all questions flattened)
    // - Else fallback to module.units from courseModules
    const moduleUnitsList = (() => {
        const cq = currentQuestion as any;
        if (!cq) return [];

        let source = 'none';
        let units: any[] = [];

        // 1) Prefer explicit moduleUnits returned by API (test or module)
        if (Array.isArray(cq.moduleUnits) && cq.moduleUnits.length > 0) {
            source = 'moduleUnits';
            units = cq.moduleUnits.map((u: any) => ({ id: String(u.id), type: u.type, title: u.title }));
        }

        const modId = cq.module?.id;

        // 2) If this unit is inside a CourseTest (module.id refers to test id), try to resolve from courseTests
        if (units.length === 0 && courseTests && Array.isArray(courseTests)) {
            const test = courseTests.find((t: any) => t.id === modId || t.slug === modId || String(t.id) === String(modId));
            if (test) {
                let questionsData: any = test.questions;
                if (typeof questionsData === 'string') {
                    try { questionsData = JSON.parse(questionsData); } catch (e) { /* ignore */ }
                }

                // If questionsData is a flat array of question objects (no sections), return them directly
                if (Array.isArray(questionsData) && questionsData.length > 0 && !questionsData[0].questions) {
                    source = 'test-flat';
                    units = questionsData.map((qq: any) => ({ id: String(qq.id), type: qq.type || qq.questionType || 'Test', title: qq.title || 'Question' }));
                } else {
                    const sections = Array.isArray(questionsData) ? questionsData : (questionsData?.sections || []);

                    // Build a list of sections with questions arrays
                    const sectionList = sections.map((s: any) => ({
                        id: s.id || s.title || 'section',
                        questions: Array.isArray(s.questions) ? s.questions : (s.id ? [s] : [])
                    }));

                    // Show ALL questions from ALL sections (flattened) so the sidebar shows the full test
                    const flat = sectionList.flatMap((s: any) => s.questions || []);
                    if (flat.length > 0) {
                        source = 'test-all-sections';
                        units = flat.map((qq: any) => ({ id: String(qq.id), type: qq.type || qq.questionType || 'Test', title: qq.title || 'Question' }));
                    }
                }
            }
        }

        // 3) fallback to module units from courseModules (normal course modules)
        if (units.length === 0 && courseModules) {
            // try direct id match first
            let module = courseModules.find((m: any) => m.id === modId || String(m.id) === String(modId));
            if (!module) {
                // try to match by title as a fallback (some test modules use test.title)
                const modTitle = (cq.module && (cq.module.title || cq.module.name)) || undefined;
                if (modTitle) module = courseModules.find((m: any) => String(m.title || m.name || '').toLowerCase() === String(modTitle).toLowerCase());
            }
            if (module && Array.isArray(module.units) && module.units.length > 0) {
                source = 'course-module';
                units = module.units.map((u: any) => ({ id: String(u.id), type: u.type, title: u.title }));
            }
        }

        // 4) Last resort: if we have courseTests but earlier section logic didn't match, flatten all tests and try to find other questions from the same test
        if (units.length === 0 && courseTests && Array.isArray(courseTests) && modId) {
            const test = courseTests.find((t: any) => t.id === modId || t.slug === modId || String(t.id) === String(modId));
            if (test) {
                let questionsData: any = test.questions;
                if (typeof questionsData === 'string') {
                    try { questionsData = JSON.parse(questionsData); } catch (e) { /* ignore */ }
                }
                // produce a flat list of question objects
                const sections = Array.isArray(questionsData) ? questionsData : (questionsData?.sections || []);
                const flat = sections.flatMap((s: any) => Array.isArray(s.questions) ? s.questions : (s.id ? [s] : []));
                if (flat.length > 0) {
                    source = 'test-flat-2';
                    units = flat.map((qq: any) => ({ id: String(qq.id), type: qq.type || qq.questionType || 'Test', title: qq.title || 'Question' }));
                }
            }
        }

        if (units.length === 0) {
            units = [{ id: String(cq.id), type: cq.type, title: cq.title }];
            source = 'current-only';
        }

        console.log('[StudentUnitPage] moduleUnitsList source=', source, 'count=', units.length, 'modId=', modId);
        return units;
    })();

    const sidebarUnits = currentQuestion ? (
        moduleUnitsList.length > 0 ?
            moduleUnitsList.map((u: any) => ({ id: String(u.id), type: u.type, title: u.title, done: false, active: normalizeId(u.id) === normalizeId(id) })) :
            [{ id: String(currentQuestion.id), type: currentQuestion.type, title: currentQuestion.title, done: false, active: true }]
    ) : [];

    const navigateToUnit = (targetId: string) => {
        if (!targetId) return;
        router.push(`/dashboard/student/unit/${targetId}`);
    };

    const handleNextUnit = () => {
        if (!moduleUnitsList || moduleUnitsList.length === 0) return;
        const idx = moduleUnitsList.findIndex((u: any) => normalizeId(u.id) === normalizeId(id));
        const next = moduleUnitsList[(idx + 1) % moduleUnitsList.length];
        if (next) navigateToUnit(String(next.id));
    };

    const handlePreviousUnit = () => {
        if (!moduleUnitsList || moduleUnitsList.length === 0) return;
        const idx = moduleUnitsList.findIndex((u: any) => normalizeId(u.id) === normalizeId(id));
        const prev = moduleUnitsList[(idx - 1 + moduleUnitsList.length) % moduleUnitsList.length];
        if (prev) navigateToUnit(String(prev.id));
    };

    // SECTION NAVIGATION (previous/next section) - used by UnitSidebar top arrows
    const handleNextSection = () => {
        if (!currentQuestion) return;
        const currentModuleId = (currentQuestion as any)?.module?.id;

        // If the unit belongs to a CourseTest, navigate between its sections
        if (courseTests && Array.isArray(courseTests)) {
            const test = courseTests.find((t: any) => t.id === currentModuleId || t.slug === currentModuleId || String(t.id) === String(currentModuleId));
            if (test) {
                let questionsData: any = test.questions;
                if (typeof questionsData === 'string') {
                    try { questionsData = JSON.parse(questionsData); } catch (e) { /* ignore */ }
                }

                let sections: any[] = [];
                if (Array.isArray(questionsData)) {
                    // Detect flat questions array (no sections)
                    if (questionsData.length > 0 && !questionsData[0].questions) {
                        sections = [{ id: 'section', questions: questionsData }];
                    } else {
                        sections = questionsData;
                    }
                } else {
                    sections = questionsData?.sections || [];
                }

                const qNorm = normalizeId(currentQuestion.id);
                const sectionIdx = sections.findIndex((s: any) => {
                    const qs = Array.isArray(s.questions) ? s.questions : (s.id ? [s] : []);
                    return qs.some((qq: any) => normalizeId(qq.id) === qNorm);
                });
                if (sectionIdx === -1) return;
                const nextSection = sections[(sectionIdx + 1) % sections.length];
                const firstQuestion = Array.isArray(nextSection.questions) ? nextSection.questions[0] : nextSection;
                if (firstQuestion) navigateToUnit(String(firstQuestion.id));
                return;
            }
        }

        // Fallback: use courseModules (module-level navigation)
        if (!courseModules) return;
        const idx = courseModules.findIndex((m: any) => m.id === currentModuleId);
        if (idx === -1) return;
        const nextModule = courseModules[(idx + 1) % courseModules.length];
        if (nextModule && Array.isArray(nextModule.units) && nextModule.units.length > 0) {
            navigateToUnit(nextModule.units[0].id);
        }
    };

    const handlePreviousSection = () => {
        if (!currentQuestion) return;
        const currentModuleId = (currentQuestion as any)?.module?.id;

        // If the unit belongs to a CourseTest, navigate between its sections
        if (courseTests && Array.isArray(courseTests)) {
            const test = courseTests.find((t: any) => t.id === currentModuleId || t.slug === currentModuleId || String(t.id) === String(currentModuleId));
            if (test) {
                let questionsData: any = test.questions;
                if (typeof questionsData === 'string') {
                    try { questionsData = JSON.parse(questionsData); } catch (e) { /* ignore */ }
                }

                let sections: any[] = [];
                if (Array.isArray(questionsData)) {
                    // Detect flat questions array (no sections)
                    if (questionsData.length > 0 && !questionsData[0].questions) {
                        sections = [{ id: 'section', questions: questionsData }];
                    } else {
                        sections = questionsData;
                    }
                } else {
                    sections = questionsData?.sections || [];
                }

                const qNorm = normalizeId(currentQuestion.id);
                const sectionIdx = sections.findIndex((s: any) => {
                    const qs = Array.isArray(s.questions) ? s.questions : (s.id ? [s] : []);
                    return qs.some((qq: any) => normalizeId(qq.id) === qNorm);
                });
                if (sectionIdx === -1) return;
                const prevSection = sections[(sectionIdx - 1 + sections.length) % sections.length];
                const firstQuestion = Array.isArray(prevSection.questions) ? prevSection.questions[0] : prevSection;
                if (firstQuestion) navigateToUnit(String(firstQuestion.id));
                return;
            }
        }

        // Fallback: use courseModules (module-level navigation)
        if (!courseModules) return;
        const idx = courseModules.findIndex((m: any) => m.id === currentModuleId);
        if (idx === -1) return;
        const prevModule = courseModules[(idx - 1 + courseModules.length) % courseModules.length];
        if (prevModule && Array.isArray(prevModule.units) && prevModule.units.length > 0) {
            navigateToUnit(prevModule.units[0].id);
        }
    };
    if (loading) return <CoursePlayerSkeleton hasSidebar={true} isExamMode={false} />;

    if (!currentQuestion) {
        return (
            <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-lg font-bold text-red-400">Unit not found</div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden">
            <Navbar />

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    <div className="flex-1 overflow-hidden relative">
                        <UnitRenderer
                            key={`${currentQuestion.id}-${selectedAttemptId || 'current'}`}
                            question={currentQuestion}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            onToggleBookmark={handleToggleBookmark}
                            isBookmarked={isBookmarked}
                            showSidebar={showSidebar}
                            onToggleSidebar={() => setShowSidebar(!showSidebar)}
                            attempts={attempts}
                            selectedAttemptId={selectedAttemptId}
                            onAttemptSelect={handleAttemptSelect}
                            viewingAttemptAnswer={(() => {
                                const c = viewingAttempt?.content;
                                // If content is object with code property, return code. Otherwise return content as is.
                                if (c && typeof c === 'object' && !Array.isArray(c) && c.code) return c.code;
                                return c;
                            })()}
                            onClearAttemptSelection={() => setSelectedAttemptId(undefined)}
                            onRun={handleRun}
                            onSubmit={handleSubmit}
                            isExecuting={isExecuting}
                            onNext={handleNextUnit}
                            onPrevious={handlePreviousUnit}
                            onCodeBlockRun={handleCodeBlockRun}
                            sidebar={
                                <UnitSidebar
                                    units={sidebarUnits}
                                    moduleTitle={(currentQuestion as any)?.moduleTitle || (currentQuestion as any)?.module?.title || 'Course Content'}
                                    sectionTitle={`${sidebarUnits.length} Question${sidebarUnits.length !== 1 ? 's' : ''}`}
                                    onToggle={() => setShowSidebar(false)}
                                    onUnitClick={(unitId: string) => navigateToUnit(unitId)}
                                    onPrevSection={handlePreviousSection}
                                    onNextSection={handleNextSection}
                                />
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
