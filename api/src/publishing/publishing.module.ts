import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PublishingService } from './publishing.service';
import { PublishingController } from './publishing.controller';
import { JobRecoveryService } from './job-recovery.service';
import { PublishNotificationService } from './publish-notification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule, ConfigModule],
  controllers: [PublishingController],
  providers: [PublishingService, JobRecoveryService, PublishNotificationService],
  exports: [PublishingService, JobRecoveryService, PublishNotificationService],
})
export class PublishingModule {}
