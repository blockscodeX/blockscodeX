import { Module } from '@nestjs/common';
import { CodeExecutionController } from './code-execution.controller';
import { CodeExecutionService } from './code-execution.service';
import { PistonStrategy } from './strategies/piston.strategy';
import { Judge0Strategy } from './strategies/judge0.strategy';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { CodeExecutionProcessor } from './code-execution.processor';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../services/prisma/prisma.module';

@Module({
    imports: [
        HttpModule,
        PrismaModule,
        BullModule.registerQueue({
            name: 'code-execution',
        }),
    ],
    controllers: [CodeExecutionController],
    providers: [
        CodeExecutionService,
        CodeExecutionProcessor,
        PistonStrategy,
        Judge0Strategy,
        {
            provide: 'IExecutionStrategy', // Use string token for interface injection
            useFactory: (configService: ConfigService, pistonStrategy: PistonStrategy, judge0Strategy: Judge0Strategy) => {
                const engine = configService.get<string>('CODE_EXECUTION_ENGINE', 'judge0');
                if (engine === 'piston') {
                    return pistonStrategy;
                }
                return judge0Strategy; // Default
            },
            inject: [ConfigService, PistonStrategy, Judge0Strategy],
        },
    ],
    exports: [CodeExecutionService],
})
export class CodeExecutionModule { }

