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
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  extensionId?: string;
}

interface JobPlan {
  jobId: string;
  tenantId: string;
  type: string;
  steps: JobStep[];
  config: {
    maxRetries: number;
    timeoutMs: number;
    throttleMs: number;
  };
}

interface JobStep {
  id: number;
  connector: string;
  action: string;
  params: Record<string, any>;
  optional: boolean;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'chrome-extension://*'],
    credentials: true,
  },
  namespace: '/extension',
})
export class ExtensionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ExtensionGateway');
  
  // Map of tenantId -> connected sockets
  private connectedExtensions = new Map<string, Set<string>>();
  
  // Map of socketId -> socket info
  private socketInfo = new Map<string, { userId: string; tenantId: string }>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  // ==================== Connection Lifecycle ====================

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token = this.extractToken(client);
      
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided (${client.id})`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = await this.verifyToken(token);
      
      if (!payload) {
        this.logger.warn(`Connection rejected: Invalid token (${client.id})`);
        client.emit('error', { message: 'Invalid token' });
        client.disconnect();
        return;
      }

      // Store user info on socket
      client.userId = payload.userId;
      client.tenantId = payload.tenantId;
      
      // Track connection
      this.trackConnection(client.id, payload.userId, payload.tenantId);
      
      // Join tenant room for targeted broadcasts
      client.join(`tenant:${payload.tenantId}`);
      
      this.logger.log(`Extension connected: ${client.id} (User: ${payload.userId}, Tenant: ${payload.tenantId})`);
      
      // Send connection confirmation
      client.emit('connected', {
        socketId: client.id,
        userId: payload.userId,
        tenantId: payload.tenantId,
        serverTime: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.untrackConnection(client.id);
    this.logger.log(`Extension disconnected: ${client.id}`);
  }

  // ==================== Message Handlers ====================

  @SubscribeMessage('heartbeat')
  handleHeartbeat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { extensionVersion: string; activeJobs: string[]; status: string },
  ) {
    this.logger.debug(`Heartbeat from ${client.id}: ${JSON.stringify(data)}`);
    
    return {
      event: 'heartbeat_ack',
      data: {
        serverTime: new Date().toISOString(),
        received: true,
      },
    };
  }

  @SubscribeMessage('job_ack')
  async handleJobAck(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { jobId: string; accepted: boolean; reason?: string },
  ) {
    this.logger.log(`Job ACK from ${client.id}: Job ${data.jobId} - ${data.accepted ? 'Accepted' : 'Rejected'}`);
    
    if (data.accepted) {
      // Update job status to AGENT_RUNNING
      await this.updateJobStatus(data.jobId, 'RUNNING');
    } else {
      // Update job status to FAILED with reason
      await this.updateJobStatus(data.jobId, 'FAILED', data.reason);
    }

    return { event: 'job_ack_received', data: { jobId: data.jobId } };
  }

  @SubscribeMessage('progress')
  async handleProgress(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { jobId: string; stepId: number; progress: number; message: string },
  ) {
    this.logger.debug(`Progress from ${client.id}: Job ${data.jobId} - Step ${data.stepId} - ${data.progress}%`);
    
    // Update job progress in database
    await this.updateJobProgress(data.jobId, data.stepId, data.progress, data.message);
    
    // Broadcast to web clients in same tenant
    if (client.tenantId) {
      this.server.to(`tenant:${client.tenantId}`).emit('job_progress', data);
    }

    return { event: 'progress_received', data: { jobId: data.jobId } };
  }

  @SubscribeMessage('log')
  handleLog(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { jobId: string; stepId: number; level: string; message: string; timestamp: string },
  ) {
    this.logger.debug(`Log from ${client.id}: [${data.level}] ${data.message}`);
    
    // Could store logs in database or forward to monitoring
    // For now, just acknowledge
    return { event: 'log_received', data: { jobId: data.jobId } };
  }

  @SubscribeMessage('evidence_batch')
  async handleEvidenceBatch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { jobId: string; stepId: number; evidence: any[] },
  ) {
    this.logger.log(`Evidence batch from ${client.id}: Job ${data.jobId} - ${data.evidence.length} items`);
    
    // Store evidence in database
    // TODO: Implement evidence storage
    
    return { 
      event: 'evidence_received', 
      data: { 
        jobId: data.jobId, 
        count: data.evidence.length,
      },
    };
  }

  @SubscribeMessage('job_complete')
  async handleJobComplete(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      jobId: string;
      status: 'SUCCESS' | 'FAILED' | 'PARTIAL_SUCCESS' | 'CANCELLED';
      summary: { stepsCompleted: number; stepsTotal: number; evidenceCount: number; duration: number };
      error?: { code: string; message: string; stepId?: number };
    },
  ) {
    this.logger.log(`Job complete from ${client.id}: Job ${data.jobId} - ${data.status}`);
    
    // Update job in database
    const jobStatus = data.status === 'SUCCESS' ? 'COMPLETED' : 
                      data.status === 'PARTIAL_SUCCESS' ? 'COMPLETED' : 'FAILED';
    
    await this.updateJobStatus(data.jobId, jobStatus, data.error?.message);
    
    // Broadcast to web clients
    if (client.tenantId) {
      this.server.to(`tenant:${client.tenantId}`).emit('job_completed', {
        jobId: data.jobId,
        status: data.status,
        summary: data.summary,
      });
    }

    return { event: 'job_complete_received', data: { jobId: data.jobId } };
  }

  @SubscribeMessage('needs_user_action')
  async handleNeedsUserAction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      jobId: string;
      stepId: number;
      actionType: 'CAPTCHA' | 'CONSENT' | 'VERIFICATION' | 'BLOCKED';
      message: string;
    },
  ) {
    this.logger.warn(`User action needed from ${client.id}: Job ${data.jobId} - ${data.actionType}`);
    
    // Update job status
    await this.updateJobStatus(data.jobId, 'NEEDS_USER_ACTION');
    
    // Broadcast to web clients
    if (client.tenantId) {
      this.server.to(`tenant:${client.tenantId}`).emit('job_needs_action', data);
    }

    return { event: 'needs_action_received', data: { jobId: data.jobId } };
  }

  // ==================== Server-to-Extension Methods ====================

  /**
   * Dispatch a job to an extension for a specific tenant
   */
  async dispatchJob(tenantId: string, jobPlan: JobPlan): Promise<boolean> {
    const tenantSockets = this.connectedExtensions.get(tenantId);
    
    if (!tenantSockets || tenantSockets.size === 0) {
      this.logger.warn(`No extensions connected for tenant ${tenantId}`);
      return false;
    }

    // Send to all connected extensions for this tenant
    this.server.to(`tenant:${tenantId}`).emit('job_dispatch', { jobPlan });
    
    this.logger.log(`Job dispatched to tenant ${tenantId}: ${jobPlan.jobId}`);
    return true;
  }

  /**
   * Cancel a job
   */
  async cancelJob(tenantId: string, jobId: string, reason: string): Promise<void> {
    this.server.to(`tenant:${tenantId}`).emit('job_cancel', { jobId, reason });
    this.logger.log(`Job cancel sent to tenant ${tenantId}: ${jobId}`);
  }

  /**
   * Send config update to extensions
   */
  async sendConfigUpdate(tenantId: string, config: any): Promise<void> {
    this.server.to(`tenant:${tenantId}`).emit('config_update', config);
    this.logger.log(`Config update sent to tenant ${tenantId}`);
  }

  /**
   * Check if tenant has connected extensions
   */
  hasConnectedExtension(tenantId: string): boolean {
    const sockets = this.connectedExtensions.get(tenantId);
    return sockets ? sockets.size > 0 : false;
  }

  /**
   * Get count of connected extensions for a tenant
   */
  getConnectedExtensionCount(tenantId: string): number {
    const sockets = this.connectedExtensions.get(tenantId);
    return sockets ? sockets.size : 0;
  }

  // ==================== Helper Methods ====================

  private extractToken(client: Socket): string | null {
    // Try auth header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    
    // Try query param
    const token = client.handshake.query.token;
    if (typeof token === 'string') {
      return token;
    }
    
    // Try auth object
    const auth = client.handshake.auth;
    if (auth?.token) {
      return auth.token;
    }
    
    return null;
  }

  private async verifyToken(token: string): Promise<{ userId: string; tenantId: string } | null> {
    try {
      const payload = this.jwtService.verify(token);
      
      // Verify user exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, isActive: true, defaultTenantId: true },
      });
      
      if (!user || !user.isActive) {
        return null;
      }
      
      return {
        userId: payload.userId,
        tenantId: payload.tenantId || user.defaultTenantId,
      };
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      return null;
    }
  }

  private trackConnection(socketId: string, userId: string, tenantId: string) {
    // Store socket info
    this.socketInfo.set(socketId, { userId, tenantId });
    
    // Track by tenant
    if (!this.connectedExtensions.has(tenantId)) {
      this.connectedExtensions.set(tenantId, new Set());
    }
    this.connectedExtensions.get(tenantId)!.add(socketId);
  }

  private untrackConnection(socketId: string) {
    const info = this.socketInfo.get(socketId);
    if (info) {
      const tenantSockets = this.connectedExtensions.get(info.tenantId);
      if (tenantSockets) {
        tenantSockets.delete(socketId);
        if (tenantSockets.size === 0) {
          this.connectedExtensions.delete(info.tenantId);
        }
      }
      this.socketInfo.delete(socketId);
    }
  }

  private async updateJobStatus(jobId: string, status: string, errorMsg?: string) {
    try {
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: status as any,
          error: errorMsg ? { message: errorMsg } : undefined,
          startedAt: status === 'RUNNING' ? new Date() : undefined,
          completedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : undefined,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to update job status: ${err.message}`);
    }
  }

  private async updateJobProgress(jobId: string, stepId: number, progress: number, message: string) {
    try {
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          progress,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to update job progress: ${err.message}`);
    }
  }
}
