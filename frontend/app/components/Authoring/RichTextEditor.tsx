"use client";
import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code as CodeIcon,
    List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Link as LinkIcon, Image as ImageIcon, Quote, Undo, Redo,
    Heading1, Heading2, Heading3, Subscript as SubIcon, Superscript as SupIcon,
    Moon, Sun, Terminal, Code2, Youtube as YoutubeIcon
} from 'lucide-react';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Removed unique instance ID as it breaks Tiptap HTML serialization and standard commands.
    const linkName = 'link';
    const underlineName = 'underline';

    const _extensions = [
        StarterKit.configure({
            codeBlock: {
                HTMLAttributes: {
                    class: 'rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-sm my-4 border border-slate-700',
                },
            },
            code: {
                HTMLAttributes: {
                    class: 'rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-sm border border-slate-200 dark:border-slate-700 font-bold text-[var(--brand)]',
                },
            },
        }),
        // Use standard Underline extension
        Underline,
        Subscript,
        Superscript,
        TextAlign.configure({
            types: ['heading', 'paragraph'],
        }),
        // Configure Link
        Link.configure({
            openOnClick: false,
            HTMLAttributes: {
                class: 'text-[var(--brand)] underline cursor-pointer hover:text-[var(--brand-dark)]',
            },
        }),
        Image.configure({
            HTMLAttributes: {
                class: 'rounded-2xl max-w-full h-auto my-4 shadow-lg',
            },
        }),
        Youtube.configure({
            inline: false,
            HTMLAttributes: {
                class: 'w-full aspect-video rounded-xl shadow-lg my-4 overflow-hidden border border-slate-200 dark:border-slate-700',
            },
        }),
    ];

    const dedupeExtensions = (exts: any[]) => {
        const map = new Map<string, any>();
        for (const e of exts) {
            const name = (e && (e as any).name) || (typeof e === 'function' && (e as any)().name) || '';
            if (!map.has(name)) map.set(name, e);
        }
        return Array.from(map.values());
    };

    const editor = useEditor({
        extensions: dedupeExtensions(_extensions),
        content: content,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: `prose max-w-none focus:outline-none min-h-[400px] p-8 transition-colors duration-300 ${isDarkMode
                    ? 'prose-invert bg-slate-900 text-slate-100 placeholder:text-slate-600'
                    : 'prose-slate bg-white text-slate-700 placeholder:text-slate-400'
                    }`,
            },
        },
    });

    // Sync content if it changes externally
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    if (!editor) return null;

    const setLink = () => {
        const previousUrl = editor.getAttributes(linkName).href;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange(linkName).unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange(linkName).setLink({ href: url }).run();
    };

    const removeActiveNode = (nodeType: 'image' | 'youtube') => {
        if (!editor.isActive(nodeType)) return;
        editor.chain().focus().selectParentNode().deleteSelection().run();
    };

    const addImage = () => {
        const existingSrc = editor.isActive('image') ? editor.getAttributes('image').src || '' : '';
        const url = window.prompt('Image URL', existingSrc);
        if (url === null) return;

        const nextUrl = url.trim();
        if (!nextUrl) {
            removeActiveNode('image');
            return;
        }

        if (editor.isActive('image')) {
            editor.chain().focus().updateAttributes('image', { src: nextUrl }).run();
            return;
        }

        editor.chain().focus().setImage({ src: nextUrl }).run();
    };

    const addYoutube = () => {
        const existingSrc = editor.isActive('youtube') ? editor.getAttributes('youtube').src || '' : '';
        const url = window.prompt('YouTube URL', existingSrc);
        if (url === null) return;

        const nextUrl = url.trim();
        if (!nextUrl) {
            removeActiveNode('youtube');
            return;
        }

        if (editor.isActive('youtube')) {
            editor.chain().focus().updateAttributes('youtube', { src: nextUrl }).run();
            return;
        }

        editor.commands.setYoutubeVideo({
            src: nextUrl,
            width: 640,
            height: 360,
        });
    };

    return (
        <div className={`border rounded-[32px] overflow-hidden transition-all duration-300 ${isDarkMode ? 'border-slate-700 shadow-2xl shadow-black/50' : 'border-slate-200 shadow-sm'}`}>
            {/* Toolbar */}
            <div className={`flex flex-wrap items-center gap-1 p-3 border-b sticky top-0 z-10 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>

                <div className="flex bg-white/10 rounded-xl p-0.5 gap-0.5 shadow-inner">
                    <ToolbarBtn onClick={() => editor.chain().undo().run()} icon={<Undo size={15} />} label="Undo" dark={isDarkMode} />
                    <ToolbarBtn onClick={() => editor.chain().redo().run()} icon={<Redo size={15} />} label="Redo" dark={isDarkMode} />
                </div>
                <Divider dark={isDarkMode} />

                <div className="flex bg-white/10 rounded-xl p-0.5 gap-0.5 shadow-inner">
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        icon={<Bold size={15} />}
                        label="Bold"
                        dark={isDarkMode}
                    />
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')}
                        icon={<Italic size={15} />}
                        label="Italic"
                        dark={isDarkMode}
                    />
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive(underlineName)}
                        icon={<UnderlineIcon size={15} />}
                        label="Underline"
                        dark={isDarkMode}
                    />
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        active={editor.isActive('strike')}
                        icon={<Strikethrough size={15} />}
                        label="Strike"
                        dark={isDarkMode}
                    />
                </div>
                <Divider dark={isDarkMode} />

                <div className="flex bg-white/10 rounded-xl p-0.5 gap-0.5 shadow-inner">
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        active={editor.isActive('code')}
                        icon={<Code2 size={15} />}
                        label="Inline Code"
                        dark={isDarkMode}
                    />
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        active={editor.isActive('codeBlock')}
                        icon={<Terminal size={15} />}
                        label="Code Block"
                        dark={isDarkMode}
                    />
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        active={editor.isActive('blockquote')}
                        icon={<Quote size={15} />}
                        label="Quote"
                        dark={isDarkMode}
                    />
                </div>
                <Divider dark={isDarkMode} />

                <div className="flex bg-white/10 rounded-xl p-0.5 gap-0.5 shadow-inner">
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        active={editor.isActive('heading', { level: 1 })}
                        icon={<Heading1 size={15} />}
                        label="H1"
                        dark={isDarkMode}
                    />
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        active={editor.isActive('heading', { level: 2 })}
                        icon={<Heading2 size={15} />}
                        label="H2"
                        dark={isDarkMode}
                    />
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        active={editor.isActive('heading', { level: 3 })}
                        icon={<Heading3 size={15} />}
                        label="H3"
                        dark={isDarkMode}
                    />
                </div>
                <Divider dark={isDarkMode} />

                <div className="flex bg-white/10 rounded-xl p-0.5 gap-0.5 shadow-inner">
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        active={editor.isActive({ textAlign: 'left' })}
                        icon={<AlignLeft size={15} />}
                        label="Left"
                        dark={isDarkMode}
                    />
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        active={editor.isActive({ textAlign: 'center' })}
                        icon={<AlignCenter size={15} />}
                        label="Center"
                        dark={isDarkMode}
                    />
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        active={editor.isActive({ textAlign: 'right' })}
                        icon={<AlignRight size={15} />}
                        label="Right"
                        dark={isDarkMode}
                    />
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                        active={editor.isActive({ textAlign: 'justify' })}
                        icon={<AlignJustify size={15} />}
                        label="Justify"
                        dark={isDarkMode}
                    />
                </div>
                <Divider dark={isDarkMode} />

                <div className="flex bg-white/10 rounded-xl p-0.5 gap-0.5 shadow-inner">
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')}
                        icon={<List size={15} />}
                        label="Bullet List"
                        dark={isDarkMode}
                    />
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        icon={<ListOrdered size={15} />}
                        label="Numbered List"
                        dark={isDarkMode}
                    />
                </div>
                <Divider dark={isDarkMode} />

                <div className="flex bg-white/10 rounded-xl p-0.5 gap-0.5 shadow-inner">
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleSubscript().run()}
                        active={editor.isActive('subscript')}
                        icon={<SubIcon size={15} />}
                        label="Subscript"
                        dark={isDarkMode}
                    />
                    <ToolbarBtn
                        onClick={() => editor.chain().focus().toggleSuperscript().run()}
                        active={editor.isActive('superscript')}
                        icon={<SupIcon size={15} />}
                        label="Superscript"
                        dark={isDarkMode}
                    />
                </div>
                <Divider dark={isDarkMode} />

                <div className="flex bg-white/10 rounded-xl p-0.5 gap-0.5 shadow-inner">
                    <ToolbarBtn onClick={setLink} active={editor.isActive(linkName)} icon={<LinkIcon size={15} />} label="Link" dark={isDarkMode} />
                    <ToolbarBtn onClick={addImage} active={editor.isActive('image')} icon={<ImageIcon size={15} />} label="Image" dark={isDarkMode} />
                    <ToolbarBtn onClick={addYoutube} active={editor.isActive('youtube')} icon={<YoutubeIcon size={15} />} label="YouTube Video" dark={isDarkMode} />
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <div className={`h-6 w-[1px] ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                    <button
                        type="button"
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isDarkMode
                            ? 'bg-[var(--brand)] text-white hover:brightness-110 shadow-lg shadow-[var(--brand)]/20'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                    >
                        {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                        {isDarkMode ? 'Light' : 'Dark'}
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className={`relative ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <EditorContent editor={editor} />
                {(content === '' || content === '<p></p>') && (
                    <div className={`absolute top-8 left-8 pointer-events-none font-medium italic ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                        {placeholder || 'Start typing your content...'}
                    </div>
                )}
            </div>

            <style jsx global>{`
                .prose pre {
                    background-color: #0f172a !important;
                    color: #f8fafc !important;
                    padding: 1.5rem !important;
                    border-radius: 1rem !important;
                    font-family: 'Geist Mono', 'JetBrains Mono', monospace !important;
                    font-size: 0.875rem !important;
                    line-height: 1.5 !important;
                    border: 1px solid #1e293b !important;
                    margin: 1.5rem 0 !important;
                }
                .prose code {
                    font-family: 'Geist Mono', 'JetBrains Mono', monospace !important;
                    color: var(--brand) !important;
                    background-color: transparent !important;
                    padding: 0 !important;
                    font-weight: 600 !important;
                }
                .prose :not(pre) > code {
                    background-color: #f1f5f9 !important;
                    padding: 0.2rem 0.4rem !important;
                    border-radius: 0.4rem !important;
                    color: var(--brand) !important;
                    font-size: 0.9em !important;
                }
                .dark .prose :not(pre) > code {
                    background-color: #1e293b !important;
                    color: var(--brand) !important;
                }
            `}</style>
        </div>
    );
}

function ToolbarBtn({ onClick, active, icon, label, dark }: { onClick: () => void; active?: boolean; icon: React.ReactNode; label: string; dark: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            className={`p-2.5 rounded-lg transition-all ${active
                ? (dark ? 'bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/30' : 'bg-[var(--brand)] text-white shadow-lg')
                : (dark ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-white')
                }`}
        >
            {icon}
        </button>
    );
}

function Divider({ dark }: { dark: boolean }) {
    return <div className={`w-[1px] h-6 mx-1 ${dark ? 'bg-white/10' : 'bg-slate-200 font-thin'}`}></div>
}
