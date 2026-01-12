import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: any,
  ) {
    const asset = await this.mediaService.uploadProofScreenshot(
      user.tenantId,
      user.userId,
      file,
    );
    return { data: asset };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const asset = await this.mediaService.findById(user.tenantId, id);
    return { data: asset };
  }
}
