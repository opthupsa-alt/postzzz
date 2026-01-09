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
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/constants/permissions';

@ApiTags('leads')
@Controller('leads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LEAD_CREATE)
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.create(user.tenantId, user.userId, dto);
  }

  @Post('bulk')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LEAD_CREATE)
  @ApiOperation({ summary: 'Bulk create leads' })
  @ApiResponse({ status: 201, description: 'Leads created' })
  async bulkCreate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() leads: CreateLeadDto[],
  ) {
    return this.leadsService.bulkCreate(user.tenantId, user.userId, leads);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LEAD_VIEW)
  @ApiOperation({ summary: 'Get all leads for tenant' })
  @ApiResponse({ status: 200, description: 'List of leads' })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.leadsService.findByTenant(user.tenantId, {
      status: status as any,
      limit,
      offset,
    });
  }

  @Get('count')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LEAD_VIEW)
  @ApiOperation({ summary: 'Get lead count' })
  @ApiResponse({ status: 200, description: 'Lead count' })
  async count(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
  ) {
    const count = await this.leadsService.count(user.tenantId, status as any);
    return { count };
  }

  @Get('dashboard-stats')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LEAD_VIEW)
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getDashboardStats(@CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.getDashboardStats(user.tenantId);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LEAD_VIEW)
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiResponse({ status: 200, description: 'Lead details' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.leadsService.findById(id, user.tenantId);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LEAD_EDIT)
  @ApiOperation({ summary: 'Update a lead' })
  @ApiResponse({ status: 200, description: 'Lead updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LEAD_DELETE)
  @ApiOperation({ summary: 'Delete a lead' })
  @ApiResponse({ status: 200, description: 'Lead deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.leadsService.delete(id, user.tenantId);
  }
}
