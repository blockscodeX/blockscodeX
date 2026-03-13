"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DOMPurify from 'isomorphic-dompurify';
import SplitPane from './SplitPane';
import ProblemStatement from './ProblemStatement';
import MCQOptions from './MCQOptions';
import AttemptsView, { Attempt } from './AttemptsView';

// Dynamic imports for heavy editor components to optimize bundle size
const WebEditor = dynamic(() => import('./WebEditor/WebEditor'), {
    loading: () => <div className="h-full w-full bg-slate-50 animate-pulse flex items-center justify-center text-slate-400">Loading Web Editor...</div>,
    ssr: false
});
const CodingQuestionRenderer = dynamic(() => import('./CodingQuestionRenderer'), {
    loading: () => <div className="h-full w-full bg-slate-50 animate-pulse flex items-center justify-center text-slate-400">Loading Code Editor...</div>,
    ssr: false
});
const EmbeddedCodeRunner = dynamic(() => import('./Reading/EmbeddedCodeRunner'), {
    loading: () => <div className="h-64 w-full bg-slate-100 animate-pulse rounded-lg border border-slate-200"></div>,
    ssr: false
});
const PythonNotebook = dynamic(() => import('./Features/Notebook/PythonNotebook'), {
    loading: () => <div className="h-full w-full bg-slate-50 animate-pulse flex items-center justify-center text-slate-400">Loading Notebook...</div>,
    ssr: false
});

import { SUPPORTED_LANGUAGES } from './Editor/languages';
import { UnitQuestion, QuestionType } from '@/types/unit';


export type { UnitQuestion, QuestionType };

import UnitNavHeader from './UnitNavHeader';

interface UnitRendererProps {
    question: UnitQuestion;
    activeTab?: 'question' | 'attempts';
    onTabChange?: (tab: 'question' | 'attempts') => void;
    onPrevious?: () => void;
    onNext?: () => void;
    onToggleReview?: () => void;
    isMarkedForReview?: boolean;
    onToggleBookmark?: () => void;
    isBookmarked?: boolean;
    hideNav?: boolean;
    attempts?: Attempt[];
    // Sidebar integration
    showSidebar?: boolean;
    onToggleSidebar?: () => void;
    extraHeaderContent?: React.ReactNode;
    topHeader?: React.ReactNode;
    showSidebarToggle?: boolean;
    // Attempt Selection
    onAttemptSelect?: (attempt: Attempt) => void;
    selectedAttemptId?: string;
    viewingAttemptAnswer?: any;
    onClearAttemptSelection?: () => void;
    hideTabs?: boolean;
    contentFontSize?: number;
    isExamMode?: boolean;
    sidebar?: React.ReactNode;
    // Execution / Submission
    onRun?: (data: any) => void;
    onSubmit?: (data: any) => void;
    onAnswerChange?: (data: any) => void;
    currentAnswer?: any;
    isExecuting?: boolean;
    onCodeBlockRun?: (blockId: string) => void;
    examId?: string;
    hideAttemptBanner?: boolean;
    marksObtained?: number;
    questionTotalMarks?: number;
    hideSubmit?: boolean;
    onCheatDetected?: (reason: string) => void;
}

import { CodeExecutionService } from '@/services/api/CodeExecutionService';

