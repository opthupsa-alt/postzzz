import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { ClaimJobsDto, StartJobDto, CompleteJobDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('publishing')
@UseGuards(JwtAuthGuard)
export class PublishingController {
  constructor(private readonly publishingService: PublishingService) {}

  @Get('jobs')
  async findJobs(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const jobs = await this.publishingService.findJobs(user.tenantId, {
      status,
      clientId,
      from,
      to,
    });
    return { data: jobs };
  }

  @Get('jobs/:id')
  async findJob(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const job = await this.publishingService.findJobById(user.tenantId, id);
    return { data: job };
  }

  @Post('jobs/claim')
  async claimJobs(@CurrentUser() user: CurrentUserPayload, @Body() dto: ClaimJobsDto) {
    const jobs = await this.publishingService.claimJobs(user.tenantId, dto);
    return { data: jobs };
  }

  @Post('jobs/:id/start')
  async startJob(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: StartJobDto,
  ) {
    const result = await this.publishingService.startJob(user.tenantId, id, dto);
    return { data: result };
  }

  @Post('jobs/:id/complete')
  async completeJob(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CompleteJobDto,
  ) {
    const result = await this.publishingService.completeJob(user.tenantId, id, dto);
    return { data: result };
  }

  @Post('jobs/:id/cancel')
  async cancelJob(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const result = await this.publishingService.cancelJob(user.tenantId, user.userId, id);
    return { data: result };
  }

  @Post('jobs/cancel-all')
  async cancelAllJobs(
    @CurrentUser() user: CurrentUserPayload,
    @Query('clientId') clientId?: string,
  ) {
    const result = await this.publishingService.cancelAllJobs(user.tenantId, user.userId, clientId);
    return { data: result };
  }
}
