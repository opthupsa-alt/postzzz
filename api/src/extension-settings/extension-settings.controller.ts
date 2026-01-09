import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExtensionSettingsService, UpdateSettingsDto } from './extension-settings.service';

interface AuthRequest extends Request {
  user: { userId: string; email: string; tenantId: string; role: string };
}

@Controller('extension-settings')
@UseGuards(JwtAuthGuard)
export class ExtensionSettingsController {
  constructor(private settingsService: ExtensionSettingsService) {}

  /**
   * Get current user's extension settings
   */
  @Get()
  async getSettings(@Req() req: AuthRequest) {
    const settings = await this.settingsService.getSettings(req.user.userId);
    return { settings };
  }

  /**
   * Update current user's extension settings
   */
  @Put()
  async updateSettings(@Req() req: AuthRequest, @Body() data: UpdateSettingsDto) {
    const settings = await this.settingsService.updateSettings(req.user.userId, data);
    return { settings, message: 'تم تحديث الإعدادات بنجاح' };
  }

  /**
   * Update social platforms connection status
   */
  @Put('social-platforms')
  async updateSocialPlatforms(
    @Req() req: AuthRequest,
    @Body() data: { platforms: Record<string, boolean> },
  ) {
    const settings = await this.settingsService.updateSocialPlatforms(
      req.user.userId,
      data.platforms,
    );
    return { settings, message: 'تم تحديث حالة المنصات' };
  }

  /**
   * Reset settings to defaults
   */
  @Post('reset')
  async resetSettings(@Req() req: AuthRequest) {
    const settings = await this.settingsService.resetSettings(req.user.userId);
    return { settings, message: 'تم إعادة تعيين الإعدادات' };
  }
}
