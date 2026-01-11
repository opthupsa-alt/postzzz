import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface WhatsAppMessage {
  to: string;
  message: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  whatsappUrl?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  /**
   * Generate WhatsApp Web URL for sending message
   * This is a basic integration without Business API
   */
  generateWhatsAppUrl(phone: string, message: string): string {
    // Clean phone number - remove spaces, dashes, and ensure it starts with country code
    const cleanPhone = this.normalizePhoneNumber(phone);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  }

  /**
   * Generate WhatsApp API URL (for desktop app)
   */
  generateWhatsAppApiUrl(phone: string, message: string): string {
    const cleanPhone = this.normalizePhoneNumber(phone);
    const encodedMessage = encodeURIComponent(message);
    return `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
  }

  /**
   * Normalize phone number to international format
   */
  normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Saudi numbers
    if (cleaned.startsWith('05') && cleaned.length === 10) {
      cleaned = '966' + cleaned.substring(1);
    } else if (cleaned.startsWith('5') && cleaned.length === 9) {
      cleaned = '966' + cleaned;
    } else if (cleaned.startsWith('00')) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    return cleaned;
  }

  /**
   * Send message via WhatsApp Web URL (returns URL for user to click)
   */
  async sendMessage(
    tenantId: string,
    userId: string,
    message: WhatsAppMessage,
  ): Promise<SendResult> {
    try {
      const whatsappUrl = this.generateWhatsAppUrl(message.to, message.message);
      
      // Log the message attempt
      const logEntry = await this.prisma.whatsAppLog.create({
        data: {
          tenantId,
          userId,
          phone: message.to,
          message: message.message,
          templateId: message.templateId,
          status: 'PENDING',
          whatsappUrl,
        },
      });

      await this.auditService.log({
        tenantId,
        userId,
        action: 'WHATSAPP_SEND',
        entityType: 'WHATSAPP_MESSAGE',
        entityId: logEntry.id,
        metadata: { phone: message.to },
      });

      this.logger.log(`WhatsApp message prepared for ${message.to}`);

      return {
        success: true,
        messageId: logEntry.id,
        whatsappUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to prepare WhatsApp message: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk messages
   */
  async sendBulkMessages(
    tenantId: string,
    userId: string,
    messages: WhatsAppMessage[],
  ): Promise<{ total: number; prepared: number; failed: number; results: SendResult[] }> {
    const results: SendResult[] = [];
    let prepared = 0;
    let failed = 0;

    for (const msg of messages) {
      const result = await this.sendMessage(tenantId, userId, msg);
      results.push(result);
      if (result.success) {
        prepared++;
      } else {
        failed++;
      }
    }

    return {
      total: messages.length,
      prepared,
      failed,
      results,
    };
  }

  /**
   * Get message templates for tenant
   */
  async getTemplates(tenantId: string) {
    return this.prisma.whatsAppTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new template
   */
  async createTemplate(
    tenantId: string,
    userId: string,
    data: {
      name: string;
      content: string;
      variables: string[];
      category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    },
  ) {
    const template = await this.prisma.whatsAppTemplate.create({
      data: {
        tenantId,
        name: data.name,
        content: data.content,
        variables: data.variables,
        category: data.category,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'WHATSAPP_TEMPLATE_CREATE',
      entityType: 'WHATSAPP_TEMPLATE',
      entityId: template.id,
      metadata: { name: data.name },
    });

    return template;
  }

  /**
   * Update a template
   */
  async updateTemplate(
    tenantId: string,
    userId: string,
    templateId: string,
    data: Partial<{
      name: string;
      content: string;
      variables: string[];
      category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    }>,
  ) {
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    const updated = await this.prisma.whatsAppTemplate.update({
      where: { id: templateId },
      data,
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'WHATSAPP_TEMPLATE_UPDATE',
      entityType: 'WHATSAPP_TEMPLATE',
      entityId: templateId,
    });

    return updated;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(tenantId: string, userId: string, templateId: string) {
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    await this.prisma.whatsAppTemplate.delete({
      where: { id: templateId },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'WHATSAPP_TEMPLATE_DELETE',
      entityType: 'WHATSAPP_TEMPLATE',
      entityId: templateId,
    });

    return { success: true };
  }

  /**
   * Apply template variables
   */
  applyTemplate(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  /**
   * Get message logs for tenant
   */
  async getMessageLogs(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      phone?: string;
    } = {},
  ) {
    const { page = 1, limit = 20, status, phone } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (phone) where.phone = { contains: phone };

    const [logs, total] = await Promise.all([
      this.prisma.whatsAppLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.whatsAppLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update message status (called after user sends via WhatsApp Web)
   */
  async updateMessageStatus(
    tenantId: string,
    messageId: string,
    status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
  ) {
    const log = await this.prisma.whatsAppLog.findFirst({
      where: { id: messageId, tenantId },
    });

    if (!log) {
      throw new BadRequestException('Message not found');
    }

    return this.prisma.whatsAppLog.update({
      where: { id: messageId },
      data: {
        status,
        sentAt: status === 'SENT' ? new Date() : log.sentAt,
      },
    });
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const [
      totalMessages,
      messagesToday,
      messagesThisWeek,
      messagesByStatus,
      templatesCount,
    ] = await Promise.all([
      this.prisma.whatsAppLog.count({ where: { tenantId } }),
      this.prisma.whatsAppLog.count({
        where: { tenantId, createdAt: { gte: startOfToday } },
      }),
      this.prisma.whatsAppLog.count({
        where: { tenantId, createdAt: { gte: startOfWeek } },
      }),
      this.prisma.whatsAppLog.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
      }),
      this.prisma.whatsAppTemplate.count({ where: { tenantId } }),
    ]);

    return {
      totalMessages,
      messagesToday,
      messagesThisWeek,
      byStatus: messagesByStatus.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      templatesCount,
    };
  }
}
