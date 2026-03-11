"use client";
import React, { useState, useEffect } from "react";
import { Plus, Layout, Settings, Eye, EyeOff, Share2, Save, GripVertical, ChevronRight, FileText, Code, Globe, HelpCircle, CheckCircle2, BarChart3, Sparkles, Trash2, TerminalSquare, PanelLeftClose, PanelLeftOpen, Calendar, Lock } from "lucide-react";
import { Course, Section, Question, TestSection } from "./types";
import { TeacherService } from "@/services/api/TeacherService";
import QuestionBuilder from "./QuestionBuilder/QuestionBuilder";
import RichTextEditor from "./RichTextEditor";
import Navbar from "@/app/components/Navbar";
import StudentPreview from "./StudentPreview";
import AlertModal from "../Common/AlertModal";
import { useToast } from "../Common/Toast";
import AiCourseBuilderModal from "./AiCourseBuilderModal";

export default function CourseBuilder({ initialData, onDelete, onSave, basePath, userRole, orgPermissions = { allowCourseTests: true }, organizationId }: { initialData?: Course, onDelete?: () => void, onSave?: (data: any) => Promise<void>, basePath?: string, userRole?: 'admin' | 'teacher' | 'super-admin', orgPermissions?: { allowCourseTests?: boolean }, organizationId?: string }) {
    const { success } = useToast();
    const [course, setCourse] = useState<Course>(initialData || {
        title: "",
        shortDescription: "",
        longDescription: "",
        difficulty: "Beginner",
        tags: [],
        isVisible: false,
        sections: [
            {
                id: "sec-1",
                title: "Introduction",
                questions: []
            }
        ],
        tests: []
    });

    const [activeTab, setActiveTab] = useState<'unit' | 'test'>('unit');
    const [activeSectionId, setActiveSectionId] = useState<string>("sec-1");
    const [activeStep, setActiveStep] = useState<'metadata' | 'builder'>('builder');
    const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, type?: 'danger' | 'warning' | 'info', onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    // Persistence: Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const key = initialData?.id ? `course_builder_draft_${initialData.id}` : 'course_builder_draft_new';
            const saved = localStorage.getItem(key);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setCourse(prev => ({ ...prev, ...parsed }));
                    success("Restored draft from local storage", "Draft Restored");
                } catch (e) {
                    console.error("Failed to load draft", e);
                }
            }
        }
    }, []);

    // Persistence: Save to localStorage on change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const key = course.id ? `course_builder_draft_${course.id}` : 'course_builder_draft_new';
            const timeout = setTimeout(() => {
                localStorage.setItem(key, JSON.stringify(course));
            }, 1000); // Debounce 1s
            return () => clearTimeout(timeout);
        }
    }, [course]);

    // Date formatting helpers for datetime-local inputs
    const formatISOToInput = (iso?: string) => {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '';
            const pad = (n: number) => n.toString().padStart(2, '0');
            const yyyy = d.getFullYear();
            const MM = pad(d.getMonth() + 1);
            const dd = pad(d.getDate());
            const hh = pad(d.getHours());
            const mm = pad(d.getMinutes());
            return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
        } catch (e) { return ''; }
    };

    const convertInputToISO = (localString?: string) => {
        if (!localString) return '';
        // localString is expected like "yyyy-MM-ddTHH:mm" (no timezone)
        const dt = new Date(localString);
        if (isNaN(dt.getTime())) return '';
        return dt.toISOString();
    };


    const activeList = activeTab === 'unit' ? course.sections : (course.tests || []);
    const activeSection = activeList.find(s => s.id === activeSectionId);
    const activeQuestion = activeSection?.questions.find(q => q.id === activeQuestionId);

    const addSection = () => {
        const newSection: any = {
            id: `${activeTab === 'unit' ? 'sec' : 'test'}-${Date.now()}`,
            title: activeTab === 'unit' ? "New Section" : "New Test",
            questions: []
        };

        if (activeTab === 'test') {
            newSection.startDate = "";
            newSection.endDate = "";
        }

        setCourse(prev => ({
            ...prev,
            [activeTab === 'unit' ? 'sections' : 'tests']: [...(activeTab === 'unit' ? prev.sections : (prev.tests || [])), newSection]
        }));
        setActiveSectionId(newSection.id);
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
                showTestCases: true
            } : undefined,
            webConfig: type === 'Web' ? {
                html: '<h1>Hello World</h1>',
                css: 'body { color: blue; }',
                js: '',
                showFiles: { html: true, css: true, js: true },
                testCases: []
            } : undefined,
            readingConfig: type === 'Reading' ? {
                contentBlocks: [
                    { id: '1', type: 'text', content: '<p>Start writing your content...</p>' }
                ]
            } : undefined,
            notebookConfig: type === 'Notebook' ? {
                initialCode: '# Write your Python code here\nimport numpy as np\nimport matplotlib.pyplot as plt\n\nprint("Hello from Python Notebook!")',
                language: 'python',
                maxExecutionTime: 10,
                allowedLibraries: ['numpy', 'matplotlib']
            } : undefined
        };

        setCourse(prev => {
            if (activeTab === 'unit') {
                return {
                    ...prev,
                    sections: prev.sections.map(s =>
                        s.id === activeSectionId ? { ...s, questions: [...s.questions, newQuestion] } : s
                    )
                };
            } else {
                return {
                    ...prev,
                    tests: (prev.tests || []).map(s =>
                        s.id === activeSectionId ? { ...s, questions: [...s.questions, newQuestion] } : s
                    )
                };
            }
        });
        setActiveQuestionId(newQuestion.id);
        setShowAddMenu(null);
    };

    const deleteSection = (sectionId: string) => {
        setAlertConfig({
            isOpen: true,
            title: `Delete ${activeTab === 'unit' ? 'Section' : 'Test'}?`,
            message: "Are you sure you want to delete this? All questions in it will be lost.",
            onConfirm: () => {
                const listName = activeTab === 'unit' ? 'sections' : 'tests';
                setCourse(prev => ({
                    ...prev,
                    [listName]: (prev[listName] as any[]).filter(s => s.id !== sectionId)
                }));
                if (activeSectionId === sectionId) {
                    const currentList = activeTab === 'unit' ? course.sections : (course.tests || []);
                    setActiveSectionId(currentList.find(s => s.id !== sectionId)?.id || "");
                }
                setAlertConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const deleteQuestion = (sectionId: string, questionId: string) => {
        setAlertConfig({
            isOpen: true,
            title: "Delete Question?",
            message: "This action cannot be undone.",
            onConfirm: () => {
                const updateList = (list: any[]) => list.map(s =>
                    s.id === sectionId ? { ...s, questions: s.questions.filter((q: any) => q.id !== questionId) } : s
                );

                setCourse(prev => {
                    if (activeTab === 'unit') {
                        return { ...prev, sections: updateList(prev.sections) };
                    } else {
                        return { ...prev, tests: updateList(prev.tests || []) };
                    }
                });
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
                            placeholder="Course Title..."
                            className="text-lg font-black text-slate-800 outline-none border-b-2 border-transparent focus:border-[var(--brand)] transition-all placeholder:text-slate-300"
                            value={course.title}
                            onChange={(e) => setCourse(prev => ({ ...prev, title: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 justify-center w-1/3">
                    <button
                        onClick={() => {
                            const newStatus = course.status === 'Published' ? 'Draft' : 'Published';
                            setCourse(prev => ({ ...prev, status: newStatus, isVisible: newStatus === 'Published' }));
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border-2 ${course.status === 'Published' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100'}`}
                    >
                        <div className={`w-2 h-2 rounded-full ${course.status === 'Published' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></div>
                        {course.status || 'Draft'}
                        <span className="text-[8px] opacity-60 ml-1">(Click to toggle)</span>
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
                                title: "Delete Course?",
                                message: "This will permanently remove the course and all its contents. This action cannot be undone.",
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
                                if (onSave) {
                                    // Provide sanitized copy to onSave (convert datetime-local strings to ISO)
                                    const sanitized = JSON.parse(JSON.stringify(course));
                                    (sanitized.tests || []).forEach((t: any) => {
                                        if (t.startDate && !t.startDate.endsWith('Z')) t.startDate = convertInputToISO(t.startDate);
                                        if (t.endDate && !t.endDate.endsWith('Z')) t.endDate = convertInputToISO(t.endDate);
                                    });
                                    await onSave(sanitized);
                                } else if (course.id && !course.id.startsWith('course-')) { // Check if it's a real CID not a temp one
                                    const sanitized = JSON.parse(JSON.stringify(course));
                                    (sanitized.tests || []).forEach((t: any) => {
                                        if (t.startDate && !t.startDate.endsWith('Z')) t.startDate = convertInputToISO(t.startDate);
                                        if (t.endDate && !t.endDate.endsWith('Z')) t.endDate = convertInputToISO(t.endDate);
                                    });
                                    await TeacherService.updateCourse(course.id, sanitized);
                                    success("Course updated successfully!", "Saved");
                                } else {
                                    const sanitized = JSON.parse(JSON.stringify(course));
                                    (sanitized.tests || []).forEach((t: any) => {
                                        if (t.startDate && !t.startDate.endsWith('Z')) t.startDate = convertInputToISO(t.startDate);
                                        if (t.endDate && !t.endDate.endsWith('Z')) t.endDate = convertInputToISO(t.endDate);
                                    });
                                    const res = await TeacherService.createCourse(sanitized, organizationId);
                                    setCourse(prev => ({ ...prev, id: res.id }));
                                    localStorage.removeItem('course_builder_draft_new');
                                    success("Course created successfully!", "Saved");
                                    // Optional: window.history.pushState({}, '', `${basePath}/${res.id}/edit`);
                                }
                            } catch (e) {
                                console.error(e);
                                alert("Failed to save course. Check console for details.");
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
                            <Save size={16} />
                        )}
                        {course.id && !course.id.startsWith('course-') ? "Update Course" : "Publish Course"}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Sidebar Structure */}
                <div className={`border-r border-slate-100 flex flex-col bg-slate-50/30 overflow-hidden shrink-0 min-h-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-0 border-none' : 'w-80'}`}>
                    {/* Unit / Test Tab Switcher */}
                    <div className="p-4 border-b border-slate-100 bg-white flex gap-1">
                        <button
                            onClick={() => { setActiveTab('unit'); setActiveStep('builder'); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'unit' && activeStep === 'builder' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Layout size={12} /> Units
                        </button>
                        {orgPermissions.allowCourseTests && (
                            <button
                                onClick={() => { setActiveTab('test'); setActiveStep('builder'); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'test' && activeStep === 'builder' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                            >
                                <FileText size={12} /> Tests
                            </button>
                        )}
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
                                    {activeTab === 'unit' ? 'Learning Modules' : 'Exam Modules'}
                                    <button onClick={addSection} className="text-[var(--brand)] hover:scale-110 transition-transform">
                                        <Plus size={16} strokeWidth={3} />
                                    </button>
                                </h3>

                                <div className="space-y-4">
                                    {(activeTab === 'unit' ? course.sections : (course.tests || [])).map((section) => (
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
                                                            Add Question
                                                        </button>

                                                        {showAddMenu === section.id && (
                                                            <div className="absolute left-0 top-full z-50 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                <AddMenuItem onClick={() => addQuestion('MCQ')} label="Single Choice (MCQ)" icon={<HelpCircle size={14} />} />
                                                                <AddMenuItem onClick={() => addQuestion('MultiSelect')} label="Multiple Choice" icon={<CheckCircle2 size={14} className="text-emerald-500" />} />
                                                                <AddMenuItem onClick={() => addQuestion('Coding')} label="Coding (DSA)" icon={<Code size={14} className="text-indigo-500" />} />
                                                                <AddMenuItem onClick={() => addQuestion('Web')} label="Web Project" icon={<Globe size={14} className="text-blue-500" />} />
                                                                <AddMenuItem onClick={() => addQuestion('Reading')} label="Reading / Content" icon={<FileText size={14} className="text-amber-500" />} />
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
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6">Course Settings</h3>
                                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                                    <div className="w-12 h-12 bg-[var(--brand-light)] text-[var(--brand)] rounded-xl flex items-center justify-center">
                                        <BarChart3 size={20} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-800 uppercase leading-tight">Manage the high-level details of this curriculum.</p>
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
                        <div className="flex-1 overflow-y-auto p-12 space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="max-w-4xl mx-auto space-y-10">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Main Curriclum Metadata</h2>
                                    <p className="text-sm font-medium text-slate-400 mt-1">Define how your course is presented to students.</p>

                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Content Status</label>
                                        <div className="flex items-center gap-4">
                                            <VisibilityToggle active={course.status === 'Published'} onClick={() => {
                                                const newStatus = course.status === 'Published' ? 'Draft' : 'Published';
                                                setCourse(prev => ({ ...prev, status: newStatus, isVisible: newStatus === 'Published' }));
                                            }} />
                                            <span className={`text-xs font-black uppercase tracking-widest ${course.status === 'Published' ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                {course.status || 'Draft'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Difficulty Level</label>
                                        <div className="flex gap-2">
                                            {['Beginner', 'Intermediate', 'Advanced'].map((level: any) => (
                                                <button
                                                    key={level}
                                                    onClick={() => setCourse(prev => ({ ...prev, difficulty: level }))}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${course.difficulty === level ? 'bg-[var(--brand)] border-[var(--brand)] text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                                >
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Short Catchy Tagline</label>
                                    <input
                                        type="text"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold text-slate-700 outline-none focus:border-[var(--brand-light)] transition-all shadow-inner"
                                        placeholder="e.g. Master React Hooks in 2 weeks..."
                                        value={course.shortDescription || ''}
                                        onChange={(e) => setCourse(prev => ({ ...prev, shortDescription: e.target.value }))}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Long Description (Detailed Curriculum)</label>
                                        <button className="flex items-center gap-2 text-[var(--brand)] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform group">
                                            <Sparkles size={14} className="group-hover:animate-pulse" />
                                            AI Content Writer
                                        </button>
                                    </div>
                                    <RichTextEditor
                                        content={course.longDescription || ''}
                                        onChange={(content) => setCourse(prev => ({ ...prev, longDescription: content }))}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : activeStep === 'builder' && activeTab === 'test' && activeSection && !activeQuestion ? (
                        <div className="flex-1 overflow-y-auto p-12 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="max-w-4xl mx-auto space-y-6">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Test Schedule</h2>
                                    <p className="text-sm font-medium text-slate-400">Configure when this test is available to students.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                            <Calendar size={14} /> Start Date & Time
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[var(--brand)] transition-all"
                                            value={formatISOToInput((activeSection as any).startDate) || ''}
                                            onChange={(e) => {
                                                const val = e.target.value; // 'YYYY-MM-DDTHH:mm'
                                                setCourse(prev => ({
                                                    ...prev,
                                                    tests: (prev.tests || []).map(t =>
                                                        t.id === activeSectionId ? { ...t, startDate: val } : t
                                                    )
                                                }));
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                            <Calendar size={14} /> End Date & Time
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[var(--brand)] transition-all"
                                            value={formatISOToInput((activeSection as any).endDate) || ''}
                                            onChange={(e) => {
                                                const val = e.target.value; // 'YYYY-MM-DDTHH:mm'
                                                setCourse(prev => ({
                                                    ...prev,
                                                    tests: (prev.tests || []).map(t =>
                                                        t.id === activeSectionId ? { ...t, endDate: val } : t
                                                    )
                                                }));
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl shadow-sm">
                                    <div className="flex gap-3">
                                        <div className="shrink-0 pt-0.5">
                                            <Calendar className="text-amber-500" size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide mb-1">Testing Window Logic</h4>
                                            <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                                Before the start time, the test card will be visible but locked. After the end time, it will freeze.
                                                Students can only attempt the test between these two dates.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeQuestion ? (
                        <QuestionBuilder
                            question={activeQuestion}
                            onChange={(updates) => {
                                setCourse(prev => {
                                    const updateList = (list: any[]) => list.map(s =>
                                        s.id === activeSectionId
                                            ? {
                                                ...s,
                                                questions: s.questions.map((q: any) =>
                                                    q.id === activeQuestionId ? { ...q, ...updates } : q
                                                )
                                            }
                                            : s
                                    );

                                    if (activeTab === 'unit') {
                                        return { ...prev, sections: updateList(prev.sections) };
                                    } else {
                                        return { ...prev, tests: updateList(prev.tests || []) };
                                    }
                                });
                            }}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-300 flex-col gap-4">
                            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                                <Settings size={40} />
                            </div>
                            <p className="text-sm font-black uppercase tracking-widest">Select a question to start authoring</p>
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
            <AiCourseBuilderModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                onGenerateFull={(data, tokenUsage) => {
                    setCourse(prev => ({
                        ...prev,
                        title: data.title || prev.title,
                        shortDescription: data.shortDescription || prev.shortDescription,
                        sections: data.sections,
                        courseSummary: data.summary,
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
        case 'Reading': return <FileText size={14} className="text-amber-500" />;
        case 'Notebook': return <TerminalSquare size={14} className="text-orange-500" />;
        default: return <HelpCircle size={14} />;
    }
}
