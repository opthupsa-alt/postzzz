import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsAppService, WhatsAppMessage } from './whatsapp.service';
import { WhatsAppWebService } from './whatsapp-web.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/constants/permissions';

@ApiTags('whatsapp')
@Controller('whatsapp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WhatsAppController {
  constructor(
    private whatsappService: WhatsAppService,
    private whatsappWebService: WhatsAppWebService,
  ) {}

  // ==================== Messages ====================

  @Post('send')
  @RequirePermissions(Permissions.WHATSAPP_SEND)
  @ApiOperation({ summary: 'Send a WhatsApp message' })
  @ApiResponse({ status: 200, description: 'Message prepared with WhatsApp URL' })
  async sendMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { to: string; message: string; templateId?: string; variables?: Record<string, string> },
  ) {
    return this.whatsappService.sendMessage(user.tenantId, user.userId, body);
  }

  @Post('send-bulk')
  @RequirePermissions(Permissions.WHATSAPP_SEND)
  @ApiOperation({ summary: 'Send bulk WhatsApp messages' })
  @ApiResponse({ status: 200, description: 'Messages prepared' })
  async sendBulkMessages(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { messages: WhatsAppMessage[] },
  ) {
    return this.whatsappService.sendBulkMessages(user.tenantId, user.userId, body.messages);
  }

  @Get('generate-url')
  @RequirePermissions(Permissions.WHATSAPP_SEND)
  @ApiOperation({ summary: 'Generate WhatsApp URL without logging' })
  @ApiResponse({ status: 200, description: 'WhatsApp URL generated' })
  generateUrl(
    @Query('phone') phone: string,
    @Query('message') message: string,
  ) {
    return {
      webUrl: this.whatsappService.generateWhatsAppUrl(phone, message),
      appUrl: this.whatsappService.generateWhatsAppApiUrl(phone, message),
    };
  }

  @Get('logs')
  @RequirePermissions(Permissions.WHATSAPP_VIEW)
  @ApiOperation({ summary: 'Get message logs' })
  @ApiResponse({ status: 200, description: 'Message logs retrieved' })
  async getMessageLogs(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('phone') phone?: string,
  ) {
    return this.whatsappService.getMessageLogs(user.tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      phone,
    });
  }

  @Put('logs/:id/status')
  @RequirePermissions(Permissions.WHATSAPP_SEND)
  @ApiOperation({ summary: 'Update message status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateMessageStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' },
  ) {
    return this.whatsappService.updateMessageStatus(user.tenantId, id, body.status);
  }

  // ==================== Templates ====================

  @Get('templates')
  @RequirePermissions(Permissions.WHATSAPP_VIEW)
  @ApiOperation({ summary: 'Get all templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved' })
  async getTemplates(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsappService.getTemplates(user.tenantId);
  }

  @Post('templates')
  @RequirePermissions(Permissions.WHATSAPP_MANAGE)
  @ApiOperation({ summary: 'Create a new template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      name: string;
      content: string;
      variables: string[];
      category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    },
  ) {
    return this.whatsappService.createTemplate(user.tenantId, user.userId, body);
  }

  @Put('templates/:id')
  @RequirePermissions(Permissions.WHATSAPP_MANAGE)
  @ApiOperation({ summary: 'Update a template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async updateTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      content: string;
      variables: string[];
      category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    }>,
  ) {
    return this.whatsappService.updateTemplate(user.tenantId, user.userId, id, body);
  }

  @Delete('templates/:id')
  @RequirePermissions(Permissions.WHATSAPP_MANAGE)
  @ApiOperation({ summary: 'Delete a template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async deleteTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.whatsappService.deleteTemplate(user.tenantId, user.userId, id);
  }

  // ==================== Dashboard ====================

  @Get('dashboard-stats')
  @RequirePermissions(Permissions.WHATSAPP_VIEW)
  @ApiOperation({ summary: 'Get WhatsApp dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getDashboardStats(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsappService.getDashboardStats(user.tenantId);
  }

  // ==================== WhatsApp Web (QR Code) ====================

  @Get('web/status')
  @RequirePermissions(Permissions.WHATSAPP_VIEW)
  @ApiOperation({ summary: 'Get WhatsApp Web connection status' })
  @ApiResponse({ status: 200, description: 'Connection status' })
  getWebStatus(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsappWebService.getStatus(user.tenantId);
  }

  @Post('web/initialize')
  @RequirePermissions(Permissions.WHATSAPP_MANAGE)
  @ApiOperation({ summary: 'Initialize WhatsApp Web connection (generates QR code)' })
  @ApiResponse({ status: 200, description: 'Initialization started' })
  async initializeWeb(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsappWebService.initializeClient(user.tenantId);
  }

  @Post('web/disconnect')
  @RequirePermissions(Permissions.WHATSAPP_MANAGE)
  @ApiOperation({ summary: 'Disconnect WhatsApp Web' })
  @ApiResponse({ status: 200, description: 'Disconnected' })
  async disconnectWeb(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsappWebService.disconnect(user.tenantId);
  }

  @Post('web/send')
  @RequirePermissions(Permissions.WHATSAPP_SEND)
  @ApiOperation({ summary: 'Send message via WhatsApp Web' })
  @ApiResponse({ status: 200, description: 'Message sent' })
  async sendWebMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { phone: string; message: string },
  ) {
    return this.whatsappWebService.sendMessage(
      user.tenantId,
      user.userId,
      body.phone,
      body.message,
    );
  }
}
