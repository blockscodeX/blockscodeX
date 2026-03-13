"use client";
import React, { useState } from 'react';
import { Plus, Trash2, Code, FileCode, CheckCircle2, FlaskConical, Layout, Eye, EyeOff, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { Question } from '../../types';
import CodeMirrorEditor from '../../CodeMirrorEditor';
import { useToast } from '../../../Common/Toast';
import { PLAYGROUND_LANGUAGES } from '../../../Editor/playgroundLanguages';

interface CodingEditorProps {
    question: Question;
    onChange: (updates: Partial<Question>) => void;
}

interface Template {
    head: string;
    body: string;
    tail: string;
    solution: string;
}

interface CodingConfig {
    templates: Record<string, Template>;
    testCases: any[];
    showTestCases?: boolean;
    allowedLanguages?: string[];
    languageId?: string;
}

export default function CodingEditor({ question, onChange }: CodingEditorProps) {
    const defaultConfig: CodingConfig = {
        templates: {
            javascript: { head: '', body: '// Write your code here', tail: '', solution: '' },
            python: { head: '', body: '# Write your code here', tail: '', solution: '' }
        },
        testCases: [],
        showTestCases: true,
        allowedLanguages: ['javascript', 'python'],
        languageId: 'javascript'
    };

    const normalizeLanguageId = (languageId?: string) => {
        if (!languageId) return '';
        const normalized = languageId.toLowerCase();
        if (normalized === 'c++' || normalized === 'cplusplus' || normalized === 'cxx') return 'cpp';
        if (normalized === 'js') return 'javascript';
        if (normalized === 'py') return 'python';
        return normalized;
    };

    const normalizeConfig = (base?: any): CodingConfig => {
        if (!base) return defaultConfig;

        const rawTemplates = base.templates && typeof base.templates === 'object' ? base.templates : defaultConfig.templates;
        const normalizedTemplates = Object.entries(rawTemplates).reduce((acc, [langId, template]: [string, any]) => {
            acc[normalizeLanguageId(langId)] = template;
            return acc;
        }, {} as Record<string, Template>);

        const templateKeys = Object.keys(normalizedTemplates);
        const safeTemplateKeys = templateKeys.length > 0 ? templateKeys : Object.keys(defaultConfig.templates);
        const languageId = normalizeLanguageId(base.languageId);

        return {
            ...base,
            templates: safeTemplateKeys.length > 0 ? normalizedTemplates : defaultConfig.templates,
            testCases: base.testCases || [],
            showTestCases: base.showTestCases ?? true,
            allowedLanguages: safeTemplateKeys,
            languageId: safeTemplateKeys.includes(languageId) ? languageId : safeTemplateKeys[0]
        };
    };

    // Use local state to prevent stale closure issues during rapid edits
    const [config, setConfig] = useState<CodingConfig>(() => {
        return normalizeConfig(question.codingConfig);
    });

    // Only sync from props when the question ID changes (e.g. switching questions)
    // This avoids overwriting local progress with stale props during the render loop
    React.useEffect(() => {
        const normalized = normalizeConfig(question.codingConfig);
        setConfig(normalized);
        if (!normalized.templates[activeLang]) {
            setActiveLang(normalized.languageId || Object.keys(normalized.templates)[0] || 'javascript');
        }
    }, [question.id]);

    const { warning } = useToast();
    const [activeLang, setActiveLang] = useState<string>('javascript');
    const [activeTemplateSection, setActiveTemplateSection] = useState<'head' | 'body' | 'tail' | 'solution'>('body');
    const [expandedTestCase, setExpandedTestCase] = useState<number | null>(null);

    const configRef = React.useRef(config);
    configRef.current = config;

    const updateTemplate = (lang: string, field: 'head' | 'body' | 'tail' | 'solution', value: string) => {
        const prev = configRef.current;
        const currentLangTemplates = prev.templates[lang] || { head: '', body: '', tail: '', solution: '' };
        const newConfig = {
            ...prev,
            templates: {
                ...prev.templates,
                [lang]: { ...currentLangTemplates, [field]: value }
            }
        };
        setConfig(newConfig);
        onChange({ codingConfig: newConfig });
    };

    const toggleLanguageSupport = (langId: string) => {
        const prev = configRef.current;
        const normalizedLangId = normalizeLanguageId(langId);
        const newTemplates = { ...prev.templates };
        if (newTemplates[normalizedLangId]) {
            if (Object.keys(newTemplates).length > 1) {
                delete newTemplates[normalizedLangId];
                if (activeLang === normalizedLangId) setActiveLang(Object.keys(newTemplates)[0]);
            } else {
                warning("At least one language must be enabled.", "Action Required");
                return;
            }
        } else {
            // Add default template
            const langConfig = PLAYGROUND_LANGUAGES.find(l => l.id === normalizedLangId);
            newTemplates[normalizedLangId] = {
                head: langConfig?.header || '',
                body: langConfig?.initialBody || '',
                tail: langConfig?.footer || '',
                solution: ''
            };
            setActiveLang(normalizedLangId);
        }
        const templateKeys = Object.keys(newTemplates);
        const newConfig = {
            ...prev,
            templates: newTemplates,
            allowedLanguages: templateKeys,
            languageId: templateKeys.includes(normalizeLanguageId(prev.languageId)) ? normalizeLanguageId(prev.languageId) : templateKeys[0]
        };
        setConfig(newConfig);
        onChange({ codingConfig: newConfig });
    };

    const addTestCase = () => {
        const prev = configRef.current;
        const newTestCase = { input: "", output: "", isPublic: false, points: 5 };
        const newTestCases = [...(prev.testCases || []), newTestCase];
        const newMarks = newTestCases.reduce((acc, tc) => acc + (tc.points || 0), 0);

        const newConfig = { ...prev, testCases: newTestCases };
        setConfig(newConfig);
        onChange({
            codingConfig: newConfig,
            marks: newMarks
        });
        setExpandedTestCase(newTestCases.length - 1);
    };

    const removeTestCase = (index: number) => {
        const prev = configRef.current;
        const newTestCases = (prev.testCases || []).filter((_, i) => i !== index);
        const newMarks = newTestCases.reduce((acc, tc) => acc + (tc.points || 0), 0);

        const newConfig = { ...prev, testCases: newTestCases };
        setConfig(newConfig);
        onChange({
            codingConfig: newConfig,
            marks: newMarks
        });
        if (expandedTestCase === index) setExpandedTestCase(null);
    };

    const updateTestCase = (index: number, updates: any) => {
        const prev = configRef.current;
        const newTestCases = (prev.testCases || []).map((tc: any, i: number) => i === index ? { ...tc, ...updates } : tc);
        const newMarks = newTestCases.reduce((acc: any, tc: any) => acc + (tc.points || 0), 0);

        const newConfig = { ...prev, testCases: newTestCases };
        setConfig(newConfig);
        onChange({
            codingConfig: newConfig,
            marks: newMarks
        });
    };

    const currentTemplate = config.templates?.[activeLang] || { head: '', body: '', tail: '', solution: '' };

    return (
        <div className="space-y-8">
            {/* Language Configuration Headers */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supported Languages</label>
                    <div className="flex gap-2 items-center flex-wrap justify-end">
                        {Object.keys(config.templates).map(langId => {
                            const lang = PLAYGROUND_LANGUAGES.find(l => l.id === langId);
                            if (!lang) return null;
                            return (
                                <div key={langId} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--brand-light)] border border-[var(--brand-light)] text-[var(--brand-dark)]">
                                    <span>{lang.label}</span>
                                    <button onClick={() => toggleLanguageSupport(langId)} className="hover:text-red-500 transition-colors">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            );
                        })}

                        <div className="relative">
                            <select
                                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-500 hover:border-slate-300 outline-none cursor-pointer transition-all focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        toggleLanguageSupport(e.target.value);
                                        e.target.value = "";
                                    }
                                }}
                                value=""
                            >
                                <option value="" disabled>+ Add Language</option>
                                {PLAYGROUND_LANGUAGES
                                    .filter(lang => !config.templates[lang.id])
                                    .sort((a, b) => a.label.localeCompare(b.label))
                                    .map(lang => (
                                        <option key={lang.id} value={lang.id}>{lang.label}</option>
                                    ))
                                }
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Main Editor Area */}
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    {/* Language Dropdown Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Editing Template:</span>
                            <div className="relative">
                                <select
                                    value={activeLang}
                                    onChange={(e) => setActiveLang(e.target.value)}
                                    className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10 transition-all cursor-pointer shadow-sm"
                                >
                                    {Object.keys(config.templates).map(langSlug => {
                                        const langInfo = PLAYGROUND_LANGUAGES.find(l => l.id === langSlug);
                                        return (
                                            <option key={langSlug} value={langSlug}>
                                                {langInfo?.label || langSlug}
                                            </option>
                                        )
                                    })}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Internal Template Tabs (Head/Body/Tail) */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <TemplateTab active={activeTemplateSection === 'head'} onClick={() => setActiveTemplateSection('head')} label="Header (Hidden)" icon={<Layers size={14} />} />
                                <TemplateTab active={activeTemplateSection === 'body'} onClick={() => setActiveTemplateSection('body')} label="Body (Student)" icon={<Code size={14} />} />
                                <TemplateTab active={activeTemplateSection === 'tail'} onClick={() => setActiveTemplateSection('tail')} label="Footer (Hidden)" icon={<Layers size={14} />} />
                            </div>
                            <div className="h-6 w-[1px] bg-slate-200"></div>
                            <button
                                onClick={() => setActiveTemplateSection('solution')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTemplateSection === 'solution' ? 'bg-green-100 text-green-700 ring-2 ring-green-500/20' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                <CheckCircle2 size={14} /> Solution
                            </button>
                        </div>

                        {/* Code Editor Instance */}
                        <div className="relative group">
                            <CodeMirrorEditor
                                key={`${activeLang}-${activeTemplateSection}`}
                                value={activeTemplateSection === 'solution' ? currentTemplate.solution : currentTemplate[activeTemplateSection]}
                                onChange={(val) => updateTemplate(activeLang, activeTemplateSection, val)}
                                language={activeLang as any}
                                height="400px"
                                theme="dark"
                                placeholder={
                                    activeTemplateSection === 'head' ? '// Libraries, imports, or setup code hidden from students...' :
                                        activeTemplateSection === 'tail' ? '// Testing logic or execution code hidden from students...' :
                                            activeTemplateSection === 'solution' ? '// The correct solution for reference...' :
                                                '// Starter code for students...'
                                }
                            />
                            {/* Visual indicator for hidden sections */}
                            {(activeTemplateSection === 'head' || activeTemplateSection === 'tail') && (
                                <div className="absolute top-4 right-4 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 z-10 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                                    <EyeOff size={12} /> Hidden from Student
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Test Cases */}
            <section className="space-y-6 pt-8 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                            <FlaskConical size={16} className="text-[var(--brand)]" />
                            Test Cases
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">{config.testCases?.length || 0}</span>
                        </h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Total Question Points: <span className="text-[var(--brand)]">{question.marks || 0}</span></p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                const newVal = !config.showTestCases;
                                const newTestCases = (config.testCases || []).map(tc => ({ ...tc, isPublic: newVal }));
                                setConfig(prev => ({ ...prev, showTestCases: newVal, testCases: newTestCases }));
                                onChange({
                                    codingConfig: { ...config, showTestCases: newVal, testCases: newTestCases }
                                });
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all ${config.showTestCases ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                        >
                            {config.showTestCases ? <Eye size={12} /> : <EyeOff size={12} />}
                            <span className="text-[10px] font-black uppercase tracking-widest">{config.showTestCases ? 'Show All' : 'Hide All'}</span>
                        </button>
                        <button
                            onClick={addTestCase}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--brand)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--brand)]/20 transition-all active:scale-95"
                        >
                            <Plus size={14} strokeWidth={3} />
                            Add New Case
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {(config.testCases || []).map((tc: any, index: number) => {
                        const isExpanded = expandedTestCase === index;
                        return (
                            <div key={index} className={`bg-white border transition-all duration-300 rounded-[24px] overflow-hidden ${isExpanded ? 'border-[var(--brand-light)] shadow-xl shadow-[var(--brand)]/10 ring-1 ring-[var(--brand-light)]/20' : 'border-slate-100 hover:border-slate-200'}`}>
                                {/* Header */}
                                <div
                                    onClick={() => setExpandedTestCase(isExpanded ? null : index)}
                                    className="flex items-center justify-between p-4 cursor-pointer bg-slate-50/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${isExpanded ? 'bg-[var(--brand)] text-white' : 'bg-slate-200 text-slate-500'}`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-700">{tc.isPublic ? 'Public Test Case' : 'Hidden Test Case'}</p>
                                            <p className="text-[10px] font-bold text-slate-400">Points: {tc.points}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateTestCase(index, { isPublic: !tc.isPublic });
                                            }}
                                            className={`p-1.5 rounded-lg transition-colors ${tc.isPublic ? 'text-[var(--brand)] hover:bg-[var(--brand-light)]/50' : 'text-slate-400 hover:bg-slate-100'}`}
                                            title={tc.isPublic ? "Make Hidden" : "Make Public"}
                                        >
                                            {tc.isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
                                        </button>
                                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-6 border-t border-slate-100 space-y-6 animate-fade-in">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-wide text-slate-400">Input (stdin)</label>
                                                <textarea
                                                    value={tc.input}
                                                    onChange={(e) => updateTestCase(index, { input: e.target.value })}
                                                    placeholder="Enter input data..."
                                                    className="w-full h-[120px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-700 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10 transition-all resize-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-wide text-slate-400 text-[var(--brand)]">Expected Output (stdout)</label>
                                                <textarea
                                                    value={tc.output}
                                                    onChange={(e) => updateTestCase(index, { output: e.target.value })}
                                                    placeholder="Enter expected output..."
                                                    className="w-full h-[120px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-700 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10 transition-all resize-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-400">Points:</span>
                                                    <input
                                                        type="number"
                                                        value={tc.points}
                                                        onChange={(e) => updateTestCase(index, { points: parseInt(e.target.value) || 0 })}
                                                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[var(--brand-light)]"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => removeTestCase(index)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors text-xs font-black uppercase tracking-widest"
                                            >
                                                <Trash2 size={14} />
                                                Delete Case
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {(!config.testCases || config.testCases.length === 0) && (
                        <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[24px]">
                            <Layout size={32} className="text-slate-200 mx-auto mb-3" />
                            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No test cases defined</p>
                            <button onClick={addTestCase} className="mt-4 text-[var(--brand)] text-xs font-black hover:underline">Add First Case</button>
                        </div>
                    )}
                </div>
            </section>


        </div>
    );
}

function TemplateTab({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-[var(--brand)] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
            {icon} {label}
        </button>
    )
}
