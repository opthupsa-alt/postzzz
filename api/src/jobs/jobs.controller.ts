import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/constants/permissions';
import { JobStatus } from '@prisma/client';

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(private jobsService: JobsService) {}

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
}
