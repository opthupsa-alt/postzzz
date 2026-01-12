import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface PublishNotification {
  userId: string;
  postTitle: string;
  platform: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  publishedAt?: Date;
}

@Injectable()
export class PublishNotificationService {
  private readonly logger = new Logger(PublishNotificationService.name);
  private readonly callmeApiKey: string;
  private readonly callmeInstanceId: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // CallMeBot or similar WhatsApp API credentials
    this.callmeApiKey = this.configService.get<string>('WHATSAPP_API_KEY') || '';
    this.callmeInstanceId = this.configService.get<string>('WHATSAPP_INSTANCE_ID') || '';
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

      // Send via WhatsApp API
      const sent = await this.sendWhatsAppMessage(user.whatsappPhone, message);

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
   * Send WhatsApp message via API
   * Using CallMeBot free API or similar service
   */
  private async sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
    const normalizedPhone = this.normalizePhoneNumber(phone);

    // Method 1: CallMeBot API (free, requires registration)
    if (this.callmeApiKey) {
      try {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${normalizedPhone}&text=${encodeURIComponent(message)}&apikey=${this.callmeApiKey}`;
        
        const response = await fetch(url);
        
        if (response.ok) {
          this.logger.log(`WhatsApp sent via CallMeBot to ${normalizedPhone}`);
          return true;
        }
      } catch (error) {
        this.logger.error(`CallMeBot error: ${error.message}`);
      }
    }

    // Method 2: UltraMsg API (paid, more reliable)
    const ultraMsgToken = this.configService.get<string>('ULTRAMSG_TOKEN');
    const ultraMsgInstance = this.configService.get<string>('ULTRAMSG_INSTANCE');
    
    if (ultraMsgToken && ultraMsgInstance) {
      try {
        const url = `https://api.ultramsg.com/${ultraMsgInstance}/messages/chat`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: ultraMsgToken,
            to: normalizedPhone,
            body: message,
          }),
        });

        if (response.ok) {
          this.logger.log(`WhatsApp sent via UltraMsg to ${normalizedPhone}`);
          return true;
        }
      } catch (error) {
        this.logger.error(`UltraMsg error: ${error.message}`);
      }
    }

    // Method 3: Twilio WhatsApp (enterprise)
    const twilioSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const twilioToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const twilioFrom = this.configService.get<string>('TWILIO_WHATSAPP_FROM');

    if (twilioSid && twilioToken && twilioFrom) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: `whatsapp:${twilioFrom}`,
            To: `whatsapp:+${normalizedPhone}`,
            Body: message,
          }),
        });

        if (response.ok) {
          this.logger.log(`WhatsApp sent via Twilio to ${normalizedPhone}`);
          return true;
        }
      } catch (error) {
        this.logger.error(`Twilio error: ${error.message}`);
      }
    }

    // No API configured - log for debugging
    this.logger.warn(`No WhatsApp API configured. Message would be sent to ${normalizedPhone}:`);
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
    try {
      // Get post with creator
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          title: true,
          createdById: true,
          createdBy: {
            select: {
              id: true,
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

      // Send notification to post creator
      await this.sendPublishNotification({
        userId: post.createdBy.id,
        postTitle: post.title || 'منشور',
        platform,
        status,
        errorMessage,
        publishedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to notify for post ${postId}: ${error.message}`);
    }
  }
}
