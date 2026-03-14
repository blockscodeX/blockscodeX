import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { StorageService } from '../../services/storage/storage.service';

@Injectable()
export class SuperAdminService {
    constructor(
        private prisma: PrismaService,
        private storageService: StorageService
    ) { }

    
    async getStats() {
        const organizations = await this.prisma.organization.count();
        const totalUsers = await this.prisma.user.count();
        const activeNodes = 4; // Mock for now as it's infra related
        const alerts = await this.prisma.auditLog.count({
            where: { action: { contains: 'ALERT' } }
        }); // Example if we log alerts

        return {
            totalOrgs: organizations,
            totalUsers,
            activeNodes,
            alerts: alerts || 0
        };
    }

    async getOrganizations() {
        return this.prisma.organization.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit for dashboard
        });
    }

    async getOrganization(id: string) {
        return this.prisma.organization.findUnique({
            where: { id },
            include: {
                users: {
                    where: { role: 'ADMIN' },
                    take: 1
                }
            }
        });
    }

    async createOrganization(data: any) {
        // 0. Pre-check: Admin Email Uniqueness
        if (data.adminEmail) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: data.adminEmail }
            });
            if (existingUser) {
                throw new BadRequestException(`User with email ${data.adminEmail} already exists.`);
            }
        }

        try {
            console.log('[SuperAdminService] Creating organization with data:', JSON.stringify(data, null, 2));

            // 1. Create Organization
            const org = await this.prisma.organization.create({
                data: {
                    name: data.name,
                    domain: data.domain,
                    logo: data.logo || null,
                    status: data.status || 'Active',

                    // Limits
                    maxUsers: Number(data.maxUsers) || 100,
                    maxCourses: Number(data.maxCourses) || 10,
                    storageLimit: Number(data.storageLimit || data.maxStorage) || 1024,
                    examsPerMonth: Number(data.examsPerMonth) || 50,

                    // Config
                    plan: data.plan || 'Enterprise',
                    primaryColor: data.primaryColor || '#fc751b',
                    features: {
                        canCreateExams: data.canCreateExams !== undefined ? data.canCreateExams : true,
                        allowAppExams: data.allowAppExams !== undefined ? data.allowAppExams : true,
                        allowAIProctoring: data.allowAIProctoring !== undefined ? data.allowAIProctoring : true,
                        canCreateCourses: data.canCreateCourses !== undefined ? data.canCreateCourses : true,
                        allowCourseTests: data.allowCourseTests !== undefined ? data.allowCourseTests : true,
                        canManageUsers: data.canManageUsers !== undefined ? data.canManageUsers : true
                    },
                    contact: {
                        adminName: data.adminName || null,
                        adminEmail: data.adminEmail || null,
                        phone: data.phone || null,
                        supportEmail: data.supportEmail || null,
                        address: data.address || null,
                        city: data.city || null,
                        country: data.country || null
                    }
                }
            });

            console.log('[SuperAdminService] Organization created successfully:', org.id);

            // 2. Create Admin User for this Org
            if (data.adminEmail && data.adminPassword) {
                const hashedPassword = await bcrypt.hash(data.adminPassword, 10);

                await this.prisma.user.create({
                    data: {
                        email: data.adminEmail,
                        name: data.adminName || 'Admin',
                        password: hashedPassword,
                        role: 'ADMIN',
                        orgId: org.id,
                        isActive: true
                    }
                });

                console.log(`[SuperAdmin] Created Admin ${data.adminEmail}`);
            }

            return org;
        } catch (error) {
            console.error('[SuperAdminService] Create Organization Error Details:', {
                message: error.message,
                code: error.code,
                meta: error.meta,
                stack: error.stack
            });
            throw new BadRequestException('Failed to create organization. ' + error.message);
        }
    }

    async updateOrganization(id: string, data: any) {
        return this.prisma.organization.update({
            where: { id },
            data
        });
    }

    async getUsers(page: number, limit: number, search: string) {
        const skip = (page - 1) * limit;
        const where: any = {};
        
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                // Note: Filtering by relation (organization) depends on Prisma version/db support. 
                // If this fails, consider removing the relation filter or doing it differently.
                // Assuming efficient enough for now or that it's supported.
                { organization: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                include: {
                    organization: {
                        select: { name: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            this.prisma.user.count({ where })
        ]);

        return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async updateUser(id: string, data: any) {
        // Only allow specific updates for safety
        const safeData: any = {};
        if (typeof data.isActive === 'boolean') safeData.isActive = data.isActive;
        if (data.name) safeData.name = data.name;
        if (data.role) safeData.role = data.role;

        return this.prisma.user.update({
            where: { id },
            data: safeData
        });
    }

    async deleteUser(id: string) {
        // Check if user is the last super admin or something? 
        // For now keep it simple but maybe add a check
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (user?.role === 'SUPER_ADMIN') {
            const count = await this.prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
            if (count <= 1) throw new BadRequestException('Cannot delete the last Super Admin.');
        }

        return this.prisma.user.delete({
            where: { id }
        });
    }

    async deleteOrganization(id: string) {
        // Fetch all user IDs belonging to this org
        const users = await this.prisma.user.findMany({
            where: { orgId: id },
            select: { id: true }
        });
        const userIds = users.map((u: any) => u.id);

        try {
            // Use transaction for manual cascade
            await this.prisma.$transaction(async (tx: any) => {
                // 1. Delete AuditLogs for these users
                await tx.auditLog.deleteMany({
                    where: { userId: { in: userIds } }
                });

                // 2. Delete Bookmarks for these users
                await tx.bookmark.deleteMany({
                    where: { userId: { in: userIds } }
                });

                // 3. Delete Users (will cascade Session, Submission, Feedback via schema)
                await tx.user.deleteMany({
                    where: { orgId: id }
                });

                // 4. Delete Organization (will cascade Courses, Exams - though creatorId SetNull)
                await tx.organization.delete({
                    where: { id }
                });
            });
            return { success: true };
        } catch (error) {
            console.error('[SuperAdminService] Delete Error Full:', error);
            throw new BadRequestException('Failed to delete organization. Dependencies may exist. ' + error.message);
        }
    }

    async getBugReports(status?: 'OPEN' | 'FIXED', page = 1, limit = 20) {
        const safePage = Number.isFinite(page) && page > 0 ? page : 1;
        const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
        const skip = (safePage - 1) * safeLimit;

        const where: any = {};
        if (status === 'OPEN' || status === 'FIXED') {
            where.status = status;
        }

        const [data, total] = await Promise.all([
            this.prisma.bugReport.findMany({
                where,
                include: {
                    reporter: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            department: true,
                            organization: { select: { id: true, name: true } }
                        }
                    },
                    fixedBy: {
                        select: { id: true, name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: safeLimit
            }),
            this.prisma.bugReport.count({ where })
        ]);

        return {
            data,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit)
        };
    }

    async markBugReportFixed(id: string, fixedById?: string) {
        const existing = await this.prisma.bugReport.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Bug report not found');

        return this.prisma.bugReport.update({
            where: { id },
            data: {
                status: 'FIXED',
                fixedAt: new Date(),
                fixedById: fixedById || null
            }
        });
    }

    async deleteBugReport(id: string) {
        const existing = await this.prisma.bugReport.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Bug report not found');

        const attachments = Array.isArray(existing.attachments) ? (existing.attachments as any[]) : [];
        for (const att of attachments) {
            if (att?.url) {
                await this.storageService.deleteFile(att.url).catch(() => undefined);
            }
        }

        return this.prisma.bugReport.delete({ where: { id } });
    }
}
