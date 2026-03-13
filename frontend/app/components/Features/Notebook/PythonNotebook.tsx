"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import SplitPane from "../../SplitPane";

// Dynamic Import for Code Splitting
const CodeEditor = dynamic(() => import("../../Editor/CodeEditor"), {
  loading: () => <div className="h-full w-full bg-slate-50 animate-pulse min-h-[100px]" />,
  ssr: false
});
import { LanguageConfig } from "../../Editor/types";
import { python } from "@codemirror/lang-python";
import { TerminalSquare, Play, RotateCcw, Image as ImageIcon, AlertCircle } from "lucide-react";

// Special config for Notebook execution (Script mode, no function wrapping)
const NotebookConfigBase: Omit<LanguageConfig, 'initialBody'> = {
    id: "python-notebook",
    label: "Python (Notebook)",
    header: "", // No boilerplate
    footer: "", // No boilerplate
    extension: async () => python(),
};

interface OutputItem {
    id: string;
    type: 'stdout' | 'stderr' | 'image' | 'info';
    content: string;
    timestamp: number;
}

interface PythonNotebookProps {
    initialCode?: string;
    readOnly?: boolean;
    fontSize?: number;
    onChange?: (code: string) => void;
    onSubmit?: (code: string) => void;
    isExamMode?: boolean;
}

