import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateSearchHistoryDto {
  query: string;
  city?: string;
  country?: string;
  searchType: 'SINGLE' | 'BULK';
  resultsCount: number;
  savedCount: number;
  results?: any[];
  searchLayers?: string[];
  matchThreshold?: number;
  duration?: number;
  status?: string;
  errorMessage?: string;
  jobId?: string;
}

export interface SearchHistoryFilters {
  query?: string;
  searchType?: 'SINGLE' | 'BULK';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class SearchHistoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * حفظ عملية بحث جديدة
   */
  async create(
    tenantId: string,
    userId: string,
    data: CreateSearchHistoryDto,
  ) {
    return this.prisma.searchHistory.create({
      data: {
        tenantId,
        userId,
        query: data.query,
        city: data.city,
        country: data.country,
        searchType: data.searchType,
        resultsCount: data.resultsCount,
        savedCount: data.savedCount,
        results: data.results || [],
        searchLayers: data.searchLayers || [],
        matchThreshold: data.matchThreshold,
        duration: data.duration,
        status: data.status || 'COMPLETED',
        errorMessage: data.errorMessage,
        jobId: data.jobId,
      },
    });
  }

  /**
   * جلب سجل البحث للمستخدم
   */
  async findAll(
    tenantId: string,
    userId: string,
    filters: SearchHistoryFilters = {},
  ) {
    const { query, searchType, startDate, endDate, limit = 50, offset = 0 } = filters;

    const where: any = {
      tenantId,
      userId,
    };

    if (query) {
      where.query = { contains: query, mode: 'insensitive' };
    }

    if (searchType) {
      where.searchType = searchType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [items, total] = await Promise.all([
      this.prisma.searchHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.searchHistory.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  /**
   * جلب عملية بحث واحدة
   */
  async findOne(tenantId: string, userId: string, id: string) {
    return this.prisma.searchHistory.findFirst({
      where: {
        id,
        tenantId,
        userId,
      },
    });
  }

  /**
   * جلب آخر عمليات البحث
   */
  async getRecent(tenantId: string, userId: string, limit = 10) {
    return this.prisma.searchHistory.findMany({
      where: {
        tenantId,
        userId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        query: true,
        city: true,
        searchType: true,
        resultsCount: true,
        savedCount: true,
        status: true,
        createdAt: true,
      },
    });
  }

  /**
   * حذف عملية بحث
   */
  async delete(tenantId: string, userId: string, id: string) {
    return this.prisma.searchHistory.deleteMany({
      where: {
        id,
        tenantId,
        userId,
      },
    });
  }

  /**
   * حذف كل سجل البحث للمستخدم
   */
  async clearAll(tenantId: string, userId: string) {
    return this.prisma.searchHistory.deleteMany({
      where: {
        tenantId,
        userId,
      },
    });
  }

  /**
   * إحصائيات البحث
   */
  async getStats(tenantId: string, userId: string) {
    const [totalSearches, totalResults, searchesByType] = await Promise.all([
      this.prisma.searchHistory.count({
        where: { tenantId, userId },
      }),
      this.prisma.searchHistory.aggregate({
        where: { tenantId, userId },
        _sum: { resultsCount: true, savedCount: true },
      }),
      this.prisma.searchHistory.groupBy({
        by: ['searchType'],
        where: { tenantId, userId },
        _count: true,
      }),
    ]);

    return {
      totalSearches,
      totalResults: totalResults._sum.resultsCount || 0,
      totalSaved: totalResults._sum.savedCount || 0,
      searchesByType: searchesByType.reduce((acc, item) => {
        acc[item.searchType] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
