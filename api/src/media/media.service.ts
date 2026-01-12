import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async uploadProofScreenshot(
    tenantId: string,
    userId: string,
    file: UploadedFile,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Determine media type
    const isVideo = file.mimetype.startsWith('video/');
    const isImage = file.mimetype.startsWith('image/');

    // Security: Validate file size
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
    const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    
    if (file.size > maxSize) {
      throw new BadRequestException(`File too large (max ${isVideo ? '100MB' : '10MB'})`);
    }

    // Security: Validate mime type
    const allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type (only PNG, JPEG, WebP, GIF, MP4, WebM allowed)');
    }

    // For now, store as base64 in database (simple approach)
    // In production, use cloud storage (S3, GCS, etc.)
    const base64Data = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64Data}`;

    const mediaType = isVideo ? 'VIDEO' : 'IMAGE';

    const asset = await this.prisma.mediaAsset.create({
      data: {
        tenantId,
        uploadedById: userId,
        type: mediaType,
        url: dataUrl,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'MEDIA_UPLOAD',
      entityType: 'MEDIA_ASSET',
      entityId: asset.id,
      metadata: { type: mediaType, size: file.size },
    });

    return asset;
  }

  async findById(tenantId: string, assetId: string) {
    return this.prisma.mediaAsset.findFirst({
      where: { id: assetId, tenantId },
    });
  }
}
