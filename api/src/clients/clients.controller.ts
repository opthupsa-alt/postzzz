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
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, CreatePlatformDto, UpdatePlatformDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ClientStatus } from '@prisma/client';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // ==================== CLIENTS ====================

  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
    @Query('status') status?: ClientStatus,
  ) {
    const clients = await this.clientsService.findAll(user.tenantId, {
      search,
      status,
    });
    return { data: clients };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const client = await this.clientsService.findById(user.tenantId, id);
    return { data: client };
  }

  @Post()
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateClientDto) {
    const client = await this.clientsService.create(
      user.tenantId,
      user.userId,
      dto,
    );
    return { data: client };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    const client = await this.clientsService.update(
      user.tenantId,
      user.userId,
      id,
      dto,
    );
    return { data: client };
  }

  @Delete(':id')
  async delete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const result = await this.clientsService.delete(
      user.tenantId,
      user.userId,
      id,
    );
    return { data: result };
  }

  // ==================== PLATFORMS ====================

  @Get(':id/platforms')
  async findPlatforms(@CurrentUser() user: CurrentUserPayload, @Param('id') clientId: string) {
    const platforms = await this.clientsService.findPlatforms(
      user.tenantId,
      clientId,
    );
    return { data: platforms };
  }

  @Post(':id/platforms')
  async createPlatform(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') clientId: string,
    @Body() dto: CreatePlatformDto,
  ) {
    const platform = await this.clientsService.createPlatform(
      user.tenantId,
      user.userId,
      clientId,
      dto,
    );
    return { data: platform };
  }

  @Patch('platforms/:platformId')
  async updatePlatform(
    @CurrentUser() user: CurrentUserPayload,
    @Param('platformId') platformId: string,
    @Body() dto: UpdatePlatformDto,
  ) {
    const platform = await this.clientsService.updatePlatform(
      user.tenantId,
      user.userId,
      platformId,
      dto,
    );
    return { data: platform };
  }

  @Delete('platforms/:platformId')
  async deletePlatform(
    @CurrentUser() user: CurrentUserPayload,
    @Param('platformId') platformId: string,
  ) {
    const result = await this.clientsService.deletePlatform(
      user.tenantId,
      user.userId,
      platformId,
    );
    return { data: result };
  }
}
