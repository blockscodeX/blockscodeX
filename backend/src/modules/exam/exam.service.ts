import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { PrismaService } from '../../services/prisma/prisma.service';
import { sanitizeQuestionForClient, shouldSanitizeSensitiveContent } from '../common/testcase-visibility.util';
import { toStudentExamResponseDto } from './dto/exam-response.dto';

@Injectable()
export class ExamService {
    constructor(
        private prisma: PrismaService,
        @InjectRedis() private readonly redis: Redis
    ) { }

    async createExam(data: any) {
        try {
            return await this.prisma.exam.create({
                data: {
                    title: data.title,
                    slug: data.slug,
                    duration: data.duration || 60,
                    questions: data.questions,
                    strictness: data.strictness || 'high',
                }
            });
        } catch (e) {
            if (e.code === 'P2002') throw new ConflictException('Slug already exists');
            throw e;
        }
    }

    async getExamIdBySlug(slug: string, user?: any) {
        // PERFORMANCE: Check Cache
        const cacheKey = `exam:lookup:${slug}`;
        const cached = await this.redis.get(cacheKey);

        let foundData = cached ? JSON.parse(cached) : null;

        if (!foundData) {
            // Lightweight lookup for Start Session
            // 1. Exam
            const exam = await this.prisma.exam.findUnique({
                where: { slug },
                select: { id: true, orgId: true, isActive: true, allowedIPs: true, examMode: true }
            });

            if (exam) {
                foundData = { ...exam, type: 'exam' };
            } else {
                // 2. Course Test
                const test = await this.prisma.courseTest.findUnique({
                    where: { slug },
                    select: { id: true, course: { select: { orgId: true } } }
                });

                if (test) {
                    foundData = { id: test.id, orgId: test.course?.orgId, type: 'test' };
                } else {
                    // 3. Course (Curriculum)
                    const course = await this.prisma.course.findUnique({
                        where: { slug },
                        select: { id: true, orgId: true }
                    });
                    if (course) {
                        foundData = { ...course, type: 'course' };
                    }
                }
            }

            if (foundData) {
                console.log(`[ExamService] Resolved slug '${slug}' to type '${foundData.type}' with ID: ${foundData.id}`);
                await this.redis.set(cacheKey, JSON.stringify(foundData), 'EX', 3600);
            }
        }

        if (foundData) {
            if (foundData.type === 'exam' && typeof foundData.examMode === 'undefined') {
                const examModeRecord = await this.prisma.exam.findUnique({
                    where: { id: foundData.id },
                    select: { examMode: true }
                });
                foundData.examMode = examModeRecord?.examMode;
            }

            if (foundData.isActive === false) throw new NotFoundException('Exam is not active');
            if (user && user.role !== 'SUPER_ADMIN' && foundData.orgId && foundData.orgId !== user.orgId) {
                throw new NotFoundException('Access Denied');
            }
            return foundData;
        }

        throw new NotFoundException('Exam not found');
    }

    async getExamBySlug(slug: string, user?: any) {
        // PERFORMANCE: Check Cache
        const cacheKey = `exam:content:${slug}`;
        const cached = await this.redis.get(cacheKey);

        let entity = cached ? JSON.parse(cached) : null;

        if (entity) {
            // ISOLATION CHECK from Cached Data
            if (user && user.role !== 'SUPER_ADMIN') {
                if (entity.orgId && entity.orgId !== user.orgId) {
                    throw new NotFoundException('Assessment not found or access denied');
                }
            }
            return this.transformExam(entity, !shouldSanitizeSensitiveContent(user));
        }

        // 1. Try finding all at once using Promise.all to reduce latency
        const [exam, courseTest, course] = await Promise.all([
            this.prisma.exam.findUnique({
                where: { slug, isActive: true },
            }),
            this.prisma.courseTest.findUnique({
                where: { slug },
                include: { course: true }
            }),
            this.prisma.course.findUnique({
                where: { slug },
                include: {
                    modules: {
                        include: { units: true },
                        orderBy: { order: 'asc' }
                    }
                }
            })
        ]);

        if (exam) {
            // Cache before check
            await this.redis.set(cacheKey, JSON.stringify(exam), 'EX', 3600);

            // ISOLATION CHECK
            if (user && user.role !== 'SUPER_ADMIN') {
                if (exam.orgId && exam.orgId !== user.orgId) {
                    throw new NotFoundException('Assessment not found or access denied');
                }
            }
            return this.transformExam(exam, !shouldSanitizeSensitiveContent(user));
        }

        if (courseTest) {
            const mappedTest = { ...courseTest, orgId: courseTest.course.orgId };
            // Cache
            await this.redis.set(cacheKey, JSON.stringify(mappedTest), 'EX', 3600);

            // ISOLATION CHECK from Course
            if (user && user.role !== 'SUPER_ADMIN') {
                if (courseTest.course.orgId && courseTest.course.orgId !== user.orgId) {
                    throw new NotFoundException('Assessment not found');
                }
            }

            console.log('Found CourseTest:', JSON.stringify(courseTest, null, 2));
            const transformed = this.transformCourseTest(courseTest, !shouldSanitizeSensitiveContent(user));
            // Add startTime for frontend timer calculation
            (transformed as any).startTime = courseTest.startDate || courseTest.createdAt;
            return transformed;
        }

        if (course) {
            // ISOLATION CHECK
            if (user && user.role !== 'SUPER_ADMIN') {
                if (course.orgId && course.orgId !== user.orgId) {
                    throw new NotFoundException('Assessment not found');
                }
            }
            return this.transformCourse(course, !shouldSanitizeSensitiveContent(user));
        }

        throw new NotFoundException('Assessment not found');
    }

