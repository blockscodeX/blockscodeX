export type QuestionType = 'MCQ' | 'MultiSelect' | 'Coding' | 'Web' | 'Reading' | 'Descriptive' | 'Notebook';

export interface Question {
    id: string;
    type: QuestionType;
    title: string;
    problemStatement: string;
    marks: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    timeLimit?: number; // minutes
    tags: string[];

    // MCQ / MultiSelect
    options?: { id: string; text: string; isCorrect: boolean }[];

    // Coding (Updated for Multi-Language)
    codingConfig?: {
        // Map of language slug (e.g., 'javascript', 'python') to templates
        templates: Record<string, {
            head: string;   // Code before student's code (hidden)
            body: string;   // Starter code
            tail: string;   // Code after student's code (hidden)
            solution: string; // Model solution
        }>;
        testCases: {
            input: string;
            output: string;
            isPublic: boolean; // Replaces previous default "true"
            points: number
        }[];
    };

    // Web
    webConfig?: {
        html: string;
        css: string;
        js: string;
        showFiles: { html: boolean; css: boolean; js: boolean };
        testCases: { description: string; code: string; weight: number }[];
    };

    // Reading
    readingConfig?: {
        contentBlocks: {
            id: string;
            type: 'text' | 'code-runner' | 'video';
            content: string; // HTML for text blocks
            videoUrl?: string; // S3 URL for video blocks
            runnerConfig?: {
                language: 'javascript' | 'python' | 'java' | 'cpp';
                initialCode: string;
            };
        }[];
    };

    // Notebook
    notebookConfig?: {
        initialCode: string;
        language: 'python'; // Currently only python supported
        maxExecutionTime?: number; // seconds
        allowedLibraries?: string[]; // e.g. ['numpy', 'matplotlib']
    };
}

export interface Section {
    id: string;
    title: string;
    questions: Question[];
}

export interface TestSection extends Section {
    startDate?: string;
    endDate?: string;
}

export interface Course {
    id?: string;
    title: string;
    slug?: string;
    shortDescription?: string;
    longDescription?: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    tags: string[];
    thumbnail?: string;
    isVisible: boolean;
    status?: 'Draft' | 'Published' | 'Archived';
    sections: Section[];
    tests?: TestSection[];

    // Exam specific fields
    totalMarks?: number;
    duration?: number;
    testCode?: string;
    testCodeType?: 'Permanent' | 'Rotating';
    rotationInterval?: number; // in minutes
    allowedIPs?: string;
    inviteToken?: string;
    examMode?: 'Browser' | 'App';
    aiProctoring?: boolean;
    tabSwitchLimit?: number;
    startTime?: string;
    endTime?: string;
    moduleId?: string;
    courseId?: string;

    // AI Generation Metadata
    aiTokensUsed?: number;
}
