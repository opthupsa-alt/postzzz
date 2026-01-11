import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePostDto, UpdatePostDto, UpdateVariantDto, CreateVariantDto } from './dto';

// Define enums locally until Prisma client is regenerated
type PostStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';
type SocialPlatform = 'X' | 'INSTAGRAM' | 'TIKTOK' | 'SNAPCHAT' | 'LINKEDIN' | 'THREADS' | 'YOUTUBE' | 'FACEBOOK';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ==================== POSTS ====================

  async findAll(tenantId: string, options?: { 
    clientId?: string; 
    from?: string; 
    to?: string; 
    status?: PostStatus;
  }) {
    const where: any = { tenantId };

    if (options?.clientId) {
      where.clientId = options.clientId;
    }

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.from || options?.to) {
      where.scheduledAt = {};
      if (options?.from) {
        where.scheduledAt.gte = new Date(options.from);
      }
      if (options?.to) {
        where.scheduledAt.lte = new Date(options.to);
      }
    }

    const posts = await this.prisma.post.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        client: {
          select: { id: true, name: true, logoUrl: true },
        },
        variants: {
          select: { id: true, platform: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        _count: {
          select: { variants: true },
        },
      },
    });

    return posts.map(post => ({
      ...post,
      variantsCount: post._count.variants,
      platforms: post.variants.map(v => v.platform),
    }));
  }

  async findById(tenantId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, tenantId },
      include: {
        client: {
          select: { id: true, name: true, logoUrl: true },
        },
        variants: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async create(tenantId: string, userId: string, dto: CreatePostDto) {
    // Verify client belongs to tenant
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, tenantId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const post = await this.prisma.post.create({
      data: {
        tenantId,
        clientId: dto.clientId,
        title: dto.title,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        timezone: dto.timezone || 'Asia/Riyadh',
        status: 'DRAFT',
        createdById: userId,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });

    // Create variants if provided
    if (dto.variants && dto.variants.length > 0) {
      await this.upsertVariants(tenantId, post.id, dto.variants);
    }

    await this.auditService.log({
      tenantId,
      userId,
      action: 'POST_CREATE',
      entityType: 'POST',
      entityId: post.id,
      metadata: { title: post.title, clientId: post.clientId },
    });

    return this.findById(tenantId, post.id);
  }

  async update(tenantId: string, userId: string, postId: string, dto: UpdatePostDto) {
    const existing = await this.prisma.post.findFirst({
      where: { id: postId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Post not found');
    }

    const post = await this.prisma.post.update({
      where: { id: postId },
      data: {
        title: dto.title,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        timezone: dto.timezone,
        status: dto.status,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'POST_UPDATE',
      entityType: 'POST',
      entityId: post.id,
      metadata: { title: post.title },
    });

    return this.findById(tenantId, post.id);
  }

  async delete(tenantId: string, userId: string, postId: string) {
    const existing = await this.prisma.post.findFirst({
      where: { id: postId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Post not found');
    }

    // Soft delete by setting status to ARCHIVED
    await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'ARCHIVED' },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'POST_DELETE',
      entityType: 'POST',
      entityId: postId,
      metadata: { title: existing.title },
    });

    return { success: true };
  }

  // ==================== VARIANTS ====================

  async getVariants(tenantId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, tenantId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.postVariant.findMany({
      where: { postId, tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async upsertVariants(tenantId: string, postId: string, variants: CreateVariantDto[]) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, tenantId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const results = [];

    for (const variant of variants) {
      const existing = await this.prisma.postVariant.findUnique({
        where: {
          tenantId_postId_platform: {
            tenantId,
            postId,
            platform: variant.platform,
          },
        },
      });

      if (existing) {
        // Update existing variant
        const updated = await this.prisma.postVariant.update({
          where: { id: existing.id },
          data: {
            caption: variant.caption,
            hashtags: variant.hashtags,
            linkUrl: variant.linkUrl,
            mediaAssetIds: variant.mediaAssetIds,
            extra: variant.extra,
          },
        });
        results.push(updated);
      } else {
        // Create new variant
        const created = await this.prisma.postVariant.create({
          data: {
            tenantId,
            postId,
            platform: variant.platform,
            caption: variant.caption,
            hashtags: variant.hashtags,
            linkUrl: variant.linkUrl,
            mediaAssetIds: variant.mediaAssetIds,
            extra: variant.extra,
          },
        });
        results.push(created);
      }
    }

    return results;
  }

  async updateVariant(tenantId: string, userId: string, variantId: string, dto: UpdateVariantDto) {
    const existing = await this.prisma.postVariant.findFirst({
      where: { id: variantId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Variant not found');
    }

    const variant = await this.prisma.postVariant.update({
      where: { id: variantId },
      data: {
        caption: dto.caption,
        hashtags: dto.hashtags,
        linkUrl: dto.linkUrl,
        mediaAssetIds: dto.mediaAssetIds,
        extra: dto.extra,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'VARIANT_UPDATE',
      entityType: 'POST_VARIANT',
      entityId: variant.id,
      metadata: { platform: variant.platform },
    });

    return variant;
  }

  async deleteVariant(tenantId: string, userId: string, variantId: string) {
    const existing = await this.prisma.postVariant.findFirst({
      where: { id: variantId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Variant not found');
    }

    await this.prisma.postVariant.delete({
      where: { id: variantId },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'VARIANT_DELETE',
      entityType: 'POST_VARIANT',
      entityId: variantId,
      metadata: { platform: existing.platform },
    });

    return { success: true };
  }

  // ==================== WORKFLOW ====================

  async submitForApproval(tenantId: string, userId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, tenantId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== 'DRAFT') {
      throw new BadRequestException('Only draft posts can be submitted for approval');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'PENDING_APPROVAL' },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'POST_SUBMIT_APPROVAL',
      entityType: 'POST',
      entityId: postId,
      metadata: { title: post.title },
    });

    return this.findById(tenantId, postId);
  }

  async approve(tenantId: string, userId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, tenantId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== 'PENDING_APPROVAL' && post.status !== 'DRAFT') {
      throw new BadRequestException('Post cannot be approved in current status');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { 
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'POST_APPROVE',
      entityType: 'POST',
      entityId: postId,
      metadata: { title: post.title },
    });

    return this.findById(tenantId, postId);
  }

  async schedule(tenantId: string, userId: string, postId: string, scheduledAt?: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, tenantId },
      include: {
        variants: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== 'APPROVED' && post.status !== 'DRAFT') {
      throw new BadRequestException('Post must be approved before scheduling');
    }

    const scheduleTime = scheduledAt ? new Date(scheduledAt) : post.scheduledAt;
    
    if (!scheduleTime) {
      throw new BadRequestException('Scheduled time is required');
    }

    if (!post.variants || post.variants.length === 0) {
      throw new BadRequestException('Post has no variants to publish');
    }

    // Create publishing jobs for each variant (idempotent)
    for (const variant of post.variants) {
      const idempotencyKey = `${postId}:${variant.platform}:${scheduleTime.toISOString()}`;

      await this.prisma.publishingJob.upsert({
        where: {
          tenantId_idempotencyKey: { tenantId, idempotencyKey },
        },
        update: {
          scheduledAt: scheduleTime,
        },
        create: {
          tenantId,
          postId,
          clientId: post.clientId,
          platform: variant.platform,
          scheduledAt: scheduleTime,
          idempotencyKey,
        },
      });
    }

    // Update post status
    await this.prisma.post.update({
      where: { id: postId },
      data: { 
        status: 'SCHEDULED',
        scheduledAt: scheduleTime,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'POST_SCHEDULE',
      entityType: 'POST',
      entityId: postId,
      metadata: { title: post.title, scheduledAt: scheduleTime, jobsCreated: post.variants.length },
    });

    return this.findById(tenantId, postId);
  }
}
