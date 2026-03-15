import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { PrismaModule } from '../../services/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [OrganizationController],
    providers: [],
    exports: []
})
export class OrganizationModule { }
