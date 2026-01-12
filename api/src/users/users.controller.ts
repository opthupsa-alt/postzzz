import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/constants/permissions';
import { Role } from '@prisma/client';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('team')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.TEAM_VIEW)
  @ApiOperation({ summary: 'Get team members' })
  @ApiResponse({ status: 200, description: 'List of team members' })
  async getTeamMembers(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getTeamMembers(user.tenantId);
  }

  @Patch(':id/role')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.TEAM_ROLE_CHANGE)
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateMemberRole(
    @Param('id') targetUserId: string,
    @Body('role') newRole: Role,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.updateMemberRole(
      user.tenantId,
      targetUserId,
      newRole,
      user.userId,
      user.role,
    );
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.TEAM_REMOVE)
  @ApiOperation({ summary: 'Remove team member' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(
    @Param('id') targetUserId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.removeMember(
      user.tenantId,
      targetUserId,
      user.userId,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfile(user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: { name?: string; whatsappPhone?: string; notifyOnPublish?: boolean },
  ) {
    return this.usersService.updateProfile(user.userId, data);
  }

  // Alias endpoints for /users/profile
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile (alias)' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getProfileAlias(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfile(user.userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile (alias)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfileAlias(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: { name?: string; whatsappPhone?: string; notifyOnPublish?: boolean },
  ) {
    return this.usersService.updateProfile(user.userId, data);
  }
}
