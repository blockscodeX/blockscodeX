import { AuthService } from "./AuthService";
import { LRUCache } from 'lru-cache';

// Use Proxy for Client-Side execution to ensure cookies are passed automatically
const BASE_URL = typeof window !== 'undefined' ? '/api/proxy' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');

// Cache configuration: Max 50 items, TTL 5 minutes
const cache = new LRUCache<string, any>({
    max: 50,
    ttl: 1000 * 60 * 5, 
});

const getHeaders = () => {
    return {
        'Content-Type': 'application/json'
    };
};

// Helper for authorized fetch
const authFetch = async (endpoint: string, options: RequestInit = {}) => {
    // endpoint should be relative like '/student/stats'
    const url = `${BASE_URL}${endpoint}`;
    
    return fetch(url, {
        ...options,
        credentials: 'include', // Ensure cookies are sent
        headers: {
            ...options.headers,
            ...getHeaders()
        }
    });
};

export interface StudentStats {
    completedModules: number;
    averageScore: number;
    streak: number;
    totalXP: number;
}

export interface StudentModule {
    title: string;
    slug: string;
    sections: number;
    percent: number;
    status: string;
}

export const StudentService = {
    async getStats(forceRefresh = false): Promise<StudentStats> {
        const cacheKey = 'student_stats';
        if (!forceRefresh && cache.has(cacheKey)) {
            return cache.get(cacheKey) as StudentStats;
        }

        try {
            const res = await authFetch('/student/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('[StudentService] Failed to fetch stats', error);
            throw error;
        }
    },

    async getModules(): Promise<StudentModule[]> {
        try {
            const res = await authFetch('/student/modules');
            if (!res.ok) throw new Error('Failed to fetch modules');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getCourses(forceRefresh = false) {
        const cacheKey = 'student_courses';
        if (!forceRefresh && cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }

        try {
            const res = await authFetch('/student/courses');
            if (!res.ok) throw new Error('Failed to fetch courses');
            const data = await res.json();
            cache.set(cacheKey, data);
            return data;
        } catch (error) {
            // console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getAttempts() {
        try {
            const res = await authFetch('/student/attempts');
            if (!res.ok) throw new Error('Failed to fetch attempts');
            return await res.json();
        } catch (error) {
            // console.error('[StudentService] Error', error);
            throw error;
        }
    },
    async getExamResult(sessionId: string) {
        try {
            const res = await authFetch(`/student/exam/${sessionId}/result`);
            if (!res.ok) throw new Error('Failed to fetch exam result');
            return await res.json();
        } catch (error) {
            // console.error('[StudentService] Error', error);
            throw error;
        }
    },
    async getUnitAttempts() {
        try {
            const res = await authFetch('/student/unit-attempts');
            if (!res.ok) throw new Error('Failed to fetch unit attempts');
            return await res.json();
        } catch (error) {
            // console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getAnalytics() {
        try {
            const res = await authFetch('/student/analytics');
            if (!res.ok) throw new Error('Failed to fetch analytics');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getProfile() {
        try {
            const res = await authFetch('/student/profile');
            if (!res.ok) throw new Error('Failed to fetch profile');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async updateProfile(data: { name?: string }) {
        try {
            const res = await authFetch('/student/profile', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update profile');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getBookmarks() {
        try {
            const res = await authFetch('/student/bookmarks');
            if (!res.ok) throw new Error('Failed to fetch bookmarks');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async addBookmark(unitId: string, metadata?: any) {
        try {
            const res = await authFetch(`/student/bookmarks/${unitId}`, {
                method: 'POST',
                body: JSON.stringify(metadata || {})
            });
            if (!res.ok) throw new Error('Failed to add bookmark');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async removeBookmark(unitId: string) {
        try {
            const res = await authFetch(`/student/bookmarks/${unitId}`, {
                method: 'DELETE',
                body: JSON.stringify({})
            });
            if (!res.ok) throw new Error('Failed to remove bookmark');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getUnitSubmissions(unitId: string) {
        try {
            const res = await authFetch(`/student/units/${unitId}/submissions`);
            if (!res.ok) throw new Error('Failed to fetch unit submissions');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async submitUnit(unitId: string, data: { status: string; content: any; score?: number }) {
        try {
            const res = await authFetch(`/student/units/${unitId}/submit`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to submit unit');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getCourseProgress(slug: string) {
        try {
            const res = await authFetch(`/student/course/${slug}/progress`);
            if (!res.ok) throw new Error('Failed to fetch course progress');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    // ─── ANNOUNCEMENTS ─────────────────────────────────────────────────────────

    async getAnnouncements(forceRefresh = false) {
        const cacheKey = 'student_announcements';
        if (!forceRefresh && cache.has(cacheKey)) {
            return cache.get(cacheKey) as any[];
        }

        try {
            const res = await authFetch('/student/announcements');
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    // Exam sessions may not have dashboard auth; return empty list.
                    return [];
                }
                throw new Error('Failed to fetch announcements');
            }
            const data = await res.json();
            cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getUnreadAnnouncementCount() {
        try {
            const res = await authFetch('/student/announcements/unread-count');
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    return { count: 0 };
                }
                throw new Error('Failed to fetch unread count');
            }
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            return { count: 0 };
        }
    },

    async markAnnouncementRead(id: string) {
        try {
            // Invalidate cache so next fetch is fresh
            cache.delete('student_announcements');

            const res = await authFetch(`/student/announcements/${id}/read`, {
                method: 'POST',
                body: JSON.stringify({})
            });
            if (!res.ok) throw new Error('Failed to mark announcement as read');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    }
};
