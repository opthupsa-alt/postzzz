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

    // For now, store as base64 in database (simple approach)
    // In production, use cloud storage (S3, GCS, etc.)
    const base64Data = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64Data}`;

    const asset = await this.prisma.mediaAsset.create({
      data: {
        tenantId,
        uploadedById: userId,
        type: 'IMAGE',
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
      metadata: { type: 'IMAGE', size: file.size },
    });

    return asset;
  }

  async findById(tenantId: string, assetId: string) {
    return this.prisma.mediaAsset.findFirst({
      where: { id: assetId, tenantId },
    });
  }
}
