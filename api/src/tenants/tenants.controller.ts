import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/constants/permissions';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tenants for current user' })
  @ApiResponse({ status: 200, description: 'List of tenants' })
  async getUserTenants(@CurrentUser() user: CurrentUserPayload) {
    return this.tenantsService.getUserTenants(user.userId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant details' })
  @ApiResponse({ status: 200, description: 'Current tenant details' })
  async getCurrentTenant(@CurrentUser() user: CurrentUserPayload) {
    return this.tenantsService.findById(user.tenantId);
  }

  @Post('switch')
  @ApiOperation({ summary: 'Switch to a different tenant' })
  @ApiResponse({ status: 200, description: 'Switched tenant successfully' })
  async switchTenant(
    @CurrentUser() user: CurrentUserPayload,
    @Body('tenantId') tenantId: string,
  ) {
    return this.tenantsService.switchTenant(user.userId, tenantId);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.TENANT_EDIT)
  @ApiOperation({ summary: 'Update tenant details' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  async updateTenant(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: { name?: string },
  ) {
    return this.tenantsService.update(id, user.userId, data);
  }
}
