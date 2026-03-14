import { Controller, Get, Post, Put, Patch, Delete, Body, UseGuards, Param, Req, Query } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { FastifyRequest } from 'fastify';
import { StorageService } from '../../services/storage/storage.service';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
    constructor(
        private readonly superAdminService: SuperAdminService,
        private readonly storageService: StorageService
    ) { }

    @Get('stats')
    async getStats() {
        return this.superAdminService.getStats();
    }

    @Get('organizations')
    async getOrganizations() {
        return this.superAdminService.getOrganizations();
    }

    @Get('organizations/:id')
    async getOrganization(@Param('id') id: string) {
        return this.superAdminService.getOrganization(id);
    }

    @Post('organizations')
    async createOrganization(@Req() req: FastifyRequest) {
        console.log('[SuperAdminController] Received createOrganization request');
        const parts = (req as any).parts();
        const body: any = {};

        for await (const part of parts) {
            console.log(`[SuperAdminController] Processing part: ${part.fieldname}, type: ${part.type}`);
            if (part.type === 'file') {
                if (part.fieldname === 'logo') {
                    console.log('[SuperAdminController] Found logo file, uploading...');
                    const fileSizeHeader = req.headers['x-file-size'];
                    const fileSize = fileSizeHeader ? parseInt(fileSizeHeader as string, 10) : undefined;

                    body.logo = await this.storageService.uploadFile(
                        part.file,
                        part.filename,
                        part.mimetype,
                        'organizations',
                        fileSize
                    );
                    console.log('[SuperAdminController] Logo uploaded:', body.logo);
                } else {
                    await part.toBuffer(); // consume unused file
                }
            } else {
                // @ts-ignore - part.value exists on field type
                const value = part.value;
                if (value === 'true') {
                    body[part.fieldname] = true;
                } else if (value === 'false') {
                    body[part.fieldname] = false;
                } else {
                    body[part.fieldname] = value;
                }
            }
        }

        console.log('[SuperAdminController] Final body:', body);
        return this.superAdminService.createOrganization(body);
    }

    @Put('organizations/:id')
    async updateOrganization(@Param('id') id: string, @Body() data: any) {
        return this.superAdminService.updateOrganization(id, data);
    }

    @Delete('organizations/:id')
    async deleteOrganization(@Param('id') id: string) {
        return this.superAdminService.deleteOrganization(id);
    }

    @Get('users')
    async getUsers(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
        @Query('search') search: string = ''
    ) {
        return this.superAdminService.getUsers(Number(page), Number(limit), search);
    }

    @Put('users/:id')
    async updateUser(@Param('id') id: string, @Body() data: any) {
        return this.superAdminService.updateUser(id, data);
    }

    @Delete('users/:id')
    async deleteUser(@Param('id') id: string) {
        return this.superAdminService.deleteUser(id);
    }

    @Get('bug-reports')
    async getBugReports(
        @Query('status') status?: 'OPEN' | 'FIXED',
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20'
    ) {
        return this.superAdminService.getBugReports(status, Number(page), Number(limit));
    }

    @Patch('bug-reports/:id/fix')
    async markBugReportFixed(@Param('id') id: string, @Req() req: any) {
        return this.superAdminService.markBugReportFixed(id, req.user?.id);
    }

    @Delete('bug-reports/:id')
    async deleteBugReport(@Param('id') id: string) {
        return this.superAdminService.deleteBugReport(id);
    }
}
