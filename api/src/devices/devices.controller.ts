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
import { DevicesService } from './devices.service';
import { RegisterDeviceDto, UpdateDeviceDto, HeartbeatDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    const devices = await this.devicesService.findAll(user.tenantId);
    return { data: devices };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const device = await this.devicesService.findById(user.tenantId, id);
    return { data: device };
  }

  @Post('register')
  async register(@CurrentUser() user: CurrentUserPayload, @Body() dto: RegisterDeviceDto) {
    const device = await this.devicesService.register(user.tenantId, user.userId, dto);
    return { data: device };
  }

  @Post(':id/heartbeat')
  async heartbeat(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: HeartbeatDto,
  ) {
    const device = await this.devicesService.heartbeat(user.tenantId, id, dto);
    return { data: device };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    const device = await this.devicesService.update(user.tenantId, user.userId, id, dto);
    return { data: device };
  }

  @Delete(':id')
  async delete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const result = await this.devicesService.delete(user.tenantId, user.userId, id);
    return { data: result };
  }
}
