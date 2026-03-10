import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PrismaModule } from '../../services/prisma/prisma.module';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [PrismaModule, CourseModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService]
})
export class AiModule { }
