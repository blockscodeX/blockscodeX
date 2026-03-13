"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TeacherService } from "@/services/api/TeacherService";
import { Plus, Layout, Settings, Share2, GripVertical, ChevronRight, Code, Globe, HelpCircle, CheckCircle2, BarChart3, Sparkles, Trash2, Clock, Target, Eye, EyeOff, TerminalSquare, PanelLeftClose, PanelLeftOpen, Lock } from "lucide-react";
import { Course as Exam, Section, Question } from "./types";
import QuestionBuilder from "./QuestionBuilder/QuestionBuilder";
import RichTextEditor from "./RichTextEditor";
import Navbar from "@/app/components/Navbar";
import { siteConfig } from "@/app/config/site";
import StudentPreview from "./StudentPreview";
import AlertModal from "../Common/AlertModal";
import { useToast } from "../Common/Toast";
import AiExamBuilderModal from "./AiExamBuilderModal";

export default function ExamBuilder({ initialData, onDelete, basePath, userRole, orgPermissions = { allowAppExams: true, allowAIProctoring: true }, organizationId }: { initialData?: Partial<Exam>, onDelete?: () => void, basePath?: string, userRole?: 'admin' | 'teacher' | 'super-admin', orgPermissions?: { allowAppExams?: boolean, allowAIProctoring?: boolean }, organizationId?: string }) {
    const { success } = useToast();
    const router = useRouter();
    const [exam, setExam] = useState<Partial<Exam>>(initialData || {
        title: "",
        shortDescription: "",
        longDescription: "",
        difficulty: "Intermediate",
        tags: [],
        isVisible: false,
        sections: [
            {
                id: "sec-1",
                title: "Core Assessment",
                questions: []
            }
        ]
    });

    const [activeSectionId, setActiveSectionId] = useState<string>("sec-1");
    const [activeStep, setActiveStep] = useState<'metadata' | 'builder'>('builder');
    const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, type?: 'danger' | 'warning' | 'info', onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    const getDraftKey = () => initialData?.id ? `exam_builder_draft_${initialData.id}` : 'exam_builder_draft_new';

    // Persistence: Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const key = getDraftKey();
            const saved = localStorage.getItem(key);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setExam(prev => ({ ...prev, ...parsed }));
                    success("Restored exam draft from local storage", "Draft Restored");
                } catch (e) {
                    console.error("Failed to load exam draft", e);
                }
            }
        }
    }, []);

    // Persistence: Save to localStorage on change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const key = getDraftKey();
            const timeout = setTimeout(() => {
                localStorage.setItem(key, JSON.stringify(exam));
            }, 1000); // Debounce 1s
            return () => clearTimeout(timeout);
        }
    }, [exam]);

    const activeSection = exam.sections?.find(s => s.id === activeSectionId);
    const activeQuestion = activeSection?.questions.find(q => q.id === activeQuestionId);

    const addSection = () => {
        const newSection: Section = {
            id: `sec-${Date.now()}`,
            title: "New Section",
            questions: []
        };
        setExam(prev => ({ ...prev, sections: [...(prev.sections || []), newSection] }));
        setActiveSectionId(newSection.id);
    };

    // Helper to format ISO datetime to a `datetime-local` compatible value (YYYY-MM-DDThh:mm)
    const formatDateTimeLocal = (iso?: string | undefined) => {
        if (!iso) return '';
        const d = new Date(iso);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const addQuestion = (type: Question['type']) => {
        if (!activeSection) return;
        const newQuestion: Question = {
            id: `q-${Date.now()}`,
            type,
            title: `New ${type} Question`,
            problemStatement: "",
            marks: 10,
            difficulty: "Medium",
            tags: [],
            options: (type === 'MCQ' || type === 'MultiSelect') ? [
                { id: `opt-1`, text: "Option 1", isCorrect: true },
                { id: `opt-2`, text: "Option 2", isCorrect: false }
            ] : [],
            codingConfig: type === 'Coding' ? {
                templates: {
                    javascript: { head: '', body: '// Write your code here', tail: '', solution: '' },
                    python: { head: '', body: '# Write your code here', tail: '', solution: '' }
                },
                testCases: [],
                showTestCases: false
            } : undefined,
            webConfig: type === 'Web' ? {
                html: '<h1>Hello World</h1>',
                css: 'body { color: blue; }',
                js: '',
                showFiles: { html: true, css: true, js: true },
                testCases: []
            } : undefined,
            notebookConfig: type === 'Notebook' ? {
                initialCode: '# Write your Python code here\\nimport numpy as np\\nimport matplotlib.pyplot as plt\\n\\nprint("Hello from Python Notebook!")',
                language: 'python',
                maxExecutionTime: 10,
                allowedLibraries: ['numpy', 'matplotlib']
            } : undefined
        };

        setExam(prev => ({
            ...prev,
            sections: prev.sections?.map(s =>
                s.id === activeSectionId ? { ...s, questions: [...s.questions, newQuestion] } : s
            )
        }));
        setActiveQuestionId(newQuestion.id);
        setShowAddMenu(null);
    };

    const deleteSection = (sectionId: string) => {
        setAlertConfig({
            isOpen: true,
            title: "Delete Section?",
            message: "Are you sure you want to delete this assessment section? All questions in it will be lost.",
            onConfirm: () => {
                setExam(prev => ({
                    ...prev,
                    sections: prev.sections?.filter(s => s.id !== sectionId)
                }));
                if (activeSectionId === sectionId) {
                    setActiveSectionId(exam.sections?.find(s => s.id !== sectionId)?.id || "");
                }
                setAlertConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const deleteQuestion = (sectionId: string, questionId: string) => {
        setAlertConfig({
            isOpen: true,
            title: "Delete Question?",
            message: "This question will be permanently removed from the exam.",
            onConfirm: () => {
                setExam(prev => ({
                    ...prev,
                    sections: prev.sections?.map(s =>
                        s.id === sectionId ? { ...s, questions: s.questions.filter(q => q.id !== questionId) } : s
                    )
                }));
                if (activeQuestionId === questionId) setActiveQuestionId(null);
                setAlertConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            <Navbar basePath={basePath} userRole={userRole} />
            {/* Top Toolbar */}
            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0 sticky top-0 z-40 shadow-sm">
                <div className="flex items-center gap-4 w-1/3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-[var(--brand)] transition-all mr-1"
                            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                        </button>
                        <input
                            type="text"
                            placeholder="Exam Title..."
                            className="text-lg font-black text-slate-800 outline-none border-b-2 border-transparent focus:border-[var(--brand)] transition-all placeholder:text-slate-300"
                            value={exam.title}
                            onChange={(e) => setExam(prev => ({ ...prev, title: e.target.value }))}
                        />
                    </div>
                </div>

                {/* Header Center: Status Toggle */}
                <div className="flex-1 flex justify-center">
                    <button
                        onClick={() => setExam(prev => ({ ...prev, isVisible: !prev.isVisible, isActive: !prev.isVisible } as any))}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border-2 ${exam.isVisible ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
                    >
                        <div className={`w-2 h-2 rounded-full ${exam.isVisible ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        {exam.isVisible ? 'Published' : 'Draft'}
                        <span className="text-[8px] opacity-60 ml-1">(Toggle)</span>
                    </button>
                </div>

                <div className="flex items-center justify-end gap-3 w-1/3">
                    <button
                        onClick={() => setIsAiModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-light)]/30 text-[var(--brand)] hover:bg-[var(--brand-light)]/50 rounded-xl transition-all text-xs font-black uppercase tracking-widest"
                    >
                        <Sparkles size={16} />
                        AI Generate
                    </button>
                    {onDelete && (
                        <button
                            onClick={() => setAlertConfig({
                                isOpen: true,
                                title: "Delete Exam?",
                                message: "Are you sure you want to delete this exam? This action is permanent.",
                                onConfirm: onDelete
                            })}
                            className="flex items-center gap-2 px-4 py-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-xs font-black uppercase tracking-widest"
                        >
                            <Trash2 size={16} />
                            Delete
                        </button>
                    )}
                    <button
                        onClick={() => setPreviewMode(previewMode ? null : 'desktop')}
                        disabled={!activeQuestion}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-widest disabled:opacity-30 ${previewMode ? 'bg-[var(--brand)] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 hover:text-[var(--brand)]'}`}
                        title={activeQuestion ? (previewMode ? "Close preview" : "Preview this question") : "Select a question to preview"}
                    >
                        {previewMode ? (
                            <>
                                <EyeOff size={16} />
                                Close Preview
                            </>
                        ) : (
                            <>
                                <Eye size={16} />
                                Preview
                            </>
                        )}
                    </button>
                    <button
                        onClick={async () => {
                            setIsSaving(true);
                            try {
                                if (exam.id) {
                                    await TeacherService.updateExam(exam.id, exam);
                                    success("Exam updated successfully!", "Saved");
                                } else {
                                    const res = await TeacherService.createExam(exam, organizationId);
                                    setExam(prev => ({ ...prev, id: res.id }));
                                    if (typeof window !== 'undefined') {
                                        localStorage.removeItem('exam_builder_draft_new');
                                    }
                                    success("Exam created successfully!", "Saved");
                                }
                            } catch (e) {
                                console.error(e);
                                alert("Failed to save exam");
                            } finally {
                                setIsSaving(false);
                            }
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-[var(--brand)] text-white rounded-xl shadow-lg shadow-[var(--brand)]/20 hover:scale-105 active:scale-95 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:hover:scale-100"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Share2 size={16} />
                        )}
                        {exam.id ? "Update Exam" : "Save Exam"}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Sidebar Structure */}
                <div className={`border-r border-slate-100 flex flex-col bg-slate-50/30 overflow-hidden shrink-0 min-h-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-0 border-none' : 'w-80'}`}>
                    <div className="p-4 border-b border-slate-100 bg-white flex gap-1">
                        <button
                            onClick={() => setActiveStep('builder')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeStep === 'builder' ? 'bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/20' : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Layout size={12} /> Structure
                        </button>
                        <button
                            onClick={() => setActiveStep('metadata')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeStep === 'metadata' ? 'bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/20' : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Settings size={12} /> Guidelines
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                        {activeStep === 'builder' ? (
                            <>
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
                                    Exam Sections
                                    <button onClick={addSection} className="text-[var(--brand)] hover:scale-110 transition-transform">
                                        <Plus size={16} strokeWidth={3} />
                                    </button>
                                </h3>

                                <div className="space-y-4">
                                    {exam.sections?.map((section) => (
                                        <div key={section.id} className="space-y-1">
                                            <div
                                                onClick={() => setActiveSectionId(section.id)}
                                                className={`group flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all border ${activeSectionId === section.id ? 'bg-white border-[var(--brand-light)] shadow-md shadow-[var(--brand)]/5 text-slate-900' : 'bg-transparent border-transparent text-slate-500 hover:bg-white hover:border-slate-100 hover:shadow-sm'}`}
                                            >
                                                <GripVertical size={14} className="text-slate-300 cursor-grab active:cursor-grabbing" />
                                                <span className="text-xs font-black flex-1 truncate">{section.title}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                                <ChevronRight size={14} className={`transition-transform ${activeSectionId === section.id ? 'rotate-90' : ''}`} />
                                            </div>

                                            {activeSectionId === section.id && (
                                                <div className="pl-8 space-y-1 py-1">
                                                    {section.questions.map(q => (
                                                        <div
                                                            key={q.id}
                                                            onClick={() => setActiveQuestionId(q.id)}
                                                            className={`group/q flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all border ${activeQuestionId === q.id ? 'bg-[var(--brand-light)] border-[var(--brand-light)] text-[var(--brand-dark)]' : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600'}`}
                                                        >
                                                            <QuestionIcon type={q.type} />
                                                            <span className="text-[11px] font-bold truncate flex-1">{q.title}</span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); deleteQuestion(section.id, q.id); }}
                                                                className="opacity-0 group-hover/q:opacity-100 p-1 hover:text-red-500 transition-all"
                                                            >
                                                                <Trash2 size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setShowAddMenu(showAddMenu === section.id ? null : section.id)}
                                                            className="flex items-center gap-2 px-3 py-2 w-full text-[var(--brand)] opacity-70 hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-wider"
                                                        >
                                                            <Plus size={12} strokeWidth={3} />
                                                            Add Exam Question
                                                        </button>

                                                        {showAddMenu === section.id && (
                                                            <div className="absolute left-0 top-full z-50 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                <AddMenuItem onClick={() => addQuestion('MCQ')} label="Single Choice (MCQ)" icon={<HelpCircle size={14} />} />
                                                                <AddMenuItem onClick={() => addQuestion('MultiSelect')} label="Multiple Choice" icon={<CheckCircle2 size={14} className="text-emerald-500" />} />
                                                                <AddMenuItem onClick={() => addQuestion('Coding')} label="Coding Exercise" icon={<Code size={14} className="text-indigo-500" />} />
                                                                <AddMenuItem onClick={() => addQuestion('Web')} label="Web Assessment" icon={<Globe size={14} className="text-blue-500" />} />
                                                                <AddMenuItem onClick={() => addQuestion('Notebook')} label="Notebook" icon={<TerminalSquare size={14} className="text-orange-500" />} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6">Exam Settings</h3>
                                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                                    <div className="w-12 h-12 bg-[var(--brand-light)] text-[var(--brand)] rounded-xl flex items-center justify-center">
                                        <BarChart3 size={20} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-800 uppercase leading-tight">Configure the global rules and instructions for this exam.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                    {previewMode ? (
                        <StudentPreview question={activeQuestion} mode={previewMode} setMode={setPreviewMode} />
                    ) : activeStep === 'metadata' ? (
                        <div className="flex-1 overflow-y-auto p-8 animate-in fade-in slide-in-from-right-4 duration-500 bg-slate-50/20">
                            <div className="max-w-4xl mx-auto space-y-6">
                                {/* Section: Primary Info */}
                                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-light)] text-[var(--brand)] flex items-center justify-center">
                                                <Layout size={18} />
                                            </div>
                                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Basic Information</h3>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${exam.isVisible ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                {exam.isVisible ? 'Published' : 'Draft'}
                                            </span>
                                            <VisibilityToggle active={exam.isVisible || false} onClick={() => setExam(prev => ({ ...prev, isVisible: !prev.isVisible }))} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exam Title</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[var(--brand-light)] transition-all"
                                                placeholder="e.g. JavaScript Midterm"
                                                value={exam.title}
                                                onChange={(e) => setExam(prev => ({ ...prev, title: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">URL Slug</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-[var(--brand)] outline-none focus:border-[var(--brand-light)] transition-all"
                                                    placeholder="phy"
                                                    value={exam.slug}
                                                    onChange={(e) => setExam(prev => ({ ...prev, slug: e.target.value }))}
                                                />
                                            </div>
                                            <p className="text-[9px] font-medium text-slate-400">Public URL identifier. Leave empty to auto-generate.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                                        <RichTextEditor
                                            content={exam.longDescription || ''}
                                            onChange={(content) => setExam(prev => ({ ...prev, longDescription: content }))}
                                        />
                                    </div>
                                </div>

                                {/* Section: Scheduling & Duration */}
                                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                            <Clock size={18} />
                                        </div>
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Scheduling & Duration</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Time</label>
                                            <input
                                                type="datetime-local"
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-[var(--brand-light)] transition-all"
                                                value={formatDateTimeLocal(exam.startTime)}
                                                onChange={(e) => setExam(prev => ({ ...prev, startTime: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Time</label>
                                            <input
                                                type="datetime-local"
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-[var(--brand-light)] transition-all"
                                                value={formatDateTimeLocal(exam.endTime)}
                                                onChange={(e) => setExam(prev => ({ ...prev, endTime: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration (Mins)</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-slate-700 outline-none focus:border-[var(--brand-light)] transition-all"
                                                placeholder="60"
                                                value={exam.duration}
                                                onChange={(e) => setExam(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Marks</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-[var(--brand)] outline-none focus:border-[var(--brand-light)] transition-all"
                                                placeholder="100"
                                                value={exam.totalMarks}
                                                onChange={(e) => setExam(prev => ({ ...prev, totalMarks: parseInt(e.target.value) }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Authentication & Access */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                <Target size={18} />
                                            </div>
                                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Test Code Authentication</h3>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Test Code (Optional)</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black tracking-[0.3em] text-[var(--brand)] outline-none focus:border-[var(--brand-light)] transition-all"
                                                placeholder="00000"
                                                value={exam.testCode}
                                                onChange={(e) => setExam(prev => ({ ...prev, testCode: e.target.value }))}
                                            />
                                            <p className="text-[9px] font-medium text-slate-400">Required code to enter the exam.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Code Rotation Type</label>
                                                <div className="flex gap-2 p-1 bg-slate-50 rounded-xl">
                                                    {['Permanent', 'Rotating'].map((t) => (
                                                        <button
                                                            key={t}
                                                            onClick={() => setExam(prev => ({ ...prev, testCodeType: t as any }))}
                                                            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${exam.testCodeType === t ? 'bg-white text-[var(--brand)] shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                                                        >
                                                            {t}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {exam.testCodeType === 'Rotating' && (
                                                <div className="space-y-1.5 animate-in slide-in-from-top-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rotation Interval (Mins)</label>
                                                    <input
                                                        type="number"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-[var(--brand)] outline-none focus:border-[var(--brand-light)]"
                                                        placeholder="60"
                                                        value={exam.rotationInterval}
                                                        onChange={(e) => setExam(prev => ({ ...prev, rotationInterval: parseInt(e.target.value) }))}
                                                    />
                                                </div>
                                            )}

                                            <p className="text-[9px] font-bold text-slate-400">
                                                Current Code: <span className="text-[var(--brand)]">{exam.testCode || '00000'}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                                <Globe size={18} />
                                            </div>
                                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Access Control</h3>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allowed IP Addr</label>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch('https://api.ipify.org?format=json');
                                                            const data = await res.json();
                                                            setExam(prev => {
                                                                const currentIps = prev.allowedIPs ? prev.allowedIPs.trim() : '';
                                                                const newIps = currentIps ? `${currentIps}, ${data.ip}` : data.ip;
                                                                return { ...prev, allowedIPs: newIps };
                                                            });
                                                            success("IP Address copied and added!", "Success");
                                                        } catch (err) {
                                                            console.error("Failed to fetch IP", err);
                                                            alert("Failed to fetch your IP address");
                                                        }
                                                    }}
                                                    className="text-[8px] font-black uppercase text-[var(--brand)] hover:underline"
                                                >
                                                    Copy My IP
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-[var(--brand-light)] transition-all font-mono"
                                                placeholder="e.g. 192.168.1.1, 10.0.0.1"
                                                value={exam.allowedIPs || ''}
                                                onChange={(e) => setExam(prev => ({ ...prev, allowedIPs: e.target.value }))}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invite Token</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 outline-none cursor-default"
                                                    value={exam.inviteToken || 'xqoto373'}
                                                />
                                                <button
                                                    onClick={() => setExam(prev => ({ ...prev, inviteToken: Math.random().toString(36).substring(7) }))}
                                                    title="Generate Random Token"
                                                    className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"
                                                >
                                                    <Sparkles size={16} />
                                                </button>
                                                <button className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all">
                                                    <Share2 size={16} />
                                                </button>
                                            </div>
                                            <p className="text-[9px] font-bold text-[var(--brand)] truncate">{siteConfig.domain}/invite/{exam.inviteToken || 'xqoto373'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Monitoring & Security */}
                                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                                            <Settings size={18} />
                                        </div>
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Monitoring & Security</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exam Mode</label>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setExam(prev => ({ ...prev, examMode: 'Browser' }))}
                                                    className={`flex-1 p-4 rounded-2xl border transition-all text-left ${exam.examMode === 'Browser' ? 'border-[var(--brand)] bg-[var(--brand-light)]/50' : 'border-slate-100 hover:border-slate-200'}`}
                                                >
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${exam.examMode === 'Browser' ? 'text-[var(--brand)]' : 'text-slate-400'}`}>Browser</p>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1">Standard web assessment.</p>
                                                </button>
                                                {orgPermissions.allowAppExams && (
                                                    <button
                                                        onClick={() => setExam(prev => ({ ...prev, examMode: 'App' }))}
                                                        className={`flex-1 p-4 rounded-2xl border transition-all text-left ${exam.examMode === 'App' ? 'border-[var(--brand)] bg-[var(--brand-light)]/50' : 'border-slate-100 hover:border-slate-200'}`}
                                                    >
                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${exam.examMode === 'App' ? 'text-[var(--brand)]' : 'text-slate-400'}`}>App (Secure)</p>
                                                        <p className="text-[9px] font-bold text-slate-400 mt-1">Electron locked app only.</p>
                                                    </button>
                                                )}
                                                {!orgPermissions.allowAppExams && (
                                                    <div className="flex-1 p-4 rounded-2xl border border-slate-50 bg-slate-50 opacity-40 cursor-not-allowed">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">App (Locked)</p>
                                                        <p className="text-[9px] font-bold text-slate-300 mt-1">Contact Admin to enable.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Proctoring & Monitoring</label>
                                            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">Advanced AI Shield</p>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Eye tracking, noise & person detection.</p>
                                                </div>
                                                {orgPermissions.allowAIProctoring ? (
                                                    <VisibilityToggle
                                                        active={!!exam.aiProctoring}
                                                        onClick={() => setExam(prev => ({ ...prev, aiProctoring: !prev.aiProctoring }))}
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase text-slate-400">
                                                        <Lock size={10} /> Disabled
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tab Switch Limit</label>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-24 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-[var(--brand)] outline-none focus:border-[var(--brand-light)] shadow-inner"
                                                    placeholder="3"
                                                    value={exam.tabSwitchLimit ?? ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '') {
                                                            setExam(prev => ({ ...prev, tabSwitchLimit: undefined }));
                                                            return;
                                                        }
                                                        const num = parseInt(val);
                                                        setExam(prev => ({
                                                            ...prev,
                                                            tabSwitchLimit: Math.max(0, num)
                                                        }));
                                                    }}
                                                />
                                                <p className="text-[10px] font-medium text-slate-400 leading-tight">Maximum times a student can switch tabs before being blocked.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeQuestion ? (
                        <QuestionBuilder
                            question={activeQuestion}
                            onChange={(updates) => {
                                setExam(prev => ({
                                    ...prev,
                                    sections: prev.sections?.map(s =>
                                        s.id === activeSectionId
                                            ? {
                                                ...s,
                                                questions: s.questions.map(q =>
                                                    q.id === activeQuestionId ? { ...q, ...updates } : q
                                                )
                                            }
                                            : s
                                    )
                                }));
                            }}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-300 flex-col gap-4">
                            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                                <Settings size={40} />
                            </div>
                            <p className="text-sm font-black uppercase tracking-widest">Select a question to start editing</p>
                        </div>
                    )}
                </div>
            </div>
            <AlertModal
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type || "danger"}
                confirmLabel={alertConfig.type === 'info' ? "Close" : "Delete"}
                onConfirm={() => {
                    alertConfig.onConfirm();
                    setAlertConfig(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />
            <AiExamBuilderModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                onGenerateFull={(data, tokenUsage) => {
                    setExam(prev => ({
                        ...prev,
                        title: data.title || prev.title,
                        longDescription: data.description || prev.longDescription,
                        sections: data.sections,
                        aiTokensUsed: (prev.aiTokensUsed || 0) + (tokenUsage?.totalTokens || 0)
                    }));
                    if (data.sections.length > 0) {
                        setActiveSectionId(data.sections[0].id);
                    }
                }}
            />
        </div>
    );
}

function VisibilityToggle({ active, onClick }: { active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-14 h-7 rounded-full relative transition-all duration-300 ${active ? 'bg-emerald-500' : 'bg-slate-200'}`}
        >
            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${active ? 'translate-x-7' : ''}`} />
        </button>
    )
}

function AddMenuItem({ onClick, label, icon }: { onClick: () => void, label: string, icon: any }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-all group"
        >
            <span className="text-slate-400 group-hover:text-[var(--brand)] transition-colors uppercase">{icon}</span>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">{label}</span>
        </button>
    )
}

function QuestionIcon({ type }: { type: Question['type'] }) {
    switch (type) {
        case 'MCQ': return <HelpCircle size={14} />;
        case 'MultiSelect': return <CheckCircle2 size={14} className="text-emerald-500" />;
        case 'Coding': return <Code size={14} className="text-[var(--brand)]" />;
        case 'Web': return <Globe size={14} className="text-blue-500" />;
        case 'Notebook': return <TerminalSquare size={14} className="text-orange-500" />;
        default: return <HelpCircle size={14} />;
    }
}