    async getPublicStatus(slug: string, ip?: string) {
        console.log(`[ExamService] Checking public status for slug: ${slug}, ip: ${ip}`);

        const exam = await this.prisma.exam.findUnique({
            where: { slug, isActive: true },
            select: { title: true, startTime: true, duration: true, id: true, questions: true, totalMarks: true, allowedIPs: true, examMode: true }
        });

        if (exam) {
            console.log(`[ExamService] Found Exam: ${exam.title}`);

            if (exam.allowedIPs && exam.allowedIPs.trim().length > 0 && ip) {
                const allowedList = exam.allowedIPs.split(',').map((i: string) => i.trim());
                const cleanIp = ip.replace(/^::ffff:/, '');
                const isAllowed = allowedList.some((allowedIp: string) =>
                    allowedIp === cleanIp || allowedIp === ip
                );

                if (!isAllowed) {
                    throw new UnauthorizedException('Access denied: Your IP address is not whitelisted for this exam');
                }
            }

            const rawQuestions: any = exam.questions || {};
            let totalQuestions = 0;
            let totalSections = 0;

            if (rawQuestions.sections && Array.isArray(rawQuestions.sections)) {
                totalSections = rawQuestions.sections.length;
                rawQuestions.sections.forEach((s: any) => {
                    if (Array.isArray(s.questions)) {
                        totalQuestions += s.questions.length;
                    }
                });
            } else if (Array.isArray(rawQuestions)) {
                totalSections = 1;
                totalQuestions = rawQuestions.length;
            } else if (Object.keys(rawQuestions).length > 0) { // Handle flat object of questions
                totalSections = 1;
                totalQuestions = Object.keys(rawQuestions).length;
            }


            return {
                title: exam.title,
                startTime: exam.startTime,
                duration: exam.duration,
                examMode: exam.examMode || 'Browser',
                totalSections: totalSections,
                totalQuestions: totalQuestions,
                totalMarks: exam.totalMarks || (totalQuestions * 1),
                id: exam.id
            };
        }

        // Check Course Test
        const courseTest = await this.prisma.courseTest.findUnique({
            where: { slug },
            select: { title: true, startDate: true, endDate: true, id: true, questions: true }
        });

        if (courseTest) {
            console.log(`[ExamService] Found CourseTest: ${courseTest.title}`);
            let duration = 60;
            if (courseTest.startDate && courseTest.endDate) {
                const diffMs = courseTest.endDate.getTime() - courseTest.startDate.getTime();
                duration = Math.floor(diffMs / 60000);
            }

            const rawQuestions: any = courseTest.questions || {};
            let totalQuestions = 0;
            let totalSections = 1;

            if (rawQuestions.sections && Array.isArray(rawQuestions.sections)) {
                totalSections = rawQuestions.sections.length;
                rawQuestions.sections.forEach((s: any) => {
                    if (Array.isArray(s.questions)) {
                        totalQuestions += s.questions.length;
                    }
                });
            } else if (Array.isArray(rawQuestions)) {
                totalQuestions = rawQuestions.length;
            }

            return {
                title: courseTest.title,
                startTime: courseTest.startDate,
                duration: duration,
                totalSections: totalSections,
                totalQuestions: totalQuestions,
                totalMarks: totalQuestions * 1,
                id: courseTest.id
            };
        }

        throw new NotFoundException(`Exam not found for slug: ${slug}`);
    }


