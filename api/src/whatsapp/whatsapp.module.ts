import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebService } from './whatsapp-web.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppWebGateway } from './whatsapp-web.gateway';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppWebService, WhatsAppWebGateway],
  exports: [WhatsAppService, WhatsAppWebService],
})
export class WhatsAppModule {}
