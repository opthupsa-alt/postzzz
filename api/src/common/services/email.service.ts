import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly platformName: string;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get('SMTP_FROM') || 'noreply@leedz.app';
    this.platformName = this.configService.get('PLATFORM_NAME') || 'Leedz';
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const smtpHost = this.configService.get('SMTP_HOST');
      
      if (!smtpHost) {
        // Development mode - log email instead of sending
        this.logger.warn('SMTP not configured - logging email instead');
        this.logger.log('='.repeat(50));
        this.logger.log(`TO: ${options.to}`);
        this.logger.log(`SUBJECT: ${options.subject}`);
        this.logger.log(`BODY: ${options.text || options.html}`);
        this.logger.log('='.repeat(50));
        return true;
      }

      // Production mode - use nodemailer
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(this.configService.get('SMTP_PORT') || '587'),
        secure: this.configService.get('SMTP_SECURE') === 'true',
        auth: {
          user: this.configService.get('SMTP_USER'),
          pass: this.configService.get('SMTP_PASS'),
        },
      });

      await transporter.sendMail({
        from: `"${this.platformName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`Email sent to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetUrl: string, userName?: string): Promise<boolean> {
    const subject = 'استعادة كلمة المرور - Leedz';
    
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">⚡ Leedz</h1>
    </div>
    
    <div style="padding: 32px;">
      <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 24px;">مرحباً ${userName || 'عزيزي المستخدم'}</h2>
      
      <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 24px;">
        لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. إذا لم تقم بهذا الطلب، يمكنك تجاهل هذه الرسالة.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 16px 48px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">
          إعادة تعيين كلمة المرور
        </a>
      </div>
      
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        أو انسخ الرابط التالي:
        <br>
        <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
      </p>
      
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-top: 24px;">
        <p style="color: #92400e; font-size: 14px; margin: 0;">
          ⚠️ هذا الرابط صالح لمدة ساعة واحدة فقط.
        </p>
      </div>
    </div>
    
    <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Leedz. جميع الحقوق محفوظة.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
مرحباً ${userName || 'عزيزي المستخدم'}

لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.

لإعادة تعيين كلمة المرور، انقر على الرابط التالي:
${resetUrl}

هذا الرابط صالح لمدة ساعة واحدة فقط.

إذا لم تقم بهذا الطلب، يمكنك تجاهل هذه الرسالة.

فريق Leedz
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }

  async sendInviteEmail(
    email: string,
    inviteUrl: string,
    inviterName: string,
    tenantName: string,
    role: string,
  ): Promise<boolean> {
    const subject = `دعوة للانضمام إلى ${tenantName} - Leedz`;
    
    const roleAr = {
      OWNER: 'مالك',
      ADMIN: 'مدير',
      MANAGER: 'مدير فريق',
      SALES: 'مندوب مبيعات',
    }[role] || role;

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">⚡ Leedz</h1>
    </div>
    
    <div style="padding: 32px;">
      <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 24px;">لديك دعوة جديدة! 🎉</h2>
      
      <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 24px;">
        قام <strong>${inviterName}</strong> بدعوتك للانضمام إلى فريق <strong>${tenantName}</strong> بصفة <strong>${roleAr}</strong>.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 16px 48px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">
          قبول الدعوة
        </a>
      </div>
      
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        أو انسخ الرابط التالي:
        <br>
        <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
      </p>
      
      <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin-top: 24px;">
        <p style="color: #1e40af; font-size: 14px; margin: 0;">
          💡 هذه الدعوة صالحة لمدة 7 أيام.
        </p>
      </div>
    </div>
    
    <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Leedz. جميع الحقوق محفوظة.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
لديك دعوة جديدة!

قام ${inviterName} بدعوتك للانضمام إلى فريق ${tenantName} بصفة ${roleAr}.

لقبول الدعوة، انقر على الرابط التالي:
${inviteUrl}

هذه الدعوة صالحة لمدة 7 أيام.

فريق Leedz
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }
}
