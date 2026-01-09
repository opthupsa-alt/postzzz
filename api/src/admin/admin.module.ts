import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { AISettingsController } from './ai-settings.controller';

@Module({
  imports: [PrismaModule, AIProviderModule],
  controllers: [AdminController, AISettingsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
