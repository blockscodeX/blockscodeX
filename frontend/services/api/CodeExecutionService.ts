// Use Proxy for Client-Side execution to ensure cookies are passed automatically
const BASE_URL = typeof window !== 'undefined'
    ? '/api/proxy'
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    output: string;
    code: number;
    signal: string;
}

export interface SubmissionResult {
    status: string; // "Accepted", "Wrong Answer"
    passedTests: number;
    totalTests: number;
    results: {
        input: string;
        expectedOutput: string;
        actualOutput: string;
        passed: boolean;
        status: string;
        error: string | null;
    }[];
}

const authFetch = async (endpoint: string, options: RequestInit = {}) => {
    // endpoint should be relative like '/code/run'
    const url = `${BASE_URL}${endpoint}`;

    // Explicitly strip Content-Type if body is FormData (file upload)
    // otherwise default to application/json
    const headers: Record<string, string> = {
        ...options.headers as Record<string, string>,
    };

    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        credentials: 'include', // Ensure cookies are sent
        headers
    });

    if (!response.ok) {
        // Handle 401 specifically if needed, or throw generic error
        if (response.status === 401) {
            throw new Error("Unauthorized: Please log in again.");
        }
        const errorData = await response.text();
        throw new Error(`Execution error: ${response.status} ${errorData}`);
    }

    return response.json();
};

export const CodeExecutionService = {
    run: async (language: string, code: string, input?: string): Promise<ExecutionResult> => {
        try {
            return await authFetch('/code/run', {
                method: 'POST',
                body: JSON.stringify({
                    language,
                    code,
                    input,
                })
            });
        } catch (error) {
            console.error('Run code error', error);
            throw error;
        }
    },

    submit: async (unitId: string, language: string, code: string, examId?: string, testCases?: any[]): Promise<SubmissionResult> => {
        try {
            return await authFetch('/code/submit', {
                method: 'POST',
                body: JSON.stringify({
                    unitId,
                    language,
                    code,
                    examId,
                    testCases
                })
            });
        } catch (error) {
            console.error('Submit code error', error);
            throw error;
        }
    }
};
