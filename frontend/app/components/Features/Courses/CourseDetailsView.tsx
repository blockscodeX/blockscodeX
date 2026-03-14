"use client";
import React, { useState } from 'react';
import { X, Users, BookOpen, Clock, BarChart3 } from 'lucide-react';

interface CourseDetailsViewProps {
    isOpen: boolean;
    onClose: () => void;
    course: {
        title: string;
        slug: string;
        studentsCount: number;
        status: string;
        lastUpdated: string;
        // Optional extended props
        teacher?: string;
        modules?: number;
    } | null;
    userRole?: 'admin' | 'teacher';
}

export default function CourseDetailsView({ isOpen, onClose, course, userRole = 'teacher' }: CourseDetailsViewProps) {
    const [activeTab] = useState<'overview'>('overview');

    if (!isOpen || !course) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-zoom-in h-[85vh] flex flex-col">

                {/* Header Section */}
                <div className="px-10 pt-10 pb-6 bg-white border-b border-slate-50 shrink-0">
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-[24px] bg-[var(--brand)] flex items-center justify-center text-white shadow-xl shadow-[var(--brand)]/20">
                                <BookOpen size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">{course.title}</h2>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${course.status === 'Published' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {course.status}
                                    </span>
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                        Last Updated {course.lastUpdated}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-all hover:rotate-90">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Stats/Quick Actions */}
                    <div className="flex items-center gap-12 mb-8">
                        <StatItem icon={<Users size={18} />} label="Enrolled" value={course.studentsCount.toString()} color="brand" />
                        <StatItem icon={<BarChart3 size={18} />} label="Completion" value="78%" color="emerald" />
                        <StatItem icon={<Clock size={18} />} label="Avg. Time" value="12h 45m" color="amber" />
                    </div>

                </div>

                {/* Body Section */}
                <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
                    {activeTab === 'overview' ? (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-2 gap-6">
                                <InfoCard title="Module Description" content="This comprehensive module covers the full spectrum of full-stack development, from modern frontend frameworks like React to robust backend architectures with Node.js and SQL." />
                                <InfoCard title="Technical Stack" content="React, Node.js, Express, MySQL, TailwindCSS, TypeScript" />
                            </div>
                        </div>
                    ) : (
                        <></>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes zoom-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                .animate-zoom-in { animation: zoom-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
            `}</style>
        </div>
    );
}

function StatItem({ icon, label, value, color }: { icon: any, label: string, value: string, color: 'brand' | 'emerald' | 'amber' }) {
    const colors = {
        brand: 'text-[var(--brand)] bg-[var(--brand-light)]',
        emerald: 'text-emerald-600 bg-emerald-50',
        amber: 'text-amber-600 bg-amber-50',
    };
    return (
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-lg font-black text-slate-800 leading-none">{value}</p>
            </div>
        </div>
    );
}

function InfoCard({ title, content }: { title: string, content: string }) {
    return (
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{title}</h4>
            <p className="text-sm font-bold text-slate-600 leading-relaxed">{content}</p>
        </div>
    );
}