export default function PythonNotebook({ initialCode = "", readOnly = false, fontSize, onChange, onSubmit, isExamMode = false }: PythonNotebookProps) {
    const [code, setCode] = useState(initialCode);

    const handleCodeChange = (newCode: string) => {
        setCode(newCode);
        if (onChange) onChange(newCode);
    };

    // Dynamic config to ensure initialCode is passed and refreshed
    const notebookConfig = React.useMemo(() => ({
        ...NotebookConfigBase,
        initialBody: initialCode,
        id: "python-notebook" as any
    }), [initialCode]);

    // Sync code only when initialCode prop truly changes from outside (e.g. on question switch)
    useEffect(() => {
        if (initialCode !== undefined && initialCode !== code) {
            setCode(initialCode);
        }
    }, [initialCode, code]);

    // Outputs state
    const [outputs, setOutputs] = useState<OutputItem[]>([]);

    // Worker State
    const [isWorkerReady, setIsWorkerReady] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [workerError, setWorkerError] = useState<string | null>(null);

    const workerRef = useRef<Worker | null>(null);
    const outputEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom of output
    useEffect(() => {
        outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [outputs]);

    // Initialize Worker
    useEffect(() => {
        try {
            workerRef.current = new Worker("/workers/pyodideWorker.js");

            workerRef.current.onmessage = (event) => {
                const { id, type, text, plots, error } = event.data;

                switch (type) {
                    case "ready":
                        setIsWorkerReady(true);
                        addOutput('info', "Python Environment Ready (Pyodide v0.25.1)");
                        break;
                    case "stdout":
                        addOutput('stdout', text);
                        break;
                    case "stderr":
                        addOutput('stderr', text);
                        break;
                    case "done":
                        if (plots && Array.isArray(plots)) {
                            plots.forEach(plotBase64 => addOutput('image', plotBase64));
                        }
                        setIsExecuting(false);
                        break;
                    case "error":
                        addOutput('stderr', error || "Unknown runtime error");
                        setIsExecuting(false);
                        break;
                    default:
                        break;
                }
            };

            // Start initialization
            workerRef.current.postMessage({ action: "init", id: "init" });

        } catch (err) {
            setWorkerError("Failed to initialize Web Worker. This browser might not support it.");
        }

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const addOutput = useCallback((type: OutputItem['type'], content: string) => {
        setOutputs(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            type,
            content,
            timestamp: Date.now()
        }]);
    }, []);

    const handleRun = useCallback(() => {
        if (!isWorkerReady || isExecuting) return;

        setOutputs([]);
        setIsExecuting(true);

        workerRef.current?.postMessage({
            action: "run",
            id: Date.now(),
            code
        });
    }, [code, isWorkerReady, isExecuting]);

    const handleClearConsole = () => setOutputs([]);

    return (
        <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
            {/* 1. Main Content Area */}
            <div className="flex-1 min-h-0">
                <SplitPane
                    initialLeftWidth={50}
                    leftContent={
                        <div className="h-full flex flex-col border-r border-slate-200">
                            <CodeEditor
                                language={notebookConfig}
                                actions={!readOnly ? {
                                    onChange: handleCodeChange,
                                    onRun: handleRun
                                } : {}}
                                options={{ readOnly }}
                                isExecuting={isExecuting}
                                fontSize={fontSize}
                                className="flex-1 border-none"
                                hideLanguageSelector={true}
                                hideRunBar={true}
                                hideSnapshotButton={isExamMode}
                                customToolbarContent={
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center text-orange-600">
                                                <TerminalSquare size={14} />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black text-slate-800 tracking-tight">Python 3.11 Kernel</h3>
                                                <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${isWorkerReady ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isWorkerReady ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                                    {isWorkerReady ? "Ready" : "Initializing..."}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-4 w-px bg-slate-200 mx-2"></div>
                                        {!readOnly && (
                                            <button
                                                onClick={() => {
                                                    setOutputs([]);
                                                    workerRef.current?.postMessage({ action: "init", id: "re-init" });
                                                    addOutput('info', 'Kernel Restarting...');
                                                }}
                                                className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all"
                                            >
                                                <RotateCcw size={10} />
                                                Restart
                                            </button>
                                        )}
                                    </div>
                                }
                            />
                        </div>
                    }
                    rightContent={
                        <div
                            className="h-full flex flex-col bg-[#1e1e1e] text-slate-300 font-mono"
                            style={{ fontSize: fontSize ? `${fontSize}px` : '14px' }}
                        >
                            <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-[#252526]">
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Console Output</span>
                                {isExecuting && <span className="text-[10px] text-amber-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Executing...</span>}
                            </div>

                            <div className="flex-1 overflow-auto p-4 space-y-2 no-scrollbar">
                                {outputs.length === 0 && !isExecuting && (
                                    <div className="h-full flex flex-col items-center justify-center text-white/20 gap-4">
                                        <Play size={40} strokeWidth={1} />
                                        <p className="text-xs">Run code to see output</p>
                                    </div>
                                )}

                                {outputs.map((out) => (
                                    <div key={out.id} className="animate-in fade-in slide-in-from-bottom-1 duration-200">
                                        {out.type === 'stdout' && (
                                            <div className="whitespace-pre-wrap">{out.content}</div>
                                        )}
                                        {out.type === 'stderr' && (
                                            <div className="whitespace-pre-wrap text-rose-400 bg-rose-500/10 p-2 rounded border-l-2 border-rose-500">
                                                {out.content}
                                            </div>
                                        )}
                                        {out.type === 'info' && (
                                            <div className="whitespace-pre-wrap text-indigo-400 italic text-xs">
                                                # {out.content}
                                            </div>
                                        )}
                                        {out.type === 'image' && (
                                            <div className="my-2 bg-white rounded-lg p-2 max-w-fit">
                                                <img src={`data:image/png;base64,${out.content}`} alt="Plot" className="max-w-full h-auto" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={outputEndRef} />
                            </div>
                        </div>
                    }
                />
            </div>

            {/* 2. Unified Action Bar */}
            {!readOnly && (
                <div className="h-[70px] bg-white border-t border-slate-100 flex items-center px-6 justify-between shrink-0 z-30">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleClearConsole}
                            className="px-4 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            Clear Console
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleRun}
                            disabled={isExecuting || !isWorkerReady}
                            className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-[12px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex items-center gap-2"
                        >
                            {isExecuting ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                                    Running...
                                </>
                            ) : (
                                <>
                                    Execute
                                    <Play size={12} fill="currentColor" />
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => onSubmit?.(code)}
                            className={`px-10 py-3 bg-[var(--brand)] text-white font-black rounded-xl text-[12px] uppercase tracking-widest shadow-lg shadow-[var(--brand-light)] hover:bg-[var(--brand-dark)] hover:-translate-y-0.5 transition-all active:translate-y-0 active:scale-[0.98] flex items-center gap-2`}
                        >
                            Submit
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
