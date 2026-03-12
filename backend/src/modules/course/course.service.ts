import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class CourseService {
    constructor(
        private prisma: PrismaService,
        @InjectRedis() private readonly redis: Redis
    ) { }

    async getCourse(slug: string, user?: any) {
        // PERFORMANCE: Check cache
        // Note: We cache based on slug. If orgId checks are needed per user, we must ensure cache isn't leaking data.
        // Public courses or courses accessible to current user.
        // Since getCourse is mostly about content manifest, we can cache the result.
        // However, we perform an isolation check AFTER fetching.
        // So we can cache the RAW course data by slug, then check permissions.

        const cacheKey = `course:${slug}`;
        const cached = await this.redis.get(cacheKey);

        let course;

        if (cached) {
            course = JSON.parse(cached);
        } else {
            course = await this.prisma.course.findUnique({
                where: { slug },
                include: {
                    modules: {
                        orderBy: { order: 'asc' },
                        include: {
                            units: {
                                orderBy: { order: 'asc' },
                                select: {
                                    id: true,
                                    title: true,
                                    type: true,
                                    order: true
                                }
                            }
                        }
                    },
                    tests: {
                        orderBy: { startDate: 'asc' },
                        select: {
                            id: true,
                            slug: true,
                            title: true,
                            startDate: true,
                            endDate: true,
                            questions: true
                        }
                    }
                }
            });

            if (course) {
                // Cache for 1 hour
                await this.redis.set(cacheKey, JSON.stringify(course), 'EX', 3600);
            }
        }

        if (!course) throw new NotFoundException('Course not found');

        // ISOLATION CHECK
        if (user && user.role !== 'SUPER_ADMIN') {
            if (course.orgId && course.orgId !== user.orgId) {
                throw new NotFoundException('Course not found or access denied');
            }
        }

        return course;
    }

    // Invalidated cache for courses/units/tests whenever they are updated
    // This method should be called by TeacherService/AdminService when updating content
    async invalidateCourseCache(slug: string) {
        await this.redis.del(`course:${slug}`);
    }

    async getUnit(id: string, user?: any) {
        // PERFORMANCE: Check cache
        const cacheKey = `unit:${id}`;
        const cached = await this.redis.get(cacheKey);

        if (cached) {
            const { data, source, orgId } = JSON.parse(cached);

            // If it's a test-source unit but missing moduleUnits (stale cache), bust cache and re-fetch
            if (source === 'test' && (!data.moduleUnits || data.moduleUnits.length === 0)) {
                await this.redis.del(cacheKey);
                // Fall through to re-fetch below
            } else {
                // Re-verify isolation
                if (user && user.role !== 'SUPER_ADMIN') {
                    if (orgId && orgId !== user.orgId) {
                        throw new NotFoundException('Unit not found');
                    }
                }
                return data;
            }
        }

        console.log('[CourseService] getUnit id=', id);
        const unit = await this.prisma.unit.findUnique({
            where: { id },
            include: {
                module: {
                    include: {
                        course: true
                    }
                }
            }
        });

        // 1. If Unit Found, Check Isolation via Course
        if (unit) {
            const orgId = unit.module.course.orgId;

            // Cache immediately before checks (data is valid, access is situational)
            await this.redis.set(cacheKey, JSON.stringify({
                data: unit,
                source: 'unit',
                orgId: orgId
            }), 'EX', 3600);

            if (user && user.role !== 'SUPER_ADMIN') {
                if (orgId && orgId !== user.orgId) {
                    throw new NotFoundException('Unit not found');
                }
            }
            return unit;
        }

        // 2. If Unit NOT found, look in CourseTests
        // (Course Tests store 'questions' as structured JSON with sections)
        // Optimization: Use Raw SQL to find candidates instead of loading all tests

        // Postgres-specific raw query to find tests containing the ID in their JSON column
        // We CAST to text to do a simple substring search which is fast enough for loose loose matching
        const candidateTests: any[] = await this.prisma.$queryRaw`
            SELECT id FROM "CourseTest" 
            WHERE "questions"::text LIKE ${'%' + id + '%'}
            LIMIT 5
        `;

        if (candidateTests.length === 0) {
            throw new NotFoundException('Unit not found');
        }

        const candidateIds = candidateTests.map(t => t.id);

        const tests = await this.prisma.courseTest.findMany({
            where: { id: { in: candidateIds } },
            include: { course: true }
        });

        // inspecting candidate tests

        let matchedTest = null;
        let foundQuestion: any = null;
        let foundOrgId: string | null = null;
        for (const test of tests) {
            // Defensive: CourseTest.questions might be stored as a JSON string or already as object
            let questionsData: any = test.questions;
            if (typeof questionsData === 'string') {
                try {
                    questionsData = JSON.parse(questionsData);
                } catch (e) {
                    console.error('[CourseService] failed to parse questions JSON for test', test.id);
                    questionsData = {};
                }
            }

            const sections = Array.isArray(questionsData) ? questionsData : (questionsData?.sections || []);

            // Search logic (same as before) ...
            // Helper to recursively find in sections
            const findInSections = (secs: any[]) => {
                for (const section of secs) {
                    if (section.questions) {
                        const q = section.questions.find((q: any) => q.id === id);
                        if (q) return q;
                    }
                }
                return null;
            };

            // Helper for flat
            const findInFlat = (qs: any[]) => {
                return qs.find((q: any) => q.id === id);
            }

            if (Array.isArray(questionsData)) {
                // Check if it looks like sections or questions
                if (questionsData.length > 0 && questionsData[0].questions) {
                    foundQuestion = findInSections(questionsData);
                } else {
                    foundQuestion = findInFlat(questionsData);
                }
            } else if (questionsData?.sections) {
                foundQuestion = findInSections(questionsData.sections);
            }

            if (foundQuestion) {
                foundOrgId = test.course.orgId;
                matchedTest = test;
                break;
            }
        }

        if (foundQuestion && matchedTest) {
            // Build a flat list of ALL questions from this test (across all sections)
            // so the frontend sidebar can show all questions for navigation
            let allTestQuestions: any[] = [];
            let rawQ: any = matchedTest.questions;
            if (typeof rawQ === 'string') {
                try { rawQ = JSON.parse(rawQ); } catch { rawQ = []; }
            }
            if (Array.isArray(rawQ)) {
                if (rawQ.length > 0 && rawQ[0].questions) {
                    // Array of sections
                    allTestQuestions = rawQ.flatMap((s: any) => Array.isArray(s.questions) ? s.questions : []);
                } else {
                    // Flat array of questions
                    allTestQuestions = rawQ;
                }
            } else if (rawQ?.sections) {
                allTestQuestions = rawQ.sections.flatMap((s: any) => Array.isArray(s.questions) ? s.questions : []);
            }

            const moduleUnits = allTestQuestions.map((q: any) => ({
                id: String(q.id),
                type: q.type || q.questionType || 'Test',
                title: q.title || 'Question'
            }));

            const responseData = {
                ...foundQuestion,
                moduleUnits,
                module: {
                    id: matchedTest.id,
                    title: matchedTest.title,
                    course: matchedTest.course
                }
            };

            // Cache result
            await this.redis.set(cacheKey, JSON.stringify({
                data: responseData,
                source: 'test',
                orgId: foundOrgId
            }), 'EX', 3600);

            if (user && user.role !== 'SUPER_ADMIN') {
                if (foundOrgId && foundOrgId !== user.orgId) {
                    throw new NotFoundException('Unit not found');
                }
            }
            return responseData;
        }

        // Explicitly simplified the loop replacement for brevity in this tool call, 
        // sticking to replacing the block effectively.

        throw new NotFoundException('Unit not found');
    }


}