    private normalizeType(type: string): string {
        const t = type.toLowerCase();
        if (t.includes('multi') || t.includes('select')) return 'MultiSelect';
        if (t.includes('mcq') || t.includes('quiz') || t.includes('choice')) return 'MCQ';
        if (t.includes('code') || t.includes('coding') || t.includes('program')) return 'Coding';
        if (t.includes('web') || t.includes('html')) return 'Web';
        if (t.includes('read') || t.includes('text') || t.includes('lesson')) return 'Reading';
        if (t.includes('notebook') || t.includes('jupyter')) return 'Notebook';
        return 'MCQ'; // Default fallback
    }

    public transformExam(exam: any, includeSensitive: boolean = true) {
        const questionsMap: Record<string, any> = {};
        const finalSections: any[] = [];

        // 1. Build a comprehensive map of all items found in the 'questions' JSON
        // This handles cases where 'questions' is a map of sections, or just an array
        const rawQuestions = exam.questions || {};
        const sourceMap = (rawQuestions.sections || !Array.isArray(rawQuestions)) ? (rawQuestions.sections || rawQuestions) : {};
        const sourceArray = Array.isArray(rawQuestions) ? rawQuestions : Object.values(sourceMap);

        const registerQuestion = (q: any, parentId?: string, index?: number) => {
            const qId = q.id || `${parentId || 'q'}-${index || Math.random()}`;
            const normalizedQ = {
                ...q,
                id: qId,
                title: q.title || `Question ${index || ''}`,
                description: q.description || q.problemStatement || '',
                type: this.normalizeType(q.type || 'MCQ'),
                mcqOptions: q.mcqOptions || q.options || q.mcq?.options,
                codingConfig: q.codingConfig || q.coding,
                webConfig: q.webConfig || q.web,
                readingContent: q.readingContent || q.readingConfig?.contentBlocks || q.readingConfig
            };
                questionsMap[qId] = sanitizeQuestionForClient(normalizedQ, includeSensitive);
            return qId;
        };

        // Pre-fill map from source
        sourceArray.forEach((item: any) => {
            if (!item || typeof item !== 'object') return;
            if (Array.isArray(item.questions)) {
                item.questions.forEach((q: any, i: number) => registerQuestion(q, item.id || 'sec', i + 1));
            } else {
                registerQuestion(item);
            }
        });

        // 2. Process existing sections structure if present in DB
        if (Array.isArray(exam.sections) && exam.sections.length > 0) {
            exam.sections.forEach((s: any, sIdx: number) => {
                const sectionQuestions: any[] = [];
                (s.questions || []).forEach((sq: any) => {
                    // Check if this ID points to a section entry in our source map
                    const sourceItem = sourceMap[sq.id];
                    if (sourceItem && Array.isArray(sourceItem.questions)) {
                        // Spread sub-questions into this section
                        sourceItem.questions.forEach((lq: any, lqIdx: number) => {
                            const lqId = registerQuestion(lq, sourceItem.id, lqIdx + 1);
                            sectionQuestions.push({ id: lqId, status: 'unanswered', number: sectionQuestions.length + 1 });
                        });
                    } else if (questionsMap[sq.id]) {
                        // Standard question
                        sectionQuestions.push({ ...sq, number: sectionQuestions.length + 1 });
                    }
                });

                if (sectionQuestions.length > 0) {
                    finalSections.push({
                        ...s,
                        status: sIdx === 0 ? 'active' : 'locked',
                        questions: sectionQuestions
                    });
                }
            });
        }

        // 3. If no sections were built from Step 2, build from Step 1's source map
        if (finalSections.length === 0) {
            sourceArray.forEach((item: any, idx: number) => {
                if (!item || typeof item !== 'object') return;

                const sectionQuestions: any[] = [];
                if (Array.isArray(item.questions)) {
                    item.questions.forEach((q: any, qIdx: number) => {
                        const qId = registerQuestion(q, item.id, qIdx + 1);
                        sectionQuestions.push({ id: qId, status: 'unanswered', number: sectionQuestions.length + 1 });
                    });

                    finalSections.push({
                        id: item.id || `s${idx + 1}`,
                        title: item.title || `Section ${idx + 1}`,
                        status: finalSections.length === 0 ? 'active' : 'locked',
                        questions: sectionQuestions
                    });
                } else {
                    // Handle flat questions by grouping into a default section
                    const qId = registerQuestion(item, 'q', idx + 1);
                    const defaultSection = finalSections.find(fs => fs.id === 'default-section');
                    if (defaultSection) {
                        defaultSection.questions.push({ id: qId, status: 'unanswered', number: defaultSection.questions.length + 1 });
                    } else {
                        finalSections.push({
                            id: 'default-section',
                            title: 'Assessment',
                            status: 'active',
                            questions: [{ id: qId, status: 'unanswered', number: 1 }]
                        });
                    }
                }
            });
        }

        const transformed = {
            ...exam,
            sections: finalSections,
            questions: questionsMap
        };

        if (!includeSensitive) {
            return toStudentExamResponseDto(transformed);
        }

        return transformed;
    }

