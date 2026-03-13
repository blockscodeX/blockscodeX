"use client";
import React, { useState, useEffect, useRef } from "react";
import { useEditor } from "./hooks/useEditor";
import { CodeEditorProps, LanguageConfig } from "./types";
import { SUPPORTED_LANGUAGES } from "./languages";

export default function CodeEditor(props: CodeEditorProps) {
    const [currentLang, setCurrentLang] = useState<LanguageConfig>(props.language);
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
    const [isFooterExpanded, setIsFooterExpanded] = useState(false);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"testcases" | "terminal" | "input">("testcases");
    const [selectedTestCase, setSelectedTestCase] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [terminalHeight, setTerminalHeight] = useState(320);
    const [isResizingTerminal, setIsResizingTerminal] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalDrawerRef = useRef<HTMLDivElement>(null);
    const resizeStartYRef = useRef(0);
    const resizeStartHeightRef = useRef(320);
    const terminalHeightRef = useRef(320);
    const resizeAnimationFrameRef = useRef<number | null>(null);

    const { editorRef, view } = useEditor({ ...props, language: currentLang });

    // Validate selectedTestCase index when props change
    useEffect(() => {
        if (props.testCases && props.testCases.length > 0) {
            if (selectedTestCase >= props.testCases.length) {
                setSelectedTestCase(0);
            }
        }
    }, [props.testCases, selectedTestCase]);

    useEffect(() => {
        setCurrentLang(props.language);
    }, [props.language.id]);

    // Native Fullscreen Sync
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement && document.fullscreenElement === containerRef.current);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullScreen = async () => {
        if (!containerRef.current) return;

        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error("Error attempting to toggle fullscreen:", err);
            // Fallback to internal state if API fails
            setIsFullScreen(!isFullScreen);
        }
    };

    // Handle fullscreen layout refresh
    useEffect(() => {
        if (view) {
            setTimeout(() => view.requestMeasure(), 350); // Delay to allow CSS transition to finish
        }
    }, [isFullScreen, view]);

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = SUPPORTED_LANGUAGES.find(l => l.id === e.target.value);
        if (selected) {
            setCurrentLang(selected);
        }
    };

    const takeSnapshot = () => {
        if (view) {
            const code = view.state.doc.toString();
            const blob = new Blob([code], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `code_snapshot_${new Date().getTime()}.txt`;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    const getFirstLine = (text: string) => text.split("\n")[0].trim();

    const [customInput, setCustomInput] = useState("");

    const handleRun = async () => {
        if (view) {
            const code = view.state.doc.toString();
            let inputToRun = customInput;
            let expectedOutput: string | undefined = undefined;
            let indexToPass: number | undefined = undefined;

            if (activeTab === "testcases" && props.testCases && props.testCases.length > 0) {
                // Robustly determine index: if selectedTestCase is out of bounds, use 0
                const validIndex = (selectedTestCase >= 0 && selectedTestCase < props.testCases.length)
                    ? selectedTestCase
                    : 0;

                const tc = props.testCases[validIndex];
                if (tc) {
                    inputToRun = tc.input || "";
                    expectedOutput = tc.expected || tc.expectedOutput || "";
                    indexToPass = validIndex;

                    // Auto-correct state if needed so UI reflects what we actually ran
                    if (validIndex !== selectedTestCase) {
                        setSelectedTestCase(validIndex);
                    }
                }
            }

            console.log('CodeEditor handleRun', {
                activeTab,
                indexToPass,
                selectedTestCase,
                testCasesLength: props.testCases?.length
            }); // DEBUG

            if (props.actions?.onRun) {
                const result = await props.actions.onRun(code, inputToRun, expectedOutput, indexToPass);

                // If result is returned (it should be now), use it to switch tabs
                if (result && typeof result === 'object') {
                    if (result.error) {
                        setActiveTab("terminal");
                    } else if (indexToPass !== undefined) {
                        // If running a test case and no error (even if failed), show test cases
                        setActiveTab("testcases");
                    } else {
                        // Custom input -> terminal
                        setActiveTab("terminal");
                    }
                } else {
                    // Fallback if no result returned (legacy behavior)
                    if (indexToPass !== undefined) {
                        setActiveTab("testcases");
                    } else {
                        setActiveTab("terminal");
                    }
                }
            }

            setIsTerminalOpen(true);
        }
    };

    const startTerminalResize = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        resizeStartYRef.current = event.clientY;
        const currentHeight = terminalDrawerRef.current?.offsetHeight || terminalHeight;
        resizeStartHeightRef.current = currentHeight;
        terminalHeightRef.current = currentHeight;
        setIsResizingTerminal(true);
    };

    useEffect(() => {
        if (!isResizingTerminal) return;

        const onMouseMove = (event: MouseEvent) => {
            if (!containerRef.current) return;

            const deltaY = resizeStartYRef.current - event.clientY;
            const containerHeight = containerRef.current.clientHeight;

            const minHeight = 180;
            const maxHeight = Math.max(minHeight, containerHeight - 140);
            const nextHeight = Math.min(maxHeight, Math.max(minHeight, resizeStartHeightRef.current + deltaY));

            terminalHeightRef.current = nextHeight;

            if (resizeAnimationFrameRef.current == null) {
                resizeAnimationFrameRef.current = requestAnimationFrame(() => {
                    if (terminalDrawerRef.current) {
                        terminalDrawerRef.current.style.height = `${terminalHeightRef.current}px`;
                    }
                    resizeAnimationFrameRef.current = null;
                });
            }
        };

        const onMouseUp = () => {
            setTerminalHeight(terminalHeightRef.current);
            setIsResizingTerminal(false);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            if (resizeAnimationFrameRef.current != null) {
                cancelAnimationFrame(resizeAnimationFrameRef.current);
                resizeAnimationFrameRef.current = null;
            }
        };
    }, [isResizingTerminal]);

    return (
        <div
            ref={containerRef}
            className={`flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden relative transition-all duration-300 ${isFullScreen ? 'h-screen w-screen z-[9999] rounded-none' : 'h-full ' + (props.className || '')
                }`}
        >
            {/* ... Top Bar & Header ... */}
            {!props.hideTopBar && (
                <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between z-[60]">
                    {!props.hideLanguageSelector ? (
                        <select
                            value={currentLang.id}
                            onChange={handleLanguageChange}
                            className="bg-[#f8f9fa] border border-slate-200 rounded px-3 py-1.5 text-[11px] font-bold text-slate-600 outline-none hover:border-slate-300 transition-colors"
                        >
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <option key={lang.id} value={lang.id}>{lang.label}</option>
                            ))}
                        </select>
                    ) : (
                        <div>{props.customToolbarContent}</div>
                    )}

                    <div className="flex items-center gap-5 text-slate-400">
                        {props.options?.readOnly && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded text-[9px] font-black text-amber-600 uppercase tracking-widest">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                Read Only
                            </div>
                        )}
                        {!props.hideSnapshotButton && (
                            <button
                                onClick={takeSnapshot}
                                title="Take Snapshot"
                                className="hover:text-[var(--brand)] transition-colors"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                            </button>
                        )}
                        <button
                            onClick={toggleFullScreen}
                            title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                            className="hover:text-[var(--brand)] transition-colors"
                        >
                            {isFullScreen ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5" /></svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {currentLang.header?.trim() && (
                <div
                    className="bg-[#f8f9fa] border-b border-slate-100 px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors group select-none relative z-50"
                    onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                >
                    {!isHeaderExpanded ? (
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] text-slate-400 rotate-0">▼</span>
                            <span className="text-[13px] font-mono text-slate-700 font-medium shrink-0 truncate max-w-[90%]">
                                {getFirstLine(currentLang.header)} <span className="text-[var(--brand)] ml-1">↔</span>
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[8px] text-slate-400">▼</span>
                            </div>
                            <pre className="text-[13px] font-mono text-slate-500 leading-relaxed whitespace-pre-wrap">{currentLang.header}</pre>
                        </div>
                    )}
                </div>
            )}

            <div
                ref={editorRef}
                className="flex-1 w-full bg-white relative overflow-hidden"
            ></div>

            {/* TERMINAL DRAWER */}
            <div
                ref={terminalDrawerRef}
                className={`absolute bottom-[60px] left-0 right-0 bg-white border-t border-slate-200 ease-in-out z-[100] ${isResizingTerminal ? '' : 'transition-all duration-300'} ${isTerminalOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
                    } ${isResizingTerminal ? 'select-none' : ''}`}
                style={{ height: isTerminalOpen ? `${terminalHeight}px` : '0px' }}
            >
                <div
                    onMouseDown={startTerminalResize}
                    className="h-2 w-full cursor-ns-resize"
                    title="Drag to resize"
                />
                <div className="flex items-center justify-between bg-[#fff4ee] px-4 h-11 select-none">
                    <div className="flex items-center h-full gap-4 pl-2">
                        {["testcases", "terminal", "input"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setActiveTab(t as any)}
                                className={`text-[12px] font-bold h-full border-b-2 transition-all px-2 flex items-center capitalize ${activeTab === t ? 'border-[#e67e22] text-[#e67e22]' : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {t === "testcases" ? "Test Cases" : t}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsTerminalOpen(false)}
                        className="p-1 px-3 text-slate-400 hover:text-slate-600 transition-transform active:scale-90"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-hidden h-full">
                    {activeTab === "testcases" && (
                        <div className="flex h-full gap-8">
                            <div className="w-[260px] flex flex-col gap-3 content-start">
                                <div className="flex flex-wrap gap-2">
                                    {(props.testCases || []).map((tc: any, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedTestCase(idx)}
                                            className={`flex-1 min-w-[70px] flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg text-[11px] font-bold border transition-all ${selectedTestCase === idx
                                                ? 'bg-[#e67e22] text-white border-[#e67e22]'
                                                : (tc.passed === true ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : (tc.passed === false ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'))
                                                }`}
                                        >
                                            <span>Case {idx + 1}</span>
                                        </button>
                                    ))}
                                    {(!props.testCases || props.testCases.length === 0) && (
                                        <div className="text-slate-400 text-xs italic p-2">No test cases available.</div>
                                    )}
                                </div>
                                {(props.testCases && props.testCases.length > 0 && props.testCases.some((tc: any) => tc.passed !== undefined)) && (
                                    <div className="mt-4 p-3 bg-emerald-50 rounded-lg flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-emerald-600">PASSED</span>
                                        <span className="text-[12px] font-black text-emerald-700">
                                            {props.testCases.filter((tc: any) => tc.passed).length} / {props.testCases.length}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar pb-10">
                                {props.testCases && props.testCases[selectedTestCase] ? (
                                    <>
                                        {props.testCases[selectedTestCase].isPublic === false ? (
                                            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50 p-8 border-2 border-dashed border-slate-200 rounded-xl">
                                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.84 0 1.68-.1 2.47-.28" /><path d="M2 2l20 20" /></svg>
                                                </div>
                                                <div className="text-center">
                                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Hidden Test Case</h3>
                                                    <p className="text-xs text-slate-500 mt-1">Input and output are hidden for this case.</p>
                                                </div>
                                                {props.testCases[selectedTestCase].passed !== undefined && (
                                                    <div className={`mt-4 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${props.testCases[selectedTestCase].passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {props.testCases[selectedTestCase].passed ? 'Passed' : 'Failed'}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Input</span>
                                                        <div className="bg-slate-50 p-4 rounded-xl text-[13px] font-mono border border-slate-100/50 whitespace-pre-wrap text-slate-700">{props.testCases[selectedTestCase].input}</div>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Expected</span>
                                                        <div className="bg-slate-50 p-4 rounded-xl text-[13px] font-mono border border-slate-100/50 text-[#e67e22] whitespace-pre-wrap">{props.testCases[selectedTestCase].expected ?? props.testCases[selectedTestCase].expectedOutput}</div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Actual Output</span>
                                                    {props.testCases[selectedTestCase].actualOutput !== undefined ? (
                                                        <div className={`bg-white border-2 ${props.testCases[selectedTestCase].passed ? 'border-emerald-100 bg-emerald-50/20' : 'border-red-100 bg-red-50/20'} p-4 rounded-xl text-[13px] font-mono whitespace-pre-wrap text-slate-700`}>
                                                            {props.testCases[selectedTestCase].actualOutput}
                                                            {props.testCases[selectedTestCase].error && (
                                                                <div className="text-red-500 mt-2 font-bold">{props.testCases[selectedTestCase].error}</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-white border-2 border-dashed border-slate-100 h-20 rounded-xl flex items-center justify-center text-slate-300 italic text-xs">Waiting for execution...</div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">Select a test case to view details</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "terminal" && (
                        <div className="bg-slate-900 rounded-xl p-6 h-[200px] font-mono text-[13px] text-emerald-400 overflow-y-auto shadow-inner whitespace-pre-wrap">
                            <div className="flex items-center gap-2 mb-2 opacity-50">
                                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                            </div>
                            {props.terminalOutput || "No output yet. Run your code to see the output here."}
                        </div>
                    )}

                    {activeTab === "input" && (
                        <div className="flex flex-col h-[220px] bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Standard Input (stdin)</span>
                                <span className="text-[10px] text-slate-400 font-mono">custom mode</span>
                            </div>
                            <textarea
                                className="flex-1 w-full bg-white p-4 text-[13px] font-mono outline-none focus:ring-1 focus:ring-orange-100 transition-all resize-none text-slate-700"
                                placeholder="Type your custom input here..."
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                            ></textarea>
                        </div>
                    )}
                </div>
            </div>

            {!props.hideRunBar && (
                <div className="flex flex-col bg-white border-t border-slate-200 relative">
                    {currentLang.footer?.trim() && (
                        <div
                            className="bg-[#f8f9fa] px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors select-none border-b border-slate-100 relative z-20"
                            onClick={() => setIsFooterExpanded(!isFooterExpanded)}
                        >
                            {!isFooterExpanded ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-[8px] text-slate-400 -rotate-90">▼</span>
                                    <span className="text-[13px] font-mono text-slate-700 font-medium shrink-0 truncate max-w-[90%]">
                                        {getFirstLine(currentLang.footer)} <span className="text-[var(--brand)] ml-1">↔</span>
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[8px] text-slate-400">▼</span>
                                    </div>
                                    <pre className="text-[13px] font-mono text-slate-500 leading-relaxed whitespace-pre-wrap">{currentLang.footer}</pre>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="px-5 py-3 flex items-center justify-between h-[60px] bg-white select-none relative z-[120]">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsTerminalOpen(prev => !prev);
                                }}
                                className={`group flex items-center gap-2 px-4 py-2 border rounded-lg text-[12px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer relative ${isTerminalOpen ? 'bg-[var(--brand-light)] border-[var(--brand-light)] text-[var(--brand)]' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                <svg className={`transition-colors ${isTerminalOpen ? 'text-[var(--brand)]' : 'group-hover:text-[var(--brand)]'}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 17l6-6-6-6M12 19h8" /></svg>
                                Terminal <span className={`text-[8px] opacity-60 transition-transform duration-300 ${isTerminalOpen ? 'rotate-180' : ''}`}>▲</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-6">
                            {!props.options?.readOnly && (
                                <>
                                    <button
                                        onClick={async () => {
                                            if (props.actions?.onReset && view) {
                                                const resetCode = await props.actions.onReset();
                                                if (typeof resetCode === 'string') {
                                                    view.dispatch({
                                                        changes: { from: 0, to: view.state.doc.length, insert: resetCode }
                                                    });
                                                }
                                            }
                                        }}
                                        title="Reset Code"
                                        className="text-slate-400 hover:text-slate-600 transition-all p-2 active:rotate-180 duration-500"
                                    >
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                                    </button>
                                    <button
                                        onClick={handleRun}
                                        disabled={props.isExecuting}
                                        className={`px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-[12px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex items-center gap-2`}
                                    >
                                        {props.isExecuting ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                                                Running...
                                            </>
                                        ) : (
                                            "Execute"
                                        )}
                                    </button>

                                    {!props.hideSubmit && (
                                        <button
                                            onClick={async () => {
                                                if (view) {
                                                    if (props.actions?.onSubmit) {
                                                        const result = await props.actions.onSubmit(view.state.doc.toString());

                                                        // If result is returned, use it to switch tabs
                                                        if (result && typeof result === 'object') {
                                                            if (result.error) {
                                                                setActiveTab("terminal");
                                                            } else {
                                                                // Submit usually runs all test cases, so show test cases tab
                                                                setActiveTab("testcases");
                                                            }
                                                        } else {
                                                            // Fallback
                                                            setActiveTab("testcases");
                                                        }
                                                        setIsTerminalOpen(true);
                                                    }
                                                }
                                            }}
                                            className={`px-10 py-3 bg-[var(--brand)] text-white font-black rounded-xl text-[12px] uppercase tracking-widest shadow-lg shadow-[var(--brand-light)] hover:bg-[var(--brand-dark)] hover:-translate-y-0.5 transition-all active:translate-y-0 active:scale-[0.98] flex items-center gap-2`}
                                        >
                                            Submit
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <style jsx global>{`
        .cm-editor { 
            outline: none !important; 
            height: 100%; 
            background: #ffffff !important;
        }

        .cm-scroller { padding-top: 15px; }
        .cm-content {
            font-family: 'Geist Mono', 'JetBrains Mono', monospace !important;
            font-size: ${props.fontSize ? `${props.fontSize}px` : '14px'} !important;
            line-height: 1.6;
            color: #1e293b !important;
            caret-color: #f77621 !important;
        }

        /* Autocomplete / Code Suggestions fix */
        .cm-tooltip.cm-tooltip-autocomplete {
            background-color: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important;
            overflow: hidden !important;
            z-index: 9999 !important;
        }
        .cm-tooltip-autocomplete > ul > li {
            color: #475569 !important;
            padding: 4px 12px !important;
            font-size: 13px !important;
        }
        .cm-tooltip-autocomplete > ul > li[aria-selected] {
            background-color: #f8fafc !important;
            color: #f77621 !important;
        }
        .cm-completionDetail {
            font-style: italic !important;
            opacity: 0.6 !important;
            margin-left: 8px !important;
        }
        .cm-completionIcon { display: none !important; }

        /* Syntax Highlighting overrides */
        .cm-keyword { color: #f77621 !important; font-weight: bold; }
        .cm-operator { color: #64748b !important; }
        .cm-variable { color: #0f172a !important; }
        .cm-string { color: #059669 !important; }
        .cm-comment { color: #94a3b8 !important; font-style: italic; }
        .cm-number { color: #2563eb !important; }
        .cm-type { color: #7c3aed !important; }
        .cm-propertyName { color: #0891b2 !important; }

        .cm-gutters {
            background-color: #ffffff !important;
            border-right: 1px solid #f1f5f9 !important;
            color: #cbd5e1 !important;
            padding-right: 12px !important;
            font-weight: 500;
            font-size: ${props.fontSize ? `${props.fontSize}px` : '14px'} !important;
        }
        .cm-activeLine { background-color: #f8fafc !important; }
        .cm-activeLineGutter { background-color: #f8fafc !important; color: #f77621 !important; font-weight: bold; }
        .cm-selectionBackground { background-color: #ffedd5 !important; }
        .cm-cursor { border-left-color: #f77621 !important; }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </div>
    );
}
