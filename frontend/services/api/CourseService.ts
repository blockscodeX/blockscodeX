import { AuthService } from "./AuthService";

const BASE_URL = typeof window !== 'undefined' ? '/api/proxy' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');

// Helper for authorized fetch
const authFetch = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${BASE_URL}${endpoint}`;
    return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        } as any
    });
};

// Deprecated since we use cookies now
const getHeaders = () => {
    return { 'Content-Type': 'application/json' };
};

export const CourseService = {
    async getCourse(slug: string) {
        try {
            console.log('[CourseService] GET course', slug);
            const res = await authFetch(`/course/${slug}`);
            
            if (!res.ok) {
                let body: any = null;
                try { body = await res.json(); } catch (e) { body = await res.text(); }
                const message = `Failed to fetch course (status: ${res.status}) - ${typeof body === 'string' ? body : JSON.stringify(body)}`;
                throw new Error(message);
            }
            return await res.json();
        } catch (error) {
            console.error('[CourseService] Error fetching course', error);
            throw error;
        }
    },

    async getUnit(id: string) {
        try {
            console.log('[CourseService] GET unit', id);
            const res = await authFetch(`/course/unit/${id}`);
            
            if (!res.ok) {
                let body: any = null;
                try { body = await res.json(); } catch (e) { body = await res.text(); }
                const message = `Failed to fetch unit (status: ${res.status}) - ${typeof body === 'string' ? body : JSON.stringify(body)}`;
                throw new Error(message);
            }

            const data = await res.json();
            console.log('[CourseService] unit payload:', data);
            // Transform backend Unit to Frontend UnitQuestion with defensive defaults
            const content = data.content || {};
            // Backend uses `problemStatement` and `options` for authored questions
            const description = content.problemStatement || content.description || '';
            const mcqOptions = Array.isArray(content.options) ? content.options.map((o: any) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })) : (Array.isArray(content.mcqOptions) ? content.mcqOptions.map((o: any) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })) : []);
            // Reading config may be under different keys (readingConfig.contentBlocks, readingContent, blocks, etc.)
            const rawReading = content.readingConfig?.contentBlocks || content.readingContent || content.blocks || content.content?.blocks || content.contentBlocks || [];

            // Helper: extract code blocks from HTML (<pre><code> or <pre>)
            const extractCodeBlocksFromHtml = (html: string) => {
                const blocks: Array<any> = [];
                if (!html || typeof html !== 'string') return blocks;
                // Match <pre><code ...>...</code></pre> or <pre>...</pre>
                const codeRegex = /<pre[^>]*>(?:\s*<code[^>]*>)?([\s\S]*?)(?:<\/code>)?<\/pre>/gi;
                let m: RegExpExecArray | null;
                let i = 0;
                while ((m = codeRegex.exec(html)) !== null) {
                    const code = m[1] || '';
                    // try to detect language from data-lang or class name like language-python
                    const preTag = m[0];
                    let langMatch = /data-lang=["']?([a-z0-9-_]+)["']?/i.exec(preTag) || /class=["'][^"']*(language-|lang-)([a-z0-9-_]+)[^"']*["']/i.exec(preTag);
                    const language = (langMatch && (langMatch[1] || langMatch[2])) || 'python';
                    blocks.push({ id: `desc-code-${i++}`, type: 'code', codeConfig: { languageId: language.toLowerCase(), initialCode: decodeHtmlEntities(code.trim()) } });
                }
                return blocks;
            };

            // Small utility to decode basic HTML entities in code blocks
            function decodeHtmlEntities(text: string) {
                return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
            }

            // Normalize reading content blocks to expected frontend shape:
            // { id, type: 'text' | 'code', content?, codeConfig?: { languageId, initialCode } }
            let readingContent = [] as any[];
            if (Array.isArray(rawReading) && rawReading.length > 0) {
                readingContent = rawReading.map((b: any, idx: number) => {
                    const id = b.id || b.key || `reading-${idx}`;
                    const rawType = (b.type || b.blockType || '').toString().toLowerCase();
                    if (rawType === 'video' || b.videoUrl) {
                        return {
                            id,
                            type: 'video',
                            videoUrl: b.videoUrl || b.url || b.src || ''
                        };
                    }
                    if (rawType === 'code' || rawType === 'codeblock' || rawType === 'code-runner' || b.code || b.codeConfig || b.language || b.runnerConfig) {
                        const codeConf = b.codeConfig || b.config || b.runnerConfig || {};
                        const language = codeConf.languageId || codeConf.language || b.language || b.lang || (codeConf.runnerLanguage) || 'python';
                        const initialCode = codeConf.initialCode || codeConf.code || codeConf.initial_code || codeConf.codeSnippet || b.code || b.content || '';
                        return {
                            id,
                            type: 'code',
                            codeConfig: {
                                languageId: language,
                                initialCode
                            }
                        };
                    }
                    const contentHtml = b.content || b.html || b.contentHtml || b.text || '';
                    return {
                        id,
                        type: 'text',
                        content: contentHtml
                    };
                });
            }

            // If no explicit reading blocks found, try to parse the description HTML for <pre> code blocks
            if ((!readingContent || readingContent.length === 0) && description && /<pre|<code/i.test(description)) {
                const parsed = extractCodeBlocksFromHtml(description);
                if (parsed.length > 0) {
                    console.log('[CourseService] extracted code blocks from description:', parsed.length);
                    readingContent = parsed;
                }
            }

            const mapped = {
                id: data.id,
                type: (data.type || content.type || 'Reading') as any,
                title: data.title || content.title || 'Untitled Unit',
                description,
                difficulty: content.difficulty || undefined,
                topic: content.topic || undefined,
                order: data.order,
                // Map coding config -> languageId, header, initialCode, footer, testCases
                codingConfig: (function () {
                    if (!content.codingConfig) return undefined;
                    // raw templates object may be under `templates` or be the object itself
                    const rawTemplates = content.codingConfig.templates || content.codingConfig.templatesMap || content.codingConfig;

                    // Normalize templates into a map: { langId: { header, initialCode, footer, testCases? } }
                    const templatesMap: Record<string, any> = {};
                    const keys = rawTemplates && typeof rawTemplates === 'object' ? Object.keys(rawTemplates) : [];
                    for (const k of keys) {
                        const t = rawTemplates[k] || {};
                        templatesMap[k] = {
                            header: t.head || t.header || t.h || '',
                            initialCode: t.body || t.initialCode || t.boot || '',
                            footer: t.tail || t.footer || t.f || '',
                            testCases: t.testCases || t.tests || undefined
                        };
                    }

                    // allowed languages may be specified explicitly or inferred from templates
                    const allowedLanguages = content.codingConfig.allowedLanguages || content.codingConfig.languages || (keys.length ? keys : undefined);
                    const primary = content.codingConfig.language || (Array.isArray(allowedLanguages) ? allowedLanguages[0] : keys[0]) || 'javascript';
                    const primaryTemplate = templatesMap[primary] || templatesMap[keys[0]] || {};

                    // Prefer template-level testcases if available, else top-level testcases
                    const testCases = primaryTemplate.testCases || content.codingConfig.testCases || [];

                    return {
                        languageId: primary,
                        header: primaryTemplate.header || '',
                        initialCode: primaryTemplate.initialCode || '',
                        footer: primaryTemplate.footer || '',
                        testCases,
                        templates: templatesMap,
                        allowedLanguages
                    };
                })(),
                webConfig: (function () {
                    if (!content.webConfig) return undefined;
                    return {
                        initialHTML: content.webConfig.html || content.webConfig.initialHTML || '',
                        initialCSS: content.webConfig.css || content.webConfig.initialCSS || '',
                        initialJS: content.webConfig.js || content.webConfig.initialJS || '',
                        showFiles: content.webConfig.showFiles || { html: true, css: true, js: true },
                        testCases: content.webConfig.testCases || []
                    };
                })(),
                mcqOptions,
                readingContent,
                // (debug) preserve raw reading for quick inspection if needed
                rawReading,
                notebookConfig: (function () {
                    if (!content.notebookConfig) return undefined;
                    return {
                        initialCode: content.notebookConfig.initialCode || content.notebookConfig.initial_code || '',
                        language: content.notebookConfig.language || 'python'
                    };
                })(),
                // Preserve module object so pages can access module.id / module.course
                module: data.module || undefined,
                // Include module units for sidebar (if backend provided)
                moduleUnits: (data.moduleUnits && Array.isArray(data.moduleUnits)) ? data.moduleUnits : ((data.module && Array.isArray(data.module.units)) ? data.module.units : []),
                moduleTitle: (data.moduleTitle || data.module?.title || data.module?.course?.title) || undefined
            };

            console.log('[CourseService] mapped unit:', mapped);
            // DEBUG: expose raw backend module and moduleUnits for troubleshooting
            if (mapped.module) console.log('[CourseService] module present:', mapped.module?.id, mapped.module?.title, 'courseSlug=', mapped.module?.course?.slug);
            if (mapped.moduleUnits) console.log('[CourseService] moduleUnits count=', mapped.moduleUnits.length);
            return mapped;
        } catch (error) {
            console.error('[CourseService] Error fetching unit', error);
            throw error;
        }
    },

    async deleteCourseVideo(url: string): Promise<void> {
        const res = await fetch(`${BASE_URL}/course/video`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error((error as any).message || 'Failed to delete video');
        }
    },

    uploadCourseVideo(file: File, onProgress?: (percent: number) => void): Promise<{ url: string }> {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('video', file);

            const xhr = new XMLHttpRequest();
            xhr.withCredentials = true;

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable && onProgress) {
                    onProgress(Math.round((event.loaded / event.total) * 100));
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch {
                        reject(new Error('Invalid response from server'));
                    }
                } else {
                    try {
                        const err = JSON.parse(xhr.responseText);
                        reject(new Error(err.message || 'Failed to upload video'));
                    } catch {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
            xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled')));

            xhr.open('POST', `${BASE_URL}/course/upload-video`);
            xhr.send(formData);
        });
    }
};
