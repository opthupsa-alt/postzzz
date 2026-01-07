import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/constants/permissions';
import { JobStatus } from '@prisma/client';
import { ExtensionGateway } from '../gateway/extension.gateway';

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(
    private jobsService: JobsService,
    private extensionGateway: ExtensionGateway,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.JOB_CREATE)
  @ApiOperation({ summary: 'Create a new job' })
  @ApiResponse({ status: 201, description: 'Job created' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { type: string; input?: Record<string, unknown> },
  ) {
    return this.jobsService.create(user.tenantId, user.userId, body);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.JOB_VIEW)
  @ApiOperation({ summary: 'Get all jobs for tenant' })
  @ApiResponse({ status: 200, description: 'List of jobs' })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: JobStatus,
    @Query('limit') limit?: number,
  ) {
    return this.jobsService.findByTenant(user.tenantId, { status, limit });
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.JOB_VIEW)
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.jobsService.findById(id, user.tenantId);
  }

  @Post(':id/cancel')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.JOB_CANCEL)
  @ApiOperation({ summary: 'Cancel a job' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.jobsService.cancel(id, user.tenantId, user.userId);
  }

  @Get(':id/logs')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.JOB_VIEW)
  @ApiOperation({ summary: 'Get job logs' })
  @ApiResponse({ status: 200, description: 'Job logs' })
  async getLogs(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.jobsService.getLogs(id, user.tenantId);
  }

  @Post(':id/dispatch')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.JOB_CREATE)
  @ApiOperation({ summary: 'Dispatch job to connected extension' })
  @ApiResponse({ status: 200, description: 'Job dispatched to extension' })
  @ApiResponse({ status: 400, description: 'No extension connected' })
  async dispatch(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // Check if extension is connected
    if (!this.extensionGateway.hasConnectedExtension(user.tenantId)) {
      throw new BadRequestException('No extension connected. Please open the Leedz extension in Chrome.');
    }

    // Get job details
    const job = await this.jobsService.findById(id, user.tenantId);

    // Create job plan for extension
    const jobPlan = {
      jobId: job.id,
      tenantId: user.tenantId,
      type: job.type,
      steps: this.createJobSteps(job.type, job.input as Record<string, any>),
      config: {
        maxRetries: 3,
        timeoutMs: 60000,
        throttleMs: 1000,
      },
    };

    // Dispatch to extension
    const dispatched = await this.extensionGateway.dispatchJob(user.tenantId, jobPlan);

    if (!dispatched) {
      throw new BadRequestException('Failed to dispatch job to extension');
    }

    // Update job status
    await this.jobsService.updateStatus(id, user.tenantId, 'PENDING');

    return {
      success: true,
      jobId: job.id,
      message: 'Job dispatched to extension',
      connectedExtensions: this.extensionGateway.getConnectedExtensionCount(user.tenantId),
    };
  }

  @Get('extension/status')
  @ApiOperation({ summary: 'Check extension connection status' })
  @ApiResponse({ status: 200, description: 'Extension status' })
  async getExtensionStatus(@CurrentUser() user: CurrentUserPayload) {
    return {
      connected: this.extensionGateway.hasConnectedExtension(user.tenantId),
      count: this.extensionGateway.getConnectedExtensionCount(user.tenantId),
    };
  }

  private createJobSteps(type: string, input: Record<string, any> = {}): any[] {
    // Create steps based on job type
    switch (type) {
      case 'google_maps_search':
        return [
          { id: 1, connector: 'google_maps', action: 'search', params: { query: input.query, location: input.location }, optional: false },
          { id: 2, connector: 'google_maps', action: 'extract_results', params: { maxResults: input.maxResults || 20 }, optional: false },
          { id: 3, connector: 'google_maps', action: 'collect_details', params: {}, optional: true },
        ];
      
      case 'website_crawl':
        return [
          { id: 1, connector: 'website', action: 'load', params: { url: input.url }, optional: false },
          { id: 2, connector: 'website', action: 'extract_contact', params: {}, optional: false },
        ];
      
      case 'linkedin_profile':
        return [
          { id: 1, connector: 'linkedin', action: 'load_profile', params: { url: input.url }, optional: false },
          { id: 2, connector: 'linkedin', action: 'extract_info', params: {}, optional: false },
        ];
      
      default:
        return [
          { id: 1, connector: 'generic', action: 'execute', params: input, optional: false },
        ];
    }
  }
}
