import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExtensionSettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get extension settings for a user
   * Creates default settings if none exist
   */
  async getSettings(userId: string) {
    let settings = await this.prisma.extensionSettings.findUnique({
      where: { userId },
    });

    // Create default settings if not found
    if (!settings) {
      settings = await this.prisma.extensionSettings.create({
        data: {
          userId,
          enableGoogleMaps: true,
          enableGoogleSearch: true,
          enableSocialMedia: false,
          matchThreshold: 90,
          maxResults: 30,
          searchDelay: 3,
          showSearchWindow: false,
          socialPlatforms: {},
          debugMode: false,
        },
      });
    }

    return settings;
  }

  /**
   * Update extension settings for a user
   */
  async updateSettings(userId: string, data: UpdateSettingsDto) {
    // Ensure settings exist
    await this.getSettings(userId);

    return this.prisma.extensionSettings.update({
      where: { userId },
      data: {
        enableGoogleMaps: data.enableGoogleMaps,
        enableGoogleSearch: data.enableGoogleSearch,
        enableSocialMedia: data.enableSocialMedia,
        matchThreshold: data.matchThreshold,
        maxResults: data.maxResults,
        searchDelay: data.searchDelay,
        showSearchWindow: data.showSearchWindow,
        socialPlatforms: data.socialPlatforms,
        debugMode: data.debugMode,
      },
    });
  }

  /**
   * Update social platforms connection status
   */
  async updateSocialPlatforms(userId: string, platforms: Record<string, boolean>) {
    await this.getSettings(userId);

    return this.prisma.extensionSettings.update({
      where: { userId },
      data: {
        socialPlatforms: platforms,
      },
    });
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(userId: string) {
    await this.getSettings(userId);

    return this.prisma.extensionSettings.update({
      where: { userId },
      data: {
        enableGoogleMaps: true,
        enableGoogleSearch: true,
        enableSocialMedia: false,
        matchThreshold: 90,
        maxResults: 30,
        searchDelay: 3,
        showSearchWindow: false,
        socialPlatforms: {},
        debugMode: false,
      },
    });
  }
}

// DTO for updating settings
export interface UpdateSettingsDto {
  enableGoogleMaps?: boolean;
  enableGoogleSearch?: boolean;
  enableSocialMedia?: boolean;
  matchThreshold?: number;
  maxResults?: number;
  searchDelay?: number;
  showSearchWindow?: boolean;
  socialPlatforms?: Record<string, boolean>;
  debugMode?: boolean;
}
