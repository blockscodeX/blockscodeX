"use client";
import React, { useState, useRef } from 'react';
import { siteConfig } from '@/app/config/site';
import { X, UserPlus, Upload, FileText, Download, CheckCircle2, AlertCircle, Loader2, Shield, Copy, Check } from 'lucide-react';
import { AdminService } from '@/services/api/AdminService';
import { useToast } from './Toast';
import BulkImportReportModal from './BulkImportReportModal';

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    orgName: string;
    onImport: (users: any[]) => void;
}

export default function UserManagementModal({ isOpen, onClose, orgName, onImport }: UserManagementModalProps) {
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        id: '',
        role: 'Student',
        dept: ''
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [createdPassword, setCreatedPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [importReport, setImportReport] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { success: toastSuccess, error: toastError } = useToast();

    if (!isOpen) return null;


    const handleSingleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setError(null);

        try {
            const result = await AdminService.createUser(formData);
            setCreatedPassword(result.password);
            setSuccess(true);
            toastSuccess("User created successfully");
            onImport([result.user]); // Refresh local list
        } catch (err: any) {
            setError(err.message || "Failed to create user");
            toastError(err.message || "Failed to create user");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
            try {
                const text = event.target?.result as string;
                const lines = text.split('\n');
                // Fields: Name, type-student/teacher/admin, ID, email, department
                const usersToCreate = lines.slice(1).filter(line => line.trim()).map(line => {
                    const [name, type, id, email, department] = line.split(',').map(item => item.trim());
                    return { name, role: type, id, email, dept: department };
                });

                if (usersToCreate.length === 0) {
                    setError('No valid data found in CSV.');
                    setIsProcessing(false);
                    return;
                }

                const results = await AdminService.createUsersBulk(usersToCreate);

                if (results.summary) {
                    const successfulUsers = results.details.filter((r: any) => r.success).map((r: any) => r.user);
                    if (successfulUsers.length > 0) {
                        onImport(successfulUsers);
                    }
                    setImportReport(results);
                } else {
                    const successfulUsers = results.filter((r: any) => r.success).map((r: any) => r.user);
                    const failedCount = results.filter((r: any) => !r.success).length;

                    if (successfulUsers.length > 0) {
                        onImport(successfulUsers);
                        toastSuccess(`Successfully imported ${successfulUsers.length} users.`);
                        if (failedCount > 0) {
                            toastError(`${failedCount} users failed to import (likely already exist).`);
                        }
                        onClose();
                    } else {
                        setError('All users in CSV failed to import. They may already exist.');
                    }
                }
            } catch (err: any) {
                setError(err.message || "Failed to process bulk import");
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    };

    const downloadSampleCSV = () => {
        const content = "Name,Role (Student/Teacher/Admin),Student ID,Email,Department\nJohn Doe,Student,STU001,john@example.com,Computer Science\nDr. Jane Smith,Teacher,TEA002,jane@example.com,Information Technology";
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_user_import.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <>
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

                <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-zoom-in flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--brand-light)] flex items-center justify-center text-[var(--brand)]">
                                <UserPlus size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Access Management</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{orgName}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-all hover:rotate-90">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
                        {/* Role Instructions */}
                        <div className="bg-[var(--brand-light)] p-6 rounded-[24px] border border-[var(--brand)]/20 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--brand)] shrink-0 shadow-sm border border-[var(--brand-light)]">
                                <Shield size={20} />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-[var(--brand-dark)] uppercase tracking-widest mb-1">Authorization Protocol</p>
                                <p className="text-xs font-bold text-[var(--brand)] leading-relaxed">Adding users will automatically trigger welcome emails with temporary credentials. Admins have full system control.</p>
                            </div>
                        </div>


                        {/* Tabs */}
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                            <button
                                onClick={() => setActiveTab('single')}
                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'single' ? 'bg-white text-[var(--brand)] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Manual Entry
                            </button>
                            <button
                                onClick={() => setActiveTab('bulk')}
                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'bulk' ? 'bg-white text-[var(--brand)] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Bulk Import (CSV)
                            </button>
                        </div>

                        {success ? (
                            <div className="py-6 flex flex-col items-center text-center animate-fade-in space-y-8">
                                {createdPassword ? (
                                    <div className="w-full max-w-sm bg-indigo-50/50 border border-indigo-100 rounded-[32px] p-8 space-y-6 shadow-sm">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[var(--brand)] shadow-sm border border-indigo-50">
                                                <Shield size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temporary Access Key</p>
                                                <p className="text-xs text-rose-500 font-bold italic">Account established for {formData.name}</p>
                                            </div>
                                        </div>

                                        <div className="relative group">
                                            <div className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-2xl font-black text-slate-800 tracking-widest text-center shadow-inner overflow-hidden">
                                                {createdPassword}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(createdPassword);
                                                    setCopied(true);
                                                    setTimeout(() => setCopied(false), 2000);
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-[var(--brand)] transition-all active:scale-90"
                                                title="Copy Password"
                                            >
                                                {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-[11px] font-bold text-slate-400 leading-relaxed px-4">
                                                Please share this credential with the user securely. This key will not be shown again.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setSuccess(false);
                                                    setCreatedPassword(null);
                                                    setFormData({ name: '', email: '', id: '', role: 'Student', dept: '' });
                                                    onClose();
                                                }}
                                                className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                                            >
                                                Dismiss & Close
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : activeTab === 'single' ? (
                            <form onSubmit={handleSingleAdd} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <FormInput label="Full Name" placeholder="e.g. John Doe" value={formData.name} onChange={(v: string) => setFormData({ ...formData, name: v })} />
                                    <FormInput label="Email Address" type="email" placeholder="john@example.com" value={formData.email} onChange={(v: string) => setFormData({ ...formData, email: v })} />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <FormInput label="Official ID" placeholder="STU-2025-001" value={formData.id} onChange={(v: string) => setFormData({ ...formData, id: v })} />
                                    <FormInput label="Department" placeholder="Computer Science" value={formData.dept} onChange={(v: string) => setFormData({ ...formData, dept: v })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Account Role</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['Student', 'Teacher', 'Admin'].map(role => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, role })}
                                                className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${formData.role === role ? 'bg-white border-[var(--brand)] text-[var(--brand)] shadow-lg shadow-[var(--brand)]/10' : 'bg-slate-50 border-transparent text-slate-400 hover:border-slate-200'}`}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="w-full py-5 bg-[var(--brand)] text-white font-black text-xs uppercase tracking-[0.2em] rounded-[24px] shadow-xl shadow-[var(--brand)]/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Establish User Access'}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-8 animate-fade-in">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50 p-12 flex flex-col items-center text-center cursor-pointer hover:border-[var(--brand-light)] hover:bg-slate-100 transition-all group"
                                >
                                    <div className="w-16 h-16 rounded-[24px] bg-white shadow-sm border border-slate-50 flex items-center justify-center text-slate-300 group-hover:text-[var(--brand)] transition-all mb-4">
                                        <Upload size={32} />
                                    </div>
                                    <p className="text-base font-black text-slate-800 mb-1">Upload Institutional Roster</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supports CSV formats</p>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                                </div>

                                <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-slate-600">
                                        <FileText size={20} />
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">CSV Template</p>
                                            <p className="text-xs font-bold text-slate-400 italic">Name, Role, ID, Email, Dept</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={downloadSampleCSV}
                                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
                                    >
                                        <Download size={14} />
                                        Get Sample
                                    </button>
                                </div>

                                {error && (
                                    <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl flex items-center gap-3">
                                        <AlertCircle size={18} />
                                        <p className="text-xs font-bold">{error}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-8 bg-slate-50/50 border-t border-slate-100 text-center">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Institutional Access Management • {siteConfig.name} Admin</p>
                    </div>
                </div>
            </div>

            <BulkImportReportModal
                isOpen={!!importReport}
                onClose={() => {
                    setImportReport(null);
                    onClose();
                }}
                report={importReport}
            />
        </>
    );
}

function FormInput({ label, type = "text", placeholder, value, onChange }: { label: string, type?: string, placeholder: string, value: string, onChange: (v: string) => void }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
            <input
                type={type}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-[var(--brand)] transition-all font-mono"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required
            />
        </div>
    );
}
