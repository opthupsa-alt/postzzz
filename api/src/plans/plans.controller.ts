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
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  // Public endpoint - list active plans
  @Get()
  @ApiOperation({ summary: 'Get all active plans (public)' })
  @ApiResponse({ status: 200, description: 'List of active plans' })
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.plansService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiResponse({ status: 200, description: 'Plan details' })
  async findOne(@Param('id') id: string) {
    return this.plansService.findById(id);
  }

  // Admin-only endpoints
  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new plan (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  async create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a plan (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan updated' })
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle plan active status (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan status toggled' })
  async toggleActive(@Param('id') id: string) {
    return this.plansService.toggleActive(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a plan (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan deleted' })
  async delete(@Param('id') id: string) {
    return this.plansService.delete(id);
  }
}
