import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppWebService } from '../whatsapp/whatsapp-web.service';

export interface PublishNotification {
  userId: string;
  tenantId: string;
  postTitle: string;
  platform: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  publishedAt?: Date;
}

@Injectable()
export class PublishNotificationService {
  private readonly logger = new Logger(PublishNotificationService.name);
  private whatsappWebService: WhatsAppWebService | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Set WhatsApp Web service (injected later to avoid circular dependency)
   */
  setWhatsAppWebService(service: WhatsAppWebService) {
    this.whatsappWebService = service;
  }

  /**
   * Send WhatsApp notification for publish result
   */
  async sendPublishNotification(notification: PublishNotification): Promise<boolean> {
    try {
      // Get user with WhatsApp phone
      const user = await this.prisma.user.findUnique({
        where: { id: notification.userId },
        select: {
          id: true,
          name: true,
          whatsappPhone: true,
          notifyOnPublish: true,
        },
      });

      if (!user) {
        this.logger.warn(`User not found: ${notification.userId}`);
        return false;
      }

      if (!user.notifyOnPublish) {
        this.logger.debug(`Notifications disabled for user: ${user.id}`);
        return false;
      }

      if (!user.whatsappPhone) {
        this.logger.debug(`No WhatsApp phone for user: ${user.id}`);
        return false;
      }

      // Build message
      const message = this.buildNotificationMessage(notification, user.name);

      // Send via WhatsApp Web
      const sent = await this.sendWhatsAppMessage(user.whatsappPhone, message, notification.tenantId);

      if (sent) {
        this.logger.log(`Notification sent to ${user.whatsappPhone} for ${notification.status}`);
      }

      return sent;
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Build notification message based on status
   */
  private buildNotificationMessage(notification: PublishNotification, userName: string): string {
    const platformName = this.getPlatformName(notification.platform);
    const time = notification.publishedAt 
      ? new Date(notification.publishedAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
      : new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' });

    if (notification.status === 'SUCCESS') {
      return `✅ *تم النشر بنجاح*

مرحباً ${userName}،

تم نشر المنشور بنجاح!

📝 *المنشور:* ${notification.postTitle || 'بدون عنوان'}
📱 *المنصة:* ${platformName}
🕐 *الوقت:* ${time}

— بوستزز 🚀`;
    } else {
      return `❌ *فشل النشر*

مرحباً ${userName}،

للأسف فشل نشر المنشور.

📝 *المنشور:* ${notification.postTitle || 'بدون عنوان'}
📱 *المنصة:* ${platformName}
⚠️ *السبب:* ${notification.errorMessage || 'خطأ غير معروف'}
🕐 *الوقت:* ${time}

يرجى المحاولة مرة أخرى أو التواصل مع الدعم.

— بوستزز 🚀`;
    }
  }

  /**
   * Get Arabic platform name
   */
  private getPlatformName(platform: string): string {
    const names: Record<string, string> = {
      'X': 'إكس (تويتر)',
      'TWITTER': 'إكس (تويتر)',
      'INSTAGRAM': 'انستقرام',
      'FACEBOOK': 'فيسبوك',
      'LINKEDIN': 'لينكدإن',
      'TIKTOK': 'تيك توك',
      'YOUTUBE': 'يوتيوب',
      'THREADS': 'ثريدز',
      'SNAPCHAT': 'سناب شات',
    };
    return names[platform?.toUpperCase()] || platform;
  }

  /**
   * Normalize phone number to international format
   */
  private normalizePhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Saudi numbers
    if (cleaned.startsWith('05') && cleaned.length === 10) {
      cleaned = '966' + cleaned.substring(1);
    } else if (cleaned.startsWith('5') && cleaned.length === 9) {
      cleaned = '966' + cleaned;
    } else if (cleaned.startsWith('00')) {
      cleaned = cleaned.substring(2);
    }
    
    return cleaned;
  }

  /**
   * Send WhatsApp message via WhatsApp Web connection
   */
  private async sendWhatsAppMessage(phone: string, message: string, tenantId?: string): Promise<boolean> {
    const normalizedPhone = this.normalizePhoneNumber(phone);

    // Primary Method: WhatsApp Web (user's own number via QR code)
    if (this.whatsappWebService && tenantId) {
      const status = this.whatsappWebService.getStatus(tenantId);
      
      if (status.status === 'connected') {
        try {
          const result = await this.whatsappWebService.sendMessage(
            tenantId,
            'system', // System notification
            normalizedPhone,
            message,
          );
          
          if (result.success) {
            this.logger.log(`WhatsApp sent via WhatsApp Web to ${normalizedPhone}`);
            return true;
          } else {
            this.logger.error(`WhatsApp Web error: ${result.error}`);
          }
        } catch (error: any) {
          this.logger.error(`WhatsApp Web error: ${error.message}`);
        }
      } else {
        this.logger.warn(`WhatsApp Web not connected for tenant ${tenantId}. Status: ${status.status}`);
      }
    }

    // No WhatsApp Web connected - log for debugging
    this.logger.warn(`WhatsApp Web not available. Message would be sent to ${normalizedPhone}:`);
    this.logger.debug(message);
    
    // Return true in dev mode to not block flow
    return this.configService.get<string>('NODE_ENV') !== 'production';
  }

  /**
   * Notify all users who should receive notifications for a post
   */
  async notifyPostPublishResult(
    postId: string,
    platform: string,
    status: 'SUCCESS' | 'FAILED',
    errorMessage?: string,
  ): Promise<void> {
    this.logger.log(`notifyPostPublishResult called: postId=${postId}, platform=${platform}, status=${status}`);
    
    try {
      // Get post with creator and tenant
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          title: true,
          tenantId: true,
          createdById: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              whatsappPhone: true,
              notifyOnPublish: true,
            },
          },
        },
      });

      if (!post || !post.createdBy) {
        this.logger.warn(`Post or creator not found: ${postId}`);
        return;
      }

      this.logger.log(`Post found: ${post.title}, Creator: ${post.createdBy.name}, WhatsApp: ${post.createdBy.whatsappPhone}, NotifyOnPublish: ${post.createdBy.notifyOnPublish}`);

      // Send notification to post creator
      const result = await this.sendPublishNotification({
        userId: post.createdBy.id,
        tenantId: post.tenantId,
        postTitle: post.title || 'منشور',
        platform,
        status,
        errorMessage,
        publishedAt: new Date(),
      });
      
      this.logger.log(`Notification result: ${result}`);
    } catch (error: any) {
      this.logger.error(`Failed to notify for post ${postId}: ${error.message}`);
    }
  }
}
