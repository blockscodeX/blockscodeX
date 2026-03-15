const HIDDEN_TESTCASE_PLACEHOLDER = null;

export function shouldSanitizeSensitiveContent(user?: any): boolean {
    return user?.role === 'STUDENT';
}

export function sanitizeCodingConfigForClient(codingConfig: any, includeSensitive: boolean): any {
    if (!codingConfig || includeSensitive) return codingConfig;

    const showTestCases = codingConfig.showTestCases ?? true;
    const sanitized: any = {
        ...codingConfig,
        testCases: sanitizeTestCasesForClient(codingConfig.testCases || [], showTestCases, includeSensitive)
    };

    if (sanitized.solution) {
        sanitized.solution = '';
    }

    if (sanitized.templates && typeof sanitized.templates === 'object') {
        const templateEntries = Object.entries(sanitized.templates).map(([lang, template]: [string, any]) => {
            const safeTemplate: any = {
                ...(template || {})
            };

            if (safeTemplate.solution) {
                safeTemplate.solution = '';
            }

            if (Array.isArray(safeTemplate.testCases)) {
                safeTemplate.testCases = sanitizeTestCasesForClient(
                    safeTemplate.testCases,
                    showTestCases,
                    includeSensitive
                );
            }

            return [lang, safeTemplate];
        });

        sanitized.templates = Object.fromEntries(templateEntries);
    }

    return sanitized;
}

export function sanitizeQuestionForClient(question: any, includeSensitive: boolean): any {
    if (!question || includeSensitive) return question;

    const sanitized: any = {
        ...question
    };

    if (sanitized.codingConfig) {
        sanitized.codingConfig = sanitizeCodingConfigForClient(sanitized.codingConfig, includeSensitive);
    }

    if (sanitized.coding) {
        sanitized.coding = sanitizeCodingConfigForClient(sanitized.coding, includeSensitive);
    }

    if (Array.isArray(sanitized.testCases)) {
        const showTestCases = sanitized.codingConfig?.showTestCases ?? true;
        sanitized.testCases = sanitizeTestCasesForClient(sanitized.testCases, showTestCases, includeSensitive);
    }

    return sanitized;
}

export function sanitizeQuestionsPayloadForClient(questionsPayload: any, includeSensitive: boolean): any {
    if (!questionsPayload || includeSensitive) return questionsPayload;

    if (Array.isArray(questionsPayload)) {
        return questionsPayload.map((item: any) => {
            if (item && typeof item === 'object' && Array.isArray(item.questions)) {
                return {
                    ...item,
                    questions: item.questions.map((q: any) => sanitizeQuestionForClient(q, includeSensitive))
                };
            }
            return sanitizeQuestionForClient(item, includeSensitive);
        });
    }

    if (questionsPayload.sections && Array.isArray(questionsPayload.sections)) {
        return {
            ...questionsPayload,
            sections: questionsPayload.sections.map((section: any) => ({
                ...section,
                questions: Array.isArray(section?.questions)
                    ? section.questions.map((q: any) => sanitizeQuestionForClient(q, includeSensitive))
                    : section?.questions
            }))
        };
    }

    if (typeof questionsPayload === 'object') {
        const sanitizedEntries = Object.entries(questionsPayload).map(([key, value]: [string, any]) => {
            if (value && typeof value === 'object' && Array.isArray(value.questions)) {
                return [
                    key,
                    {
                        ...value,
                        questions: value.questions.map((q: any) => sanitizeQuestionForClient(q, includeSensitive))
                    }
                ];
            }
            return [key, value];
        });
        return Object.fromEntries(sanitizedEntries);
    }

    return questionsPayload;
}

function sanitizeTestCasesForClient(
    testCases: any[],
    showTestCases: boolean,
    includeSensitive: boolean
): any[] {
    if (!Array.isArray(testCases) || includeSensitive) return testCases;

    return testCases.map((testCase: any) => {
        const isPublic = testCase?.isPublic !== false;
        const isVisible = showTestCases && isPublic;

        if (isVisible) {
            return { ...testCase };
        }

        return {
            ...testCase,
            input: HIDDEN_TESTCASE_PLACEHOLDER,
            output: HIDDEN_TESTCASE_PLACEHOLDER,
            expectedOutput: HIDDEN_TESTCASE_PLACEHOLDER
        };
    });
}