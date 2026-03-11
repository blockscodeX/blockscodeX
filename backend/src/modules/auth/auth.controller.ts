import { Controller, Request, Post, Patch, Delete, UseGuards, Body, Get, UnauthorizedException, Req, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './user.decorator';
import type { FastifyRequest } from 'fastify';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { StorageService } from '../../services/storage/storage.service';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private storageService: StorageService
    ) { }

    @Post('login')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async login(@Body() req: any) {
        // Manually validating for simplicity if LocalGuard isn't set up yet
        const user = await this.authService.validateUser(req.email, req.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Post('register')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async register(@Body() createUserDto: CreateUserDto) {
        return this.authService.register(createUserDto);
    }

    @Post('exam-login')
    async examLogin(@Body() data: { email: string; testCode: string; password?: string }) {
        return this.authService.examLogin(data.email, data.testCode, data.password);
    }

    @Post('forgot-password')
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    async forgotPassword(@Body() data: { email: string }) {
        return this.authService.forgotPassword(data.email);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async me(@Request() req: any) {
        return req.user;
    }

    @UseGuards(JwtAuthGuard)
    @Post('profile/avatar')
    async uploadAvatar(@User() user: any, @Req() req: FastifyRequest) {
        const multipartReq = req as any;

        if (!multipartReq.isMultipart()) {
            throw new BadRequestException('Request must be multipart/form-data');
        }

        const parts = multipartReq.parts();
        for await (const part of parts) {
            if (part.type === 'file' && part.fieldname === 'avatar') {
                const buffer = await part.toBuffer();

                if (buffer.length > MAX_FILE_SIZE) {
                    throw new BadRequestException('File size must be less than 5MB');
                }
                if (!ALLOWED_IMAGE_TYPES.includes(part.mimetype)) {
                    throw new BadRequestException('Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)');
                }

                const url = await this.storageService.uploadFile(
                    buffer,
                    part.filename,
                    part.mimetype,
                    'avatars'
                );
                return this.authService.updateProfile(user.id, { profilePicture: url });
            } else if (part.type === 'file') {
                await part.toBuffer(); // consume unused file parts
            }
        }

        throw new BadRequestException('No avatar file provided');
    }

    @UseGuards(JwtAuthGuard)
    @Patch('profile')
    async updateProfile(@User() user: any, @Body() body: { name?: string }) {
        return this.authService.updateProfile(user.id, { name: body?.name });
    }

    @UseGuards(JwtAuthGuard)
    @Delete('profile/picture')
    async removeProfilePicture(@User() user: any) {
        return this.authService.removeProfilePicture(user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('change-password')
    async changePassword(@User() user: any, @Body() data: { currentPass: string; newPass: string }) {
        return this.authService.changePassword(user.id, data);
    }
}
