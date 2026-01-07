import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';

@Injectable()
export class ListsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateListDto) {
    return this.prisma.list.create({
      data: {
        ...dto,
        tenantId,
        createdById: userId,
      },
    });
  }

  async findByTenant(tenantId: string) {
    return this.prisma.list.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });
  }

  async findById(id: string, tenantId: string) {
    const list = await this.prisma.list.findUnique({
      where: { id },
      include: {
        leads: {
          include: {
            lead: true,
          },
        },
      },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    if (list.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return list;
  }

  async update(id: string, tenantId: string, dto: UpdateListDto) {
    const list = await this.findById(id, tenantId);

    return this.prisma.list.update({
      where: { id: list.id },
      data: dto,
    });
  }

  async delete(id: string, tenantId: string) {
    const list = await this.findById(id, tenantId);

    return this.prisma.list.delete({
      where: { id: list.id },
    });
  }

  async addLeadsToList(listId: string, tenantId: string, leadIds: string[]) {
    const list = await this.findById(listId, tenantId);

    const data = leadIds.map((leadId) => ({
      leadId,
      listId: list.id,
    }));

    return this.prisma.leadList.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async removeLeadFromList(listId: string, leadId: string, tenantId: string) {
    await this.findById(listId, tenantId);

    return this.prisma.leadList.deleteMany({
      where: {
        listId,
        leadId,
      },
    });
  }

  async getLeadsInList(listId: string, tenantId: string) {
    const list = await this.findById(listId, tenantId);

    const leadLists = await this.prisma.leadList.findMany({
      where: { listId: list.id },
      include: { lead: true },
      orderBy: { addedAt: 'desc' },
    });

    return leadLists.map((ll) => ll.lead);
  }
}
