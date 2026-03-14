const BASE_URL = typeof window !== 'undefined' ? '/api/proxy' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');
import { LRUCache } from 'lru-cache';

const sessionCache = new LRUCache<string, any>({
    max: 1,
    ttl: 1000 * 60 * 2, // 2 minutes cache for session check
});

export const AuthService = {
    // Legacy: getToken is deprecated as we use HttpOnly cookies
    getToken() {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('auth_token');
        }
        return null;
    },

    // Legacy: user details might still be needed for UI context if not fetched from server
    getUser() {
        if (typeof window !== 'undefined') {
            const user = localStorage.getItem('user');
            return user ? JSON.parse(user) : null;
        }
        return null;
    },

    async login(email: string, password: string): Promise<any> {
        // This should technically not be used directly anymore in favor of Server Action
        // But if used, it will route through proxy
        try {
            const res = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Login failed');
            }

            // We rely on the Proxy/Server Action to set the cookie.
            // But this specific client-side call via Proxy might fail to set cookie 
            // because Proxy forwards response. 
            // IMPORTANT: Login SHOULD be done via Server Action (actions/auth.ts).

            const data = await res.json();
            return data;
        } catch (error) {
            console.error('[AuthService] Login error:', error);
            throw error;
        }
    },

    async checkSession(force = false): Promise<any> {
        try {
            if (!force && sessionCache.has('me')) {
                return sessionCache.get('me');
            }

            const res = await fetch(`${BASE_URL}/auth/me`, {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include' // Send cookies
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                if (error.message === 'ACCOUNT_SUSPENDED') {
                    this.logout('suspended');
                } else if (res.status === 401) {
                    this.logout();
                }
                throw new Error(error.message || 'Session invalid');
            }

            const userData = await res.json();
            // Sync local storage
            localStorage.setItem('user', JSON.stringify({
                ...this.getUser(),
                ...userData
            }));

            sessionCache.set('me', userData);

            return userData;
        } catch (error) {
            console.error('[AuthService] Session check skipped (offline or error)');
            return null;
        }
    },

    async examLogin(email: string, testCode: string, password?: string): Promise<any> {
        try {
            // Clear previous session
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            localStorage.removeItem('currentExamSessionId');

            const res = await fetch(`${BASE_URL}/auth/exam-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, testCode, password })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Exam login failed');
            }

            const data = await res.json();
            if (data.access_token) {
                localStorage.setItem('auth_token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            return data;
        } catch (error) {
            console.error('[AuthService] Exam login error:', error);
            throw error;
        }
    },

    async register(data: any): Promise<any> {
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async uploadAvatar(file: File): Promise<any> {
        const formData = new FormData();
        formData.append('avatar', file);

        const res = await fetch(`${BASE_URL}/auth/profile/avatar`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to upload avatar');
        }

        const updatedUser = await res.json();
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
    },

    async updateProfile(data: { name?: string }): Promise<any> {
        const res = await fetch(`${BASE_URL}/auth/profile`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: data.name }),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to update profile');
        }

        const updatedUser = await res.json();
        // Update local session
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
    },

    async removeProfilePicture(): Promise<any> {
        const res = await fetch(`${BASE_URL}/auth/profile/picture`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to remove profile picture');
        }

        const updatedUser = await res.json();
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
    },

    async changePassword(data: { currentPass: string; newPass: string }): Promise<any> {
        const res = await fetch(`${BASE_URL}/auth/change-password`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to change password');
        }

        return await res.json();
    },

    async uploadBugReportImage(file: File): Promise<{ url: string; name: string; type: string; size: number }> {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${BASE_URL}/auth/bug-reports/upload-image`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to upload image');
        }

        return await res.json();
    },

    async createBugReport(data: {
        title: string;
        description: string;
        attachments?: { name: string; url: string; type: string; size: number }[];
    }): Promise<any> {
        const res = await fetch(`${BASE_URL}/auth/bug-reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to submit bug report');
        }

        return await res.json();
    },

    getRole(): string | null {
        const user = this.getUser();
        return user?.role || null;
    },

    async forgotPassword(email: string): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!res.ok) {
                // Handle rate limiting specifically if needed, but generic error is fine for now
                if (res.status === 429) {
                    throw new Error('Too many requests. Please try again later.');
                }
                const error = await res.json();
                throw new Error(error.message || 'Request failed');
            }

            return await res.json();
        } catch (error) {
            console.error('[AuthService] Forgot Password error:', error);
            throw error;
        }
    },

    logout(reason?: string) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        if (reason === 'suspended') {
            window.location.href = '/login?error=suspended';
        } else {
            window.location.href = '/login';
        }
    }
};
