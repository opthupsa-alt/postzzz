import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AgentService } from './agent.service';

@ApiTags('agent')
@Controller('api/agent')
@UseGuards(ThrottlerGuard)
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get agent configuration' })
  @ApiResponse({ status: 200, description: 'Agent configuration' })
  async getConfig() {
    return this.agentService.getConfig();
  }

  @Get('jobs/pending')
  @ApiHeader({ name: 'Authorization', required: true })
  @ApiOperation({ summary: 'Get pending jobs for agent to execute' })
  @ApiResponse({ status: 200, description: 'List of pending jobs' })
  async getPendingJobs(@Headers('authorization') auth: string) {
    // Extract tenant from token
    return this.agentService.getPendingJobs(auth);
  }

  @Post('heartbeat')
  @ApiHeader({ name: 'X-Agent-Id', required: true })
  @ApiOperation({ summary: 'Agent heartbeat' })
  @ApiResponse({ status: 200, description: 'Heartbeat acknowledged' })
  async heartbeat(@Headers('x-agent-id') agentId: string) {
    if (!agentId) {
      throw new BadRequestException('X-Agent-Id header is required');
    }
    return this.agentService.heartbeat(agentId);
  }

  @Post('jobs/:jobId/ack')
  @ApiHeader({ name: 'X-Agent-Id', required: true })
  @ApiOperation({ summary: 'Acknowledge job assignment' })
  @ApiResponse({ status: 200, description: 'Job acknowledged' })
  async ackJob(
    @Param('jobId') jobId: string,
    @Headers('x-agent-id') agentId: string,
  ) {
    if (!agentId) {
      throw new BadRequestException('X-Agent-Id header is required');
    }
    return this.agentService.ackJob(jobId, agentId);
  }

  @Post('jobs/:jobId/progress')
  @ApiHeader({ name: 'X-Agent-Id', required: true })
  @ApiOperation({ summary: 'Update job progress' })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  async updateProgress(
    @Param('jobId') jobId: string,
    @Headers('x-agent-id') agentId: string,
    @Body() body: { progress: number; message?: string },
  ) {
    if (!agentId) {
      throw new BadRequestException('X-Agent-Id header is required');
    }
    return this.agentService.updateProgress(jobId, agentId, body.progress, body.message);
  }

  @Post('jobs/:jobId/evidence')
  @ApiHeader({ name: 'X-Agent-Id', required: true })
  @ApiOperation({ summary: 'Submit evidence for job' })
  @ApiResponse({ status: 200, description: 'Evidence submitted' })
  async submitEvidence(
    @Param('jobId') jobId: string,
    @Headers('x-agent-id') agentId: string,
    @Body() body: { evidence: Array<{ type: string; title: string; source: string; url?: string; snippet: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' }> },
  ) {
    if (!agentId) {
      throw new BadRequestException('X-Agent-Id header is required');
    }
    return this.agentService.submitEvidence(jobId, agentId, body.evidence);
  }

  @Post('jobs/:jobId/error')
  @ApiHeader({ name: 'X-Agent-Id', required: true })
  @ApiOperation({ summary: 'Report job error' })
  @ApiResponse({ status: 200, description: 'Error reported' })
  async reportError(
    @Param('jobId') jobId: string,
    @Headers('x-agent-id') agentId: string,
    @Body() body: { errorCode: string; errorMessage: string; needsUserAction?: boolean },
  ) {
    if (!agentId) {
      throw new BadRequestException('X-Agent-Id header is required');
    }
    return this.agentService.reportError(
      jobId,
      agentId,
      body.errorCode,
      body.errorMessage,
      body.needsUserAction,
    );
  }

  @Post('jobs/:jobId/done')
  @ApiHeader({ name: 'X-Agent-Id', required: true })
  @ApiOperation({ summary: 'Mark job as done' })
  @ApiResponse({ status: 200, description: 'Job completed' })
  async markDone(
    @Param('jobId') jobId: string,
    @Headers('x-agent-id') agentId: string,
    @Body() body: { output?: Record<string, unknown> },
  ) {
    if (!agentId) {
      throw new BadRequestException('X-Agent-Id header is required');
    }
    return this.agentService.markDone(jobId, agentId, body.output);
  }
}
