import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../services/prisma/prisma.service';
import { ExamService } from '../exam/exam.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class StudentService {
    constructor(
        private prisma: PrismaService,
        private examService: ExamService,
        @InjectRedis() private readonly redis: Redis,
        @InjectQueue('student-analytics') private studentAnalyticsQueue: Queue
    ) { }

    async getStats(userId: string) {
        // PERFORMANCE: Check cache first
        const cacheKey = `student:stats:${userId}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                // @ts-ignore
                dailyStreak: true,
                // @ts-ignore
                totalXP: true,
                unitSubmissions: {
                    where: { status: 'COMPLETED' },
                    select: { id: true }
                }
            }
        });

        if (!user) throw new Error('User not found');

        // Calculate average score - only from published results
        const sessionsWithScore = await this.prisma.examSession.findMany({
            where: {
                userId,
                score: { not: null },
                exam: { resultsPublished: true }
            },
            select: { score: true }
        });

        const totalScore = sessionsWithScore.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
        const averageScore = sessionsWithScore.length > 0 ? Math.round(totalScore / sessionsWithScore.length) : 0;

        const stats = {
            completedModules: (user as any).unitSubmissions.length,
            averageScore,
            streak: (user as any).dailyStreak,
            totalXP: (user as any).totalXP
        };

        // Cache for 60 seconds (short lived)
        await this.redis.set(cacheKey, JSON.stringify(stats), 'EX', 60);

        return stats;
    }

    private async calculateDailyStreak(userId: string): Promise<number> {
        // OPTIMIZATION: Use Raw SQL to get distinct activity dates instead of fetching all records
        const activities: { dayString: Date }[] = await this.prisma.$queryRaw`
            SELECT DISTINCT DATE("createdAt") as "dayString"
            FROM (
                SELECT "createdAt" FROM "ExamSession" WHERE "userId" = ${userId} AND "status" = 'COMPLETED'
                UNION ALL
                SELECT "createdAt" FROM "UnitSubmission" WHERE "userId" = ${userId}
            ) as activity
            ORDER BY "dayString" DESC
            LIMIT 365
        `;

        if (activities.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if there's activity today or yesterday
        // Note: Raw query dates might be strings or Date objects depending on driver. 
        // Prisma usually returns Date objects for 'date' type if mapped correctly, but let's be safe.
        const lastActivityDate = new Date(activities[0].dayString);
        lastActivityDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

        // Streak is broken if last activity was more than 1 day ago
        if (daysDiff > 1) return 0;

        const activityDates = new Set(
            activities.map((a: any) => {
                const d = new Date(a.dayString);
                d.setHours(0, 0, 0, 0);
                return d.getTime();
            })
        );

        let currentDate = new Date(today);
        if (daysDiff === 1) {
            // Start from yesterday if no activity today
            currentDate.setDate(currentDate.getDate() - 1);
        }

        while (activityDates.has(currentDate.getTime())) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }

        return streak;
    }

    async getModules(user: any) {
        // Fetch published exams scoped to user's organization
        const exams = await this.prisma.exam.findMany({
            where: {
                isActive: true,
                orgId: user.orgId || undefined
            } as any, // Bypass stale type definition
            include: {
                submissions: {
                    where: { userId: user.id },
                    select: { status: true, score: true }
                }
            }
        });

        return exams.map((exam: any) => {
            const session = exam.submissions[0]; // Gets the user's session if exists
            let percent = 0;
            if (session?.status === 'COMPLETED') percent = 100;
            else if (session?.status === 'IN_PROGRESS') percent = 30; // Arbitrary progress for now

            return {
                title: exam.title,
                slug: exam.slug,
                sections: Array.isArray(exam.questions) ? (exam.questions as any[]).length : 0,
                percent,
                status: session?.status || 'NOT_STARTED'
            };
        });
    }

    async getCourses(userId: string) {
        // Get courses the student is enrolled in
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                courses: {
                    include: {
                        modules: {
                            include: {
                                units: { select: { id: true } }
                            }
                        },
                        tests: { select: { id: true, title: true, slug: true, startDate: true, endDate: true } }
                    }
                }
            }
        });

        if (!user) return [];

        // Collect every unit ID across all enrolled courses in one pass
        const allUnitIds = (user as any).courses.flatMap((course: any) =>
            course.modules.flatMap((mod: any) => mod.units.map((u: any) => u.id))
        );

        // Single query: all completed submissions for this student across all enrolled units
        const completedSubs = allUnitIds.length > 0
            ? await this.prisma.unitSubmission.findMany({
                where: { userId, unitId: { in: allUnitIds }, status: 'COMPLETED' },
                select: { unitId: true }
            })
            : [];

        const completedSet = new Set(completedSubs.map((s: any) => s.unitId));

        return (user as any).courses.map((course: any) => {
            const totalUnits = course.modules.reduce((sum: number, mod: any) => sum + mod.units.length, 0);
            const courseUnitIds = course.modules.flatMap((mod: any) => mod.units.map((u: any) => u.id));
            const completedCount = courseUnitIds.filter((uid: string) => completedSet.has(uid)).length;
            const percent = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0;
            const status =
                completedCount === totalUnits && totalUnits > 0
                    ? 'Completed'
                    : completedCount > 0
                    ? 'In Progress'
                    : 'Not Started';

            return {
                id: course.id,
                slug: course.slug,
                title: course.title,
                description: course.shortDescription,
                sections: totalUnits,
                testCount: course.tests?.length || 0,
                tests: course.tests || [],
                status,
                percent
            };
        });
    }

    async getExamResult(userId: string, sessionId: string) {
        const session = await this.prisma.examSession.findUnique({
            where: { id: sessionId, userId },
            include: {
                exam: true,
                user: { select: { name: true, email: true, rollNumber: true } }
            }
        });

        if (!session) {
            throw new Error('Session not found');
        }

        if (!(session.exam as any).resultsPublished) {
            throw new Error('Results not published yet');
        }

        const transformed = this.examService.transformExam(session.exam, false);

        return {
            details: {
                sessionId: session.id,
                studentName: session.user.name || session.user.email,
                rollNo: session.user.rollNumber || 'N/A',
                examId: session.examId,
                examTitle: session.exam.title,
                status: session.status,
                score: session.score,
                totalMarks: session.exam.totalMarks,
                startTime: session.startTime,
                endTime: session.endTime
            },
            questions: Object.values(transformed.questions),
            questionsMap: transformed.questions,
            sections: transformed.sections,
            answers: session.answers,
            attempts: (session.answers as any)?._internal_attempts || {}
        };
    }

    async getExamAttempts(userId: string) {
        const sessions = await this.prisma.examSession.findMany({
            where: {
                userId,
                exam: { resultsPublished: true }
            },
            include: {
                exam: {
                    select: {
                        title: true,
                        resultsPublished: true,
                        duration: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return sessions.map((session: any) => {
            const isPublished = session.exam.resultsPublished;
            const startTime = new Date(session.startTime).getTime();
            const endTime = session.endTime ? new Date(session.endTime).getTime() : Date.now();
            const durationMins = Math.round((endTime - startTime) / 60000);

            return {
                id: session.id,
                examTitle: session.exam.title,
                score: isPublished ? (session.score !== null ? session.score : 'Pending') : 'Hidden',
                duration: durationMins,
                startedAt: session.startTime,
                submittedAt: session.endTime,
                status: session.status,
                isPublished
            };
        });
    }

    async getDetailedUnitSubmissions(userId: string) {
        const submissions = await this.prisma.unitSubmission.findMany({
            where: { userId },
            include: {
                unit: {
                    select: {
                        title: true,
                        type: true,
                        module: {
                            select: {
                                course: {
                                    select: { title: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return submissions.map((sub: any) => {
            let testCases = '-';
            if (sub.content && typeof sub.content === 'object' && !Array.isArray(sub.content)) {
                const contentObj = sub.content as any;
                if (contentObj.testCases) {
                    testCases = contentObj.testCases;
                }
            }

            // Fallback logic
            if (testCases === '-' && sub.score !== null) {
                testCases = sub.score === 100 ? '1 / 1' : '0 / 1';
            }

            return {
                id: sub.id,
                unitId: sub.unitId,
                unitTitle: sub.unit.title,
                unitType: sub.unit.type,
                courseTitle: sub.unit.module.course.title,
                status: sub.status,
                score: sub.score,
                testCases: testCases,
                createdAt: sub.createdAt,
                updatedAt: sub.updatedAt
            };
        });
    }

    async getAnalytics(userId: string) {
        // PERFORMANCE: Cache analytics for 5 minutes
        const cacheKey = `student:analytics:${userId}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        // Get all unit submissions for analytics
        const submissions = await this.prisma.unitSubmission.findMany({
            where: { userId },
            include: {
                unit: {
                    include: {
                        module: {
                            include: {
                                course: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate weekly activity (last 7 days) via database queries instead of memory filtering
        const weeklyActivity = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Fetch ONLY submissions from the last 7 days for the activity graph
        const recentSubmissions = await this.prisma.unitSubmission.findMany({
            where: {
                userId,
                createdAt: { gte: sevenDaysAgo }
            },
            select: { createdAt: true, status: true }
        });

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const daySubmissions = recentSubmissions.filter((s: any) => {
                const subDate = new Date(s.createdAt);
                return subDate >= date && subDate < nextDate;
            });

            const passed = daySubmissions.filter((s: any) => s.status === 'COMPLETED').length;
            const failed = daySubmissions.length - passed;

            weeklyActivity.push({
                day: days[date.getDay()],
                attempts: daySubmissions.length,
                passed,
                failed
            });
        }

        // Calculate course mastery (unique units)
        const courseStats: Record<string, { units: Set<string>; completedUnits: Set<string> }> = {};
        submissions.forEach((sub: any) => {
            const courseName = sub.unit.module.course.title;
            if (!courseStats[courseName]) {
                courseStats[courseName] = { units: new Set(), completedUnits: new Set() };
            }
            courseStats[courseName].units.add(sub.unitId);
            if (sub.status === 'COMPLETED') {
                courseStats[courseName].completedUnits.add(sub.unitId);
            }
        });

        const uniqueUnits = new Set(submissions.map((s: any) => s.unitId));

        const streak = await this.calculateDailyStreak(userId);

        const courseMastery = Object.entries(courseStats).map(([subject, stats]) => ({
            subject: subject.substring(0, 15), // Truncate for display
            A: Math.round((stats.completedUnits.size / stats.units.size) * 150), // Current proficiency based on completion
            B: 130, // Benchmark
            fullMark: 150
        }));

        const result = {
            weeklyActivity,
            courseMastery,
            stats: {
                totalQuestions: uniqueUnits.size,
                totalAttempts: submissions.length,
                passedAttempts: submissions.filter((s: any) => s.status === 'COMPLETED').length,
                successRate: submissions.length > 0
                    ? Math.round((submissions.filter((s: any) => s.status === 'COMPLETED').length / submissions.length) * 100)
                    : 0,
                streak
            }
        };

        // Cache result for 5 minutes
        await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 300);

        return result;
    }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                rollNumber: true,
                role: true,
                createdAt: true
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

    async updateProfile(userId: string, data: { name?: string }) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name
            },
            select: {
                id: true,
                name: true,
                email: true,
                rollNumber: true
            }
        });
    }

    async getBookmarks(userId: string) {
        const bookmarks = await this.prisma.bookmark.findMany({
            where: { userId },
            include: {
                unit: {
                    include: {
                        module: {
                            include: {
                                course: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return bookmarks.map((b: any) => ({
            id: b.id,
            unitId: b.customId, // Use customId for frontend links
            unitTitle: b.unit?.title || b.title || 'Untitled',
            unitType: b.unit?.type || b.type || 'Reading',
            moduleTitle: b.unit?.module?.title || b.moduleTitle || 'Miscellaneous',
            courseTitle: b.unit?.module?.course?.title || b.courseTitle || 'System',
            bookmarkedAt: b.createdAt
        }));
    }

    async addBookmark(userId: string, unitId: string, metadata?: { title?: string, type?: string, moduleTitle?: string, courseTitle?: string }) {
        // Find if this unitId exists in the Unit table for the FK
        const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });

        return this.prisma.bookmark.upsert({
            where: {
                userId_customId: { userId, customId: unitId }
            },
            update: {
                unitId: unit ? unit.id : null,
                title: metadata?.title,
                type: metadata?.type,
                moduleTitle: metadata?.moduleTitle,
                courseTitle: metadata?.courseTitle
            },
            create: {
                userId,
                customId: unitId,
                unitId: unit ? unit.id : null,
                title: metadata?.title,
                type: metadata?.type,
                moduleTitle: metadata?.moduleTitle,
                courseTitle: metadata?.courseTitle
            }
        });
    }

    async removeBookmark(userId: string, bookmarkId: string) {
        console.log('[StudentService] removeBookmark called');
        console.log('[StudentService] userId:', userId);
        console.log('[StudentService] bookmarkId:', bookmarkId);

        try {
            // First, check if this is a bookmark ID or customId
            // Try to find bookmark by ID first
            const bookmark = await this.prisma.bookmark.findUnique({
                where: { id: bookmarkId }
            });

            console.log('[StudentService] Bookmark found by ID:', bookmark ? 'Yes' : 'No');

            if (bookmark) {
                console.log('[StudentService] Bookmark data:', bookmark);
                // Verify ownership
                if (bookmark.userId !== userId) {
                    console.log('[StudentService] ❌ Ownership mismatch');
                    throw new Error('Unauthorized: Bookmark does not belong to user');
                }
                // Delete by ID
                console.log('[StudentService] Deleting bookmark by ID...');
                const result = await this.prisma.bookmark.delete({
                    where: { id: bookmarkId }
                });
                console.log('[StudentService] ✅ Bookmark deleted successfully');
                return result;
            } else {
                // Try as customId (backward compatibility)
                console.log('[StudentService] Trying to delete by customId...');
                const result = await this.prisma.bookmark.delete({
                    where: {
                        userId_customId: { userId, customId: bookmarkId }
                    }
                });
                console.log('[StudentService] ✅ Bookmark deleted by customId');
                return result;
            }
        } catch (error) {
            console.error('[StudentService] ❌ Error removing bookmark:', error);
            console.error('[StudentService] Error message:', error.message);
            console.error('[StudentService] Error code:', error.code);
            throw error;
        }
    }

    async getUnitSubmissions(userId: string, unitId: string) {
        // Check if this is a real Unit or a virtual test question
        const unitExists = await this.prisma.unit.findUnique({ where: { id: unitId }, select: { id: true } });
        if (unitExists) {
            return this.prisma.unitSubmission.findMany({
                where: { userId, unitId },
                orderBy: { createdAt: 'desc' }
            });
        }

        // Virtual test question: return from QuestionAttempt instead
        const attempts = await this.prisma.questionAttempt.findMany({
            where: { userId, itemId: unitId, type: 'UNIT' },
            orderBy: { createdAt: 'desc' }
        });
        // Shape to match UnitSubmission structure that frontend expects
        return attempts.map((a: any) => ({
            id: a.id,
            userId: a.userId,
            unitId,
            status: a.isCorrect ? 'COMPLETED' : 'IN_PROGRESS',
            content: a.content,
            score: a.score,
            createdAt: a.createdAt,
            updatedAt: a.createdAt
        }));
    }

    async submitUnit(userId: string, unitId: string, data: { status: string; content: any; score?: number }) {
        // Check if this unitId maps to a real Unit record (FK constraint)
        const unitExists = await this.prisma.unit.findUnique({ where: { id: unitId }, select: { id: true } });

        let submission: any;

        if (unitExists) {
            // Normal unit — store in UnitSubmission
            submission = await this.prisma.unitSubmission.create({
                data: {
                    userId,
                    unitId,
                    status: data.status,
                    content: data.content,
                    score: data.score
                }
            });

            // Trigger course-progress analytics only for real units
            await this.studentAnalyticsQueue.add('update-course-progress', { userId, unitId });
        } else {
            // Virtual test question — store in QuestionAttempt (no FK to Unit)
            const attempt = await this.prisma.questionAttempt.create({
                data: {
                    userId,
                    itemId: unitId,
                    type: 'UNIT',
                    content: data.content,
                    isCorrect: data.status === 'COMPLETED',
                    score: data.score
                }
            });
            // Shape to UnitSubmission-compatible response
            submission = {
                id: attempt.id,
                userId: attempt.userId,
                unitId,
                status: attempt.isCorrect ? 'COMPLETED' : 'IN_PROGRESS',
                content: attempt.content,
                score: attempt.score,
                createdAt: attempt.createdAt,
                updatedAt: attempt.createdAt
            };
        }

        // Trigger analytics updates (common to both paths)
        await this.studentAnalyticsQueue.add('update-streak', { userId });
        await this.studentAnalyticsQueue.add('save-question-attempt', {
            userId,
            itemId: unitId,
            type: 'UNIT',
            content: data.content,
            isCorrect: data.status === 'COMPLETED',
            score: data.score
        });

        // Invalidate cache
        await this.redis.del(`student:stats:${userId}`);
        await this.redis.del(`student:analytics:${userId}`);

        return submission;
    }

    async getCourseProgress(userId: string, courseSlug: string) {
        // 1. Find the course and its modules/units
        const course = await this.prisma.course.findUnique({
            where: { slug: courseSlug },
            include: {
                modules: {
                    include: {
                        units: {
                            select: { id: true }
                        }
                    }
                }
            }
        });

        if (!course) {
            throw new Error('Course not found');
        }

        // 2. Extract all unit IDs
        const unitIds = course.modules.flatMap(m => m.units.map(u => u.id));

        // 3. Find ALL submissions for these units (not just completed)
        const submissions = await this.prisma.unitSubmission.findMany({
            where: {
                userId,
                unitId: { in: unitIds }
            },
            select: {
                id: true,
                unitId: true,
                status: true,
                score: true,
                content: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // 4. Group submissions by unitId
        const attemptsMap: Record<string, any[]> = {};
        const completedUnitIds = new Set<string>();

        submissions.forEach(sub => {
            if (!attemptsMap[sub.unitId]) {
                attemptsMap[sub.unitId] = [];
            }

            let testCases = '-';
            if (sub.content && typeof sub.content === 'object' && !Array.isArray(sub.content)) {
                const contentObj = sub.content as any;
                if (contentObj.testCases) {
                    testCases = contentObj.testCases;
                }
            }

            // Fallback logic similar to AttemptsView
            if (testCases === '-' && sub.score !== null) {
                testCases = sub.score === 100 ? '1 / 1' : '0 / 1';
            }

            attemptsMap[sub.unitId].push({
                id: sub.id,
                date: sub.createdAt.toLocaleDateString() + ' ' + sub.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                score: sub.score !== null ? `${sub.score}%` : '-',
                testCases: testCases,
                status: sub.status === 'COMPLETED' ? 'success' : 'failed'
            });

            if (sub.status === 'COMPLETED') {
                completedUnitIds.add(sub.unitId);
            }
        });

        return {
            totalUnits: unitIds.length,
            completedUnitIds: Array.from(completedUnitIds),
            attempts: attemptsMap
        };
    }

    // ─── ANNOUNCEMENTS ─────────────────────────────────────────────────────────

    async getAnnouncements(userId: string) {
        // Find all groups this student belongs to
        const studentGroups = await this.prisma.studentGroup.findMany({
            where: { students: { some: { id: userId } } },
            select: { id: true }
        });

        if (studentGroups.length === 0) return [];

        const groupIds = studentGroups.map(g => g.id);

        // Get all announcements sent to these groups
        const announcements = await this.prisma.announcement.findMany({
            where: {
                groups: { some: { id: { in: groupIds } } }
            },
            include: {
                teacher: { select: { name: true, profilePicture: true } },
                groups: { select: { id: true, name: true } },
                reads: {
                    where: { userId },
                    select: { id: true, readAt: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return announcements.map(a => ({
            id: a.id,
            title: a.title,
            content: a.content,
            attachments: a.attachments,
            teacherName: a.teacher.name || 'Teacher',
            teacherPicture: a.teacher.profilePicture,
            groupNames: a.groups.map(g => g.name),
            isRead: a.reads.length > 0,
            readAt: a.reads[0]?.readAt || null,
            createdAt: a.createdAt
        }));
    }

    async getUnreadAnnouncementCount(userId: string) {
        const studentGroups = await this.prisma.studentGroup.findMany({
            where: { students: { some: { id: userId } } },
            select: { id: true }
        });

        if (studentGroups.length === 0) return { count: 0 };

        const groupIds = studentGroups.map(g => g.id);

        const total = await this.prisma.announcement.count({
            where: { groups: { some: { id: { in: groupIds } } } }
        });

        const read = await this.prisma.announcementRead.count({
            where: {
                userId,
                announcement: { groups: { some: { id: { in: groupIds } } } }
            }
        });

        return { count: total - read };
    }

    async markAnnouncementRead(userId: string, announcementId: string) {
        // Upsert to avoid duplicate errors
        return this.prisma.announcementRead.upsert({
            where: {
                userId_announcementId: { userId, announcementId }
            },
            create: { userId, announcementId },
            update: {} // No update needed, just ensure it exists
        });
    }
}
