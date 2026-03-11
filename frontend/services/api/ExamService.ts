import { UnitQuestion } from '@/app/components/UnitRenderer';
import { AuthService } from './AuthService';
import { LRUCache } from 'lru-cache';

const BASE_URL = typeof window !== 'undefined' ? '/api/proxy' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');

// Cache exam definitions (static content) to prevent re-fetching on navigation
// Cache: Max 10 exams, TTL 10 minutes
const examCache = new LRUCache<string, any>({
    max: 10,
    ttl: 1000 * 60 * 10,
});

const getHeaders = () => {
    // Auth token is handled by cookie in Proxy
    return {
        'Content-Type': 'application/json'
    };
};

export const ExamService = {
    async getExamBySlug(slug: string): Promise<any> {
        // Return cached response if available
        if (examCache.has(slug)) {
            console.log(`[ExamService] Cache Hit for ${slug}`);
            return examCache.get(slug);
        }

        try {
            const res = await fetch(`${BASE_URL}/exam/${slug}?json=1`, {
                headers: getHeaders()
            });
            if (!res.ok) {
                if (res.status === 404) throw new Error('API Error: 404'); // Explicitly match catch block
                if (res.status === 401) throw new Error('401 Unauthorized');
                throw new Error(`API Error: ${res.status}`);
            }
            const data = await res.json();

            // Store in cache
            examCache.set(slug, data);

            return data;
        } catch (error) {
            console.error(`[ExamService] API GetExam failed for ${slug}`, error);
            throw error;
        }
    },

    async getExamPublicStatus(slug: string): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/exam/${slug}/public-status`);

            // Explicitly handle 404 from Proxy/Backend
            if (res.status === 404) {
                const err = new Error('Exam not found');
                (err as any).status = 404;
                throw err;
            }

            if (!res.ok) throw new Error('Failed to fetch status');
            return await res.json();
        } catch (error: any) {
            console.error('[ExamService] Failed to fetch public status', error);
            // Re-throw if it's already our custom 404
            if (error.status === 404 || error.message === 'Exam not found') {
                throw error;
            }
            // Otherwise, wrap or just rethrow
            throw error;
        }
    },

    async checkExamStatus(slug: string): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/exam/${slug}/check?json=1`);
            return await res.json();
        } catch (error) {
            console.error('[ExamService] checkExamStatus failed', error);
            // Fallback for network error
            return { quiz: null, error: 'Network Error' };
        }
    },

    async startExam(slug: string, deviceId?: string, userId?: string, tabId?: string, metadata?: any): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/exam/${slug}/enter`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ deviceId: deviceId || 'web-browser', userId, tabId, metadata })
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                if (res.status === 409) {
                    if (errorData.message === 'EXAM_TERMINATED') {
                        throw new Error('EXAM_TERMINATED');
                    }
                    throw new Error('EXAM_ALREADY_ACTIVE');
                }
                if (errorData.message) {
                    throw new Error(errorData.message);
                }
                throw new Error('Failed to start exam');
            }
            const data = await res.json();
            return data.session || data;
        } catch (error) {
            console.error(`[ExamService] startExam failed for ${slug}`, error);
            throw error;
        }
    },

    async getAppConfig(): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/exam/app-config`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Config API not available');
            return await res.json();
        } catch (error) {
            console.error('[ExamService] Failed to fetch app config', error);
            throw error;
        }
    },

    async getStrictness(examId: string): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/exam/getCurrentTypeOfExecution?quizId=${examId}`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Strictness API not available');
            return await res.json();
        } catch (error) {
            console.error('[ExamService] Failed to fetch strictness', error);
            throw error;
        }
    },

    async submitSection(sessionId: string, sectionId: string, answers: any): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/submission/section`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ sessionId, sectionId, answers })
            });
            if (!res.ok) throw new Error('Failed to submit section');
            return await res.json();
        } catch (error) {
            console.error('[ExamService] Failed to submit section', error);
            throw error;
        }
    },

    async submitExam(sessionId: string): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/submission/submit`, { // Assuming endpoint
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ sessionId })
            });
            if (!res.ok) throw new Error('Failed to submit exam');
            return await res.json();
        } catch (error) {
            console.error('[ExamService] Failed to submit exam', error);
            throw error;
        }
    },

    async saveFeedback(slug: string, userId: string, rating: number, comment: string): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/exam/${slug}/feedback`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ userId, rating, comment })
            });
            if (!res.ok) throw new Error('Failed to save feedback');
            return await res.json();
        } catch (error) {
            console.error('[ExamService] Failed to save feedback', error);
            throw error;
        }
    }
};
