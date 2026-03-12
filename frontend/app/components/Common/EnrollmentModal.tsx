"use client";
import React, { useState, useRef, useEffect } from 'react';
import { siteConfig } from '@/app/config/site';
import { X, UserPlus, Upload, FileText, Download, CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react';
import { TeacherService } from '@/services/api/TeacherService';
import { useToast } from './Toast';
import BulkImportReportModal from './BulkImportReportModal';

interface EnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseTitle: string;
    courseId: string;
    onEnroll: (students: any[]) => void;
}

export default function EnrollmentModal({ isOpen, onClose, courseTitle, courseId, onEnroll }: EnrollmentModalProps) {
    const { success: toastSuccess, error: toastError } = useToast();
    const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'group'>('single');
    const [email, setEmail] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [importReport, setImportReport] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [groups, setGroups] = useState<any[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');

    // Load groups when group tab is active
    useEffect(() => {
        if (isOpen && activeTab === 'group' && groups.length === 0) {
            setGroupsLoading(true);
            TeacherService.getGroups()
                .then(data => setGroups(data))
                .catch(() => toastError('Failed to load groups'))
                .finally(() => setGroupsLoading(false));
        }
    }, [isOpen, activeTab]);

    if (!isOpen) return null;

    if (importReport) {
        return (
            <BulkImportReportModal
                isOpen={!!importReport}
                onClose={() => {
                    setImportReport(null);
                    onClose();
                }}
                report={{
                    summary: {
                        totalProcessed: importReport.summary.total,
                        created: importReport.summary.success,
                        failed: importReport.summary.failed,
                    },
                    details: importReport.details
                }}
            />
        );
    }

    const handleSingleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsProcessing(true);
        setError(null);

        try {
            const result = await TeacherService.enrollByEmails(courseId, [email]);

            // Check success based on summary (backend format)
            if (result.summary && result.summary.enrolled > 0) {
                setSuccess(true);
                onEnroll([{ email }]); // Optimistic update
                toastSuccess(`Student enrolled successfully`);
                setTimeout(() => {
                    setSuccess(false);
                    setEmail('');
                    onClose();
                }, 2000);
            } else {
                // If enrolled is 0, check details for specific error
                const errorMsg = result.details?.[0]?.error || result.message || 'Student not found or already enrolled';
                setError(errorMsg);
                toastError(errorMsg);
            }
        } catch (err) {
            setError('An error occurred during enrollment');
            toastError('Failed to enroll student');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            setError('Please upload a valid CSV file.');
            return;
        }

        setIsProcessing(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n');
            // Assuming CSV format: Name,ID,Email
            const emails = lines.slice(1)
                .map(line => line.split(',')[2]?.trim())
                .filter(email => email && email.includes('@'));

            if (emails.length === 0) {
                setError('No valid email addresses found in CSV.');
                setIsProcessing(false);
                return;
            }

            try {
                const result = await TeacherService.enrollByEmails(courseId, emails);

                if (result.summary) {
                    setImportReport(result);
                    // Use 'enrolled' property from backend summary
                    if (result.summary.enrolled > 0) {
                        const successfulEmails = result.details
                            .filter((d: any) => d.success) // Check boolean success in details
                            .map((d: any) => ({ email: d.email }));
                        onEnroll(successfulEmails);
                    }
                    toastSuccess(`Processed ${result.summary.totalProcessed} students`);
                } else if (result.success) {
                    setSuccess(true);
                    onEnroll(emails.map(e => ({ email: e })));
                    toastSuccess(`Successfully enrolled ${result.count} students`);
                    setTimeout(() => {
                        setSuccess(false);
                        onClose();
                    }, 2000);
                } else {
                    setError(result.message || 'Bulk enrollment failed');
                    toastError(result.message || 'No students were found');
                }
            } catch (err) {
                setError('Failed to process bulk enrollment');
                toastError('Critical error during bulk enrollment');
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    };

    const downloadSampleCSV = () => {
        const content = "Name,Student ID,Email\nJohn Doe,STU001,john@example.com\nJane Smith,STU002,jane@example.com";
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_enrollment.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl overflow-hidden animate-zoom-in">

                {/* Header */}
                <div className="px-8 pt-8 pb-6 bg-white border-b border-slate-50">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[var(--brand-light)] flex items-center justify-center text-[var(--brand)]">
                                <UserPlus size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Enroll Students</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{courseTitle}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-6 p-1 bg-slate-50 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('single')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'single' ? 'bg-white text-[var(--brand)] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <FileText size={14} />
                            Custom Add
                        </button>
                        <button
                            onClick={() => setActiveTab('bulk')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'bulk' ? 'bg-white text-[var(--brand)] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Upload size={14} />
                            Bulk Enroll
                        </button>
                        <button
                            onClick={() => setActiveTab('group')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'group' ? 'bg-white text-[var(--brand)] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Users size={14} />
                            By Group
                        </button>
                    </div>
                </div>

                <div className="p-8">
                    {success ? (
                        <div className="py-8 flex flex-col items-center text-center animate-fade-in">
                            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 mb-2">Enrollment Successful!</h3>
                            <p className="text-sm text-slate-500 font-medium">Students have been enrolled in {courseTitle}.</p>
                        </div>
                    ) : (
                        <div className="min-h-[220px]">
                            {activeTab === 'single' && (
                                <form onSubmit={handleSingleEnroll} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Email Address</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="e.g., student@university.edu"
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-[var(--brand)] transition-all placeholder:text-slate-300"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isProcessing || !email}
                                        className="w-full py-4 bg-[var(--brand)] text-white font-black text-sm rounded-2xl shadow-lg shadow-[var(--brand)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        {isProcessing ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 size={18} className="animate-spin" />
                                                Processing...
                                            </div>
                                        ) : "Enroll Student"}
                                    </button>
                                </form>
                            )}
                            {activeTab === 'bulk' && (
                                <div className="space-y-6">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-100 rounded-[24px] bg-slate-50/50 p-10 flex flex-col items-center text-center cursor-pointer hover:border-[var(--brand-light)] hover:bg-slate-50 transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[var(--brand)] transition-colors mb-4">
                                            <Upload size={24} />
                                        </div>
                                        <p className="text-sm font-black text-slate-800 mb-1">Upload CSV File</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Click or drag and drop your file</p>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            accept=".csv"
                                            className="hidden"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-[var(--brand-light)] rounded-2xl border border-[var(--brand-light)]">
                                        <div className="flex items-center gap-3 text-[var(--brand)]">
                                            <Download size={18} />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Need guidance?</p>
                                                <p className="text-xs font-bold opacity-80">Download our sample CSV format</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={downloadSampleCSV}
                                            className="px-4 py-2 bg-white text-[var(--brand)] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 border border-[var(--brand-light)]"
                                        >
                                            Download
                                        </button>
                                    </div>

                                    {error && (
                                        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl flex items-center gap-3 animate-shake">
                                            <AlertCircle size={18} />
                                            <p className="text-xs font-bold">{error}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'group' && (
                                <div className="space-y-6">
                                    {groupsLoading ? (
                                        <div className="py-12 flex items-center justify-center">
                                            <Loader2 size={24} className="animate-spin text-slate-300" />
                                        </div>
                                    ) : groups.length === 0 ? (
                                        <div className="py-10 text-center">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                                                <Users size={24} className="text-slate-300" />
                                            </div>
                                            <p className="text-sm font-black text-slate-700 mb-1">No Groups Yet</p>
                                            <p className="text-xs font-bold text-slate-400">Create groups first in the Students &amp; Groups page.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select a Group</label>
                                                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    {groups.map(g => (
                                                        <button
                                                            key={g.id}
                                                            onClick={() => setSelectedGroupId(g.id)}
                                                            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${
                                                                selectedGroupId === g.id
                                                                    ? 'bg-[var(--brand-light)] border-[var(--brand)] text-[var(--brand-dark)]'
                                                                    : 'bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-700'
                                                            }`}
                                                        >
                                                            <span className="text-sm font-black">{g.name}</span>
                                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                                                {g._count?.students || g.students?.length || 0} students
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (!selectedGroupId) return;
                                                    setIsProcessing(true);
                                                    setError(null);
                                                    try {
                                                        const result = await TeacherService.enrollGroupInCourse(courseId, selectedGroupId);
                                                        setSuccess(true);
                                                        const enrolledCount = result?.enrolledCount || result?.summary?.enrolled || 0;
                                                        toastSuccess(`Group enrolled — ${enrolledCount} student(s) added`);
                                                        onEnroll([]);
                                                        setTimeout(() => {
                                                            setSuccess(false);
                                                            setSelectedGroupId('');
                                                            onClose();
                                                        }, 2000);
                                                    } catch (err: any) {
                                                        const msg = err?.message || 'Failed to enroll group';
                                                        setError(msg);
                                                        toastError(msg);
                                                    } finally {
                                                        setIsProcessing(false);
                                                    }
                                                }}
                                                disabled={isProcessing || !selectedGroupId}
                                                className="w-full py-4 bg-[var(--brand)] text-white font-black text-sm rounded-2xl shadow-lg shadow-[var(--brand)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                                            >
                                                {isProcessing ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Loader2 size={18} className="animate-spin" />
                                                        Enrolling Group...
                                                    </div>
                                                ) : "Enroll Entire Group"}
                                            </button>
                                            {error && (
                                                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl flex items-center gap-3 animate-shake">
                                                    <AlertCircle size={18} />
                                                    <p className="text-xs font-bold">{error}</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Tip */}
                <div className="px-8 py-4 bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                    Secure Student Data Management • {siteConfig.name} Authoring
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes zoom-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                .animate-zoom-in { animation: zoom-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .animate-shake { animation: shake 0.4s ease-in-out; }
            `}</style>
        </div>
    );
}
