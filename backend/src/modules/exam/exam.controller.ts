import { Controller, Get, Post, Body, Param, Req, UseGuards, Query, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ExamService } from './exam.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('exam')
export class ExamController {
    constructor(private examService: ExamService) { }

    private isAppClient(req: any): boolean {
        const userAgent = String(req?.headers?.['user-agent'] || '').toLowerCase();
        const clientPlatform = String(req?.headers?.['x-client-platform'] || '').toLowerCase();

        return (
            clientPlatform.includes('electron') ||
            clientPlatform.includes('desktop') ||
            clientPlatform.includes('app') ||
            userAgent.includes('electron')
        );
    }

    private getClientIp(req: any): string {
        const forwardedFor = req?.headers?.['x-forwarded-for'];
        if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
            return forwardedFor.split(',')[0].trim();
        }

        const realIp = req?.headers?.['x-real-ip'];
        if (typeof realIp === 'string' && realIp.trim().length > 0) {
            return realIp.trim();
        }

        return req?.ip || '';
    }

    @Get('app-config')
    getAppConfig() {
        return this.examService.getAppConfig();
    }

    @Get(':slug')
    @UseGuards(JwtAuthGuard)
    async getExam(@Param('slug') slug: string, @Query('json') json: string, @User() user: any) {
        const exam = await this.examService.getExamBySlug(slug, user);
        if (json) {
            return exam;
        }
        return exam;
    }

    @Get(':slug/public-status')
    async getPublicStatus(@Param('slug') slug: string, @Req() req: any) {
        // console.log('[ExamController] getPublicStatus slug:', slug);
        const clientIp = this.getClientIp(req);
        return this.examService.getPublicStatus(slug, clientIp);
    }

    @Get(':slug/check')
    async checkExam(@Param('slug') slug: string, @Query('json') json: string) {
        // Require ?json=1 parameter
        if (!json) {
            return { error: 'json=1 parameter required' };
        }
        return this.examService.checkExamStatus(slug);
    }

    // Protected Routes
    @UseGuards(JwtAuthGuard)
    @Post(':slug/enter')
    async enterExam(
        @Param('slug') slug: string,
        @Body() body: { deviceId: string; userId?: string; tabId?: string; metadata?: any },
        @User() user: any,
        @Req() req: any
    ) {
        if (!user) {
            throw new UnauthorizedException('User ID required');
        }

        if (user.role && user.role !== 'STUDENT') {
            throw new UnauthorizedException('Only Student accounts can access exams.');
        }

        // OPTIMIZATION: Use lightweight ID lookup instead of full transform
        const lookup: any = await this.examService.getExamIdBySlug(slug, user);
        console.log(`[ExamController] Lookup for slug ${slug}:`, lookup);

        if (!lookup || lookup.type !== 'exam') {
            throw new BadRequestException('Assessment type does not support live sessions');
        }

        if (lookup.examMode === 'App' && !this.isAppClient(req)) {
            throw new UnauthorizedException('APP_REQUIRED');
        }

        const ip = this.getClientIp(req);

        if (lookup.allowedIPs && lookup.allowedIPs.trim().length > 0) {
            const allowedList = lookup.allowedIPs.split(',').map((i: string) => i.trim());

            // Clean up ipv6 formatting (::1) or ipv4 mapped formatting (::ffff:192.168.1.1)
            const cleanIp = ip.replace(/^::ffff:/, '');
            const isAllowed = allowedList.some((allowedIp: string) =>
                allowedIp === cleanIp || allowedIp === ip
            );

            if (!isAllowed) {
                throw new UnauthorizedException('Access denied: Your IP address is not whitelisted for this exam');
            }
        }

        return {
            exam: await this.examService.getExamBySlug(slug, user),
            session: await this.examService.startSession(user.id, lookup.id, ip, body.deviceId, body.tabId, body.metadata),
            status: 'ready'
        };
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
    async createExam(@Body() body: any) {
        return this.examService.createExam(body);
    }

    @Get(':examId/monitoring')
    @UseGuards(JwtAuthGuard)
    async getMonitoredStudents(@Param('examId') examId: string) {
        return this.examService.getMonitoredStudents(examId);
    }

    @Get(':examId/feedbacks')
    @UseGuards(JwtAuthGuard)
    async getFeedbacks(@Param('examId') examId: string) {
        const feedbacks = await this.examService.getFeedbacks(examId);
        return feedbacks.map((f: any) => ({
            id: f.id,
            userName: f.user.name || 'Anonymous',
            userEmail: f.user.email,
            rating: f.rating,
            comment: f.comment,
            time: f.timestamp.toLocaleTimeString(),
            isSeen: false // Default
        }));
    }

    @Post(':slug/feedback')
    @UseGuards(JwtAuthGuard)
    async saveFeedback(
        @Param('slug') slug: string,
        @Body() body: { rating: number; comment: string },
        @User() user: any
    ) {
        const userId = user.id;
        const exam = await this.examService.getExamBySlug(slug);
        return this.examService.saveFeedback(userId, exam.id, body.rating, body.comment);
    }
}
