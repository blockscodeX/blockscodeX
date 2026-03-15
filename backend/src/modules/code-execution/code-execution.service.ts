import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IExecutionStrategy } from './strategies/execution-strategy.interface';
import { PrismaService } from '../../services/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class CodeExecutionService {
    private queueEvents: QueueEvents | null = null;

    constructor(
        @Inject('IExecutionStrategy')
        private readonly executionStrategy: IExecutionStrategy,
        private readonly prisma: PrismaService,
        @InjectQueue('code-execution') private executionQueue: Queue,
        @InjectRedis() private readonly redis: Redis
    ) { }

    private getQueueEvents(): QueueEvents {
        if (!this.queueEvents) {
            this.queueEvents = new QueueEvents('code-execution', {
                connection: this.executionQueue.opts.connection
            });
        }
        return this.queueEvents;
    }

    async runCode(language: string, code: string, stdin: string) {
        // Add job to queue
        const job = await this.executionQueue.add('execute', {
            language,
            code,
            stdin
        });

        // Wait for the job to finish and return the result
        try {
            const result = await job.waitUntilFinished(this.getQueueEvents());
            return result;
        } catch (error) {
            throw error;
        }
    }

    async submitCode(unitId: string, language: string, code: string, examId?: string, testCasesBody?: any[]) {
        let testCases: any[] = [];

        if (examId) {
            // PERFORMANCE: Cache exam questions to avoid fetching large JSON blobs on every run
            const cacheKey = `exam:questions:${examId}`;
            const cachedQuestions = await this.redis.get(cacheKey);

            let questionsData: any = null;

            if (cachedQuestions) {
                questionsData = JSON.parse(cachedQuestions);
            } else {
                // Handle Exam Question
                const exam = await this.prisma.exam.findFirst({
                    where: {
                        OR: [
                            { id: examId },
                            { slug: examId }
                        ]
                    },
                    select: { id: true, questions: true, slug: true }
                });

                if (!exam) {
                    throw new NotFoundException('Exam not found');
                }
                questionsData = exam.questions;

                // Cache for 10 minutes - exam content rarely changes during the exam
                // We use both ID and Slug as key to ensure hits
                await this.redis.set(`exam:questions:${exam.id}`, JSON.stringify(questionsData), 'EX', 600);
                if (exam.slug) {
                    await this.redis.set(`exam:questions:${exam.slug}`, JSON.stringify(questionsData), 'EX', 600);
                }
            }

            // Find question in exam.questions
            let foundQuestion: any = null;

            // Helper to find question in sections or flat list
            if (Array.isArray(questionsData)) {
                // Check if it's sections or flat
                if (questionsData.length > 0 && questionsData[0].questions) {
                    // Sections
                    for (const section of questionsData) {
                        const q = section.questions?.find((q: any) => q.id === unitId);
                        if (q) {
                            foundQuestion = q;
                            break;
                        }
                    }
                } else {
                    // Flat
                    foundQuestion = questionsData.find((q: any) => q.id === unitId);
                }
            } else if (questionsData?.sections) {
                for (const section of questionsData.sections) {
                    const q = section.questions?.find((q: any) => q.id === unitId);
                    if (q) {
                        foundQuestion = q;
                        break;
                    }
                }
            } else if (typeof questionsData === 'object' && questionsData !== null) {
                // Handle object structure like { "sec-1": { questions: [] } }
                const sections = Object.values(questionsData);
                for (const section of sections as any[]) {
                    if (section && typeof section === 'object' && section.questions && Array.isArray(section.questions)) {
                        const q = section.questions.find((q: any) => q.id === unitId);
                        if (q) {
                            foundQuestion = q;
                            break;
                        }
                    }
                }
            }

            if (!foundQuestion) {
                console.log(`Question not found. ExamId: ${examId}, UnitId: ${unitId}`);
                console.log('Questions Data keys:', Object.keys(questionsData || {}));
                throw new NotFoundException('Question not found in exam');
            }

            // Check for testCases in root OR in codingConfig (to match Unit behavior)
            testCases = foundQuestion.testCases || foundQuestion.codingConfig?.testCases || [];

        } else {
            // 1. Fetch authoritative unit test cases first
            const unit = await this.prisma.unit.findUnique({
                where: { id: unitId },
            });

            if (unit) {
                // Assuming unit.content follows a structure suitable for coding problems
                // generic casting, in a real app we'd want strict DTOs/Validation
                const content: any = unit.content;
                // Check for testCases in content root OR in codingConfig (if structure differs)
                testCases = content.testCases || content.codingConfig?.testCases || [];
            } else if (testCasesBody && Array.isArray(testCasesBody)) {
                // Fallback for preview/authoring flows where question is not persisted yet
                testCases = testCasesBody;
            } else {
                throw new NotFoundException('Unit not found');
            }
        }

        if (!testCases.length) {
            // Should we error or just return passed?
            // Let's assume passed but with warning or empty result
            return {
                status: 'Accepted',
                passedTests: 0,
                totalTests: 0,
                results: []
            };
        }

        // 2. Execute against each test case
        // Use parallel execution to minimize latency
        const results = await Promise.all(testCases.map(async (testCase) => {
            const input = testCase.input || '';
            const expectedOutput = (testCase.expectedOutput || testCase.output || '').trim();
            const isPublic = testCase.isPublic !== false; // Default to true if undefined, unless explicitly false

            try {
                // Use the queue-backed runCode method
                const executionResult = await this.runCode(language, code, input);

                // Clean undefined or null outputs
                const actualOutput = (executionResult.stdout || '').trim();
                const errorOutput = (executionResult.stderr || '').trim();

                // Pass only if actual matches expected AND there are no errors
                const hasError = errorOutput.length > 0 || (executionResult.code !== 0 && executionResult.code !== null);
                const passed = !hasError && actualOutput === expectedOutput;

                return {
                    input: isPublic ? input : null,
                    expectedOutput: isPublic ? expectedOutput : null,
                    actualOutput: isPublic ? actualOutput : null,
                    passed: passed,
                    status: passed ? 'Passed' : 'Failed',
                    isPublic: isPublic, // Keep track of visibility
                    error: isPublic ? (errorOutput || null) : null
                };
            } catch (err: any) {
                console.error(`Test case execution failed: ${err.message}`);
                return {
                    input: isPublic ? input : null,
                    expectedOutput: isPublic ? expectedOutput : null,
                    actualOutput: null,
                    passed: false,
                    status: 'Error',
                    isPublic: isPublic,
                    error: 'Execution failed: ' + (err.message || 'Unknown error')
                };
            }
        }));

        const passedCount = results.filter(r => r.passed).length;

        // 3. Determine final status
        const allPassed = passedCount === testCases.length;

        return {
            status: allPassed ? 'Accepted' : 'Wrong Answer',
            passedTests: passedCount,
            totalTests: testCases.length,
            results: results,
        };
    }
}
