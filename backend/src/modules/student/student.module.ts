import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { PrismaModule } from '../../services/prisma/prisma.module';
import { ExamModule } from '../exam/exam.module';
import { BullModule } from '@nestjs/bullmq';
import { StudentProcessor } from './student.processor';

@Module({
  imports: [
    PrismaModule,
    ExamModule,
    BullModule.registerQueue({
      name: 'student-analytics'
    })
  ],
  controllers: [StudentController],
  providers: [StudentService, StudentProcessor]
})
export class StudentModule { }
