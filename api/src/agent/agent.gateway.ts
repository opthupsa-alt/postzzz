import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AgentService } from './agent.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Will be configured properly in production
  },
  namespace: '/agent',
})
export class AgentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedAgents: Map<string, Socket> = new Map();

  constructor(private agentService: AgentService) {}

  async handleConnection(client: Socket) {
    const agentId = client.handshake.headers['x-agent-id'] as string;

    if (!agentId) {
      client.disconnect();
      return;
    }

    this.connectedAgents.set(agentId, client);
    console.log(`Agent connected: ${agentId}`);

    // Send config on connect
    const config = await this.agentService.getConfig();
    client.emit('config', config);
  }

  handleDisconnect(client: Socket) {
    const agentId = client.handshake.headers['x-agent-id'] as string;

    if (agentId) {
      this.connectedAgents.delete(agentId);
      console.log(`Agent disconnected: ${agentId}`);
    }
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { agentId: string },
  ) {
    const result = await this.agentService.heartbeat(data.agentId);
    return { event: 'heartbeat_ack', data: result };
  }

  @SubscribeMessage('job:ack')
  async handleJobAck(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string; agentId: string },
  ) {
    try {
      const result = await this.agentService.ackJob(data.jobId, data.agentId);
      return { event: 'job:ack_success', data: result };
    } catch (error) {
      return { event: 'job:ack_error', data: { error: (error as Error).message } };
    }
  }

  @SubscribeMessage('job:progress')
  async handleJobProgress(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string; agentId: string; progress: number; message?: string },
  ) {
    try {
      const result = await this.agentService.updateProgress(
        data.jobId,
        data.agentId,
        data.progress,
        data.message,
      );
      return { event: 'job:progress_ack', data: result };
    } catch (error) {
      return { event: 'job:progress_error', data: { error: (error as Error).message } };
    }
  }

  @SubscribeMessage('job:evidence')
  async handleJobEvidence(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string; agentId: string; evidence: any[] },
  ) {
    try {
      const result = await this.agentService.submitEvidence(
        data.jobId,
        data.agentId,
        data.evidence,
      );
      return { event: 'job:evidence_ack', data: result };
    } catch (error) {
      return { event: 'job:evidence_error', data: { error: (error as Error).message } };
    }
  }

  @SubscribeMessage('job:done')
  async handleJobDone(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string; agentId: string; output?: Record<string, unknown> },
  ) {
    try {
      const result = await this.agentService.markDone(data.jobId, data.agentId, data.output);
      return { event: 'job:done_ack', data: result };
    } catch (error) {
      return { event: 'job:done_error', data: { error: (error as Error).message } };
    }
  }

  // Method to push jobs to specific agent
  pushJobToAgent(agentId: string, job: any) {
    const client = this.connectedAgents.get(agentId);
    if (client) {
      client.emit('job:new', job);
    }
  }

  // Broadcast to all agents
  broadcastNewJob(job: any) {
    this.server.emit('job:available', job);
  }
}
