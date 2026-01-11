import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WhatsAppWebService } from './whatsapp-web.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/whatsapp',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class WhatsAppWebGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WhatsAppWebGateway.name);
  private clientTenants: Map<string, string> = new Map(); // socketId -> tenantId

  constructor(
    private whatsAppWebService: WhatsAppWebService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from query or auth header
      const token = client.handshake.query.token as string || 
                    client.handshake.auth?.token ||
                    client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      const tenantId = payload.tenantId;

      if (!tenantId) {
        client.emit('error', { message: 'Invalid token - no tenant' });
        client.disconnect();
        return;
      }

      // Store tenant mapping
      this.clientTenants.set(client.id, tenantId);
      client.join(`tenant_${tenantId}`);

      this.logger.log(`Client ${client.id} connected for tenant ${tenantId}`);

      // Send current status
      const status = this.whatsAppWebService.getStatus(tenantId);
      client.emit('status', status);

      // Register callbacks for this tenant
      this.whatsAppWebService.onQrCode(tenantId, (qrCode) => {
        this.server.to(`tenant_${tenantId}`).emit('qr', { qrCode });
      });

      this.whatsAppWebService.onStatusChange(tenantId, (status, data) => {
        this.server.to(`tenant_${tenantId}`).emit('status', { status, ...data });
      });

    } catch (error: any) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const tenantId = this.clientTenants.get(client.id);
    if (tenantId) {
      this.logger.log(`Client ${client.id} disconnected from tenant ${tenantId}`);
      this.clientTenants.delete(client.id);
      
      // Check if any other clients for this tenant
      const hasOtherClients = Array.from(this.clientTenants.values()).includes(tenantId);
      if (!hasOtherClients) {
        this.whatsAppWebService.removeCallbacks(tenantId);
      }
    }
  }

  @SubscribeMessage('initialize')
  async handleInitialize(@ConnectedSocket() client: Socket) {
    const tenantId = this.clientTenants.get(client.id);
    if (!tenantId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    this.logger.log(`Initializing WhatsApp for tenant ${tenantId}`);
    
    client.emit('status', { status: 'initializing' });
    
    const result = await this.whatsAppWebService.initializeClient(tenantId);
    
    if (!result.success) {
      client.emit('error', { message: result.message });
    }
  }

  @SubscribeMessage('disconnect_whatsapp')
  async handleDisconnectWhatsApp(@ConnectedSocket() client: Socket) {
    const tenantId = this.clientTenants.get(client.id);
    if (!tenantId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    this.logger.log(`Disconnecting WhatsApp for tenant ${tenantId}`);
    
    const result = await this.whatsAppWebService.disconnect(tenantId);
    
    client.emit('status', { status: 'disconnected' });
    
    return result;
  }

  @SubscribeMessage('get_status')
  handleGetStatus(@ConnectedSocket() client: Socket) {
    const tenantId = this.clientTenants.get(client.id);
    if (!tenantId) {
      return { status: 'disconnected' };
    }

    return this.whatsAppWebService.getStatus(tenantId);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { phone: string; message: string; userId: string },
  ) {
    const tenantId = this.clientTenants.get(client.id);
    if (!tenantId) {
      return { success: false, error: 'Not authenticated' };
    }

    const result = await this.whatsAppWebService.sendMessage(
      tenantId,
      data.userId,
      data.phone,
      data.message,
    );

    return result;
  }
}