    public transformCourseTest(test: any, includeSensitive: boolean = true) {
        // Course Tests are already stored with 'questions' which is the sections JSON
        const questionsData = test.questions as any;
        // Handle both: arrays (sections list) or object with sections key
        const sections = Array.isArray(questionsData) ? questionsData : (questionsData.sections || []);

        const questionsMap: Record<string, any> = {};

        // Normalize types and preserve all fields
        const normalizedSections = sections.map((s: any) => ({
            ...s,
            questions: s.questions.map((q: any) => {
                const normalizedType = this.normalizeType(q.type || 'MCQ');
                const normalizedQ = {
                    ...q,
                    id: q.id,
                    title: q.title || 'Untitled Question',
                    description: q.description || q.problemStatement || '', // Support both field names
                    type: normalizedType,
                    // Preserve specific configs if they exist, or map from flat structure if needed
                    mcqOptions: q.mcqOptions || q.options,
                    codingConfig: q.codingConfig || q.coding,
                    webConfig: q.webConfig || q.web,
                    readingContent: q.readingContent || q.readingConfig?.contentBlocks || q.readingConfig
                };

                const safeQ = sanitizeQuestionForClient(normalizedQ, includeSensitive);

                // Ensure map gets the full object
                questionsMap[q.id] = safeQ;
                return safeQ;
            })
        }));

        let duration = 60;
        if (test.startDate && test.endDate) {
            const diffMs = new Date(test.endDate).getTime() - new Date(test.startDate).getTime();
            duration = Math.floor(diffMs / 60000);
        }

        console.log(`[ExamService] Transforming CourseTest "${test.slug}". Found ${normalizedSections.length} sections.`);
        normalizedSections.forEach((s: any, i: number) => {
            console.log(`  Section ${i + 1} ("${s.id}"): ${s.questions.length} questions`);
        });

        return {
            id: test.id,
            title: test.title,
            slug: test.slug,
            duration: duration,
            sections: normalizedSections,
            questions: questionsMap, // This is critical for looking up current question
            isCourseTest: true,
            courseTitle: test.course?.title
        };
    }

    public transformCourse(course: any, includeSensitive: boolean = true) {
        const questionsMap: Record<string, any> = {};
        const sections = course.modules.map((m: any, mIdx: number) => {
            const questions = m.units.map((u: any, uIdx: number) => {
                const qId = u.id;
                // Transform Unit to UnitQuestion format
                const unitContent = u.content as any;
                const normalizedType = this.normalizeType(u.type);

                const normalizedUnit = {
                    ...unitContent,
                    id: qId,
                    title: u.title,
                    type: normalizedType
                };
                questionsMap[qId] = sanitizeQuestionForClient(normalizedUnit, includeSensitive);
                return { id: qId, status: 'unanswered', number: uIdx + 1 };
            });

            return {
                id: m.id,
                title: m.title,
                status: mIdx === 0 ? 'active' : 'locked',
                questions: questions
            };
        });

        return {
            id: course.id,
            title: course.title,
            slug: course.slug,
            sections: sections,
            questions: questionsMap,
            isCourse: true
        };
    }

