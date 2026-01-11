import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as qrcode from 'qrcode';

// WhatsApp Web.js types
interface WAClient {
  on: (event: string, callback: (...args: any[]) => void) => void;
  initialize: () => Promise<void>;
  destroy: () => Promise<void>;
  sendMessage: (chatId: string, content: string) => Promise<any>;
  getState: () => Promise<string>;
  logout: () => Promise<void>;
}

interface ClientInfo {
  client: WAClient | null;
  qrCode: string | null;
  status: 'disconnected' | 'qr_ready' | 'connecting' | 'connected' | 'failed';
  phoneNumber: string | null;
  lastActivity: Date;
  error: string | null;
}

@Injectable()
export class WhatsAppWebService implements OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppWebService.name);
  private clients: Map<string, ClientInfo> = new Map();
  private qrCallbacks: Map<string, (qr: string) => void> = new Map();
  private statusCallbacks: Map<string, (status: string, data?: any) => void> = new Map();

  constructor(private prisma: PrismaService) {}

  async onModuleDestroy() {
    // Cleanup all clients on shutdown
    for (const [tenantId, info] of this.clients) {
      if (info.client) {
        try {
          await info.client.destroy();
        } catch (e) {
          this.logger.warn(`Failed to destroy client for tenant ${tenantId}`);
        }
      }
    }
  }

  /**
   * Register callback for QR code updates
   */
  onQrCode(tenantId: string, callback: (qr: string) => void) {
    this.qrCallbacks.set(tenantId, callback);
  }

  /**
   * Register callback for status updates
   */
  onStatusChange(tenantId: string, callback: (status: string, data?: any) => void) {
    this.statusCallbacks.set(tenantId, callback);
  }

  /**
   * Remove callbacks
   */
  removeCallbacks(tenantId: string) {
    this.qrCallbacks.delete(tenantId);
    this.statusCallbacks.delete(tenantId);
  }

  /**
   * Get current connection status
   */
  getStatus(tenantId: string): { 
    status: string; 
    qrCode: string | null; 
    phoneNumber: string | null;
    error: string | null;
  } {
    const info = this.clients.get(tenantId);
    if (!info) {
      return { status: 'disconnected', qrCode: null, phoneNumber: null, error: null };
    }
    return {
      status: info.status,
      qrCode: info.qrCode,
      phoneNumber: info.phoneNumber,
      error: info.error,
    };
  }

  /**
   * Initialize WhatsApp Web client for a tenant
   */
  async initializeClient(tenantId: string): Promise<{ success: boolean; message: string }> {
    // Check if already connected
    const existing = this.clients.get(tenantId);
    if (existing && existing.status === 'connected') {
      return { success: true, message: 'Already connected' };
    }

    // Destroy existing client if any
    if (existing?.client) {
      try {
        await existing.client.destroy();
      } catch (e) {
        // Ignore
      }
    }

    try {
      // Dynamic import to avoid issues if library not installed
      const { Client, LocalAuth } = await import('whatsapp-web.js');

      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: `tenant_${tenantId}`,
          dataPath: `./.wwebjs_auth`,
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
        },
      }) as WAClient;

      // Initialize client info
      this.clients.set(tenantId, {
        client,
        qrCode: null,
        status: 'connecting',
        phoneNumber: null,
        lastActivity: new Date(),
        error: null,
      });

      // QR Code event
      client.on('qr', async (qr: string) => {
        this.logger.log(`QR Code received for tenant ${tenantId}`);
        
        // Generate QR code as data URL
        const qrDataUrl = await qrcode.toDataURL(qr, {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });

        const info = this.clients.get(tenantId);
        if (info) {
          info.qrCode = qrDataUrl;
          info.status = 'qr_ready';
          info.lastActivity = new Date();
        }

        // Notify via callback
        const callback = this.qrCallbacks.get(tenantId);
        if (callback) callback(qrDataUrl);

        const statusCallback = this.statusCallbacks.get(tenantId);
        if (statusCallback) statusCallback('qr_ready', { qrCode: qrDataUrl });
      });

      // Ready event
      client.on('ready', async () => {
        this.logger.log(`WhatsApp client ready for tenant ${tenantId}`);
        
        const info = this.clients.get(tenantId);
        if (info) {
          info.status = 'connected';
          info.qrCode = null;
          info.lastActivity = new Date();
          
          // Try to get phone number
          try {
            const state = await client.getState();
            this.logger.log(`Client state: ${state}`);
          } catch (e) {
            // Ignore
          }
        }

        // Save connection to database
        await this.saveConnection(tenantId, 'connected');

        const statusCallback = this.statusCallbacks.get(tenantId);
        if (statusCallback) statusCallback('connected');
      });

      // Authenticated event
      client.on('authenticated', () => {
        this.logger.log(`WhatsApp authenticated for tenant ${tenantId}`);
        const info = this.clients.get(tenantId);
        if (info) {
          info.status = 'connecting';
          info.lastActivity = new Date();
        }
      });

      // Auth failure event
      client.on('auth_failure', (msg: string) => {
        this.logger.error(`WhatsApp auth failure for tenant ${tenantId}: ${msg}`);
        const info = this.clients.get(tenantId);
        if (info) {
          info.status = 'failed';
          info.error = msg;
          info.lastActivity = new Date();
        }

        const statusCallback = this.statusCallbacks.get(tenantId);
        if (statusCallback) statusCallback('failed', { error: msg });
      });

      // Disconnected event
      client.on('disconnected', async (reason: string) => {
        this.logger.warn(`WhatsApp disconnected for tenant ${tenantId}: ${reason}`);
        const info = this.clients.get(tenantId);
        if (info) {
          info.status = 'disconnected';
          info.qrCode = null;
          info.phoneNumber = null;
          info.lastActivity = new Date();
        }

        await this.saveConnection(tenantId, 'disconnected');

        const statusCallback = this.statusCallbacks.get(tenantId);
        if (statusCallback) statusCallback('disconnected', { reason });
      });

      // Initialize the client
      await client.initialize();

      return { success: true, message: 'Initializing WhatsApp connection...' };
    } catch (error: any) {
      this.logger.error(`Failed to initialize WhatsApp client: ${error.message}`);
      
      const info = this.clients.get(tenantId);
      if (info) {
        info.status = 'failed';
        info.error = error.message;
      }

      return { success: false, message: error.message };
    }
  }

  /**
   * Disconnect WhatsApp client
   */
  async disconnect(tenantId: string): Promise<{ success: boolean; message: string }> {
    const info = this.clients.get(tenantId);
    if (!info || !info.client) {
      return { success: true, message: 'Not connected' };
    }

    try {
      await info.client.logout();
      await info.client.destroy();
      
      info.status = 'disconnected';
      info.qrCode = null;
      info.phoneNumber = null;
      info.client = null;

      await this.saveConnection(tenantId, 'disconnected');

      return { success: true, message: 'Disconnected successfully' };
    } catch (error: any) {
      this.logger.error(`Failed to disconnect: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send message via WhatsApp Web
   */
  async sendMessage(
    tenantId: string,
    userId: string,
    phone: string,
    message: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const info = this.clients.get(tenantId);
    
    if (!info || info.status !== 'connected' || !info.client) {
      return { success: false, error: 'WhatsApp not connected. Please scan QR code first.' };
    }

    try {
      // Format phone number for WhatsApp
      const chatId = this.formatPhoneForWhatsApp(phone);
      
      // Send message
      const result = await info.client.sendMessage(chatId, message);
      
      // Log to database
      const log = await this.prisma.whatsAppLog.create({
        data: {
          tenantId,
          userId,
          phone,
          message,
          status: 'SENT',
          sentAt: new Date(),
          connectionType: 'WEB',
        },
      });

      info.lastActivity = new Date();

      return { success: true, messageId: log.id };
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`);
      
      // Log failed attempt
      await this.prisma.whatsAppLog.create({
        data: {
          tenantId,
          userId,
          phone,
          message,
          status: 'FAILED',
          connectionType: 'WEB',
        },
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Format phone number for WhatsApp chat ID
   */
  private formatPhoneForWhatsApp(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Saudi numbers
    if (cleaned.startsWith('05') && cleaned.length === 10) {
      cleaned = '966' + cleaned.substring(1);
    } else if (cleaned.startsWith('5') && cleaned.length === 9) {
      cleaned = '966' + cleaned;
    } else if (cleaned.startsWith('00')) {
      cleaned = cleaned.substring(2);
    }
    
    return `${cleaned}@c.us`;
  }

  /**
   * Save connection status to database
   */
  private async saveConnection(tenantId: string, status: string) {
    // Just log for now - connection status is kept in memory
    this.logger.log(`WhatsApp Web connection status for tenant ${tenantId}: ${status}`);
  }

  /**
   * Check if tenant has active WhatsApp Web connection
   */
  isConnected(tenantId: string): boolean {
    const info = this.clients.get(tenantId);
    return info?.status === 'connected';
  }
}
