"use client";
import React, { useState, useEffect } from "react";
import { useEditor } from "../Editor/hooks/useEditor";
import { LanguageConfig } from "../Editor/types";
import { useWebFiles, WebFileName } from "./hooks/useWebFiles";
import { generatePreviewBlob, revokePreviewUrl } from "./utils/PreviewEngine";
import ExecuteButton from "../Common/ExecuteButton";
import PreviewFrame from "./PreviewFrame";
import SplitPane from "../SplitPane";
import AlertModal from "../Common/AlertModal";

interface WebEditorProps {
    initialHTML?: string;
    initialCSS?: string;
    initialJS?: string;
    showFiles?: {
        html?: boolean;
        css?: boolean;
        js?: boolean;
    };
    onChange?: (files: { html: string; css: string; js: string }) => void;
    hideTestCases?: boolean;
    hideReset?: boolean;
    readOnly?: boolean;
    fontSize?: number;
    // Optional test cases provided by backend
    testCases?: Array<any>;
    onSubmit?: (data: { html: string; css: string; js: string }) => void;
    isExamMode?: boolean;
    onCheatDetected?: (reason: string) => void;
}

export default function WebEditor({
    initialHTML = "<!-- HTML Body Content Here -->\n",
    initialCSS = "/* CSS Content Here */\n",
    initialJS = "// JavaScript Content Here\n",
    showFiles = { html: true, css: true, js: true },
    onChange,
    hideTestCases = false,
    hideReset = false,
    readOnly = false,
    fontSize,
    testCases,
    onSubmit,
    isExamMode = false,
    onCheatDetected
}: WebEditorProps) {
    const memoizedInitialFiles = React.useMemo(() => ({
        "index.html": initialHTML,
        "index.css": initialCSS,
        "index.js": initialJS
    }), [initialHTML, initialCSS, initialJS]);

    const { files, activeFile, setActiveFile, updateFile } = useWebFiles(memoizedInitialFiles);

    const [showTestcases, setShowTestcases] = useState(false);

    // Notify parent of changes
    useEffect(() => {
        if (onChange) {
            onChange({
                html: files["index.html"],
                css: files["index.css"],
                js: files["index.js"]
            });
        }
    }, [files, onChange]);

    const [previewUrl, setPreviewUrl] = useState("");
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [testResults, setTestResults] = useState<any[]>([]);

    // CodeMirror configuration based on active file
    const getLangConfig = (fileName: WebFileName): LanguageConfig => {
        const extMap: Record<string, () => Promise<any>> = {
            "index.html": async () => {
                const { html } = await import("@codemirror/lang-html");
                return html();
            },
            "index.css": async () => {
                const { css } = await import("@codemirror/lang-css");
                return css();
            },
            "index.js": async () => {
                const { javascript } = await import("@codemirror/lang-javascript");
                return javascript();
            }
        };
        return {
            id: fileName.split('.')[1] as any,
            label: fileName,
            header: "",
            footer: "",
            initialBody: files[fileName],
            extension: extMap[fileName]
        };
    };

    const { editorRef, view } = useEditor({
        language: getLangConfig(activeFile),
        actions: {
            ...(!readOnly ? { onChange: (content) => updateFile(activeFile, content) } : {}),
            ...(isExamMode && onCheatDetected ? { onCheatDetected } : {})
        },
        options: {
            readOnly: readOnly,
            ...(isExamMode ? {
                disablePaste: true,
                disableCopy: true,
                disableCut: true,
                disableRightClick: true,
                disableDragDrop: true
            } : {})
        }
    });

    const handleRun = () => {
        revokePreviewUrl(previewUrl);
        const url = generatePreviewBlob(files["index.html"], files["index.css"], files["index.js"]);
        setPreviewUrl(url);
    };

    useEffect(() => {
        return () => revokePreviewUrl(previewUrl);
    }, [previewUrl]);

    const visibleFiles = (Object.keys(showFiles) as Array<keyof typeof showFiles>).filter(k => showFiles[k]);

    // Ensure active file is always a visible one
    useEffect(() => {
        const activeFileType = activeFile.split('.')[1] as keyof typeof showFiles;
        if (!showFiles[activeFileType] && visibleFiles.length > 0) {
            setActiveFile(`index.${visibleFiles[0]}` as WebFileName);
        }
    }, [showFiles, activeFile, visibleFiles, setActiveFile]);

    return (
        <div className="flex flex-col h-full bg-white relative overflow-hidden">
            <div className="flex-1 overflow-hidden">
                <SplitPane
                    initialLeftWidth={50}
                    leftContent={
                        <div className="h-full flex flex-col bg-white border-r border-slate-100 relative">
                            {/* File Tabs */}
                            <div className="h-10 border-b border-slate-100 flex items-center px-4 justify-between bg-white z-20">
                                <div className="flex items-center h-full">
                                    {visibleFiles.map(fileType => {
                                        const fileName = `index.${fileType}` as WebFileName;
                                        return (
                                            <button
                                                key={fileName}
                                                onClick={() => setActiveFile(fileName)}
                                                className={`px-6 h-full flex items-center text-[12px] font-bold transition-all border-b-2 hover:bg-slate-50 ${activeFile === fileName
                                                    ? 'border-[var(--brand)] text-slate-700'
                                                    : 'border-transparent text-slate-400'
                                                    }`}
                                            >
                                                {fileName}
                                            </button>
                                        );
                                    })}
                                </div>

                                {!readOnly && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleRun}
                                            className="flex items-center gap-2 px-4 py-1 bg-[var(--brand)] text-white text-[10px] font-black uppercase tracking-widest rounded transition-all hover:bg-[var(--brand-dark)]"
                                        >
                                            preview
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Editor Surface - REMOVED KEY to fix re-mounting issue */}
                            <div ref={editorRef} className="flex-1 w-full bg-white overflow-hidden"></div>
                        </div>
                    }
                    rightContent={
                        <PreviewFrame src={previewUrl} onMessage={(msg) => console.log('Iframe msg:', msg)} />
                    }
                />
            </div>

            {/* Bottom Action Bar - Hide if Read Only */}
            {!readOnly && (
                <div className="h-14 bg-white border-t border-slate-100 flex items-center px-6 justify-between shrink-0 z-30">
                    <div className="flex items-center gap-4">
                        {!hideTestCases && (
                            <>
                                <button
                                    onClick={() => { setIsResetModalOpen(false); setShowTestcases(true); }}
                                    className="px-3 py-1.5 border border-slate-200 rounded text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    Test Cases <span className="text-[8px] opacity-60 ml-1">{testCases ? `(${testCases.length})` : '▼'}</span>
                                </button>

                                {/* Testcases Modal */}
                                {showTestcases && (
                                    <div className="fixed inset-0 z-[200] flex items-center justify-center">
                                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowTestcases(false)} />
                                        <div className="bg-white rounded-lg shadow-lg p-6 z-30 w-[640px] max-w-[95%]">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-black">Test Cases</h3>
                                                <button onClick={() => setShowTestcases(false)} className="text-slate-400 hover:text-slate-600">Close</button>
                                            </div>
                                            <div className="space-y-4 max-h-[60vh] overflow-auto">
                                                {(testCases && testCases.length > 0) ? (
                                                    testCases.map((tc: any, idx: number) => (
                                                        <div key={idx} className="p-3 border rounded">
                                                            <div className="text-xs font-bold mb-2">Case {idx + 1}</div>
                                                            <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(tc, null, 2)}</pre>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-sm text-slate-500">No test cases supplied by backend.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {!hideReset && (
                            <button
                                onClick={() => setIsResetModalOpen(true)}
                                title="Reset Code"
                                className="p-2 text-slate-400 hover:text-[var(--brand)] transition-all active:rotate-180 duration-500"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                            </button>
                        )}
                        <button
                            onClick={() => onSubmit?.({
                                html: files["index.html"],
                                css: files["index.css"],
                                js: files["index.js"]
                            })}
                            className={`px-10 py-3 bg-[var(--brand)] text-white font-black rounded-xl text-[12px] uppercase tracking-widest shadow-lg shadow-[var(--brand-light)] hover:bg-[var(--brand-dark)] hover:-translate-y-0.5 transition-all active:translate-y-0 active:scale-[0.98] flex items-center gap-2`}
                        >
                            Submit
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Alert Modals */}
            <AlertModal
                isOpen={isResetModalOpen}
                title="Reset your code?"
                message="This will delete your current progress and restore the original exercise boilerplate. This action cannot be undone."
                type="danger"
                confirmLabel="Reset Code"
                onConfirm={() => {
                    setIsResetModalOpen(false);
                    updateFile("index.html", initialHTML);
                    updateFile("index.css", initialCSS);
                    updateFile("index.js", initialJS);
                }}
                onCancel={() => setIsResetModalOpen(false)}
            />

            <style jsx global>{`
                .cm-editor { 
                    outline: none !important; 
                    height: 100%; 
                    border-radius: 0 !important; 
                    background: #ffffff !important;
                }
                .cm-scroller { padding-top: 15px; }
                .cm-content {
                    font-family: 'Geist Mono', 'JetBrains Mono', monospace !important;
                    font-size: ${fontSize ? `${fontSize}px` : '14px'} !important;
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
                .cm-tagName { color: #be185d !important; }
                .cm-attributeName { color: #7c3aed !important; }

                .cm-gutters {
                    background-color: #ffffff !important;
                    border-right: 1px solid #f1f5f9 !important;
                    color: #cbd5e1 !important;
                    padding-right: 12px !important;
                    font-size: ${fontSize ? `${fontSize}px` : '14px'} !important;
                }
                .cm-activeLine { background-color: #f8fafc !important; }
                .cm-activeLineGutter { background-color: #f8fafc !important; color: #f77621 !important; font-weight: bold; }
                .cm-selectionBackground { background-color: #ffedd5 !important; }
                .cm-cursor { border-left-color: #f77621 !important; }
            `}</style>
        </div>
    );
}
