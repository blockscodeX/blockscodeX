import { AuthService } from "./AuthService";

// Use local proxy for client-side functionality to ensure cookies are sent
const BASE_URL = typeof window !== 'undefined' ? '/api/proxy' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');

const authFetch = (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
        ...(options.headers || {}) as any
    };

    // Only set Content-Type to application/json if there is a body 
    // and it's not a FormData object
    if (options.body && typeof options.body === 'string') {
        headers['Content-Type'] = 'application/json';
    }

    return fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers
    });
};

export interface Student {
    id: string;
    name: string;
    email?: string;
    rollNumber?: string;
    ip?: string;
    status: string;
    lastActivity: string;
    tabOuts: number;
    tabIns: number;
    vmDetected: boolean;
    vmType?: string;
    isHighRisk: boolean;
    appVersion?: string;
    monitors?: number;
    loginCount?: number;
    sleepDuration?: string;
    startTime?: string;
    endTime?: string;
    logs: any[];
}

export const TeacherService = {
    async getStats() {
        try {
            const res = await authFetch('/teacher/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getModules() {
        try {
            const res = await authFetch('/teacher/modules');
            if (!res.ok) throw new Error('Failed to fetch modules');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getRecentSubmissions() {
        try {
            const res = await authFetch('/teacher/submissions/recent');
            if (!res.ok) throw new Error('Failed to fetch submissions');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getSubmission(examId: string, userId: string) {
        try {
            const res = await authFetch(`/teacher/exams/${examId}/submissions/${userId}`);
            if (!res.ok) throw new Error('Failed to fetch submission');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getStudents() {
        try {
            const res = await authFetch('/teacher/students');
            if (!res.ok) throw new Error('Failed to fetch students');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getStudentAnalytics(studentId: string) {
        try {
            const res = await authFetch(`/teacher/students/${studentId}/analytics`);
            if (!res.ok) throw new Error('Failed to fetch student analytics');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getStudentAttempts(studentId: string) {
        try {
            const res = await authFetch(`/teacher/students/${studentId}/attempts`);
            if (!res.ok) throw new Error('Failed to fetch student attempts');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getStudentUnitSubmissions(studentId: string) {
        try {
            const res = await authFetch(`/teacher/students/${studentId}/unit-submissions`);
            if (!res.ok) throw new Error('Failed to fetch student unit submissions');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async enrollStudent(courseId: string, studentId: string) {
        try {
            const res = await authFetch(`/teacher/courses/${courseId}/enroll/${studentId}`, {
                method: 'POST',
                body: JSON.stringify({})
            });
            if (!res.ok) throw new Error('Failed to enroll student');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async enrollByEmails(courseId: string, emails: string[]) {
        try {
            const res = await authFetch(`/teacher/courses/${courseId}/enroll`, {
                method: 'POST',
                body: JSON.stringify({ emails })
            });
            if (!res.ok) throw new Error('Failed to enroll students');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async unenrollStudent(courseId: string, studentId: string) {
        try {
            const res = await authFetch(`/teacher/courses/${courseId}/enroll/${studentId}`, {
                method: 'DELETE',
                body: JSON.stringify({})
            });
            if (!res.ok) throw new Error('Failed to unenroll student');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getCourses() {
        try {
            const res = await authFetch('/teacher/courses');
            if (!res.ok) throw new Error('Failed to fetch courses');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getCourse(id: string) {
        try {
            const res = await authFetch(`/teacher/courses/${id}`);
            if (!res.ok) throw new Error('Failed to fetch course');
            const data = await res.json();

            // Transform for Builder
            return {
                ...data,
                sections: (data.modules || []).map((m: any) => ({
                    id: m.id,
                    title: m.title,
                    questions: (m.units || []).map((u: any) => ({
                        id: u.id,
                        title: u.title,
                        type: u.type,
                        ...(u.content as object)
                    }))
                })),
                tests: (data.tests || []).map((t: any) => ({
                    ...t,
                    questions: t.questions || []
                }))
            };
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async createCourse(data: any, orgId?: string) {
        try {
            // Transform for Backend
            const payload = {
                ...data,
                orgId, // Pass orgId if provided (for Super Admin impersonation)
                modules: (data.sections || []).map((s: any, idx: number) => ({
                    title: s.title,
                    order: idx,
                    units: (s.questions || []).map((q: any, qIdx: number) => {
                        const { id, title, type, ...content } = q;
                        return { title, type, order: qIdx, content };
                    })
                }))
            };

            const res = await authFetch('/teacher/courses', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to create course');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async updateCourse(id: string, data: any) {
        try {
            // Transform for Backend
            const payload = {
                ...data,
                modules: (data.sections || []).map((s: any, idx: number) => ({
                    id: String(s.id).startsWith('sec-') ? undefined : s.id,
                    title: s.title,
                    order: idx,
                    units: (s.questions || []).map((q: any, qIdx: number) => {
                        const { id: qId, title, type, ...content } = q;
                        return {
                            id: String(qId).startsWith('q-') ? undefined : qId,
                            title,
                            type,
                            order: qIdx,
                            content
                        };
                    })
                })),
                tests: (data.tests || []).map((t: any) => ({
                    ...t,
                    id: String(t.id).startsWith('test-') ? undefined : t.id,
                    questions: t.questions || []
                }))
            };

            const res = await authFetch(`/teacher/courses/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to update course');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async deleteCourse(id: string) {
        try {
            const res = await authFetch(`/teacher/courses/${id}`, {
                method: 'DELETE',
                body: JSON.stringify({})
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete course');
            }
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getExams() {
        try {
            const res = await authFetch('/teacher/exams');
            if (!res.ok) throw new Error('Failed to fetch exams');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getExam(id: string) {
        try {
            const res = await authFetch(`/teacher/exams/${id}`);
            if (!res.ok) throw new Error('Failed to fetch exam');
            const data = await res.json();

            if (!data) throw new Error('Exam not found');

            // Transform JSON questions to sections for builder
            return {
                ...data,
                isVisible: data.isActive,
                sections: Array.isArray(data.questions) ? data.questions : (data.questions?.sections || [])
            };
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async createExam(data: any, orgId?: string) {
        try {
            const payload = {
                ...data,
                orgId, // Pass orgId if provided (for Super Admin impersonation)
                isActive: data.isVisible ?? true
            };

            const res = await authFetch('/teacher/exams', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to create exam');
            }
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async updateExam(id: string, data: any) {
        try {
            const res = await authFetch(`/teacher/exams/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update exam');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async deleteExam(id: string) {
        try {
            const res = await authFetch(`/teacher/exams/${id}`, {
                method: 'DELETE',
                body: JSON.stringify({})
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete exam');
            }
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getMonitoredStudents(examId: string) {
        try {
            const res = await authFetch(`/teacher/exams/${examId}/monitor`);
            if (!res.ok) throw new Error('Failed to fetch active students');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getFeedbacks(examId: string) {
        try {
            const res = await authFetch(`/teacher/exams/${examId}/feedbacks`);
            if (!res.ok) throw new Error('Failed to fetch feedbacks');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async terminateSession(examId: string, studentId: string) {
        try {
            const res = await authFetch(`/teacher/exams/${examId}/terminate/${studentId}`, {
                method: 'POST',
                body: JSON.stringify({}) // Fastify requires body for POST content-type application/json
            });
            if (!res.ok) throw new Error('Failed to terminate session');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async unterminateSession(examId: string, studentId: string) {
        try {
            const res = await authFetch(`/teacher/exams/${examId}/unterminate/${studentId}`, {
                method: 'POST',
                body: JSON.stringify({})
            });
            if (!res.ok) throw new Error('Failed to restore session');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getExamResults(examId: string, page = 1, limit = 50) {
        try {
            const res = await authFetch(`/teacher/exams/${examId}/results?page=${page}&limit=${limit}`);
            if (!res.ok) throw new Error('Failed to fetch exam results');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async updateSubmissionScore(examId: string, sessionId: string, score: number, internalMarks?: Record<string, number>) {
        try {
            const res = await authFetch(`/teacher/exams/${examId}/submissions/${sessionId}/score`, {
                method: 'PUT',
                body: JSON.stringify({ score, internalMarks })
            });
            if (!res.ok) throw new Error('Failed to update score');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async publishResults(examId: string) {
        try {
            const res = await authFetch(`/teacher/exams/${examId}/publish`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to publish results');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async generateCourseOutline(data: any) {
        try {
            const res = await authFetch('/ai/generate-course-outline', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to generate course outline');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async generateCourseFull(data: any) {
        try {
            const res = await authFetch('/ai/generate-course-full', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to generate full course');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async generateExamOutline(data: any) {
        try {
            const res = await authFetch('/ai/generate-exam-outline', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to generate exam outline');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async generateExamFull(data: any) {
        try {
            const res = await authFetch('/ai/generate-exam-full', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to generate full exam');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    }
};
