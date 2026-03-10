export type QuestionType = 'MCQ' | 'MultiSelect' | 'Coding' | 'Web' | 'Reading' | 'Notebook';

export interface UnitQuestion {
    id: string;
    type: QuestionType;
    title: string;
    description: string; // Rich text / HTML
    difficulty?: string;
    topic?: string;
    code_language?: string;
    // Coding specific
    codingConfig?: {
        languageId: string;
        header: string;
        initialCode: string;
        footer: string;
        // Teacher Dashboard names
        head?: string;
        body?: string;
        tail?: string;
        testCases?: Array<any>;
        // Normalized templates per language (if teacher provided per-lang templates)
        templates?: Record<string, {
            header?: string;
            initialCode?: string;
            footer?: string;
            // Teacher Dashboard names
            head?: string;
            body?: string;
            tail?: string;
            testCases?: Array<any>;
        }>;
        // Optional list of allowed languages (e.g. ['javascript','python'])
        allowedLanguages?: string[];
    };
    // Web specific
    webConfig?: {
        initialHTML: string;
        initialCSS: string;
        initialJS: string;
        showFiles?: { html: boolean; css: boolean; js: boolean };
        testCases?: Array<any>;
    };
    // MCQ specific
    mcqOptions?: { id: string; text: string; isCorrect?: boolean; }[];
    module?: any;
    moduleUnits?: any[];
    moduleTitle?: string;
    // Reading specific
    readingContent?: {
        id: string;
        type: 'text' | 'code' | 'code-runner' | 'video';
        content?: string; // HTML for text
        videoUrl?: string; // S3 URL for video blocks
        codeConfig?: {
            languageId: string;
            initialCode: string;
        };
        runnerConfig?: {
            language: string;
            initialCode: string;
        };
    }[];
    // Notebook specific
    notebookConfig?: {
        initialCode: string;
        language: 'python';
    };
}
