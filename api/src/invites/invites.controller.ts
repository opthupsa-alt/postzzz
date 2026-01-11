import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InvitesService } from './invites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/constants/permissions';
import { Role } from '@prisma/client';

@ApiTags('invites')
@Controller('invites')
export class InvitesController {
  constructor(private invitesService: InvitesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.TEAM_INVITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new invite' })
  @ApiResponse({ status: 201, description: 'Invite created' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { email: string; role?: Role },
  ) {
    return this.invitesService.create(
      user.tenantId,
      user.userId,
      body.email,
      body.role,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.TEAM_VIEW)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all invites for tenant' })
  @ApiResponse({ status: 200, description: 'List of invites' })
  async getAll(@CurrentUser() user: CurrentUserPayload) {
    return this.invitesService.getByTenant(user.tenantId);
  }

  @Get(':token/validate')
  @ApiOperation({ summary: 'Validate an invite token' })
  @ApiResponse({ status: 200, description: 'Invite validation result' })
  async validate(@Param('token') token: string) {
    return this.invitesService.validate(token);
  }

  @Post(':token/accept')
  @ApiOperation({ summary: 'Accept an invite' })
  @ApiResponse({ status: 200, description: 'Invite accepted' })
  async accept(
    @Param('token') token: string,
    @Body() body: { password?: string; name?: string },
  ) {
    return this.invitesService.accept(token, body.password, body.name);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.TEAM_INVITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an invite' })
  @ApiResponse({ status: 200, description: 'Invite revoked' })
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invitesService.revoke(id, user.tenantId, user.userId);
  }

  @Post(':id/resend')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permissions.TEAM_INVITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend an invite' })
  @ApiResponse({ status: 200, description: 'Invite resent' })
  async resend(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invitesService.resend(id, user.tenantId, user.userId);
  }
}
