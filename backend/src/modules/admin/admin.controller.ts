import { Controller, Get, UseGuards, Delete, Param, Patch, Post, Body, UnauthorizedException, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrgFeaturesGuard } from '../auth/guards/org-features.guard';
import { OrgStatusGuard } from '../auth/guards/org-status.guard';
import { RequireOrgFeature } from '../auth/org-feature.decorator';
import { Roles } from '../auth/roles.decorator';
import { User } from '../auth/user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, OrgStatusGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('stats')
    async getStats(@User() user: any, @Query('orgId') orgId?: string) {
        return this.adminService.getGlobalStats(user, orgId);
    }

    @Get('users')
    async getUsers(@User() user: any, @Query('orgId') orgId?: string) {
        return this.adminService.getUsers(user, orgId);
    }

    @Post('users')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canManageUsers')
    async createUser(@User() user: any, @Body() data: any, @Query('orgId') orgId?: string) {
        return this.adminService.createUser(data, user, orgId);
    }

    @Post('users/bulk')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canManageUsers')
    async createUsersBulk(@User() user: any, @Body() data: { users: any[] }, @Query('orgId') orgId?: string) {
        return this.adminService.createUsersBulk(data.users, user, orgId);
    }

    @Get('logs')
    async getLogs(@User() user: any, @Query('orgId') orgId?: string) {
        return this.adminService.getSystemLogs(user, orgId);
    }

    @Get('analytics')
    async getAnalytics(@User() user: any, @Query('orgId') orgId?: string) {
        return this.adminService.getAnalytics(user, orgId);
    }

    @Get('exams')
    async getExams(@User() user: any, @Query('orgId') orgId?: string) {
        return this.adminService.getExams(user, orgId);
    }

    @Get('courses')
    async getCourses(@User() user: any, @Query('orgId') orgId?: string) {
        return this.adminService.getCourses(user, orgId);
    }

    @Patch('users/:id/status')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canManageUsers')
    async toggleUserStatus(@User() user: any, @Param('id') id: string) {
        return this.adminService.toggleUserStatus(id, user);
    }

    @Delete('users/:id')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canManageUsers')
    async deleteUser(@User() user: any, @Param('id') id: string) {
        console.log('[AdminController] Deleting user:', id);
        return this.adminService.deleteUser(id, user);
    }
}
