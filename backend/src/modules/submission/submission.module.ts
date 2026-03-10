import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SubmissionService } from './submission.service';
import { SubmissionProcessor } from './submission.processor';
import { SubmissionController } from './submission.controller';
import { PrismaModule } from '../../services/prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        PrismaModule,
        BullModule.registerQueue(
            { name: 'submission_queue' },
            { name: 'student-analytics' }
        ),
    ],
    controllers: [SubmissionController],
    providers: [SubmissionService, SubmissionProcessor],
    exports: [SubmissionService],
})
export class SubmissionModule { }
