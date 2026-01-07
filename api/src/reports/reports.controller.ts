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
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/constants/permissions';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.REPORT_GENERATE)
  @ApiOperation({ summary: 'Create a new report' })
  @ApiResponse({ status: 201, description: 'Report created' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.REPORT_VIEW)
  @ApiOperation({ summary: 'Get all reports for tenant' })
  @ApiResponse({ status: 200, description: 'List of reports' })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('leadId') leadId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.reportsService.findByTenant(user.tenantId, {
      status: status as any,
      leadId,
      limit,
      offset,
    });
  }

  @Get('count')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.REPORT_VIEW)
  @ApiOperation({ summary: 'Get report count' })
  @ApiResponse({ status: 200, description: 'Report count' })
  async count(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
  ) {
    const count = await this.reportsService.count(user.tenantId, status as any);
    return { count };
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.REPORT_VIEW)
  @ApiOperation({ summary: 'Get report by ID' })
  @ApiResponse({ status: 200, description: 'Report details' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.findById(id, user.tenantId);
  }

  @Post(':id/generate')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.REPORT_GENERATE)
  @ApiOperation({ summary: 'Generate report content' })
  @ApiResponse({ status: 200, description: 'Report generated' })
  async generate(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.generateReport(id, user.tenantId);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.REPORT_GENERATE)
  @ApiOperation({ summary: 'Update a report' })
  @ApiResponse({ status: 200, description: 'Report updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateReportDto,
  ) {
    return this.reportsService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.REPORT_GENERATE)
  @ApiOperation({ summary: 'Delete a report' })
  @ApiResponse({ status: 200, description: 'Report deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.delete(id, user.tenantId);
  }
}
