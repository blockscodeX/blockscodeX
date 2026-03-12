import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../services/prisma/prisma.module';

@Module({
    imports: [AuthModule, PrismaModule],
    providers: [NotificationGateway],
    exports: [NotificationGateway],
})
export class NotificationModule { }
