import { Injectable, UnauthorizedException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../services/prisma/prisma.service';
import { MailService } from '../../services/mail.service';
import { StorageService } from '../../services/storage/storage.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        @InjectRedis() private readonly redis: Redis,
        private mailService: MailService,
        private storageService: StorageService
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                organization: {
                    select: {
                        features: true,
                        status: true,
                        name: true
                    }
                }
            }
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // In a real app, use bcrypt.compare
        // For now, assuming user might be created manually or via seed
        if (user && (await bcrypt.compare(pass, user.password))) {
            // Check if account is suspended
            if (!user.isActive) {
                console.log('[AuthService] ❌ Account is suspended');
                throw new UnauthorizedException('ACCOUNT_SUSPENDED');
            }

            // Check organization status (Super Admins bypass this check)
            console.log('[AuthService] Checking organization status...');
            console.log('[AuthService] Is Super Admin?', user.role === 'SUPER_ADMIN');
            console.log('[AuthService] Has organization?', !!user.organization);

            if (user.role !== 'SUPER_ADMIN' && user.organization) {
                console.log('[AuthService] Organization status:', user.organization.status);

                if (user.organization.status !== 'Active') {
                    console.log('[AuthService] ❌ Organization is not Active, blocking login');
                    throw new UnauthorizedException(
                        `ORG_${user.organization.status.toUpperCase()}:${user.organization.name}`
                    );
                }
                console.log('[AuthService] ✅ Organization is Active');
            } else {
                console.log('[AuthService] ✅ Skipping org check (Super Admin or no org)');
            }

            const { password, ...result } = user;
            console.log('[AuthService] ✅ Validation successful');
            return result;
        }

        console.log('[AuthService] ❌ Invalid credentials');
        return null;
    }

    async login(user: any) {
        // Enforce fresh check of mustChangePassword status
        const freshUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { mustChangePassword: true, organization: { select: { features: true } } }
        });

        const mustChangePassword = freshUser?.mustChangePassword ?? user.mustChangePassword;
        const features = freshUser?.organization?.features || user.organization?.features || {};

        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role,
            mustChangePassword: mustChangePassword
        };
        return {
            access_token: this.jwtService.sign(payload, { expiresIn: '24h' }),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                orgId: user.orgId,
                rollNumber: user.rollNumber,
                department: user.department,
                profilePicture: user.profilePicture, // Include profile picture
                features: features,
                mustChangePassword: mustChangePassword,
                otp_enabled: false
            }
        };
    }

    async register(data: any) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.prisma.user.create({
            data: {
                ...data,
                password: hashedPassword,
                mustChangePassword: false
            }
        });
    }

    private isAppClient(ctx?: { userAgent?: string; clientPlatform?: string }): boolean {
        const userAgent = String(ctx?.userAgent || '').toLowerCase();
        const clientPlatform = String(ctx?.clientPlatform || '').toLowerCase();

        return (
            clientPlatform.includes('electron') ||
            clientPlatform.includes('desktop') ||
            clientPlatform.includes('app') ||
            userAgent.includes('electron')
        );
    }

    async examLogin(
        email: string,
        testCode: string,
        password?: string,
        slug?: string,
        clientCtx?: { userAgent?: string; clientPlatform?: string }
    ) {
        let whereClause: any = { testCode };
        if (slug) {
            whereClause.slug = slug;
        }

        const exam = await this.prisma.exam.findFirst({
            where: whereClause
        });
        if (!exam) throw new UnauthorizedException('Invalid test code');

        if (exam.examMode === 'App' && !this.isAppClient(clientCtx)) {
            throw new UnauthorizedException('APP_REQUIRED');
        }

        const user = await this.prisma.user.findFirst({
            where: { email },
            include: {
                organization: {
                    select: {
                        status: true,
                        name: true
                    }
                }
            }
        });

        if (!user) {
            throw new UnauthorizedException('User record not found');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('ACCOUNT_SUSPENDED');
        }

        // Check organization status
        if (user.organization && user.organization.status !== 'Active') {
            throw new UnauthorizedException(
                `ORG_${user.organization.status.toUpperCase()}:${user.organization.name}`
            );
        }

        // ROLE RESTRICTION: Students & Admins only
        if (user.role === 'TEACHER' || (user.role !== 'STUDENT' && user.role !== 'ADMIN')) {
            throw new UnauthorizedException('Access denied. Valid student credentials required.');
        }

        // CHECK IF ALREADY SUBMITTED
        const existingSession = await this.prisma.examSession.findUnique({
            where: { userId_examId: { userId: user.id, examId: exam.id } }
        });

        if (existingSession) {
            if (existingSession.status === 'TERMINATED') {
                throw new UnauthorizedException('EXAM_TERMINATED');
            }
            if (existingSession.status === 'COMPLETED') {
                throw new ConflictException('EXAM_ALREADY_SUBMITTED');
            }
        }

        // SEC-H05 FIX: Password MUST be provided and must match
        if (!password || !(await bcrypt.compare(password, user.password))) {
            throw new UnauthorizedException('Invalid password');
        }

        const result = await this.login(user);
        return {
            ...result,
            exam: {
                id: exam.id,
                slug: exam.slug,
                title: exam.title
            }
        };
    }

    async updateProfile(userId: string, data: { name?: string; profilePicture?: string }) {
        // If uploading a new profile picture, delete the old one from S3
        if (data.profilePicture) {
            const existingUser = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { profilePicture: true }
            });
            if (existingUser?.profilePicture) {
                await this.storageService.deleteFile(existingUser.profilePicture);
            }
        }

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                profilePicture: data.profilePicture
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                rollNumber: true,
                profilePicture: true
            }
        });

        // Invalidate session cache to ensure next request gets fresh data
        const cacheKey = `user:session:${userId}`;
        await this.redis.del(cacheKey);

        return updatedUser;
    }

    async removeProfilePicture(userId: string) {
        // Fetch the current profile picture URL to delete from S3
        const existingUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { profilePicture: true }
        });

        if (existingUser?.profilePicture) {
            await this.storageService.deleteFile(existingUser.profilePicture);
        }

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { profilePicture: null },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                rollNumber: true,
                profilePicture: true
            }
        });

        await this.redis.del(`user:session:${userId}`);
        return updatedUser;
    }

    async changePassword(userId: string, data: { currentPass: string; newPass: string }) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('User not found');

        const isMatch = await bcrypt.compare(data.currentPass, user.password);
        if (!isMatch) throw new UnauthorizedException('INVALID_CURRENT_PASSWORD');

        const hashedPassword = await bcrypt.hash(data.newPass, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            }
        });

        // Invalidate session cache to ensure next request sees updated status
        await this.redis.del(`user:session:${userId}`);

        return { success: true, message: 'Password updated successfully' };
    }

    async forgotPassword(email: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { organization: true }
        });

        if (!user) {
            // Return success to prevent email enumeration
            return { success: true, message: 'If your email is registered, you will receive a password reset link.' };
        }

        const tempPassword = randomBytes(12).toString('base64url').slice(0, 12);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                mustChangePassword: true
            }
        });

        const orgName = user.organization?.name || 'BlocksCode';
        const primaryColor = user.organization?.primaryColor || '#fc751b';
        const orgLogo = user.organization?.logo || undefined;
        const orgDomain = user.organization?.domain || undefined;

        await this.mailService.sendPasswordResetEmail(
            { email: user.email, name: user.name || 'User' },
            tempPassword,
            { name: orgName, primaryColor, logo: orgLogo, domain: orgDomain }
        );

        return { success: true, message: 'If your email is registered, you will receive a password reset link.' };
    }

    private countWordsFromHtml(html: string): number {
        if (!html) return 0;
        const text = html
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!text) return 0;
        return text.split(' ').filter(Boolean).length;
    }

    async uploadBugReportImage(
        user: any,
        fileData: any,
        filename: string,
        mimetype: string,
        contentLength?: number
    ) {
        if (!user?.id) throw new UnauthorizedException('Invalid session');
        if (!['STUDENT', 'TEACHER', 'ADMIN'].includes(user.role)) {
            throw new ForbiddenException('Only students, teachers, and admins can report problems');
        }

        const url = await this.storageService.uploadFile(fileData, filename, mimetype, 'reported-bugs', contentLength);
        return {
            url,
            name: filename,
            type: mimetype,
            size: contentLength || 0
        };
    }

    async createBugReport(
        user: any,
        data: {
            title: string;
            description: string;
            attachments?: { name: string; url: string; type: string; size: number }[];
        }
    ) {
        if (!user?.id) throw new UnauthorizedException('Invalid session');
        if (!['STUDENT', 'TEACHER', 'ADMIN'].includes(user.role)) {
            throw new ForbiddenException('Only students, teachers, and admins can report problems');
        }

        const title = data?.title?.trim();
        if (!title) throw new BadRequestException('Title is required');
        if (title.length > 120) throw new BadRequestException('Title must be 120 characters or less');

        const description = data?.description?.trim();
        if (!description) throw new BadRequestException('Description is required');

        const wordCount = this.countWordsFromHtml(description);
        if (wordCount === 0) throw new BadRequestException('Description is required');
        if (wordCount > 500) throw new BadRequestException('Description must be 500 words or less');

        const attachments = Array.isArray(data.attachments) ? data.attachments : [];
        if (attachments.length > 5) {
            throw new BadRequestException('You can attach at most 5 images');
        }

        const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
        for (const file of attachments) {
            if (!file?.url || !file?.name || !file?.type) {
                throw new BadRequestException('Invalid attachment payload');
            }
            if (!allowedImageTypes.has(file.type)) {
                throw new BadRequestException('Attachments must be image files only');
            }
            if (typeof file.size === 'number' && file.size > 5 * 1024 * 1024) {
                throw new BadRequestException('Each image must be less than 5MB');
            }
        }

        return this.prisma.bugReport.create({
            data: {
                title,
                description,
                attachments,
                reporterRole: user.role,
                reporterId: user.id,
                orgId: user.orgId || null
            }
        });
    }
}