export function UnitRendererComponent({
    question,
    activeTab = 'question',
    onTabChange = () => { },
    onPrevious,
    onNext,
    onToggleReview,
    isMarkedForReview = false,
    onToggleBookmark,
    isBookmarked = false,
    hideNav = false,
    attempts,
    showSidebar = false,
    onToggleSidebar = () => { },
    extraHeaderContent,
    topHeader,
    showSidebarToggle = true,
    onAttemptSelect,
    selectedAttemptId,
    viewingAttemptAnswer,
    onClearAttemptSelection,
    hideTabs = false,
    contentFontSize,
    isExamMode = false,
    sidebar,
    onRun,
    onSubmit,
    onAnswerChange,
    currentAnswer,
    isExecuting = false,
    onCodeBlockRun,
    examId,
    hideAttemptBanner = false,
    marksObtained,
    questionTotalMarks,
    hideSubmit = false,
    onCheatDetected
}: UnitRendererProps) {

    const purifyConfig = { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] };

    const [isReadingFullScreen, setIsReadingFullScreen] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Execution state
    const [isRunning, setIsRunning] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState("");
    const [executionResults, setExecutionResults] = useState<any[]>([]);

    // Selected language for Coding questions (can be changed by student if allowed)
    const [selectedCodingLang, setSelectedCodingLang] = React.useState<string | null>(null);

    // Initialize language from localStorage or default
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const key = `unit_lang_${question.id}`;
            const savedLang = localStorage.getItem(key);

            const config = question.codingConfig;
            const defaultLang = config?.languageId ||
                (config?.allowedLanguages && config.allowedLanguages[0]) ||
                (config?.templates ? Object.keys(config.templates)[0] : null) ||
                SUPPORTED_LANGUAGES[0].id;

            if (savedLang && (!config?.allowedLanguages || config.allowedLanguages.includes(savedLang))) {
                setSelectedCodingLang(savedLang);
            } else {
                setSelectedCodingLang(defaultLang);
            }
        }
    }, [question.id]);

    const handleLanguageChange = (langId: string) => {
        setSelectedCodingLang(langId);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`unit_lang_${question.id}`, langId);
        }
    };

    const toggleFullScreen = () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            setIsReadingFullScreen(true);
        } else {
            document.exitFullscreen();
            setIsReadingFullScreen(false);
        }
    };

    // Keep state in sync if user exits via ESC key
    React.useEffect(() => {
        const handleFullscreenChange = () => {
            setIsReadingFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // 1. DEDICATED READING LAYOUT
    if (question.type === 'Reading') {
        return (
            <div
                ref={containerRef}
                className={`h-full w-full bg-white overflow-hidden flex flex-col ${isReadingFullScreen ? 'z-[1000]' : ''}`}
            >
                {topHeader && !isReadingFullScreen && (
                    <div className="w-full shrink-0 border-b border-slate-100 z-50">
                        {topHeader}
                    </div>
                )}

                {/* Nav Header for Reading */}
                {!isExamMode && !hideNav && !isReadingFullScreen && (
                    <UnitNavHeader
                        activeTab={activeTab}
                        onTabChange={onTabChange}
                        onToggleSidebar={onToggleSidebar}
                        showSidebar={showSidebar}
                        onPrevious={onPrevious}
                        onNext={onNext}
                        extraContent={extraHeaderContent}
                        showSidebarToggle={showSidebarToggle}
                        minimal={true} // Hidden tabs for reading
                        hideNavigationButtons={true} // Hidden < > for reading
                    />
                )}

                <div className="flex-1 overflow-hidden relative flex flex-col">
                    {/* Consistent Sidebar Handling */}
                    {showSidebar && sidebar && !isReadingFullScreen && (
                        <>
                            <div className="absolute inset-y-0 left-0 z-[100] w-[300px] bg-white shadow-2xl animate-in slide-in-from-left duration-300">
                                {sidebar}
                            </div>
                        </>
                    )}

                    <div className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-500 ${isReadingFullScreen ? 'px-4 py-6' : 'px-[10%] py-12'}`}>
                        <div className={`transition-all duration-500 ${isReadingFullScreen ? 'w-full max-w-none' : 'max-w-4xl mx-auto'}`}>
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex-1">
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{question.title}</h1>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Full Screen Toggle */}
                                    <button
                                        onClick={toggleFullScreen}
                                        className={`p-2.5 rounded-xl border transition-all ${isReadingFullScreen
                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                            : 'bg-white border-slate-100 text-slate-400 hover:text-slate-600 hover:border-slate-200'}
                                        `}
                                        title={isReadingFullScreen ? "Exit Full Screen" : "Full Screen"}
                                    >
                                        {isReadingFullScreen ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                                            </svg>
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                            </svg>
                                        )}
                                    </button>

                                    <button
                                        onClick={onToggleBookmark}
                                        className={`p-2.5 rounded-xl border transition-all ${isBookmarked
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                            : 'bg-white border-slate-100 text-slate-300 hover:text-slate-500 hover:border-slate-200'}
                                        `}
                                        title={isBookmarked ? "Remove Bookmark" : "Bookmark Lesson"}
                                    >
                                        <svg
                                            width="18" height="18" viewBox="0 0 24 24"
                                            fill={isBookmarked ? "currentColor" : "none"}
                                            stroke="currentColor" strokeWidth="2.5"
                                            strokeLinecap="round" strokeLinejoin="round"
                                        >
                                            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                                        </svg>
                                    </button>
                                    {!hideNav && !isExamMode && (
                                        <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all">
                                            Download PDF
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="w-16 h-1.5 bg-[var(--brand)] rounded-full mb-12"></div>

                            <article className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-6 prose-p:text-slate-600 prose-headings:text-slate-800 prose-code:text-[var(--brand-dark)] prose-code:bg-[var(--brand-lighter)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm"
                                style={{ fontSize: contentFontSize ? `${contentFontSize}px` : undefined }}
                            >
                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.description, purifyConfig) }} />

                                {/* Render Embedded Code Runner if config exists (Legacy/Fallback) */}
                                {question.codingConfig && !question.readingContent && (
                                    <div className="not-prose mt-8">
                                        <h2 className="text-xl font-black text-slate-800 mb-4">Code Demonstration</h2>
                                        <p className="mb-4 text-slate-600">You can run the code below to see the output directly within this lesson.</p>
                                        <EmbeddedCodeRunner
                                            language={SUPPORTED_LANGUAGES.find(l => l.id === (question.codingConfig?.languageId || (question.codingConfig?.templates && Object.keys(question.codingConfig.templates)[0]))) || SUPPORTED_LANGUAGES[0]}
                                            initialCode={question.codingConfig.initialCode || question.codingConfig.body}
                                            onRunSuccess={() => onCodeBlockRun?.('legacy-runner')}
                                        />
                                    </div>
                                )}

                                {/* Render Interleaved Content Blocks (New) */}
                                {question.readingContent && (
                                    <div className="space-y-12">
                                        {question.readingContent.map(block => (
                                            <div key={block.id}>
                                                {block.type === 'text' ? (
                                                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content || '', purifyConfig) }} />
                                                ) : block.type === 'video' ? (
                                                    <div className="not-prose my-8">
                                                        <video
                                                            src={block.videoUrl}
                                                            controls
                                                            controlsList="nodownload"
                                                            className="w-full rounded-2xl border border-slate-200 shadow-sm bg-black"
                                                            style={{ maxHeight: '480px' }}
                                                        >
                                                            Your browser does not support the video tag.
                                                        </video>
                                                    </div>
                                                ) : (
                                                    <div className="not-prose my-8">
                                                        <EmbeddedCodeRunner
                                                            language={SUPPORTED_LANGUAGES.find(l => l.id === (block.codeConfig?.languageId || block.runnerConfig?.language)) || SUPPORTED_LANGUAGES[0]}
                                                            initialCode={block.codeConfig?.initialCode || block.runnerConfig?.initialCode || ''}
                                                            onRunSuccess={() => onCodeBlockRun?.(block.id)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>

                            {!hideNav && !isExamMode && (
                                <div className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-xs font-bold tracking-widest uppercase text-slate-400">
                                    <button onClick={onPrevious} className="hover:text-[var(--brand)] transition-colors flex items-center gap-2">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M15 18l-6-6 6-6" /></svg>
                                        Previous
                                    </button>
                                    <button onClick={onNext} className="flex items-center gap-2 text-[var(--brand)]">
                                        Next
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M9 18l6-6-6-6" /></svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. SPLIT VIEW FOR INTERACTIVE QUESTIONS
    const renderRightPanel = () => {
        const hasAttemptSelected = !!selectedAttemptId;
        const attemptAnswer = viewingAttemptAnswer;

        switch (question.type) {
            case 'MCQ':
            case 'MultiSelect':
                const correctOptionIds = (question.mcqOptions || []).filter(o => o.isCorrect).map(o => o.id);
                return (
                    <MCQOptions
                        key={`mcq-${question.id}`}
                        options={question.mcqOptions || []}
                        multiSelect={question.type === 'MultiSelect'}
                        maxSelections={question.type === 'MCQ' ? 1 : undefined}
                        correctIds={correctOptionIds}
                        selectedIds={hasAttemptSelected ? attemptAnswer : currentAnswer}
                        onSubmit={onSubmit || ((ids) => console.log('Submitted MCQ:', ids))}
                        onChange={onAnswerChange}
                        onReset={() => console.log('Reset MCQ')}
                        readOnly={hasAttemptSelected}
                        fontSize={contentFontSize}
                    />
                );
            case 'Coding':
                return (
                    <CodingQuestionRenderer
                        key={`coding-${question.id}`}
                        question={question}
                        hasAttemptSelected={hasAttemptSelected}
                        attemptAnswer={attemptAnswer}
                        currentAnswer={currentAnswer}
                        onAnswerChange={onAnswerChange}
                        onSubmit={onSubmit}
                        contentFontSize={contentFontSize || 16}
                        selectedCodingLang={selectedCodingLang}
                        onLanguageChange={handleLanguageChange}
                        isRunning={isRunning}
                        setIsRunning={setIsRunning}
                        terminalLogs={terminalLogs}
                        setTerminalLogs={setTerminalLogs}
                        executionResults={executionResults}
                        setExecutionResults={setExecutionResults}
                        examId={examId}
                        hideSubmit={hideSubmit}
                        isExamMode={isExamMode}
                        onCheatDetected={onCheatDetected}
                    />
                );
            case 'Web':
                return (
                    <WebEditor
                        key={`web-${question.id}`}
                        initialHTML={hasAttemptSelected ? attemptAnswer?.html || '' : (currentAnswer?.html ?? question.webConfig?.initialHTML)}
                        initialCSS={hasAttemptSelected ? attemptAnswer?.css || '' : (currentAnswer?.css ?? question.webConfig?.initialCSS)}
                        initialJS={hasAttemptSelected ? attemptAnswer?.js || '' : (currentAnswer?.js ?? question.webConfig?.initialJS)}
                        showFiles={question.webConfig?.showFiles}
                        hideTestCases={true}
                        fontSize={contentFontSize}
                        testCases={question.webConfig?.testCases}
                        onChange={onAnswerChange}
                        onSubmit={onSubmit}
                        readOnly={hasAttemptSelected}
                        isExamMode={isExamMode}
                        onCheatDetected={onCheatDetected}
                    />
                );
            case 'Notebook':
                return (
                    <PythonNotebook
                        key={`notebook-${question.id}`}
                        initialCode={hasAttemptSelected ? attemptAnswer : (currentAnswer ?? question.notebookConfig?.initialCode)}
                        fontSize={contentFontSize}
                        onChange={onAnswerChange}
                        onSubmit={onSubmit}
                        readOnly={hasAttemptSelected}
                        isExamMode={isExamMode}
                    />
                );
            // Reading case removed from here as it's handled at top level
            default:
                return <div className="p-8 text-red-500">Unknown Question Type</div>;
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-white overflow-hidden">
            {topHeader && (
                <div className="w-full shrink-0 border-b border-slate-100 z-50">
                    {topHeader}
                </div>
            )}

            {/* Attempt Viewing Info Bar */}
            {selectedAttemptId && !hideAttemptBanner && (
                <div className="w-full bg-indigo-600/5 border-b border-indigo-100 px-6 py-2 flex items-center justify-between z-40 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        </div>
                        <p className="text-[11px] font-black text-indigo-700 uppercase tracking-widest">
                            Viewing Historical Attempt <span className="text-indigo-400 font-bold ml-1">(Read Only Mode)</span>
                        </p>
                    </div>
                    <button
                        onClick={onClearAttemptSelection}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm active:scale-95"
                    >
                        Restore Current Session
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-hidden relative">
                <SplitPane
                    initialLeftWidth={35}
                    leftContent={
                        <div className="flex flex-col h-full overflow-hidden">
                            {!isExamMode && (
                                <UnitNavHeader
                                    activeTab={activeTab}
                                    onTabChange={onTabChange}
                                    onToggleSidebar={onToggleSidebar}
                                    showSidebar={showSidebar}
                                    onPrevious={onPrevious}
                                    onNext={onNext}
                                    extraContent={extraHeaderContent}
                                    showSidebarToggle={showSidebarToggle}
                                    minimal={hideTabs}
                                    hideNavigationButtons={isExamMode}
                                />
                            )}
                            <div className="flex-1 overflow-hidden relative">
                                {showSidebar && sidebar && (
                                    <>
                                        <div className="absolute inset-y-0 left-0 z-[100] w-[300px] bg-white shadow-2xl animate-in slide-in-from-left duration-300">
                                            {sidebar}
                                        </div>
                                    </>
                                )}
                                {activeTab === 'question' ? (
                                    <>
                                        <ProblemStatement
                                            key={`ps-${question.id}`}
                                            title={question.title}
                                            difficulty={question.difficulty || 'Easy'}
                                            topic={question.topic || 'General'}
                                            description={question.description}
                                            task={question.type === 'Coding' || question.type === 'Web' ? "Implement the solution based on the requirements." : "Choose the correct option(s)."}
                                            onPrevious={onPrevious}
                                            onNext={onNext}
                                            onToggleReview={onToggleReview}
                                            isMarkedForReview={isMarkedForReview}
                                            onToggleBookmark={onToggleBookmark}
                                            isBookmarked={isBookmarked}
                                            hideHeader={true}
                                            fontSize={contentFontSize}
                                            isExamMode={isExamMode}
                                            marksObtained={marksObtained}
                                            questionTotalMarks={questionTotalMarks}
                                        />

                                        {/* Render reading content blocks (also for non-Reading question types) */}
                                        {question.readingContent && (
                                            <div className="not-prose mt-6">
                                                {question.readingContent.map(block => (
                                                    <div key={block.id} className="mb-8">
                                                        {block.type === 'text' ? (
                                                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content || '', purifyConfig) }} />
                                                        ) : (
                                                            <div className="not-prose my-8">
                                                                <EmbeddedCodeRunner
                                                                    language={SUPPORTED_LANGUAGES.find(l => l.id === block.codeConfig?.languageId) || SUPPORTED_LANGUAGES[0]}
                                                                    initialCode={block.codeConfig?.initialCode || ''}
                                                                    onRunSuccess={() => onCodeBlockRun?.(block.id)}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <AttemptsView
                                        attempts={attempts}
                                        onSelect={onAttemptSelect}
                                        selectedAttemptId={selectedAttemptId}
                                        questionType={question.type}
                                    />
                                )}
                            </div>
                        </div>
                    }
                    rightContent={renderRightPanel()}
                />
            </div>
        </div>
    );
}

// Custom comparison function for React.memo to prevent re-rendering when parent functions change
// but crucial data like the question or current answer hasn't changed.
function arePropsEqual(prevProps: UnitRendererProps, nextProps: UnitRendererProps) {
    // Re-render if the question changes
    if (prevProps.question.id !== nextProps.question.id) return false;

    // Re-render if the answer for THIS question changes
    if (prevProps.currentAnswer !== nextProps.currentAnswer) return false;

    // Fast-moving properties or view state changes
    if (prevProps.activeTab !== nextProps.activeTab) return false;
    if (prevProps.isMarkedForReview !== nextProps.isMarkedForReview) return false;
    if (prevProps.isBookmarked !== nextProps.isBookmarked) return false;
    if (prevProps.showSidebar !== nextProps.showSidebar) return false;
    if (prevProps.selectedAttemptId !== nextProps.selectedAttemptId) return false;
    if (prevProps.isExecuting !== nextProps.isExecuting) return false;
    if (prevProps.contentFontSize !== nextProps.contentFontSize) return false;
    if (prevProps.hideSubmit !== nextProps.hideSubmit) return false;

    // Otherwise, assume it's the same. (We ignore function references like onNext, onSubmit, which might change on every render in parent)
    return true;
}

const MemoizedUnitRenderer = React.memo(UnitRendererComponent, arePropsEqual);

export default function UnitRenderer(props: UnitRendererProps) {
    return <MemoizedUnitRenderer key={`unit-renderer-${props.question.id}`} {...props} />;
}
