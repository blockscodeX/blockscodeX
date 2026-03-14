import { AuthService } from "./AuthService";

const BASE_URL = typeof window !== 'undefined' ? '/api/proxy' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');

const authFetch = (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
        ...(options.headers || {}) as any
    };

    // Only set Content-Type to application/json if there is a body 
    // and it's not a FormData object (which sets its own Content-Type)
    if (options.body && typeof options.body === 'string') {
        headers['Content-Type'] = 'application/json';
    }

    return fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers
    });
};

export const SuperAdminService = {
    async getStats() {
        try {
            const res = await authFetch(`/super-admin/stats`);
            if (!res.ok) throw new Error('Failed to fetch stats');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async getOrganizations() {
        try {
            const res = await authFetch(`/super-admin/organizations`);
            if (!res.ok) throw new Error('Failed to fetch organizations');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async getOrganization(id: string) {
        try {
            const res = await authFetch(`/super-admin/organizations/${id}`);
            if (!res.ok) throw new Error('Failed to fetch organization');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async createOrganization(data: any) {
        try {
            const formData = new FormData();
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null) {
                    formData.append(key, data[key]);
                }
            });

            // Use direct fetch for FormData to avoid Content-Type conflict
            const res = await fetch(`${BASE_URL}/super-admin/organizations`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            if (!res.ok) throw new Error('Failed to create organization');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async updateOrganization(id: string, data: any) {
        try {
            const res = await authFetch(`/super-admin/organizations/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update organization');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async deleteOrganization(id: string) {
        try {
            const res = await authFetch(`/super-admin/organizations/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete organization');
            }
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async getUsers(page = 1, limit = 10, search = '') {
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search
            }).toString();

            const res = await authFetch(`/super-admin/users?${query}`);
            if (!res.ok) throw new Error('Failed to fetch users');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async updateUser(id: string, data: any) {
        try {
            const res = await authFetch(`/super-admin/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update user');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async deleteUser(id: string) {
        try {
            const res = await authFetch(`/super-admin/users/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete user');
            }
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async getBugReports(params?: { status?: 'OPEN' | 'FIXED'; page?: number; limit?: number }) {
        try {
            const query = new URLSearchParams();
            if (params?.status) query.set('status', params.status);
            if (params?.page) query.set('page', String(params.page));
            if (params?.limit) query.set('limit', String(params.limit));

            const suffix = query.toString() ? `?${query.toString()}` : '';
            const res = await authFetch(`/super-admin/bug-reports${suffix}`);
            if (!res.ok) throw new Error('Failed to fetch bug reports');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async markBugReportFixed(id: string) {
        try {
            const res = await authFetch(`/super-admin/bug-reports/${id}/fix`, {
                method: 'PATCH',
                body: JSON.stringify({})
            });
            if (!res.ok) throw new Error('Failed to mark bug report fixed');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async deleteBugReport(id: string) {
        try {
            const res = await authFetch(`/super-admin/bug-reports/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete bug report');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    }
};
