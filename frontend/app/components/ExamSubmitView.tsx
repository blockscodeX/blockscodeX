"use client";
import React, { useState } from 'react';

interface ExamSubmitViewProps {
    sections: any[];
    currentSectionId: string;
    onClose?: () => void;
    onSubmitSection: (sectionId: string) => void;
    onSubmitExam: (code: string) => void;
    onQuestionClick?: (sectionId: string, questionId: string) => void;
}

export default function ExamSubmitView({ sections, currentSectionId, onClose, onSubmitSection, onSubmitExam, onQuestionClick }: ExamSubmitViewProps) {
    const [sectionCode, setSectionCode] = useState("");
    const [examCode, setExamCode] = useState("");
    const [sectionConfirm, setSectionConfirm] = useState("");
    const [examConfirm, setExamConfirm] = useState("");

    const activeSection = sections.find(s => s.id === currentSectionId);

    React.useEffect(() => {
        const genCode = () => Math.floor(1000 + Math.random() * 9000).toString();
        setSectionConfirm(genCode());
        setExamConfirm(genCode());
    }, [currentSectionId]);

    const handleSectionSubmit = () => {
        if (sectionCode !== sectionConfirm) return;
        onSubmitSection(currentSectionId);
        setSectionCode(""); // Reset after submit
    };

    const handleExamSubmit = () => {
        if (examCode !== examConfirm) return;
        onSubmitExam(examCode);
    };

    return (
        <div className="w-full h-full bg-slate-50 flex flex-col font-sans overflow-hidden relative animate-in fade-in duration-300">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-32 bg-slate-100/50 -z-10 origin-top-left transform" />

            {/* Scrollable Content */}
            <div className="flex-1 w-full overflow-y-auto no-scrollbar pt-10 pb-20">
                <div className="max-w-5xl w-full mx-auto px-6 space-y-8">
                    {/* Sections List */}
                    <div className="space-y-6">
                        {sections.map((section, idx) => {
                            const isCurrent = section.id === currentSectionId;
                            const isSubmitted = section.status === 'submitted';
                            const isLocked = section.status === 'locked';
                            const isActuallyLocked = isLocked || isSubmitted;

                            return (
                                <div
                                    key={section.id}
                                    className={`
                                        relative rounded-2xl border transition-all duration-300 overflow-hidden
                                        ${isCurrent ? 'bg-white border-indigo-100 shadow-xl shadow-indigo-500/5 ring-1 ring-indigo-500/20 z-10' : ''}
                                        ${isActuallyLocked ? 'bg-slate-50 border-slate-200 opacity-60 grayscale' : 'bg-white border-slate-200'}
                                    `}
                                >
                                    {/* Section Header Row */}
                                    <div className={`px-8 py-6 flex flex-wrap items-center justify-between gap-4`}>
                                        <div className="flex items-center gap-6">
                                            <div className={`
                                                w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm
                                                ${isCurrent ? 'bg-indigo-600 text-white shadow-indigo-200' : ''}
                                                ${isActuallyLocked ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 text-slate-500'}
                                            `}>
                                                {isActuallyLocked ? (
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                ) : (
                                                    idx + 1
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1.5">
                                                    <h3 className={`font-black text-2xl tracking-tight ${isCurrent ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                        {section.title}
                                                    </h3>
                                                    {isCurrent && !isSubmitted && (
                                                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                                                            Active
                                                        </span>
                                                    )}
                                                    {isActuallyLocked && !isSubmitted && (
                                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider border border-slate-200">
                                                            Locked
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400 font-semibold tracking-wide">
                                                    {section.questions.filter((q: any) => q.status === 'answered' || q.status === 'review').length} / {section.questions.length} Questions Attempted
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action Input for Active Section (only if not submitted) */}
                                        {isCurrent && !isSubmitted && (
                                            <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200 ml-auto">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmation Code</span>
                                                    <span className="text-lg font-black text-indigo-600 leading-none">{sectionConfirm}</span>
                                                </div>
                                                <div className="h-10 w-px bg-slate-200 mx-1"></div>
                                                <input
                                                    type="text"
                                                    maxLength={4}
                                                    value={sectionCode}
                                                    onChange={(e) => setSectionCode(e.target.value)}
                                                    placeholder="####"
                                                    className="w-24 h-11 bg-white border border-slate-200 rounded-xl text-center font-mono text-xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:font-bold placeholder:text-slate-300"
                                                />
                                                <button
                                                    onClick={handleSectionSubmit}
                                                    disabled={sectionCode !== sectionConfirm}
                                                    className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-200 disabled:shadow-none"
                                                >
                                                    Submit Section
                                                </button>
                                            </div>
                                        )}

                                        {/* Submitted Badge for Submitted Sections */}
                                        {isSubmitted && (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl ml-auto">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                </svg>
                                                <span className="text-sm font-black text-emerald-600 uppercase tracking-wide">Submitted</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Expanded Content (Questions Breakdown - Only for Active and Not Submitted) */}
                                    {isCurrent && !isSubmitted && (
                                        <div className="px-8 pb-8 pt-2">
                                            <div className="w-full h-px bg-slate-100 mb-6" />

                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                Questions Breakdown
                                            </h4>

                                            {/* Horizontal Scrollable Row for Cards */}
                                            <div className="flex flex-row overflow-x-auto gap-3 pb-4 no-scrollbar">
                                                {section.questions.map((q: any) => {
                                                    let statusColor = "bg-slate-50 border-slate-200 text-slate-400";
                                                    let statusLabel = "Unanswered";

                                                    if (q.status === 'answered') {
                                                        statusColor = "bg-emerald-50 border-emerald-100 text-emerald-600";
                                                        statusLabel = "Answered";
                                                    }
                                                    if (q.status === 'review') {
                                                        statusColor = "bg-amber-50 border-amber-100 text-amber-600";
                                                        statusLabel = "Review";
                                                    }
                                                    if (q.status === 'current') {
                                                        statusColor = "bg-indigo-50 border-indigo-100 text-indigo-600";
                                                        statusLabel = "Active";
                                                    }

                                                    return (
                                                        <div
                                                            key={q.id}
                                                            className={`
                                                                flex-shrink-0 flex flex-col items-center gap-2 p-4 min-w-[100px] rounded-2xl border ${statusColor}
                                                                transition-all hover:scale-[1.02] cursor-pointer active:scale-95
                                                            `}
                                                            onClick={() => onQuestionClick?.(section.id, q.id)}
                                                        >
                                                            <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center text-sm font-black border border-black/5">
                                                                {q.number}
                                                            </div>
                                                            <span className="text-[9px] font-black uppercase tracking-wider">{statusLabel}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Final Submission Card - Minimalist Version */}
                    <div className="bg-white rounded-3xl p-10 mt-12 border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="max-w-md">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Final Exam Submission</h2>
                                <p className="text-slate-500 font-medium leading-relaxed text-sm">
                                    Once you submit the final exam, you will not be able to return to any questions.
                                    Make sure you have reviewed all sections.
                                </p>
                            </div>

                            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200 self-start md:self-center">
                                <div className="flex flex-col items-center px-4 border-r border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Final Code</span>
                                    <span className="text-lg font-black text-slate-900 leading-none">{examConfirm}</span>
                                </div>
                                <input
                                    type="text"
                                    maxLength={4}
                                    value={examCode}
                                    onChange={(e) => setExamCode(e.target.value)}
                                    placeholder="####"
                                    className="w-24 h-11 bg-white border border-slate-200 rounded-xl text-center font-mono text-xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-200"
                                />
                                <button
                                    onClick={handleExamSubmit}
                                    disabled={examCode !== examConfirm}
                                    className="h-11 px-8 bg-slate-900 hover:bg-black disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-sm"
                                >
                                    Finish Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
