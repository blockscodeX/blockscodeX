import { Controller, Get, Put, Post, Delete, Body, UseGuards, Request, Param } from '@nestjs/common';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrgStatusGuard } from '../auth/guards/org-status.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from '../auth/user.decorator';


@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard, OrgStatusGuard)
@Roles('STUDENT')
export class StudentController {
    constructor(private readonly studentService: StudentService) { }

    @Get('stats')
    async getStats(@User() user: any) {
        return this.studentService.getStats(user.id);
    }

    @Get('modules')
    async getModules(@User() user: any) {
        return this.studentService.getModules(user);
    }

    @Get('courses')
    async getCourses(@User() user: any) {
        return this.studentService.getCourses(user.id);
    }

    @Get('attempts')
    async getAttempts(@User() user: any) {
        return this.studentService.getExamAttempts(user.id);
    }

    @Get('exam/:sessionId/result')
    async getExamResult(@User() user: any, @Param('sessionId') sessionId: string) {
        return this.studentService.getExamResult(user.id, sessionId);
    }

    @Get('unit-attempts')
    async getUnitAttempts(@User() user: any) {
        return this.studentService.getDetailedUnitSubmissions(user.id);
    }

    @Get('analytics')
    async getAnalytics(@User() user: any) {
        return this.studentService.getAnalytics(user.id);
    }

    @Get('profile')
    async getProfile(@User() user: any) {
        return this.studentService.getProfile(user.id);
    }

    @Put('profile')
    async updateProfile(@User() user: any, @Body() data: { name?: string }) {
        return this.studentService.updateProfile(user.id, data);
    }

    @Get('bookmarks')
    async getBookmarks(@User() user: any) {
        return this.studentService.getBookmarks(user.id);
    }

    @Post('bookmarks/:unitId')
    async addBookmark(@User() user: any, @Param('unitId') unitId: string, @Body() data: any) {
        return this.studentService.addBookmark(user.id, unitId, data);
    }

    @Delete('bookmarks/:bookmarkId')
    async removeBookmark(@User() user: any, @Param('bookmarkId') bookmarkId: string) {
        console.log('[StudentController] removeBookmark called');
        console.log('[StudentController] user:', user?.id);
        console.log('[StudentController] bookmarkId:', bookmarkId);
        return this.studentService.removeBookmark(user.id, bookmarkId);
    }

    @Get('units/:unitId/submissions')
    async getUnitSubmissions(@User() user: any, @Param('unitId') unitId: string) {
        return this.studentService.getUnitSubmissions(user.id, unitId);
    }

    @Post('units/:unitId/submit')
    async submitUnit(@User() user: any, @Param('unitId') unitId: string, @Body() data: any) {
        return this.studentService.submitUnit(user.id, unitId, data);
    }

    @Get('course/:slug/progress')
    async getCourseProgress(@User() user: any, @Param('slug') slug: string) {
        return this.studentService.getCourseProgress(user.id, slug);
    }

    // ─── ANNOUNCEMENTS ─────────────────────────────────────────────────────────

    @Get('announcements')
    async getAnnouncements(@User() user: any) {
        return this.studentService.getAnnouncements(user.id);
    }

    @Get('announcements/unread-count')
    async getUnreadAnnouncementCount(@User() user: any) {
        return this.studentService.getUnreadAnnouncementCount(user.id);
    }

    @Post('announcements/:id/read')
    async markAnnouncementRead(@User() user: any, @Param('id') id: string) {
        return this.studentService.markAnnouncementRead(user.id, id);
    }
}
