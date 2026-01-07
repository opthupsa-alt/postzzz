import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePlanDto) {
    const existing = await this.prisma.plan.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Plan with name "${dto.name}" already exists`);
    }

    return this.prisma.plan.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        description: dto.description,
        descriptionAr: dto.descriptionAr,
        price: new Decimal(dto.price),
        yearlyPrice: new Decimal(dto.yearlyPrice),
        currency: dto.currency || 'SAR',
        seatsLimit: dto.seatsLimit,
        leadsLimit: dto.leadsLimit,
        searchesLimit: dto.searchesLimit,
        messagesLimit: dto.messagesLimit,
        features: dto.features || [],
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };

    return this.prisma.plan.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });
  }

  async findById(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  async findByName(name: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { name },
    });

    if (!plan) {
      throw new NotFoundException(`Plan "${name}" not found`);
    }

    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findById(id);

    const data: any = { ...dto };
    if (dto.price !== undefined) {
      data.price = new Decimal(dto.price);
    }
    if (dto.yearlyPrice !== undefined) {
      data.yearlyPrice = new Decimal(dto.yearlyPrice);
    }

    return this.prisma.plan.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const plan = await this.findById(id);

    // Check if plan has active subscriptions
    const activeSubscriptions = await this.prisma.subscription.count({
      where: { planId: id, status: 'ACTIVE' },
    });

    if (activeSubscriptions > 0) {
      throw new ConflictException(
        `Cannot delete plan with ${activeSubscriptions} active subscriptions`,
      );
    }

    return this.prisma.plan.delete({ where: { id } });
  }

  async toggleActive(id: string) {
    const plan = await this.findById(id);

    return this.prisma.plan.update({
      where: { id },
      data: { isActive: !plan.isActive },
    });
  }
}
