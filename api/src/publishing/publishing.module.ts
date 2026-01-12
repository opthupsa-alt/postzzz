import { Module } from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { PublishingController } from './publishing.controller';
import { JobRecoveryService } from './job-recovery.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PublishingController],
  providers: [PublishingService, JobRecoveryService],
  exports: [PublishingService, JobRecoveryService],
})
export class PublishingModule {}
