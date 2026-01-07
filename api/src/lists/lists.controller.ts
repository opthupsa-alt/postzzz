import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { AddLeadsToListDto } from './dto/add-leads-to-list.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/constants/permissions';

@ApiTags('lists')
@Controller('lists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ListsController {
  constructor(private listsService: ListsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LIST_CREATE)
  @ApiOperation({ summary: 'Create a new list' })
  @ApiResponse({ status: 201, description: 'List created' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateListDto,
  ) {
    return this.listsService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LIST_VIEW)
  @ApiOperation({ summary: 'Get all lists for tenant' })
  @ApiResponse({ status: 200, description: 'List of lists' })
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.listsService.findByTenant(user.tenantId);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LIST_VIEW)
  @ApiOperation({ summary: 'Get list by ID' })
  @ApiResponse({ status: 200, description: 'List details' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.listsService.findById(id, user.tenantId);
  }

  @Get(':id/leads')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LIST_VIEW)
  @ApiOperation({ summary: 'Get leads in a list' })
  @ApiResponse({ status: 200, description: 'Leads in list' })
  async getLeads(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.listsService.getLeadsInList(id, user.tenantId);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LIST_EDIT)
  @ApiOperation({ summary: 'Update a list' })
  @ApiResponse({ status: 200, description: 'List updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateListDto,
  ) {
    return this.listsService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LIST_DELETE)
  @ApiOperation({ summary: 'Delete a list' })
  @ApiResponse({ status: 200, description: 'List deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.listsService.delete(id, user.tenantId);
  }

  @Post(':id/leads')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LIST_EDIT)
  @ApiOperation({ summary: 'Add leads to a list' })
  @ApiResponse({ status: 201, description: 'Leads added to list' })
  async addLeads(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AddLeadsToListDto,
  ) {
    return this.listsService.addLeadsToList(id, user.tenantId, dto.leadIds);
  }

  @Delete(':id/leads/:leadId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.LIST_EDIT)
  @ApiOperation({ summary: 'Remove a lead from a list' })
  @ApiResponse({ status: 200, description: 'Lead removed from list' })
  async removeLead(
    @Param('id') id: string,
    @Param('leadId') leadId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.listsService.removeLeadFromList(id, leadId, user.tenantId);
  }
}
