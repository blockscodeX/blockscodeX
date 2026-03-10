"use client";
import React from 'react';
import { Sparkles, Target, BarChart3, ChevronDown } from 'lucide-react';
import { Question } from '../types';
import RichTextEditor from '../RichTextEditor';
import MCQEditor from './modules/MCQEditor';
import CodingEditor from './modules/CodingEditor';
import WebEditor from './modules/WebEditor';
import ReadingEditor from './modules/ReadingEditor';
import NotebookEditor from './modules/NotebookEditor';

interface QuestionBuilderProps {
    question: Question;
    onChange: (updates: Partial<Question>) => void;
}

export default function QuestionBuilder({ question, onChange }: QuestionBuilderProps) {
    return (
        <div className="flex-1 overflow-y-auto no-scrollbar p-10 bg-white">
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header: Meta Info */}
                <div className="flex items-start justify-between gap-8">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-[var(--brand-light)] text-[var(--brand)] rounded-lg text-[10px] font-black uppercase tracking-widest border border-[var(--brand-light)] italic">
                                {question.type} Editor
                            </span>
                            <span className="text-slate-200">/</span>
                            <input
                                type="text"
                                value={question.title}
                                onChange={(e) => onChange({ title: e.target.value })}
                                className="text-2xl font-black text-slate-800 outline-none placeholder:text-slate-200 border-b-2 border-transparent focus:border-[var(--brand)] transition-all flex-1"
                                placeholder="Question Title..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <MetaField
                            label="Points"
                            icon={<Target size={14} />}
                            value={question.marks}
                            onChange={(val) => onChange({ marks: parseInt(val) || 0 })}
                            readOnly={question.type === 'Coding'}
                        />
                        <div className="flex flex-col gap-1.5">
                            <select
                                value={question.difficulty}
                                onChange={(e) => onChange({ difficulty: e.target.value as any })}
                                className="h-10 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 outline-none focus:border-[var(--brand-light)] focus:ring-4 focus:ring-[var(--brand)]/5 transition-all appearance-none cursor-pointer pr-10 relative"
                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\' stroke-width=\'2\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                            >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                            </select>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter text-center">Difficulty</span>
                        </div>
                    </div>
                </div>

                {/* Problem Statement (Hidden for Reading) */}
                {question.type !== 'Reading' && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Problem Statement</h3>
                        </div>
                        <RichTextEditor
                            content={question.problemStatement}
                            onChange={(val) => onChange({ problemStatement: val })}
                        />
                    </section>
                )}

                {/* Dynamic Editor Module */}
                <section className="pt-8 border-t border-slate-50">
                    {renderEditorModule(question, onChange)}
                </section>

            </div>
        </div>
    );
}

function renderEditorModule(question: Question, onChange: (updates: Partial<Question>) => void) {
    switch (question.type) {
        case 'MCQ':
        case 'MultiSelect':
            return <MCQEditor question={question} onChange={onChange} />;
        case 'Coding':
            return <CodingEditor question={question} onChange={onChange} />;
        case 'Web':
            return <WebEditor question={question} onChange={onChange} />;
        case 'Reading':
        case 'Descriptive':
            return <ReadingEditor question={question} onChange={onChange} />;
        case 'Notebook':
            return <NotebookEditor question={question} onChange={onChange} />;
        default:
            return (
                <div className="text-center py-20 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                    <p className="text-sm font-black text-slate-300 uppercase tracking-widest italic">
                        {question.type} Module Coming Soon
                    </p>
                </div>
            );
    }
}

function MetaField({ label, icon, value, onChange, readOnly }: { label: string, icon: any, value: any, onChange: (val: string) => void, readOnly?: boolean }) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className={`flex items-center gap-2 px-3 h-10 bg-slate-50 border border-slate-100 rounded-xl transition-all ${readOnly ? 'opacity-60 grayscale cursor-not-allowed' : 'focus-within:border-[var(--brand-light)] focus-within:ring-4 focus-within:ring-[var(--brand)]/5'}`}>
                <span className="text-slate-400">{icon}</span>
                <input
                    type="number"
                    value={value}
                    onChange={(e) => !readOnly && onChange(e.target.value)}
                    readOnly={readOnly}
                    className={`w-12 bg-transparent text-xs font-black text-slate-700 outline-none ${readOnly ? 'cursor-not-allowed' : ''}`}
                    placeholder="0"
                />
            </div>
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter text-center">{label}</span>
        </div>
    )
}
