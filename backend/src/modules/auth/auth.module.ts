import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../../services/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { OrgFeaturesGuard } from './guards/org-features.guard';
import { OrgStatusGuard } from './guards/org-status.guard';
import { MailService } from '../../services/mail.service';
import { StorageModule } from '../../services/storage/storage.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    StorageModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OrgFeaturesGuard, OrgStatusGuard, MailService],
  exports: [AuthService, OrgFeaturesGuard, OrgStatusGuard, JwtModule],
})
export class AuthModule { }
