"use client";
import React, { useState } from "react";
import { Share2, Globe, Target, Clock, Shield, Copy, Layout, X } from "lucide-react";
import { siteConfig } from "@/app/config/site";
import AlertModal from "@/app/components/Common/AlertModal";

interface ExamDetailsModalProps {
    exam: any;
    onClose: () => void;
    userRole?: 'admin' | 'teacher';
}

export default function ExamDetailsModal({ exam, onClose, userRole = 'teacher' }: ExamDetailsModalProps) {
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, type?: 'danger' | 'warning' | 'info' }>({ isOpen: false, title: '', message: '' });

    if (!exam) return null;

    const brandColor = '#fc751b';
    const brandLightClass = 'bg-[var(--brand-light)] text-[var(--brand)] border-[var(--brand-light)]';
    const brandTextClass = 'text-[var(--brand)]';

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-3xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-zoom-in">
                {/* Modal Header */}
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${brandLightClass}`}>
                                Exam Details
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${exam.status === 'Published' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : exam.status === 'Monitor' || exam.status === 'Live' ? brandLightClass : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                {exam.status}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{exam.title}</h2>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{exam.module}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                    {/* Links Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailCard
                            icon={<Globe size={18} />}
                            label="Public Exam URL"
                            value={`${siteConfig.domain}/exam/${exam.slug}`}
                            type="link"
                            onAlert={setAlertConfig}
                            brandTextClass={brandTextClass}
                        />
                        <DetailCard
                            icon={<Share2 size={18} />}
                            label="Invite Link"
                            value={`${siteConfig.domain}/invite/${exam.inviteToken}`}
                            type="link"
                            onAlert={setAlertConfig}
                            brandTextClass={brandTextClass}
                        />
                    </div>

                    {/* Security & Access */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Security & Access Control</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SecurityPill
                                icon={<Shield size={16} />}
                                label="Exam Mode"
                                value={exam.examMode}
                                sub={exam.examMode === 'App' ? 'Electron Secure' : 'Web Browser'}
                                brandTextClass={brandTextClass}
                            />
                            <SecurityPill
                                icon={<Target size={16} />}
                                label="Test Code"
                                value={exam.testCode}
                                sub={exam.testCodeType === 'Rotating' && exam.rotationInterval
                                    ? `Rotates every ${exam.rotationInterval} min`
                                    : exam.testCodeType}
                                brandTextClass={brandTextClass}
                            />
                            <SecurityPill
                                icon={<Layout size={16} />}
                                label="Tab Limits"
                                value={exam.tabSwitchLimit || 'None'}
                                sub="Switch Attempts"
                                brandTextClass={brandTextClass}
                            />
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                                    <Target size={14} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allowed IP Addresses</p>
                                    <p className="text-xs font-bold text-slate-700">{exam.allowedIPs}</p>
                                </div>
                            </div>
                            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                Active
                            </div>
                        </div>
                    </div>

                    {/* Assessment Metadata */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-100 p-6 rounded-[32px] space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Assessment Info</h4>
                            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                <span className="text-xs font-bold text-slate-400">Total Questions</span>
                                <span className="text-sm font-black text-slate-800">{Array.isArray(exam.questions) ? exam.questions.length : 0} Items</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                <span className="text-xs font-bold text-slate-400">Time Limit</span>
                                <span className="text-sm font-black text-slate-800">{exam.duration} Minutes</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">Total Marks</span>
                                <span className={`text-sm font-black ${brandTextClass}`}>{exam.totalMarks || 100} Points</span>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-100 p-6 rounded-[32px] space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Schedule Window</h4>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-300 uppercase">Starts At</p>
                                    <p className="text-xs font-black text-slate-700">{exam.startTime}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-300 uppercase">Ends At</p>
                                    <p className="text-xs font-black text-slate-700">{exam.endTime}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center">
                            <Shield size={18} className={brandTextClass} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End-to-End Encrypted Session</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                        Dismiss
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes zoom-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                .animate-zoom-in { animation: zoom-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
            `}</style>

            <AlertModal
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type || "info"}
                confirmLabel="Close"
                onConfirm={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                onCancel={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}

function DetailCard({ icon, label, value, type, onAlert, brandTextClass }: any) {
    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        onAlert({
            isOpen: true,
            title: "Copied!",
            message: "Link has been copied to your clipboard.",
            type: "info"
        });
    }

    return (
        <div className="bg-white border border-slate-100 p-4 rounded-3xl group hover:border-[var(--brand-light)] transition-all flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${brandTextClass.replace('text-', 'bg-').replace('600', '50')} ${brandTextClass}`}>
                        {React.cloneElement(icon, { size: 18 })}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                </div>
                <button
                    onClick={handleCopy}
                    className={`p-1.5 text-slate-300 hover:${brandTextClass} transition-colors`}
                >
                    <Copy size={14} />
                </button>
            </div>
            <p className="text-xs font-black text-slate-700 break-all select-all">{value}</p>
        </div>
    )
}

function SecurityPill({ icon, label, value, sub, brandTextClass }: any) {
    return (
        <div className="bg-white border border-slate-100 p-5 rounded-3xl flex flex-col gap-1 items-start shadow-sm group hover:border-[var(--brand-light)] transition-all">
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:${brandTextClass} transition-colors`}>
                    {icon}
                </div>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{label}</span>
            </div>
            <p className="text-base font-black text-slate-800 leading-none">{value}</p>
            <p className={`text-[8px] font-bold ${brandTextClass.replace('text-', 'text-').replace('600', '500')} uppercase tracking-tighter mt-1`}>{sub}</p>
        </div>
    )
}