    async startSession(userId: string, examId: string, ip: string, deviceId: string, tabId?: string, metadata?: any) {
        try {
            // Find existing session first to resume
            const existing = await this.prisma.examSession.findUnique({
                where: { userId_examId: { userId, examId } },
                include: {
                    violations: {
                        where: { type: { in: ['TAB_SWITCH', 'TAB_SWITCH_OUT', 'TAB_SWITCH_IN'] } }
                    }
                }
            });

            if (existing) {
                if (existing.status === 'TERMINATED') {
                    throw new ConflictException('EXAM_TERMINATED');
                }
                // If metadata changed, we could update it. But typically it stays same for the session.
                // We'll update it if provided to ensure the latest "Name/Roll No" from login is preserved.
                if (metadata) {
                    const currentAnswers = typeof existing.answers === 'string'
                        ? JSON.parse(existing.answers)
                        : (existing.answers || {});

                    const updatedAnswers = {
                        ...currentAnswers,
                        _internal_metadata: {
                            ...(currentAnswers._internal_metadata || {}),
                            ...metadata
                        }
                    };

                    await this.prisma.examSession.update({
                        where: { id: existing.id },
                        data: { answers: updatedAnswers }
                    });
                }

                // Merge Redis-cached answers with DB answers for fast restore
                // Redis may have answers that BullMQ hasn't persisted yet
                try {
                    const redisKey = `session:answers:${existing.id}`;
                    const cachedAnswers = await this.redis.get(redisKey);
                    if (cachedAnswers) {
                        const dbAnswers = typeof existing.answers === 'string'
                            ? JSON.parse(existing.answers)
                            : (existing.answers || {});
                        const redisAnswers = JSON.parse(cachedAnswers);
                        // Merge: Redis answers take priority (they're more recent)
                        (existing as any).answers = { ...dbAnswers, ...redisAnswers };
                    }
                } catch (e) {
                    console.error('[ExamService] Redis answer merge failed, using DB answers:', e);
                }

                // CHECK FEEDBACK STATUS
                const feedbackRecord = await this.prisma.feedback.findFirst({
                    where: { userId, examId }
                });

                // Add violation counts to existing object
                (existing as any).tabSwitchOutCount = existing.violations.filter((v: any) => v.type === 'TAB_SWITCH' || v.type === 'TAB_SWITCH_OUT').length;
                (existing as any).tabSwitchInCount = existing.violations.filter((v: any) => v.type === 'TAB_SWITCH_IN').length;
                (existing as any).feedbackDone = !!feedbackRecord;
                return existing;
            }

            console.log(`[ExamService] Creating new session for examId: ${examId}, userId: ${userId}`);

            return await this.prisma.examSession.create({
                data: {
                    userId,
                    examId,
                    ipAddress: ip,
                    deviceId,
                    startTime: new Date(),
                    answers: metadata ? { _internal_metadata: metadata } : {}
                }
            });
        } catch (e) {
            console.error('[ExamService] Failed to start/resume session', e);
            throw e;
        }
    }

    async getAppConfig() {
        return { version: '1.0.0', features: ['monitoring', 'lockdown'] };
    }

    async checkExamStatus(slug: string) {
        // 1. Try Exam
        const exam = await this.prisma.exam.findUnique({
            where: { slug },
            select: { id: true, title: true, slug: true, isActive: true, duration: true, questions: true }
        });

        if (exam) {
            if (!exam.isActive) {
                return { quiz: null, error: 'Exam is not active' };
            }

            // Calculate total questions lightweight
            let totalQuestions = 0;
            const rawQuestions: any = exam.questions || {};
            if (rawQuestions.sections && Array.isArray(rawQuestions.sections)) {
                rawQuestions.sections.forEach((s: any) => {
                    if (Array.isArray(s.questions)) totalQuestions += s.questions.length;
                });
            } else if (Array.isArray(rawQuestions)) {
                totalQuestions = rawQuestions.length;
            } else if (Object.keys(rawQuestions).length > 0) {
                totalQuestions = Object.keys(rawQuestions).length;
            }

            return {
                quiz: {
                    id: exam.id,
                    title: exam.title,
                    slug: exam.slug,
                    isActive: exam.isActive,
                    duration: exam.duration * 60, // Normalize to seconds if stored in mins? Usually stored in mins. User sample says 3600 (seconds?). 
                    // Let's assume stored in minutes, user wants seconds? 
                    // "duration": 3600 -> 60 mins.
                    // If DB has 60, return 3600? Let's assume DB is minutes.
                    totalQuestions
                },
                error: null
            };
        }

        // 2. Try CourseTest
        const test = await this.prisma.courseTest.findUnique({
            where: { slug },
            select: { id: true, title: true, slug: true, questions: true }
        });

        if (test) {
            // CourseTests don't have explicit 'isActive', assume date based or always active?
            // Assuming active for now.

            let totalQuestions = 0;
            const rawQuestions: any = test.questions || {};
            if (rawQuestions.sections && Array.isArray(rawQuestions.sections)) {
                rawQuestions.sections.forEach((s: any) => {
                    if (Array.isArray(s.questions)) totalQuestions += s.questions.length;
                });
            } else if (Array.isArray(rawQuestions)) {
                totalQuestions = rawQuestions.length;
            }

            return {
                quiz: {
                    id: test.id,
                    title: test.title,
                    slug: test.slug,
                    isActive: true,
                    duration: 3600, // Default or fetch start/end difference
                    totalQuestions
                },
                error: null
            };
        }

        return { quiz: null, error: 'Exam not found' };
    }

