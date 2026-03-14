import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../services/prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class TestCodeRotationService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TestCodeRotationService.name);
    private timer: NodeJS.Timeout | null = null;
    private readonly tickMs = 30 * 1000;
    private readonly lockTtlMs = 20 * 1000;

    constructor(
        private readonly prisma: PrismaService,
        @InjectRedis() private readonly redis: Redis
    ) { }

    onModuleInit() {
        this.timer = setInterval(() => {
            this.rotateDueExamCodes().catch((error) => {
                this.logger.error(`Rotation tick failed: ${error?.message || error}`);
            });
        }, this.tickMs);

        this.rotateDueExamCodes().catch((error) => {
            this.logger.error(`Initial rotation tick failed: ${error?.message || error}`);
        });

        this.logger.log('Test code rotation worker started');
    }

    onModuleDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private generateRandomNumericCode(length: number): string {
        const normalizedLength = Math.min(10, Math.max(4, length));
        let value = '';
        for (let i = 0; i < normalizedLength; i += 1) {
            value += Math.floor(Math.random() * 10).toString();
        }
        return value;
    }

    private async tryAcquireLock(): Promise<boolean> {
        const lockKey = 'exam:test-code-rotation:lock';
        const lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const result = await this.redis.set(lockKey, lockValue, 'PX', this.lockTtlMs, 'NX');
        return result === 'OK';
    }

    private async rotateDueExamCodes() {
        const gotLock = await this.tryAcquireLock();
        if (!gotLock) return;

        const now = Date.now();

        const rotatingExams = await this.prisma.exam.findMany({
            where: {
                isActive: true,
                testCodeType: 'Rotating',
                rotationInterval: { gt: 0 },
                testCode: { not: null }
            },
            select: {
                id: true,
                slug: true,
                testCode: true,
                rotationInterval: true,
                updatedAt: true
            }
        });

        for (const exam of rotatingExams) {
            const intervalMinutes = Number(exam.rotationInterval || 0);
            if (!intervalMinutes || intervalMinutes <= 0) continue;

            const dueAt = new Date(exam.updatedAt).getTime() + intervalMinutes * 60 * 1000;
            if (now < dueAt) continue;

            const currentCode = String(exam.testCode || '');
            const nextCode = this.generateRandomNumericCode(currentCode.length || 5);

            if (nextCode === currentCode) continue;

            await this.prisma.exam.update({
                where: { id: exam.id },
                data: { testCode: nextCode }
            });

            this.logger.log(`Rotated test code for exam ${exam.slug}`);
        }
    }
}
