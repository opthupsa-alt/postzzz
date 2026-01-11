import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Define type locally until Prisma client is regenerated
type SocialPlatform = 'X' | 'INSTAGRAM' | 'TIKTOK' | 'SNAPCHAT' | 'LINKEDIN' | 'THREADS' | 'YOUTUBE' | 'FACEBOOK';

// Default platform rules (global defaults)
const DEFAULT_RULES: Record<SocialPlatform, {
  maxCaptionLength: number;
  maxHashtags: number;
  allowLink: boolean;
  maxMediaCount: number;
  allowedMediaTypes: string[];
}> = {
  X: {
    maxCaptionLength: 280,
    maxHashtags: 5,
    allowLink: true,
    maxMediaCount: 4,
    allowedMediaTypes: ['IMAGE', 'VIDEO'],
  },
  INSTAGRAM: {
    maxCaptionLength: 2200,
    maxHashtags: 30,
    allowLink: false,
    maxMediaCount: 10,
    allowedMediaTypes: ['IMAGE', 'VIDEO'],
  },
  TIKTOK: {
    maxCaptionLength: 2200,
    maxHashtags: 10,
    allowLink: false,
    maxMediaCount: 1,
    allowedMediaTypes: ['VIDEO'],
  },
  SNAPCHAT: {
    maxCaptionLength: 250,
    maxHashtags: 0,
    allowLink: false,
    maxMediaCount: 1,
    allowedMediaTypes: ['IMAGE', 'VIDEO'],
  },
  LINKEDIN: {
    maxCaptionLength: 3000,
    maxHashtags: 5,
    allowLink: true,
    maxMediaCount: 9,
    allowedMediaTypes: ['IMAGE', 'VIDEO'],
  },
  THREADS: {
    maxCaptionLength: 500,
    maxHashtags: 10,
    allowLink: true,
    maxMediaCount: 10,
    allowedMediaTypes: ['IMAGE', 'VIDEO'],
  },
  YOUTUBE: {
    maxCaptionLength: 5000,
    maxHashtags: 15,
    allowLink: true,
    maxMediaCount: 1,
    allowedMediaTypes: ['VIDEO'],
  },
  FACEBOOK: {
    maxCaptionLength: 63206,
    maxHashtags: 10,
    allowLink: true,
    maxMediaCount: 10,
    allowedMediaTypes: ['IMAGE', 'VIDEO'],
  },
};

@Injectable()
export class PlatformRulesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    // Get tenant-specific rules
    const tenantRules = tenantId
      ? await this.prisma.platformRule.findMany({
          where: { tenantId },
        })
      : [];

    // Get global rules
    const globalRules = await this.prisma.platformRule.findMany({
      where: { tenantId: null },
    });

    // Merge: tenant rules override global rules
    const rulesMap = new Map();

    // Start with defaults
    for (const [platform, defaults] of Object.entries(DEFAULT_RULES)) {
      rulesMap.set(platform, {
        platform,
        ...defaults,
        isDefault: true,
      });
    }

    // Apply global rules
    for (const rule of globalRules) {
      rulesMap.set(rule.platform, {
        ...rulesMap.get(rule.platform),
        ...rule,
        isDefault: false,
      });
    }

    // Apply tenant rules
    for (const rule of tenantRules) {
      rulesMap.set(rule.platform, {
        ...rulesMap.get(rule.platform),
        ...rule,
        isDefault: false,
      });
    }

    return Array.from(rulesMap.values());
  }

  async findByPlatform(tenantId: string | null, platform: SocialPlatform) {
    // Try tenant-specific rule first
    if (tenantId) {
      const tenantRule = await this.prisma.platformRule.findUnique({
        where: {
          tenantId_platform: { tenantId, platform },
        },
      });
      if (tenantRule) return tenantRule;
    }

    // Try global rule
    const globalRule = await this.prisma.platformRule.findFirst({
      where: { tenantId: null, platform },
    });
    if (globalRule) return globalRule;

    // Return default
    return {
      platform,
      ...DEFAULT_RULES[platform],
      isDefault: true,
    };
  }

  async update(
    tenantId: string | null,
    ruleId: string,
    data: {
      maxCaptionLength?: number;
      maxHashtags?: number;
      allowLink?: boolean;
      allowedMediaTypes?: string[];
      maxMediaCount?: number;
      notes?: string;
    },
  ) {
    const existing = await this.prisma.platformRule.findFirst({
      where: { id: ruleId },
    });

    if (!existing) {
      throw new NotFoundException('Rule not found');
    }

    // Verify tenant access
    if (existing.tenantId && existing.tenantId !== tenantId) {
      throw new NotFoundException('Rule not found');
    }

    return this.prisma.platformRule.update({
      where: { id: ruleId },
      data: {
        maxCaptionLength: data.maxCaptionLength,
        maxHashtags: data.maxHashtags,
        allowLink: data.allowLink,
        allowedMediaTypes: data.allowedMediaTypes,
        maxMediaCount: data.maxMediaCount,
        notes: data.notes,
      },
    });
  }

  async seedDefaults() {
    // Create global default rules if they don't exist
    for (const [platform, defaults] of Object.entries(DEFAULT_RULES)) {
      await this.prisma.platformRule.upsert({
        where: {
          tenantId_platform: { tenantId: null as any, platform: platform as SocialPlatform },
        },
        update: {},
        create: {
          tenantId: null,
          platform: platform as SocialPlatform,
          maxCaptionLength: defaults.maxCaptionLength,
          maxHashtags: defaults.maxHashtags,
          allowLink: defaults.allowLink,
          allowedMediaTypes: defaults.allowedMediaTypes,
          maxMediaCount: defaults.maxMediaCount,
        },
      });
    }
  }
}
