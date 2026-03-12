"use client";
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { TeacherService } from "@/services/api/TeacherService";
import { useToast } from "@/app/components/Common/Toast";
import { Megaphone, Plus, X, Trash2, Paperclip, FileText, ImageIcon, File, Send, Check } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy load RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(() => import("@/app/components/Authoring/RichTextEditor"), { ssr: false });

export default function AnnouncementsTab() {
    const { success, error: toastError } = useToast();
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showComposeModal, setShowComposeModal] = useState(false);

    const loadData = async () => {
        try {
            const [annData, grpData] = await Promise.all([
                TeacherService.getAnnouncements(),
                TeacherService.getGroups()
            ]);
            setAnnouncements(annData);
            setGroups(grpData);
        } catch (err) {
            console.error("Failed to load announcements", err);
            toastError("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this announcement? Students will no longer see it.")) return;
        try {
            await TeacherService.deleteAnnouncement(id);
            success("Announcement deleted");
            loadData();
        } catch (err) {
            toastError("Failed to delete announcement");
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2].map(i => (
                    <div key={i} className="bg-white rounded-[32px] border border-slate-100 p-8 animate-pulse">
                        <div className="h-5 bg-slate-100 rounded-xl w-1/3 mb-4" />
                        <div className="h-3 bg-slate-50 rounded-lg w-2/3 mb-2" />
                        <div className="h-3 bg-slate-50 rounded-lg w-1/2" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-sm">
                        <Megaphone size={18} className="text-slate-400" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Total</p>
                            <p className="text-lg font-black text-slate-800 leading-none mt-1">{announcements.length}</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => {
                        if (groups.length === 0) {
                            toastError("Create a group first before sending announcements");
                            return;
                        }
                        setShowComposeModal(true);
                    }}
                    className="px-6 py-3 bg-[var(--brand)] text-white font-black text-xs rounded-2xl hover:bg-[var(--brand-dark)] transition-all active:scale-95 uppercase tracking-widest shadow-lg shadow-[var(--brand)]/20 flex items-center gap-2"
                >
                    <Plus size={16} strokeWidth={3} /> New Announcement
                </button>
            </div>

            {announcements.length === 0 ? (
                <div className="bg-white rounded-[32px] border border-slate-100 p-16 text-center">
                    <div className="w-20 h-20 rounded-[24px] bg-slate-50 flex items-center justify-center mx-auto mb-6">
                        <Megaphone size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">No Announcements Yet</h3>
                    <p className="text-sm font-bold text-slate-400 mb-6">Send your first announcement to student groups.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map((ann) => (
                        <div key={ann.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 hover:border-[var(--brand-light)] transition-all group/ann">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--brand)]/20">
                                        <Megaphone size={20} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-black text-slate-800 mb-1">{ann.title}</h3>
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {ann.groups?.map((g: any) => (
                                                <span key={g.id} className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-[var(--brand-light)] text-[var(--brand-dark)] border border-[var(--brand-light)]">
                                                    {g.name}
                                                </span>
                                            ))}
                                        </div>
                                        <div
                                            className="text-xs font-bold text-slate-500 line-clamp-2 prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: ann.content }}
                                        />

                                        {/* Attachments */}
                                        {Array.isArray(ann.attachments) && ann.attachments.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {ann.attachments.map((att: any, idx: number) => (
                                                    <a
                                                        key={idx}
                                                        href={att.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black text-slate-600 transition-colors border border-slate-100"
                                                    >
                                                        <AttachmentIcon type={att.type} /> {att.name}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                            {new Date(ann.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-300">
                                            {ann._count?.reads || 0} read
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(ann.id)}
                                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover/ann:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* COMPOSE MODAL */}
            {showComposeModal && typeof document !== 'undefined' && createPortal(
                <ComposeAnnouncementModal
                    groups={groups}
                    onClose={() => setShowComposeModal(false)}
                    onSent={() => { setShowComposeModal(false); loadData(); }}
                />,
                document.body
            )}
        </>
    );
}

// ─── ATTACHMENT ICON ───────────────────────────────────────────────────

function AttachmentIcon({ type }: { type: string }) {
    if (type?.startsWith("image/")) return <ImageIcon size={12} />;
    if (type?.includes("pdf")) return <FileText size={12} className="text-rose-500" />;
    return <File size={12} />;
}

// ─── COMPOSE ANNOUNCEMENT MODAL ────────────────────────────────────────

function ComposeAnnouncementModal({ groups, onClose, onSent }: { groups: any[]; onClose: () => void; onSent: () => void }) {
    const { success, error: toastError } = useToast();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [attachments, setAttachments] = useState<{ name: string; url: string; type: string; size: number }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const toggleGroup = (id: string) => {
        setSelectedGroupIds(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const selectAllGroups = () => {
        if (selectedGroupIds.length === groups.length) {
            setSelectedGroupIds([]);
        } else {
            setSelectedGroupIds(groups.map(g => g.id));
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            for (const file of Array.from(files)) {
                const result = await TeacherService.uploadAnnouncementFile(file);
                setAttachments(prev => [...prev, {
                    name: result.name || file.name,
                    url: result.url,
                    type: result.type || file.type,
                    size: result.size || file.size
                }]);
            }
        } catch (err) {
            toastError("Failed to upload file");
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = "";
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if (!title.trim()) return toastError("Title is required");
        if (!content.trim() || content === "<p></p>") return toastError("Content is required");
        if (selectedGroupIds.length === 0) return toastError("Select at least one group");

        setIsSending(true);
        try {
            await TeacherService.createAnnouncement({
                title: title.trim(),
                content,
                groupIds: selectedGroupIds,
                attachments: attachments.length > 0 ? attachments : undefined
            });
            success("Announcement sent!");
            onSent();
        } catch (err) {
            toastError("Failed to send announcement");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white w-full max-w-3xl rounded-[48px] p-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom-8 duration-500 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <button onClick={onClose} className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-400 transition-all hover:scale-110 active:scale-95">
                    <X size={20} strokeWidth={3} />
                </button>

                <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">New Announcement</h2>
                    <p className="text-sm font-bold text-slate-400 mt-1">Compose and send to your student groups.</p>
                </div>

                <div className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Announcement title..."
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/5 transition-all"
                        />
                    </div>

                    {/* Groups selector */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Groups</label>
                            <button
                                onClick={selectAllGroups}
                                className="text-[10px] font-black text-[var(--brand)] uppercase tracking-widest hover:underline"
                            >
                                {selectedGroupIds.length === groups.length ? "Deselect All" : "Select All"}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {groups.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => toggleGroup(g.id)}
                                    className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 border ${selectedGroupIds.includes(g.id)
                                        ? "bg-[var(--brand)] text-white border-[var(--brand)] shadow-lg shadow-[var(--brand)]/20"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-[var(--brand-light)] hover:text-[var(--brand)]"
                                        }`}
                                >
                                    {selectedGroupIds.includes(g.id) && <Check size={12} strokeWidth={3} />}
                                    {g.name}
                                    <span className="text-[8px] opacity-60">({g._count?.students || g.students?.length || 0})</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rich Text Editor */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Content</label>
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <RichTextEditor
                                content={content}
                                onChange={setContent}
                                placeholder="Write your announcement..."
                            />
                        </div>
                    </div>

                    {/* File Attachments */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Attachments</label>

                        {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {attachments.map((att, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                                        <AttachmentIcon type={att.type} />
                                        <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{att.name}</span>
                                        <button onClick={() => removeAttachment(idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                            <X size={12} strokeWidth={3} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <label className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-[var(--brand)] hover:bg-[var(--brand-light)]/30 transition-all">
                            <Paperclip size={16} className="text-slate-400" />
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                {isUploading ? "Uploading..." : "Attach Files (PDF, Images, Docs...)"}
                            </span>
                            <input
                                type="file"
                                multiple
                                onChange={handleFileUpload}
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.xlsx,.pptx,.txt,.zip"
                                disabled={isUploading}
                            />
                        </label>
                    </div>
                </div>

                {/* Send Button */}
                <button
                    onClick={handleSend}
                    disabled={isSending || !title.trim() || selectedGroupIds.length === 0}
                    className="w-full mt-8 py-5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-[var(--brand)]/20 active:scale-95 flex items-center justify-center gap-2"
                >
                    <Send size={16} /> {isSending ? "Sending..." : "Send Announcement"}
                </button>
            </div>
        </div>
    );
}
