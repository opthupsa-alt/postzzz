import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SearchHistoryService, CreateSearchHistoryDto, SearchHistoryFilters } from './search-history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('search-history')
@UseGuards(JwtAuthGuard)
export class SearchHistoryController {
  constructor(private readonly searchHistoryService: SearchHistoryService) {}

  /**
   * حفظ عملية بحث جديدة
   * POST /search-history
   */
  @Post()
  async create(@Request() req: any, @Body() data: CreateSearchHistoryDto) {
    const { tenantId, sub: userId } = req.user;
    return this.searchHistoryService.create(tenantId, userId, data);
  }

  /**
   * جلب سجل البحث
   * GET /search-history
   */
  @Get()
  async findAll(
    @Request() req: any,
    @Query('query') query?: string,
    @Query('searchType') searchType?: 'SINGLE' | 'BULK',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const { tenantId, sub: userId } = req.user;
    
    const filters: SearchHistoryFilters = {
      query,
      searchType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    };

    return this.searchHistoryService.findAll(tenantId, userId, filters);
  }

  /**
   * جلب آخر عمليات البحث
   * GET /search-history/recent
   */
  @Get('recent')
  async getRecent(@Request() req: any, @Query('limit') limit?: string) {
    const { tenantId, sub: userId } = req.user;
    return this.searchHistoryService.getRecent(
      tenantId,
      userId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * إحصائيات البحث
   * GET /search-history/stats
   */
  @Get('stats')
  async getStats(@Request() req: any) {
    const { tenantId, sub: userId } = req.user;
    return this.searchHistoryService.getStats(tenantId, userId);
  }

  /**
   * جلب عملية بحث واحدة
   * GET /search-history/:id
   */
  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const { tenantId, sub: userId } = req.user;
    return this.searchHistoryService.findOne(tenantId, userId, id);
  }

  /**
   * حذف عملية بحث
   * DELETE /search-history/:id
   */
  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const { tenantId, sub: userId } = req.user;
    return this.searchHistoryService.delete(tenantId, userId, id);
  }

  /**
   * حذف كل سجل البحث
   * DELETE /search-history
   */
  @Delete()
  async clearAll(@Request() req: any) {
    const { tenantId, sub: userId } = req.user;
    return this.searchHistoryService.clearAll(tenantId, userId);
  }
}
