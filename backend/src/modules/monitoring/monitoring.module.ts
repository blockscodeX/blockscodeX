import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringGateway } from './monitoring.gateway';

import { SubmissionModule } from '../submission/submission.module';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SubmissionModule, AuthModule],
  controllers: [MonitoringController],
  providers: [MonitoringGateway],
  exports: [MonitoringGateway],
})
export class MonitoringModule { }
