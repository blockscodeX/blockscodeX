import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { PrismaModule } from '../../services/prisma/prisma.module';
import { TestCodeRotationService } from './test-code-rotation.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExamController],
  providers: [ExamService, TestCodeRotationService],
  exports: [ExamService]
})
export class ExamModule { }
