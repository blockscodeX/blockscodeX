import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ChevronRight, Loader2, BookOpen, Clock, Target, CheckCircle2 } from 'lucide-react';
import { TeacherService } from '@/services/api/TeacherService';
import { useToast } from '../Common/Toast';

interface AiExamBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerateFull: (data: { title: string, description: string, sections: any[], isVisible?: boolean }, tokenUsage: any) => void;
}

export default function AiExamBuilderModal({ isOpen, onClose, onGenerateFull }: AiExamBuilderModalProps) {
    const { success, error } = useToast();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [outline, setOutline] = useState<any>(null);

    // Existing Courses for Context
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');

    const [config, setConfig] = useState({
        title: '',
        description: '',
        numSections: 2
    });

    const [sectionConfigs, setSectionConfigs] = useState(
        Array.from({ length: 2 }).map(() => ({
            difficulty: 'Intermediate',
            questionsCount: 5,
            allowedTypes: ['MCQ', 'Coding', 'Notebook']
        }))
    );

    const typeOptions = ['MCQ', 'MultiSelect', 'Coding', 'Web', 'Notebook'];

    // Auto-sync section configs when numSections changes
    useEffect(() => {
        setSectionConfigs(prev => {
            const newCount = config.numSections;
            if (newCount === prev.length) return prev;
            if (newCount < prev.length) return prev.slice(0, newCount);

            const additions = Array.from({ length: newCount - prev.length }).map(() => ({
                difficulty: 'Intermediate',
                questionsCount: 5,
                allowedTypes: ['MCQ', 'Coding', 'Notebook']
            }));
            return [...prev, ...additions];
        });
    }, [config.numSections]);

    const [tokenUsage, setTokenUsage] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            TeacherService.getCourses().then(res => setCourses(res.data || res)).catch(console.error);
        }
    }, [isOpen]);

    const handleGenerateOutline = async () => {
        if (!config.title || !config.description) {
            error("Please provide a title and description");
            return;
        }

        setIsLoading(true);
        try {
            let courseSummary = undefined;
            if (selectedCourseId) {
                const selectedCourse = courses.find(c => c.id === selectedCourseId);
                courseSummary = selectedCourse?.courseSummary;
            }

            const res = await TeacherService.generateExamOutline({
                ...config,
                sectionConfigs,
                courseSummary
            });
            setOutline(res.result);
            setStep(2);
            success("Outline generated successfully!");
        } catch (e: any) {
            error(e.message || "Failed to generate outline");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateFull = async () => {
        setIsLoading(true);
        try {
            let courseSummary = undefined;
            if (selectedCourseId) {
                const selectedCourse = courses.find(c => c.id === selectedCourseId);
                courseSummary = selectedCourse?.courseSummary;
            }

            const res = await TeacherService.generateExamFull({
                title: config.title,
                description: config.description,
                outline,
                courseSummary
            });
            setTokenUsage(res.tokenUsage);
            setStep(3);
            onGenerateFull({
                title: config.title,
                description: config.description,
                sections: res.result.sections,
                isVisible: false // strictly set to off by default
            }, res.tokenUsage);
            success("Full exam generated successfully!");
        } catch (e: any) {
            error(e.message || "Failed to generate full exam");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-4xl max-h-[85vh] bg-white rounded-3xl shadow-2xl z-50 flex flex-col border border-slate-100/50 mt-4 overflow-hidden"
                    >
                        {/* Ambient Background Glows */}
                        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[var(--brand)]/5 to-transparent pointer-events-none" />
                        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--brand)]/10 blur-3xl rounded-full pointer-events-none" />
                        <div className="absolute top-1/2 -left-20 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
                        {/* Ambient Background Glows */}
                        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[var(--brand)]/5 to-transparent pointer-events-none" />
                        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--brand)]/10 blur-3xl rounded-full pointer-events-none" />
                        <div className="absolute top-1/2 -left-20 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-[var(--brand-light)]/20 to-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--brand)] text-white flex items-center justify-center shadow-lg shadow-[var(--brand)]/30">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight">AI Exam Generator</h2>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1 bg-slate-100 w-full relative">
                            <motion.div
                                className="absolute left-0 top-0 bottom-0 bg-[var(--brand)]"
                                animate={{ width: `${(step / 3) * 100}%` }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                            />
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar relative min-h-[400px]">
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center shrink-0">
                                    <Loader2 size={40} className="text-[var(--brand)] animate-spin mb-4" />
                                    <p className="text-sm font-black uppercase tracking-widest text-slate-600">Generating AI Content...</p>
                                    <p className="text-xs text-slate-400 font-medium mt-2 max-w-sm text-center">This may take a minute as we craft a customized, highly-detailed assessment specifically for you.</p>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
                                    <div className="text-center mb-8">
                                        <h3 className="text-2xl font-black text-slate-800">What do you want to test?</h3>
                                        <p className="text-slate-500 text-sm mt-2">Design an exam outline with context-aware AI generation.</p>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Context Injection Area */}
                                        <div className="p-4 bg-[var(--brand-light)]/20 rounded-2xl border border-[var(--brand-light)]/50 space-y-3">
                                            <div className="flex items-center gap-2 text-[var(--brand-dark)]">
                                                <BookOpen size={16} />
                                                <span className="text-[11px] font-black uppercase tracking-widest">Base on Existing Course (Optional)</span>
                                            </div>
                                            <select
                                                value={selectedCourseId}
                                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                                className="w-full px-4 py-2 bg-white/60 backdrop-blur border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 transition-all shadow-sm appearance-none cursor-pointer"
                                            >
                                                <option value="">-- No Context (Generate Freely) --</option>
                                                {courses.map(c => (
                                                    <option key={c.id} value={c.id}>{c.title}</option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                If selected, the AI will pull the `courseSummary` for this course and generate questions strictly based on its syllabus.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exam Topic / Title</label>
                                            <input
                                                type="text"
                                                value={config.title}
                                                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                                                placeholder="e.g. Midterm: Data Structures"
                                                className="w-full px-5 py-3.5 bg-white/60 backdrop-blur border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 transition-all placeholder:font-medium shadow-sm"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Details & Focus Areas</label>
                                            <textarea
                                                value={config.description}
                                                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                                                placeholder="Describe the specific areas you want this exam to focus on..."
                                                rows={3}
                                                className="w-full px-5 py-3.5 bg-white/60 backdrop-blur border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 transition-all resize-none shadow-sm"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Sections</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    value={config.numSections}
                                                    onChange={(e) => setConfig({ ...config, numSections: parseInt(e.target.value) || 1 })}
                                                    className="w-full px-5 py-3.5 bg-white/60 backdrop-blur border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Per-Section Configurations */}
                                        <div className="space-y-4 mt-6">
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                <h4 className="text-sm font-black text-slate-800">Section Configurations</h4>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand)] bg-[var(--brand-light)]/20 px-2 py-1 rounded-md">{config.numSections} Sections Total</span>
                                            </div>

                                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                                                {sectionConfigs.map((sec, idx) => (
                                                    <div key={idx} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-6 h-6 rounded-md bg-slate-200 text-slate-600 flex items-center justify-center font-black text-xs shrink-0">
                                                                {String.fromCharCode(65 + idx)}
                                                            </div>
                                                            <h5 className="font-bold text-sm text-slate-700">Section {String.fromCharCode(65 + idx)}</h5>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Questions</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="20"
                                                                    value={sec.questionsCount}
                                                                    onChange={(e) => {
                                                                        const count = parseInt(e.target.value) || 1;
                                                                        const updated = [...sectionConfigs];
                                                                        updated[idx].questionsCount = count;
                                                                        setSectionConfigs(updated);
                                                                    }}
                                                                    className="w-full px-4 py-2 bg-white/60 backdrop-blur border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 transition-all shadow-sm"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Difficulty</label>
                                                                <select
                                                                    value={sec.difficulty}
                                                                    onChange={(e) => {
                                                                        const updated = [...sectionConfigs];
                                                                        updated[idx].difficulty = e.target.value;
                                                                        setSectionConfigs(updated);
                                                                    }}
                                                                    className="w-full px-4 py-2 bg-white/60 backdrop-blur border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 transition-all shadow-sm appearance-none"
                                                                >
                                                                    <option>Beginner</option>
                                                                    <option>Intermediate</option>
                                                                    <option>Advanced</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allowed Question Types</label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {typeOptions.map(type => (
                                                                    <button
                                                                        key={type}
                                                                        onClick={() => {
                                                                            const updated = [...sectionConfigs];
                                                                            if (sec.allowedTypes.includes(type)) {
                                                                                updated[idx].allowedTypes = sec.allowedTypes.filter(t => t !== type);
                                                                            } else {
                                                                                updated[idx].allowedTypes = [...sec.allowedTypes, type];
                                                                            }
                                                                            setSectionConfigs(updated);
                                                                        }}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${sec.allowedTypes.includes(type) ? 'bg-[var(--brand)] text-white border-[var(--brand)] shadow-md shadow-[var(--brand)]/20' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                                                    >
                                                                        {type}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && outline && (
                                <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-right-8 duration-300">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800">Review Exam Outline</h3>
                                            <p className="text-slate-500 text-sm mt-1">Review the proposed structure before we generate the full assessment.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {outline.sections.map((section: any, idx: number) => (
                                            <div key={idx} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-base">{section.title}</h4>
                                                    </div>
                                                </div>

                                                <div className="pl-12 space-y-2">
                                                    {section.questions.map((q: any, qIdx: number) => (
                                                        <div key={qIdx} className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm">
                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shrink-0 ${q.type === 'Coding' || q.type === 'Notebook' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                {q.type}
                                                            </span>
                                                            <span className="text-sm font-semibold text-slate-700 truncate flex-1">{q.title}</span>
                                                            <span className="text-xs font-black text-slate-400">{q.marks} pts</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 3 && tokenUsage && (
                                <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto h-full animate-in fade-in zoom-in-95 duration-500 pt-10">
                                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-2">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-slate-800">Generation Complete</h3>
                                        <p className="text-slate-500 text-sm mt-2 font-medium">Your exam questions have been fully crafted.</p>
                                    </div>

                                    <div className="w-full bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analytics & Usage</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-50">
                                                <p className="text-xs text-slate-500 font-bold">Prompt Tokens</p>
                                                <p className="text-lg font-black text-slate-800 mt-1">{tokenUsage.promptTokens}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-50">
                                                <p className="text-xs text-slate-500 font-bold">Completion</p>
                                                <p className="text-lg font-black text-slate-800 mt-1">{tokenUsage.completionTokens}</p>
                                            </div>
                                        </div>
                                        <div className="bg-[var(--brand-light)]/20 p-3 rounded-xl border border-[var(--brand-light)]/40 flex items-center justify-between">
                                            <span className="text-xs text-[var(--brand-dark)] font-bold">Total Tokens Sent</span>
                                            <span className="text-lg font-black text-[var(--brand)]">{tokenUsage.totalTokens}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between mt-auto shrink-0">
                            {step === 1 ? (
                                <>
                                    <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                                    <button
                                        onClick={handleGenerateOutline}
                                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[var(--brand)] text-white text-sm font-black shadow-lg shadow-[var(--brand)]/20 hover:scale-105 active:scale-95 transition-all outline-none"
                                    >
                                        Generate Outline <ChevronRight size={18} />
                                    </button>
                                </>
                            ) : step === 2 ? (
                                <>
                                    <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all">Back</button>
                                    <button
                                        onClick={handleGenerateFull}
                                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[var(--brand)] text-white text-sm font-black shadow-lg shadow-[var(--brand)]/20 hover:scale-105 active:scale-95 transition-all outline-none"
                                    >
                                        <Sparkles size={16} /> Generate Full Exam
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={onClose}
                                    className="w-full flex justify-center items-center gap-2 px-8 py-3 rounded-xl bg-slate-900 text-white text-sm font-black shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all outline-none"
                                >
                                    Return to Builder
                                </button>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
