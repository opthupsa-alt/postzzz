import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ==================== Dashboard ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get platform dashboard stats' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ==================== Tenants ====================

  @Get('tenants')
  @ApiOperation({ summary: 'Get all tenants' })
  @ApiResponse({ status: 200, description: 'List of tenants' })
  async getTenants(
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.adminService.getAllTenants({
      status: status as any,
      limit,
      offset,
    });
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  async getTenant(@Param('id') id: string) {
    return this.adminService.getTenantById(id);
  }

  @Patch('tenants/:id/status')
  @ApiOperation({ summary: 'Update tenant status (activate/suspend)' })
  @ApiResponse({ status: 200, description: 'Tenant status updated' })
  async updateTenantStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    return this.adminService.updateTenantStatus(id, dto.status as any);
  }

  @Delete('tenants/:id')
  @ApiOperation({ summary: 'Delete tenant' })
  @ApiResponse({ status: 200, description: 'Tenant deleted' })
  async deleteTenant(@Param('id') id: string) {
    return this.adminService.deleteTenant(id);
  }

  // ==================== Users ====================

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async getUsers(
    @Query('isActive') isActive?: string,
    @Query('isSuperAdmin') isSuperAdmin?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.adminService.getAllUsers({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isSuperAdmin: isSuperAdmin === 'true' ? true : isSuperAdmin === 'false' ? false : undefined,
      limit,
      offset,
    });
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activate/deactivate user' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.adminService.updateUserStatus(id, body.isActive);
  }

  @Patch('users/:id/super-admin')
  @ApiOperation({ summary: 'Grant/revoke super admin' })
  @ApiResponse({ status: 200, description: 'Super admin status updated' })
  async toggleSuperAdmin(
    @Param('id') id: string,
    @Body() body: { isSuperAdmin: boolean },
  ) {
    return this.adminService.toggleSuperAdmin(id, body.isSuperAdmin);
  }

  // ==================== Platform Settings ====================

  @Get('settings')
  @ApiOperation({ summary: 'Get platform settings' })
  @ApiResponse({ status: 200, description: 'Platform settings' })
  async getSettings() {
    return this.adminService.getPlatformSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(@Body() dto: UpdatePlatformSettingsDto) {
    return this.adminService.updatePlatformSettings(dto);
  }
}
