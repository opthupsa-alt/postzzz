import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto, UpdateVariantDto, CreateVariantDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

// Define type locally until Prisma client is regenerated
type PostStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // ==================== POSTS ====================

  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('clientId') clientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: PostStatus,
  ) {
    const posts = await this.postsService.findAll(user.tenantId, {
      clientId,
      from,
      to,
      status,
    });
    return { data: posts };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const post = await this.postsService.findById(user.tenantId, id);
    return { data: post };
  }

  @Post()
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreatePostDto) {
    const post = await this.postsService.create(user.tenantId, user.userId, dto);
    return { data: post };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    const post = await this.postsService.update(user.tenantId, user.userId, id, dto);
    return { data: post };
  }

  @Delete(':id')
  async delete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const result = await this.postsService.delete(user.tenantId, user.userId, id);
    return { data: result };
  }

  // ==================== VARIANTS ====================

  @Get(':id/variants')
  async getVariants(@CurrentUser() user: CurrentUserPayload, @Param('id') postId: string) {
    const variants = await this.postsService.getVariants(user.tenantId, postId);
    return { data: variants };
  }

  @Put(':id/variants')
  async upsertVariants(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') postId: string,
    @Body() variants: CreateVariantDto[],
  ) {
    const result = await this.postsService.upsertVariants(user.tenantId, postId, variants);
    return { data: result };
  }

  @Patch('variants/:variantId')
  async updateVariant(
    @CurrentUser() user: CurrentUserPayload,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    const variant = await this.postsService.updateVariant(
      user.tenantId,
      user.userId,
      variantId,
      dto,
    );
    return { data: variant };
  }

  @Delete('variants/:variantId')
  async deleteVariant(
    @CurrentUser() user: CurrentUserPayload,
    @Param('variantId') variantId: string,
  ) {
    const result = await this.postsService.deleteVariant(
      user.tenantId,
      user.userId,
      variantId,
    );
    return { data: result };
  }

  // ==================== WORKFLOW ====================

  @Post(':id/submit-approval')
  async submitForApproval(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') postId: string,
  ) {
    const post = await this.postsService.submitForApproval(
      user.tenantId,
      user.userId,
      postId,
    );
    return { data: post };
  }

  @Post(':id/approve')
  async approve(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') postId: string,
  ) {
    const post = await this.postsService.approve(
      user.tenantId,
      user.userId,
      postId,
    );
    return { data: post };
  }

  @Post(':id/schedule')
  async schedule(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') postId: string,
    @Body() body: { scheduledAt?: string },
  ) {
    const post = await this.postsService.schedule(
      user.tenantId,
      user.userId,
      postId,
      body.scheduledAt,
    );
    return { data: post };
  }
}
