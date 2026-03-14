"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { X, Paperclip, AlertTriangle, Send } from "lucide-react";
import { AuthService } from "@/services/api/AuthService";
import { useToast } from "@/app/components/Common/Toast";

const RichTextEditor = dynamic(() => import("@/app/components/Authoring/RichTextEditor"), { ssr: false });

type UploadedAttachment = {
    name: string;
    url: string;
    type: string;
    size: number;
};

interface ReportProblemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmitted?: () => void;
}

const MAX_IMAGES = 5;
const MAX_WORDS = 500;

function countWordsFromHtml(html: string): number {
    if (!html) return 0;
    const text = html
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!text) return 0;
    return text.split(" ").filter(Boolean).length;
}

export default function ReportProblemModal({ isOpen, onClose, onSubmitted }: ReportProblemModalProps) {
    const { success, error } = useToast();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const wordCount = useMemo(() => countWordsFromHtml(description), [description]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;

        if (attachments.length >= MAX_IMAGES) {
            error(`You can attach up to ${MAX_IMAGES} images only.`);
            e.target.value = "";
            return;
        }

        const availableSlots = MAX_IMAGES - attachments.length;
        const toUpload = Array.from(files).slice(0, availableSlots);

        setIsUploading(true);
        try {
            const uploaded: UploadedAttachment[] = [];
            for (const file of toUpload) {
                if (!file.type.startsWith("image/")) {
                    error("Only image files are allowed.");
                    continue;
                }
                const result = await AuthService.uploadBugReportImage(file);
                uploaded.push(result);
            }
            if (uploaded.length > 0) {
                setAttachments((prev) => [...prev, ...uploaded]);
            }

            if (files.length > toUpload.length) {
                error(`Only ${availableSlots} more image(s) can be uploaded.`);
            }
        } catch (uploadError: any) {
            error(uploadError?.message || "Failed to upload image.");
        } finally {
            setIsUploading(false);
            e.target.value = "";
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        const cleanTitle = title.trim();
        if (!cleanTitle) return error("Title is required.");
        if (cleanTitle.length > 120) return error("Title must be 120 characters or less.");
        if (wordCount === 0) return error("Description is required.");
        if (wordCount > MAX_WORDS) return error("Description must be 500 words or less.");
        if (attachments.length > MAX_IMAGES) return error(`You can attach up to ${MAX_IMAGES} images only.`);

        setIsSubmitting(true);
        try {
            await AuthService.createBugReport({
                title: cleanTitle,
                description,
                attachments
            });
            success("Problem reported successfully. Thank you for your feedback.");
            onSubmitted?.();
            onClose();
            setTitle("");
            setDescription("");
            setAttachments([]);
        } catch (submitError: any) {
            error(submitError?.message || "Failed to submit report.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-3xl bg-white rounded-[40px] border border-slate-100 shadow-2xl p-8 md:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-all"
                >
                    <X size={18} />
                </button>

                <div className="mb-6 pr-12">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Report a Problem</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1">Help us improve by reporting bugs you face.</p>
                </div>

                <div className="mb-6 p-4 rounded-2xl border border-amber-200 bg-amber-50/70 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs font-bold text-amber-800 leading-relaxed">
                        Warning: Submitting fake, misleading, or unnecessary reports may result in account suspension.
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Short summary of the issue"
                            maxLength={120}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[var(--brand)]/5 focus:border-[var(--brand)] transition-all"
                        />
                        <p className="text-[10px] font-bold text-slate-400 mt-2">{title.length}/120</p>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Description</label>
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <RichTextEditor
                                content={description}
                                onChange={setDescription}
                                placeholder="Describe what happened, expected behavior, and steps to reproduce..."
                            />
                        </div>
                        <p className={`text-[10px] font-bold mt-2 ${wordCount > MAX_WORDS ? "text-rose-500" : "text-slate-400"}`}>
                            {wordCount}/{MAX_WORDS} words
                        </p>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Attach Photos (Max 5)</label>

                        {attachments.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                                {attachments.map((att, index) => (
                                    <div key={`${att.url}-${index}`} className="relative border border-slate-100 rounded-xl overflow-hidden bg-slate-50">
                                        <img src={att.url} alt={att.name} className="w-full h-28 object-cover" />
                                        <button
                                            onClick={() => removeAttachment(index)}
                                            className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-black/60 text-white flex items-center justify-center"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <label className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-[var(--brand)] hover:bg-[var(--brand-light)]/30 transition-all">
                            <Paperclip size={16} className="text-slate-400" />
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                {isUploading ? "Uploading..." : "Upload Images"}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleUpload}
                                className="hidden"
                                disabled={isUploading || attachments.length >= MAX_IMAGES}
                            />
                        </label>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isUploading || !title.trim() || wordCount === 0 || wordCount > MAX_WORDS}
                    className="w-full mt-8 py-4 rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs uppercase tracking-[0.18em] transition-all flex items-center justify-center gap-2"
                >
                    <Send size={15} /> {isSubmitting ? "Submitting..." : "Submit Report"}
                </button>
            </div>
        </div>
    );
}
