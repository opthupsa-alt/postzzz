import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  // User endpoint - get own subscription
  @Get('me')
  @ApiOperation({ summary: 'Get current tenant subscription' })
  @ApiResponse({ status: 200, description: 'Subscription details with usage' })
  async getMySubscription(@CurrentUser() user: CurrentUserPayload) {
    return this.subscriptionsService.getSubscriptionWithUsage(user.tenantId);
  }

  // Admin endpoints
  @Get()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Get all subscriptions (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  async findAll(
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.subscriptionsService.findAll({
      status: status as any,
      limit,
      offset,
    });
  }

  @Get('tenant/:tenantId')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Get subscription by tenant ID (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  async findByTenant(@Param('tenantId') tenantId: string) {
    return this.subscriptionsService.getSubscriptionWithUsage(tenantId);
  }

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Create subscription for tenant (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  async create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(dto);
  }

  @Patch('tenant/:tenantId/plan')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Change tenant plan (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan changed' })
  async changePlan(
    @Param('tenantId') tenantId: string,
    @Body() body: { planId: string },
  ) {
    return this.subscriptionsService.changePlan(tenantId, body.planId);
  }

  @Patch('tenant/:tenantId/status')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update subscription status (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('tenantId') tenantId: string,
    @Body() body: { status: string },
  ) {
    return this.subscriptionsService.updateStatus(tenantId, body.status as any);
  }

  @Post('tenant/:tenantId/cancel')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Cancel subscription (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  async cancel(
    @Param('tenantId') tenantId: string,
    @Body() body: { immediate?: boolean },
  ) {
    return this.subscriptionsService.cancel(tenantId, body.immediate);
  }

  @Post('tenant/:tenantId/reactivate')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Reactivate subscription (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription reactivated' })
  async reactivate(@Param('tenantId') tenantId: string) {
    return this.subscriptionsService.reactivate(tenantId);
  }

  @Delete('tenant/:tenantId')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Delete subscription (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription deleted' })
  async delete(@Param('tenantId') tenantId: string) {
    return this.subscriptionsService.delete(tenantId);
  }
}
