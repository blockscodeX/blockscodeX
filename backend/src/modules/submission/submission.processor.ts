import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../services/prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Processor('submission_queue', {
    // Optimize for serverless Redis (reduce command usage)
    stalledInterval: 300000, // 5 minutes
    maxStalledCount: 3,
    lockDuration: 60000, // 60s
    concurrency: 5 // Process 5 answers in parallel
})
export class SubmissionProcessor extends WorkerHost {
    constructor(
        private prisma: PrismaService,
        @InjectRedis() private readonly redis: Redis,
        @InjectQueue('student-analytics') private studentAnalyticsQueue: Queue
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        switch (job.name) {
            case 'save_answer':
                return this.handleSaveAnswer(job);
            case 'auto_submit':
                return this.handleAutoSubmit(job);
        }
    }

    private async handleSaveAnswer(job: Job) {
        const { sessionId, answer } = job.data;
        // console.log(`[SubmissionProcessor] Saving answer for session ${sessionId}:`, JSON.stringify(answer));

        try {
            // PERFORMANCE: Check Redis for cached grading data (Exam Questions)
            // We need examId first. We can cache "session:meta:{sessionId}" -> { examId, examQuestions }

            const sessionCacheKey = `session:meta:${sessionId}`;
            const cachedSession = await this.redis.get(sessionCacheKey);

            let examQuestions = null;
            let sessionStatus = null;

            if (cachedSession) {
                const meta = JSON.parse(cachedSession);
                examQuestions = meta.questions;
                sessionStatus = meta.status;
            } else {
                // Fetch from DB
                const session = await this.prisma.examSession.findUnique({
                    where: { id: sessionId },
                    select: {
                        id: true,
                        status: true,
                        exam: {
                            select: { questions: true }
                        }
                    }
                });

                if (session) {
                    examQuestions = session.exam?.questions;
                    sessionStatus = session.status;

                    if (examQuestions) {
                        // Cache for the duration of the exam session (e.g., 3 hours)
                        await this.redis.set(sessionCacheKey, JSON.stringify({
                            examId: session.id, // Not really needed but structure
                            questions: examQuestions,
                            status: session.status
                        }), 'EX', 10800);
                    }
                }
            }

            // CHECK STATUS: If terminated or completed, ignore answers
            if (sessionStatus === 'TERMINATED' || sessionStatus === 'COMPLETED') {
                // console.log(`[SubmissionProcessor] Ignored answer for ${sessionStatus} session ${sessionId}`);
                return;
            }

            let internalMarks: Record<string, number> = {};
            if (examQuestions) {
                // Reuse variable name to minimize code change in logic below
                // const examQuestions = session.exam.questions as any; <-- Removed

                // Helper to find question
                const findQuestion = (questionsData: any, questionId: string) => {
                    // 1. Check if it's in sections
                    if (questionsData.sections && Array.isArray(questionsData.sections)) {
                        for (const section of questionsData.sections) {
                            if (section.questions) {
                                const q = section.questions.find((q: any) => q.id === questionId);
                                if (q) return q;
                            }
                        }
                    }

                    // 2. Check if questionsData is array of sections or questions
                    if (Array.isArray(questionsData)) {
                        for (const item of questionsData) {
                            // If item is section
                            if (item.questions && Array.isArray(item.questions)) {
                                const q = item.questions.find((q: any) => q.id === questionId);
                                if (q) return q;
                            }
                            // If item is question
                            if (item.id === questionId) return item;
                        }
                    }

                    // 3. Check if map (object with section keys)
                    if (typeof questionsData === 'object' && questionsData !== null) {
                        // Direct access check
                        if (questionsData[questionId]) return questionsData[questionId];

                        // Iterate over values (sections)
                        const sections = Object.values(questionsData);
                        for (const section of sections as any[]) {
                            if (section && typeof section === 'object' && section.questions && Array.isArray(section.questions)) {
                                const q = section.questions.find((q: any) => q.id === questionId);
                                if (q) return q;
                            }
                        }
                    }

                    return null;
                };

                // Calculate marks for each answered question
                for (const [qId, ans] of Object.entries(answer)) {
                    if (qId.startsWith('_')) continue;

                    const question = findQuestion(examQuestions, qId);
                    if (!question) continue;

                    let marks = 0;

                    if (question.type === 'MCQ' || question.type === 'MultiSelect') {
                        const options = question.mcqOptions || question.options || [];
                        const correctIds = options.filter((o: any) => o.isCorrect).map((o: any) => o.id);
                        const selectedIds = Array.isArray(ans) ? ans : [ans];

                        // Check if correct (exact match)
                        const isCorrect = JSON.stringify(selectedIds.sort()) === JSON.stringify(correctIds.sort());

                        if (isCorrect) {
                            marks = question.marks || 1;
                        }
                    } else if (question.type === 'Coding') {
                        // Check for execution result in answer
                        // The answer object itself might be the result, or it might be nested
                        const result = (typeof ans === 'object' && (ans as any).executionResult) ? (ans as any).executionResult : ans;

                        if (result && typeof result === 'object') {
                            const testCases = question.codingConfig?.testCases || [];
                            const resultsArray = result.testResults || result.results;

                            if (resultsArray && Array.isArray(resultsArray)) {
                                resultsArray.forEach((res: any, idx: number) => {
                                    if (res.passed) {
                                        const tc = testCases[idx];
                                        // Use test case marks/points if available, else distribute total marks
                                        const tcPoints = tc?.marks || tc?.points;
                                        const tcMarks = tcPoints ? parseFloat(tcPoints) : (question.marks ? question.marks / testCases.length : 0);
                                        marks += tcMarks;
                                    }
                                });
                            }
                        }
                    }

                    internalMarks[qId] = marks;
                }
            }

            // 2. Merge marks with existing marks (Fetch-Modify-Save pattern)
            // We need to fetch current answers to merge _internal_marks correctly
            // Note: This loses strict atomicity but is necessary for deep merge of _internal_marks

            // However, to minimize race conditions, we can try to use the atomic update for the answer part,
            // and a separate update for marks? No, that's worse.

            // Let's use the atomic update for the ANSWER, and then a separate update for MARKS.
            // This way, the answer is always saved safely. The marks might have a race condition but it's less critical (can be re-calculated).

            // Step B: Update Marks (if any)
            if (Object.keys(internalMarks).length > 0) {
                // We need to fetch current _internal_marks, merge, and save back.
                const currentSession = await this.prisma.examSession.findUnique({
                    where: { id: sessionId },
                    select: { answers: true }
                });

                const currentAnswers = (currentSession?.answers as any) || {};
                const currentMarks = currentAnswers._internal_marks || {};
                const newMarks = { ...currentMarks, ...internalMarks };

                const totalScore = Object.values(newMarks).reduce((a: any, b: any) => a + b, 0);

                // We only update _internal_marks key in the jsonb
                await this.prisma.$executeRawUnsafe(
                    `UPDATE "ExamSession" 
                     SET "answers" = jsonb_set("answers", '{_internal_marks}', $1::jsonb),
                         "score" = $3,
                         "updatedAt" = NOW()
                     WHERE "id" = $2`,
                    JSON.stringify(newMarks),
                    sessionId,
                    totalScore
                );
            }

            // Trigger question attempts for analytics
            const sessionUser = await this.prisma.examSession.findUnique({
                where: { id: sessionId }, select: { userId: true }
            });
            const userId = sessionUser?.userId;

            for (const [qId, ans] of Object.entries(answer)) {
                if (qId.startsWith('_')) continue;

                const isCorrect = (internalMarks[qId] || 0) > 0;

                await this.studentAnalyticsQueue.add('save-question-attempt', {
                    userId,
                    itemId: qId,
                    sessionId: sessionId,
                    type: 'EXAM',
                    content: ans,
                    isCorrect: isCorrect,
                    score: internalMarks[qId]
                });
            }

            // console.log(`[SubmissionProcessor] Atomic update completed for ${sessionId}`);
        } catch (error) {
            console.error('[SubmissionProcessor] Failed to save answer:', error);
            throw error; // Retry job
        }
    }

    private async handleAutoSubmit(job: Job) {
        const { sessionId } = job.data;
        console.log(`Auto-submitting session: ${sessionId}`);

        // Ensure score is calculated (in case of race conditions or missing updates)
        const session = await this.prisma.examSession.findUnique({
            where: { id: sessionId },
            select: { answers: true, score: true, userId: true }
        });

        let finalScore = session?.score;

        if (finalScore === null || finalScore === undefined) {
            const answers = (session?.answers as any) || {};
            const marks = answers._internal_marks || {};
            finalScore = Object.values(marks).reduce((a: any, b: any) => a + b, 0) as number;
        }

        await this.prisma.examSession.update({
            where: { id: sessionId },
            data: {
                status: 'COMPLETED',
                endTime: new Date(),
                score: finalScore
            }
        });

        // Trigger analytics updates
        if (session) {
            await this.studentAnalyticsQueue.add('update-streak', { userId: session.userId });
        }
    }
}
