"use client";
import React, { useRef, useState } from 'react';
import { Plus, Trash2, GripVertical, Code, Type, Video, ArrowUp, ArrowDown, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Question } from '../../types';
import RichTextEditor from '../../RichTextEditor';
import CodeMirrorEditor from '../../CodeMirrorEditor';
import { CourseService } from '@/services/api/CourseService';
import AlertModal from '../../../Common/AlertModal';

interface ReadingEditorProps {
    question: Question;
    onChange: (updates: Partial<Question>) => void;
}

export default function ReadingEditor({ question, onChange }: ReadingEditorProps) {
    const config = question.readingConfig || {
        contentBlocks: [
            { id: '1', type: 'text' as const, content: '<p>Write your reading material here...</p>' }
        ]
    };

    // Track upload state per block: blockId -> 'idle' | 'uploading' | 'done' | 'error'
    const [uploadStates, setUploadStates] = useState<Record<string, 'idle' | 'uploading' | 'done' | 'error'>>({});
    const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Confirmation modal for video block deletion
    const [deleteConfirm, setDeleteConfirm] = useState<{ index: number; videoUrl: string } | null>(null);;

    const updateConfig = (updates: Partial<typeof config>) => {
        onChange({ readingConfig: { ...config, ...updates } });
    };

    const addBlock = (type: 'text' | 'code-runner' | 'video', index: number) => {
        const newBlock = {
            id: Date.now().toString(),
            type,
            content: '',
            videoUrl: type === 'video' ? '' : undefined,
            runnerConfig: type === 'code-runner' ? { language: 'javascript' as const, initialCode: '// Write starter code here' } : undefined
        };
        const newBlocks = [...config.contentBlocks];
        newBlocks.splice(index + 1, 0, newBlock);
        updateConfig({ contentBlocks: newBlocks });
    };

    const removeBlock = (index: number) => {
        if (config.contentBlocks.length <= 1) return;
        const block = config.contentBlocks[index];
        // Video block with an uploaded URL: ask for confirmation and delete from S3
        if (block.type === 'video' && block.videoUrl) {
            setDeleteConfirm({ index, videoUrl: block.videoUrl });
            return;
        }
        updateConfig({ contentBlocks: config.contentBlocks.filter((_, i) => i !== index) });
    };

    const confirmDeleteVideoBlock = async () => {
        if (!deleteConfirm) return;
        const { index, videoUrl } = deleteConfirm;
        setDeleteConfirm(null);
        try {
            await CourseService.deleteCourseVideo(videoUrl);
        } catch {
            // Non-blocking: remove the block even if S3 cleanup fails
        }
        updateConfig({ contentBlocks: config.contentBlocks.filter((_, i) => i !== index) });
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === config.contentBlocks.length - 1) return;

        const newBlocks = [...config.contentBlocks];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
        updateConfig({ contentBlocks: newBlocks });
    };

    const updateBlock = (index: number, updates: any) => {
        updateConfig({
            contentBlocks: config.contentBlocks.map((b, i) => i === index ? { ...b, ...updates } : b)
        });
    };

    const handleVideoUpload = async (blockId: string, index: number, file: File) => {
        // Validate file type
        const ALLOWED = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
        if (!ALLOWED.includes(file.type)) {
            setUploadErrors(prev => ({ ...prev, [blockId]: 'Only MP4, WebM, OGG, and MOV files are allowed.' }));
            setUploadStates(prev => ({ ...prev, [blockId]: 'error' }));
            return;
        }
        // Validate size (500MB)
        if (file.size > 500 * 1024 * 1024) {
            setUploadErrors(prev => ({ ...prev, [blockId]: 'File size must be less than 500MB.' }));
            setUploadStates(prev => ({ ...prev, [blockId]: 'error' }));
            return;
        }

        setUploadStates(prev => ({ ...prev, [blockId]: 'uploading' }));
        setUploadErrors(prev => ({ ...prev, [blockId]: '' }));
        setUploadProgress(prev => ({ ...prev, [blockId]: 0 }));

        try {
            const { url } = await CourseService.uploadCourseVideo(file, (percent) => {
                setUploadProgress(prev => ({ ...prev, [blockId]: percent }));
            });
            updateBlock(index, { videoUrl: url });
            setUploadStates(prev => ({ ...prev, [blockId]: 'done' }));
        } catch (err: any) {
            setUploadErrors(prev => ({ ...prev, [blockId]: err.message || 'Upload failed. Please try again.' }));
            setUploadStates(prev => ({ ...prev, [blockId]: 'error' }));
        }
    };

    return (
        <>
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Reading Material Breakdown</h3>
                <div className="text-[10px] font-bold text-slate-300">
                    {config.contentBlocks.length} Blocks
                </div>
            </div>

            <div className="space-y-6">
                {config.contentBlocks.map((block, index) => (
                    <div key={block.id} className="relative group/block animate-fade-in-up">
                        {/* Add Button (Top, only for first item to allow prepending) */}
                        {index === 0 && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity z-10 flex gap-2">
                                <AddButton onClick={() => addBlock('text', -1)} icon={<Type size={12} />} label="Add Text" />
                                <AddButton onClick={() => addBlock('code-runner', -1)} icon={<Code size={12} />} label="Add Code" />
                                <AddButton onClick={() => addBlock('video', -1)} icon={<Video size={12} />} label="Add Video" variant="video" />
                            </div>
                        )}

                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all ring-1 ring-transparent hover:ring-[var(--brand)]/10">
                            {/* Block Header */}
                            <div className="h-10 px-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                                        <GripVertical size={14} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        {block.type === 'text' ? (
                                            <Type size={14} className="text-[var(--brand)]" />
                                        ) : block.type === 'code-runner' ? (
                                            <Code size={14} className="text-emerald-500" />
                                        ) : (
                                            <Video size={14} className="text-violet-500" />
                                        )}
                                        {block.type === 'text' ? 'Text Block' : block.type === 'code-runner' ? 'Embedded Code Runner' : 'Video Block'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
                                    <button onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp size={14} /></button>
                                    <button onClick={() => moveBlock(index, 'down')} disabled={index === config.contentBlocks.length - 1} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown size={14} /></button>
                                    <div className="w-[1px] h-4 bg-slate-300 mx-1"></div>
                                    <button onClick={() => removeBlock(index)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
                                </div>
                            </div>

                            {/* Block Content */}
                            <div className="p-0">
                                {block.type === 'text' ? (
                                    <div className="text-editor-wrapper">
                                        <RichTextEditor
                                            content={block.content}
                                            onChange={(val) => updateBlock(index, { content: val })}
                                            placeholder="Write content..."
                                        />
                                    </div>
                                ) : block.type === 'code-runner' ? (
                                    <div className="p-6 bg-slate-900">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Language</label>
                                                <select
                                                    value={block.runnerConfig?.language}
                                                    onChange={(e) => updateBlock(index, { runnerConfig: { ...block.runnerConfig, language: e.target.value } })}
                                                    className="w-32 bg-slate-800 text-slate-200 text-xs font-bold rounded-lg px-2 py-1 outline-none border border-slate-700 focus:border-[var(--brand)]"
                                                >
                                                    <option value="javascript">JavaScript</option>
                                                    <option value="python">Python</option>
                                                    <option value="java">Java</option>
                                                    <option value="cpp">C++</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1 flex-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Description / Instructions</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Try modifying this code to calculate..."
                                                    className="w-full bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700 focus:border-[var(--brand)] outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="rounded-xl overflow-hidden border border-slate-700">
                                            <CodeMirrorEditor
                                                value={block.runnerConfig?.initialCode || ''}
                                                onChange={(val) => updateBlock(index, { runnerConfig: { ...block.runnerConfig, initialCode: val } })}
                                                language={block.runnerConfig?.language as any}
                                                theme="dark"
                                                height="200px"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    /* Video Block */
                                    <div className="p-6 bg-slate-50">
                                        {/* Hidden file input */}
                                        <input
                                            type="file"
                                            accept="video/mp4,video/webm,video/ogg,video/quicktime"
                                            className="hidden"
                                            ref={(el) => { fileInputRefs.current[block.id] = el; }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleVideoUpload(block.id, index, file);
                                                // Reset input so re-uploading same file triggers onChange
                                                e.target.value = '';
                                            }}
                                        />

                                        {block.videoUrl ? (
                                            /* Video Preview */
                                            <div className="space-y-3">
                                                <video
                                                    src={block.videoUrl}
                                                    controls
                                                    className="w-full rounded-2xl border border-slate-200 shadow-sm bg-black max-h-72 object-contain"
                                                />
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                                                        <CheckCircle size={13} />
                                                        Video uploaded successfully
                                                    </div>
                                                    <button
                                                        onClick={() => fileInputRefs.current[block.id]?.click()}
                                                        className="text-[10px] font-black uppercase tracking-widest text-violet-500 hover:text-violet-700 transition-colors"
                                                    >
                                                        Replace Video
                                                    </button>
                                                </div>
                                            </div>
                                        ) : uploadStates[block.id] === 'uploading' ? (
                                            /* Uploading state with progress */
                                            <div className="flex flex-col items-center justify-center py-10 gap-4 px-6">
                                                <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                                                    <Video size={20} className="text-violet-500" />
                                                </div>
                                                <div className="w-full max-w-sm space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Uploading video...</p>
                                                        <span className="text-[13px] font-black text-violet-600 tabular-nums">
                                                            {uploadProgress[block.id] ?? 0}%
                                                        </span>
                                                    </div>
                                                    {/* Progress bar track */}
                                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-violet-500 rounded-full transition-all duration-200 ease-out"
                                                            style={{ width: `${uploadProgress[block.id] ?? 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Upload prompt */
                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => fileInputRefs.current[block.id]?.click()}
                                                    className="w-full border-2 border-dashed border-violet-200 hover:border-violet-400 rounded-2xl py-10 flex flex-col items-center gap-3 transition-all group/upload cursor-pointer bg-white hover:bg-violet-50/40"
                                                >
                                                    <div className="w-12 h-12 rounded-2xl bg-violet-50 group-hover/upload:bg-violet-100 flex items-center justify-center transition-colors">
                                                        <Upload size={20} className="text-violet-500" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[12px] font-black text-slate-700">Click to upload video</p>
                                                        <p className="text-[10px] font-medium text-slate-400 mt-1">MP4, WebM, OGG or MOV · Max 500MB</p>
                                                    </div>
                                                </button>

                                                {uploadStates[block.id] === 'error' && (
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-rose-600 bg-rose-50 px-4 py-2.5 rounded-xl border border-rose-100">
                                                        <AlertCircle size={13} />
                                                        {uploadErrors[block.id] || 'Upload failed. Please try again.'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add Button (Center/Bottom) */}
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover/block:opacity-100 hover:opacity-100 transition-opacity z-10 flex gap-2">
                            <AddButton onClick={() => addBlock('text', index)} icon={<Type size={12} />} label="Add Text" />
                            <AddButton onClick={() => addBlock('code-runner', index)} icon={<Code size={12} />} label="Add Code" />
                            <AddButton onClick={() => addBlock('video', index)} icon={<Video size={12} />} label="Add Video" variant="video" />
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .text-editor-wrapper :global(.prose) {
                    min-height: 150px;
                }
            `}</style>
        </div>

        <AlertModal
            isOpen={!!deleteConfirm}
            type="danger"
            title="Delete Video Block?"
            message="This will permanently delete the uploaded video from storage. This action cannot be undone."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            onConfirm={confirmDeleteVideoBlock}
            onCancel={() => setDeleteConfirm(null)}
        />
        </>
    );
}

function AddButton({ onClick, icon, label, variant }: { onClick: () => void; icon: React.ReactNode; label: string; variant?: 'video' }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-110 ${
                variant === 'video'
                    ? 'bg-violet-500 shadow-violet-500/20'
                    : 'bg-[var(--brand)] shadow-[var(--brand)]/20'
            }`}
        >
            <Plus size={12} strokeWidth={4} />
            {icon}
            {label}
        </button>
    )
}
