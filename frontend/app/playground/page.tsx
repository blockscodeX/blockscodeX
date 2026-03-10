"use client";
import React, { useState } from "react";
import Navbar from "../components/Navbar";
import SplitPane from "../components/SplitPane";
import PlaygroundEditor from "../components/Playground/PlaygroundEditor";
import PlaygroundTerminal from "../components/Playground/PlaygroundTerminal";
import { PLAYGROUND_LANGUAGES } from "../components/Editor/playgroundLanguages";

interface Tab {
    id: number;
    name: string;
    langId: string;
    code: string;
}

import { CodeExecutionService } from "@/services/api/CodeExecutionService";

// ... existing imports ...

export default function PlaygroundPage() {
    const [tabs, setTabs] = useState<Tab[]>([
        { id: 1, name: "playground", langId: "javascript", code: PLAYGROUND_LANGUAGES[1].initialBody }
    ]);
    const [activeTabId, setActiveTabId] = useState(1);
    const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [customInput, setCustomInput] = useState("");

    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
    const currentLang = PLAYGROUND_LANGUAGES.find(l => l.id === activeTab.langId) || PLAYGROUND_LANGUAGES[0];

    const handleRun = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setTerminalOutput([]); // Clear previous output

        try {
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            // Execute via Piston Service
            const result = await CodeExecutionService.run(
                currentLang.id,
                activeTab.code,
                customInput
            );

            // Show ONLY the output (or error if failed, or generic message if empty)
            const finalOutput = result.output || (result.stderr ? `Error: ${result.stderr}` : "No output returned.");
            setTerminalOutput([finalOutput]);
        } catch (error) {
            console.error("Execution error:", error);
            setTerminalOutput(prev => [
                ...prev,
                `Error: Failed to execute code.`,
                String(error)
            ]);
        } finally {
            setIsRunning(false);
        }
    };

    const handleCodeChange = (newCode: string) => {
        setTabs(tabs.map(t => t.id === activeTabId ? { ...t, code: newCode } : t));
    };

    const handleClear = () => {
        setTerminalOutput([]);
    };

    const addTab = () => {
        const newId = Math.max(...tabs.map(t => t.id), 0) + 1;
        setTabs([...tabs, {
            id: newId,
            name: `page-${newId}`,
            langId: "javascript",
            code: PLAYGROUND_LANGUAGES[1].initialBody
        }]);
        setActiveTabId(newId);
    };

    const deleteTab = (id: number) => {
        if (!id) return;
        if (tabs.length === 1) return;
        setTabs(tabs.filter(t => t.id !== id));
        if (activeTabId === id) {
            setActiveTabId(tabs[0].id !== id ? tabs[0].id : tabs[1].id);
        }
        setShowDeleteConfirm(null);
    };

    const updateTabLang = (langId: string) => {
        const lang = PLAYGROUND_LANGUAGES.find(l => l.id === langId);
        setTabs(tabs.map(t => t.id === activeTabId ? { ...t, langId, code: lang?.initialBody || "" } : t));
    };

    // ... (keep handleClear, addTab, deleteTab, updateTabLang) ...

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
            {/* ... Navbar ... */}
            <Navbar />

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-hidden relative">
                    <SplitPane
                        initialLeftWidth={55}
                        leftContent={
                            <div className="h-full flex flex-col bg-white relative">
                                {/* ... Tab Bar ... */}
                                <div className="h-12 border-b border-slate-100 flex items-center px-4 justify-between bg-white z-20">
                                    <div className="flex items-center gap-1 h-full">
                                        <div className="pr-4 border-r border-slate-100 mr-2">
                                            <select
                                                value={activeTab.langId}
                                                onChange={(e) => updateTabLang(e.target.value)}
                                                className="text-[12px] font-bold text-slate-600 bg-transparent outline-none cursor-pointer hover:text-[var(--brand)] transition-colors"
                                            >
                                                {PLAYGROUND_LANGUAGES.map(lang => (
                                                    <option key={lang.id} value={lang.id}>{lang.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {tabs.map(tab => (
                                            <div
                                                key={tab.id}
                                                onClick={() => setActiveTabId(tab.id)}
                                                className={`group px-6 h-full flex items-center text-[12px] font-bold transition-all border-b-2 relative cursor-pointer ${activeTabId === tab.id ? 'border-[var(--brand)] text-slate-700 bg-slate-50/50' : 'border-transparent text-slate-400 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {tab.name}
                                                {tabs.length > 1 && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowDeleteConfirm(tab.id);
                                                        }}
                                                        className="ml-2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                                                    >
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        <button
                                            onClick={addTab}
                                            className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--brand)] hover:bg-[var(--brand-light)] transition-colors ml-2"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={handleClear}
                                            title="Clear Terminal"
                                            className="p-2 text-slate-400 hover:text-[var(--brand)] transition-all active:rotate-180 duration-500"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                                        </button>

                                        <button
                                            onClick={handleRun}
                                            disabled={isRunning}
                                            className={`flex items-center gap-2 px-6 py-1.5 bg-[var(--brand)] text-white text-[11px] font-black uppercase tracking-widest rounded-md hover:bg-[var(--brand-dark)] transition-all active:scale-95 shadow-sm shadow-[var(--brand-light)] ${isRunning ? 'opacity-70 cursor-wait' : ''}`}
                                        >
                                            {isRunning ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    Running
                                                </>
                                            ) : (
                                                <>
                                                    Execute
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <PlaygroundEditor
                                    key={activeTabId}
                                    language={currentLang}
                                    code={activeTab.code}
                                    onChange={handleCodeChange}
                                />
                            </div>
                        }
                        rightContent={
                            <PlaygroundTerminal
                                output={terminalOutput}
                                onClear={handleClear}
                                customInput={customInput}
                                onCustomInputChange={setCustomInput}
                            />
                        }
                    />

                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm && (
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in duration-200">
                                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-6">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Delete this page?</h3>
                                <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                                    You are about to delete <span className="font-bold text-slate-700">"{tabs.find(t => t.id === showDeleteConfirm)?.name}"</span>. This action cannot be undone.
                                </p>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowDeleteConfirm(null)}
                                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => deleteTab(showDeleteConfirm)}
                                        className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
