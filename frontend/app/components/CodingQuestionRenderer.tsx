"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PLAYGROUND_LANGUAGES } from './Editor/playgroundLanguages';

const CodeEditor = dynamic(() => import('./Editor/CodeEditor'), {
    loading: () => <div className="h-[400px] bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 text-xs font-black uppercase tracking-widest">Loading Editor...</div>,
    ssr: false
});
import { CodeExecutionService } from '@/services/api/CodeExecutionService';
import { UnitQuestion } from '@/types/unit';

interface CodingQuestionRendererProps {
    question: UnitQuestion;
    hasAttemptSelected: boolean;
    attemptAnswer: any;
    currentAnswer: any;
    onAnswerChange?: (ans: any) => void;
    onSubmit?: (ans: any) => void;
    contentFontSize: number;
    selectedCodingLang: string | null;
    onLanguageChange: (lang: string) => void;
    isRunning: boolean;
    setIsRunning: (val: boolean) => void;
    terminalLogs: string;
    setTerminalLogs: (val: string) => void;
    executionResults: any[];
    setExecutionResults: (val: any[]) => void;
    examId?: string;
    hideSubmit?: boolean;
}

export default function CodingQuestionRenderer({
    question,
    hasAttemptSelected,
    attemptAnswer,
    currentAnswer,
    onAnswerChange,
    onSubmit,
    contentFontSize,
    selectedCodingLang,
    onLanguageChange,
    isRunning,
    setIsRunning,
    terminalLogs,
    setTerminalLogs,
    executionResults,
    setExecutionResults,
    examId,
    hideSubmit = false
}: CodingQuestionRendererProps) {

    // Templates & allowed languages may come from the question (teacher config)
    const codingTemplates = question.codingConfig?.templates || {};
    const allowedLangs = question.codingConfig?.allowedLanguages || Object.keys(codingTemplates) || [];

    // Determine selected language (state kept in selectedCodingLang)
    const activeLangId = selectedCodingLang || (question.codingConfig?.languageId) || (allowedLangs.length ? allowedLangs[0] : PLAYGROUND_LANGUAGES[0].id);
    const template = (codingTemplates as any)[activeLangId] || {};

    // Find base language config and overlay template head/body/footer
    const baseLang = PLAYGROUND_LANGUAGES.find(l => l.id === activeLangId) || PLAYGROUND_LANGUAGES[0];

    // Persistence Logic
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Restore execution results from saved answer
    useEffect(() => {
        const answer = hasAttemptSelected ? attemptAnswer : currentAnswer;
        if (answer && typeof answer === 'object' && Array.isArray(answer.results)) {
            setExecutionResults(answer.results);
        } else {
            setExecutionResults([]);
        }
    }, [hasAttemptSelected, attemptAnswer, currentAnswer, question.id, setExecutionResults]);

    const getSavedCode = () => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(`unit_progress_${question.id}_${activeLangId}`);
    };

    const savedAnswer = mounted ? getSavedCode() : null;

    const handleAnswerChangeWithSave = (newCode: string) => {
        if (typeof window !== 'undefined') {
            const key = `unit_progress_${question.id}_${activeLangId}`;
            localStorage.setItem(key, newCode);
        }
        if (onAnswerChange) {
            if (executionResults && executionResults.length > 0) {
                onAnswerChange({
                    code: newCode,
                    results: executionResults
                });
            } else {
                onAnswerChange(newCode);
            }
        }
    };

    const handleReset = () => {
        if (typeof window !== 'undefined') {
            const key = `unit_progress_${question.id}_${activeLangId}`;
            localStorage.removeItem(key);
        }
        // Force re-render to pick up default
        setMounted(prev => !prev);

        const primaryLangId = question.codingConfig?.languageId;
        const isPrimary = activeLangId === primaryLangId;

        return template.initialCode ?? template.body ?? (isPrimary ? (question.codingConfig?.initialCode ?? question.codingConfig?.body) : undefined) ?? baseLang.initialBody;
    };

    const parseAnswer = (ans: any) => {
        if (typeof ans === 'string') return ans;
        if (ans && ans.code) return ans.code;
        return ans;
    };

    const primaryLangId = question.codingConfig?.languageId;
    const isPrimary = activeLangId === primaryLangId;

    const codingLanguage = {
        ...baseLang,
        id: activeLangId as any,
        header: template.header || template.head || (isPrimary ? (question.codingConfig?.header || question.codingConfig?.head) : "") || "",
        footer: template.footer || template.tail || (isPrimary ? (question.codingConfig?.footer || question.codingConfig?.tail) : "") || "",
        initialBody: parseAnswer(hasAttemptSelected ? attemptAnswer : (savedAnswer ?? currentAnswer ?? template.initialCode ?? template.body ?? (isPrimary ? (question.codingConfig?.initialCode ?? question.codingConfig?.body) : undefined) ?? baseLang.initialBody)),
    };

    const rawTestCases = (question.codingConfig?.testCases || []);
    const showTestCases = question.codingConfig?.showTestCases ?? true;

    let displayedTestCases: any[] = [];

    if (hideSubmit) {
        // Teacher Preview: Show all test cases raw
        displayedTestCases = rawTestCases.map((tc: any) => ({
            ...tc,
            expectedOutput: tc.output || tc.expectedOutput,
            isPublic: true
        }));
    } else {
        // Student view: Show ALL cases but mask non-public or if showTestCases is off
        displayedTestCases = rawTestCases.map((tc: any) => {
            const isActuallyPublic = showTestCases && tc.isPublic;
            return {
                ...tc,
                input: isActuallyPublic ? tc.input : null,
                expectedOutput: isActuallyPublic ? (tc.output || tc.expectedOutput) : null,
                isPublic: isActuallyPublic
            };
        });
    }

    // Overlay execution results if they exist
    if (executionResults.length > 0) {
        if (hideSubmit) {
            displayedTestCases = executionResults;
        } else {
            // Map results to display list, ensuring masking is preserved for non-public ones
            displayedTestCases = executionResults.map((res: any, idx: number) => {
                const isActuallyPublic = showTestCases && res.isPublic;
                return {
                    ...res,
                    input: isActuallyPublic ? res.input : null,
                    expectedOutput: isActuallyPublic ? (res.output || res.expectedOutput) : null,
                    actualOutput: isActuallyPublic ? res.actualOutput : "[Hidden]",
                    error: isActuallyPublic ? res.error : (res.error ? "Error occurred in hidden case" : null),
                    isPublic: isActuallyPublic
                };
            });
        }
    }

    // Custom toolbar content: language selector (restrict to allowedLangs when provided)
    const languageSelector = (
        <div className="flex items-center gap-3">
            <select
                value={activeLangId}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="bg-[#f8f9fa] border border-slate-200 rounded px-2 py-1 text-[11px] font-bold text-slate-600 outline-none hover:border-slate-300 transition-colors"
            >
                {((allowedLangs && allowedLangs.length > 0) ? allowedLangs : PLAYGROUND_LANGUAGES.map(l => l.id)).map((lid: string) => {
                    const opt = PLAYGROUND_LANGUAGES.find(s => s.id === lid) || { id: lid, label: lid } as any;
                    return <option key={lid} value={lid}>{opt.label || lid}</option>;
                })}
            </select>
            <div className="text-sm text-slate-500 font-bold">Language</div>
        </div>
    );

    const handleRun = async (code?: string, input?: string, expected?: string, testCaseIndex?: number) => {
        console.log('UnitRenderer handleRun called', { code: !!code, input, expected, testCaseIndex }); // DEBUG
        if (!code) return;

        // Concatenate header + body + footer
        const fullCode = `${codingLanguage.header}\n${code}\n${codingLanguage.footer}`;

        setIsRunning(true);
        try {
            // If running a test case (not custom input), run ALL test cases via submit
            // If running a test case (not custom input), run ALL test cases via submit
            if (testCaseIndex !== undefined) {
                const result = await CodeExecutionService.submit(
                    question.id,
                    activeLangId,
                    fullCode,
                    examId,
                    question.codingConfig?.testCases // Pass test cases for preview
                );

                // Handle case where backend returns no results (e.g. mismatch in test cases)
                if (!result.results || result.results.length === 0) {
                    const rawTestCases = (question.codingConfig?.testCases || []);
                    if (rawTestCases.length > 0) {
                        const fallbackResults = rawTestCases.map((tc: any) => ({
                            ...tc,
                            input: tc.isPublic ? tc.input : null,
                            expectedOutput: tc.isPublic ? (tc.output || tc.expectedOutput) : null,
                            actualOutput: "No output returned.",
                            passed: false,
                            status: 'Failed',
                            error: 'Execution returned no results.',
                            isPublic: tc.isPublic !== false
                        }));
                        setExecutionResults(fallbackResults);
                        setTerminalLogs('Execution completed but returned no results.');
                        return { passed: false, error: true };
                    }
                }

                setExecutionResults(result.results);

                // Show output for the selected test case in terminal
                const selectedResult = result.results[testCaseIndex];
                let output = selectedResult?.actualOutput || "";

                if (selectedResult?.error) {
                    output += `\n${selectedResult.error}`;
                }

                setTerminalLogs(output);
                return { passed: selectedResult?.passed, error: false };
            } else {
                // Custom Input: Run single execution
                const result = await CodeExecutionService.run(activeLangId, fullCode, input || '');
                let output = result.output || result.stdout || result.stderr || 'Execution finished with no output.';

                setTerminalLogs(output);
                return { passed: true, error: false };
            }
        } catch (error: any) {
            setTerminalLogs('Error running code: ' + error);

            // If we were running a specific test case, update it to show error
            if (testCaseIndex !== undefined) {
                const rawTestCases = (question.codingConfig?.testCases || []);
                const base = (executionResults && executionResults.length > 0) ? executionResults : rawTestCases.map((tc: any) => ({
                    ...tc,
                    isPublic: tc.isPublic !== false,
                    expectedOutput: tc.isPublic ? (tc.output || tc.expectedOutput) : null
                }));

                const newResults = [...base];
                // Mark all as error or just the selected one? 
                // If submit failed, likely all failed or system error.
                // Let's just mark the selected one for now to avoid clearing others if they had state, 
                // but actually we probably want to show error state.
                if (newResults[testCaseIndex]) {
                    newResults[testCaseIndex] = {
                        ...newResults[testCaseIndex],
                        actualOutput: "Error occurred during execution.",
                        passed: false,
                        status: 'Error',
                        error: error.message || String(error)
                    };
                }
                setExecutionResults(newResults);
            }
            return { passed: false, error: true };
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async (code: string) => {
        setIsRunning(true);

        // Concatenate header + body + footer
        const fullCode = `${codingLanguage.header}\n${code}\n${codingLanguage.footer}`;

        try {
            const result = await CodeExecutionService.submit(
                question.id,
                activeLangId,
                fullCode,
                examId,
                question.codingConfig?.testCases // Pass test cases for preview
            );
            console.log('Submission Result:', result); // DEBUG

            let finalResults = result.results;
            let finalTotal = result.totalTests;
            let finalPassed = result.passedTests;

            // Handle empty results fallback
            if (!finalResults || finalResults.length === 0) {
                const rawTestCases = (question.codingConfig?.testCases || []);
                if (rawTestCases.length > 0) {
                    finalResults = rawTestCases.map((tc: any) => ({
                        ...tc,
                        input: tc.isPublic ? tc.input : null,
                        expectedOutput: tc.isPublic ? (tc.output || tc.expectedOutput) : null,
                        actualOutput: "No output returned.",
                        passed: false,
                        status: 'Failed',
                        error: 'Execution returned no results.',
                        isPublic: tc.isPublic !== false
                    }));
                    finalTotal = rawTestCases.length;
                    finalPassed = 0;
                }
            }

            setExecutionResults(finalResults);

            // Calculate score and format test cases string for AttemptsView
            const score = finalTotal > 0 ? Math.round((finalPassed / finalTotal) * 100) : 0;
            const submissionData = {
                ...result,
                results: finalResults, // Use the fallback results if needed
                code: code, // Save only the user's code (body), not the full concatenated code
                score: score,
                testCases: `${finalPassed} / ${finalTotal}`
            };

            // Optionally call parent onSubmit if needed, but we handled execution here
            if (onSubmit) onSubmit(submissionData);

            // Also update the answer state with the execution result so it can be saved
            if (onAnswerChange) {
                onAnswerChange(submissionData);
            }

            return { passed: result.status === 'Accepted', error: false };
        } catch (error) {
            console.error(error);
            // Show error in terminal or relevant place
            setTerminalLogs('Error submitting code: ' + error);
            return { passed: false, error: true };
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <CodeEditor
            language={codingLanguage}
            height="100%"
            fontSize={contentFontSize}
            actions={{
                onRun: (code, input, expected, index) => handleRun(code, input, expected, index),
                onChange: handleAnswerChangeWithSave,
                onSubmit: handleSubmit,
                onReset: handleReset
            }}
            isExecuting={isRunning}
            testCases={displayedTestCases}
            hideLanguageSelector={true}
            customToolbarContent={languageSelector}
            terminalOutput={terminalLogs}
            options={{ readOnly: hasAttemptSelected }}
            hideSubmit={hideSubmit}
        />
    );
}
