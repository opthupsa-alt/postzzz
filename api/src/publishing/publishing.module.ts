import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PublishingService } from './publishing.service';
import { PublishingController } from './publishing.controller';
import { JobRecoveryService } from './job-recovery.service';
import { PublishNotificationService } from './publish-notification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { WhatsAppWebService } from '../whatsapp/whatsapp-web.service';

@Module({
  imports: [PrismaModule, AuditModule, ConfigModule, WhatsAppModule],
  controllers: [PublishingController],
  providers: [PublishingService, JobRecoveryService, PublishNotificationService],
  exports: [PublishingService, JobRecoveryService, PublishNotificationService],
})
export class PublishingModule implements OnModuleInit {
  constructor(
    private publishNotificationService: PublishNotificationService,
    private whatsAppWebService: WhatsAppWebService,
  ) {}

  onModuleInit() {
    // Connect WhatsApp Web service to notification service
    this.publishNotificationService.setWhatsAppWebService(this.whatsAppWebService);
  }
}