    async getMonitoredStudents(examId: string) {
        const sessions = await this.prisma.examSession.findMany({
            where: { examId },
            include: { user: true, violations: true }
        });

        return sessions.map((session: any) => ({
            name: session.user?.name || 'Unknown',
            id: session.user?.rollNumber || session.userId.substring(0, 8),
            status: session.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed',
            ip: session.ipAddress,
            tabOuts: session.violations.filter((v: any) => v.type === 'TAB_SWITCH').length,
            tabIns: 0,
            vmDetected: session.vmDetected,
            vmType: session.vmDetected ? 'Generic VM' : undefined,
            appVersion: '1.0.0',
            monitors: 1,
            startTime: session.startTime.toLocaleTimeString(),
            endTime: session.endTime ? session.endTime.toLocaleTimeString() : '-',
            loginCount: 1,
            sleepDuration: '0s',
            lastActivity: 'Just now',
            isHighRisk: session.violations.length > 2 || session.vmDetected,
            logs: session.violations.map((v: any) => ({
                time: v.timestamp.toLocaleTimeString(),
                event: v.type,
                description: v.message || 'Violation detected'
            }))
        }));
    }

    async getFeedbacks(examId: string) {
        return await this.prisma.feedback.findMany({
            where: { examId },
            include: { user: true },
            orderBy: { timestamp: 'desc' }
        });
    }

    async saveFeedback(userId: string, examId: string, rating: number, comment: string) {
        return await this.prisma.feedback.upsert({
            where: {
                userId_examId: { userId, examId }
            },
            update: {
                rating,
                comment,
                timestamp: new Date()
            },
            create: {
                userId,
                examId,
                rating,
                comment,
                timestamp: new Date()
            }
        });
    }

    public calculateScore(answers: any, questionsData: any) {
        if (!answers || !questionsData) return 0;

        let score = 0;
        let sections = [];

        if (Array.isArray(questionsData)) {
            // Flat array of questions or sections
            if (questionsData.length > 0 && questionsData[0].questions) {
                sections = questionsData;
            } else {
                sections = [{ questions: questionsData }];
            }
        } else if (questionsData.sections) {
            sections = questionsData.sections;
        } else if (typeof questionsData === 'object') {
            // Handle case where questionsData is an object of questions
            sections = [{ questions: Object.values(questionsData) }];
        }

        sections.forEach((section: any) => {
            const questions = section.questions || [];
            questions.forEach((q: any) => {
                const studentAnswer = answers[q.id];
                if (studentAnswer === undefined || studentAnswer === null) return;

                const qType = (q.type || '').toUpperCase();

                if (qType === 'MCQ' || qType === 'MULTISELECT') {
                    const options = q.mcqOptions || q.options || [];
                    if (qType === 'MCQ') {
                        const correctOption = options.find((opt: any) => opt.isCorrect);
                        const selectedId = Array.isArray(studentAnswer) ? studentAnswer[0] : studentAnswer;
                        if (correctOption && selectedId === correctOption.id) {
                            score += Number(q.points) || 1;
                        }
                    } else {
                        // MultiSelect
                        const correctIds = options.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.id);
                        const studentIds = Array.isArray(studentAnswer) ? studentAnswer : [];
                        if (correctIds.length === studentIds.length && correctIds.every((id: string) => studentIds.includes(id))) {
                            score += Number(q.points) || 1;
                        }
                    }
                } else if (qType === 'CODING') {
                    // Logic for coding score based on test cases passed
                    const testResults = studentAnswer.testResults || studentAnswer.results;
                    if (testResults && Array.isArray(testResults)) {
                        const passed = testResults.filter((r: any) => r.passed).length;
                        const total = testResults.length;
                        if (total > 0) {
                            score += (passed / total) * (Number(q.points) || 10);
                        }
                    }
                }
            });
        });

        return Math.round(score * 100) / 100;
    }
}
