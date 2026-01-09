import { Module } from '@nestjs/common';
import { ExtensionSettingsController } from './extension-settings.controller';
import { ExtensionSettingsService } from './extension-settings.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExtensionSettingsController],
  providers: [ExtensionSettingsService],
  exports: [ExtensionSettingsService],
})
export class ExtensionSettingsModule {}
