import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../services/prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private prisma: PrismaService,
        @InjectRedis() private readonly redis: Redis
    ) {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error('JWT_SECRET environment variable is not defined');
        }

        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (req: any) => {
                    return req?.cookies?.auth_token || null;
                }
            ]),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: any) {
        // PERFORMANCE: Cache user validation in Redis for 5 minutes
        // This reduces DB hits on every request from 1 to 0 (mostly)
        const cacheKey = `user:session:${payload.sub}`;
        const cached = await this.redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        // Real-time check if user is still active
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                isActive: true,
                orgId: true,
                profilePicture: true, // Fetch profile picture
                name: true,           // Fetch name too as it might be updated
                rollNumber: true,
                department: true,
                mustChangePassword: true,
                organization: {
                    select: {
                        features: true
                    }
                }
            }
        });

        if (!user || user.isActive === false) {
            throw new UnauthorizedException('ACCOUNT_SUSPENDED');
        }

        const sessionUser = {
            id: payload.sub,
            email: payload.email,
            name: user.name, // Include name
            role: payload.role,
            orgId: user.orgId,
            rollNumber: user.rollNumber,
            department: user.department,
            profilePicture: user.profilePicture, // Include profile picture
            features: user.organization?.features || {},
            mustChangePassword: user.mustChangePassword
        };

        // Cache for 5 minutes (300 seconds)
        await this.redis.set(cacheKey, JSON.stringify(sessionUser), 'EX', 300);

        return sessionUser;
    }
}
