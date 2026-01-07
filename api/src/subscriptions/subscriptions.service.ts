import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto, BillingCycle } from './dto/create-subscription.dto';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  private calculatePeriodEnd(start: Date, billingCycle: BillingCycle): Date {
    const end = new Date(start);
    if (billingCycle === BillingCycle.YEARLY) {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }

  async create(dto: CreateSubscriptionDto) {
    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if tenant already has a subscription
    const existing = await this.prisma.subscription.findUnique({
      where: { tenantId: dto.tenantId },
    });

    if (existing) {
      throw new ConflictException('Tenant already has a subscription');
    }

    // Check if plan exists
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const now = new Date();
    const billingCycle = dto.billingCycle || BillingCycle.MONTHLY;

    return this.prisma.subscription.create({
      data: {
        tenantId: dto.tenantId,
        planId: dto.planId,
        billingCycle: billingCycle as any,
        status: dto.trialEndsAt ? 'TRIALING' : 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: this.calculatePeriodEnd(now, billingCycle),
        trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : null,
      },
      include: {
        plan: true,
        tenant: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findByTenant(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async findAll(options?: { status?: SubscriptionStatus; limit?: number; offset?: number }) {
    const where: any = {};
    if (options?.status) {
      where.status = options.status;
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          plan: true,
          tenant: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { subscriptions, total };
  }

  async changePlan(tenantId: string, newPlanId: string) {
    const subscription = await this.findByTenant(tenantId);

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      throw new NotFoundException('Plan not found');
    }

    return this.prisma.subscription.update({
      where: { tenantId },
      data: {
        planId: newPlanId,
        // Reset period on plan change
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(new Date(), subscription.billingCycle as BillingCycle),
      },
      include: {
        plan: true,
      },
    });
  }

  async updateStatus(tenantId: string, status: SubscriptionStatus) {
    await this.findByTenant(tenantId);

    return this.prisma.subscription.update({
      where: { tenantId },
      data: { status },
      include: {
        plan: true,
      },
    });
  }

  async cancel(tenantId: string, immediate = false) {
    const subscription = await this.findByTenant(tenantId);

    if (immediate) {
      return this.prisma.subscription.update({
        where: { tenantId },
        data: {
          status: 'CANCELLED',
          cancelAtPeriodEnd: false,
        },
      });
    }

    return this.prisma.subscription.update({
      where: { tenantId },
      data: {
        cancelAtPeriodEnd: true,
      },
    });
  }

  async reactivate(tenantId: string) {
    const subscription = await this.findByTenant(tenantId);

    if (subscription.status === 'CANCELLED') {
      throw new BadRequestException('Cannot reactivate a cancelled subscription');
    }

    return this.prisma.subscription.update({
      where: { tenantId },
      data: {
        cancelAtPeriodEnd: false,
        status: 'ACTIVE',
      },
    });
  }

  async delete(tenantId: string) {
    await this.findByTenant(tenantId);

    return this.prisma.subscription.delete({
      where: { tenantId },
    });
  }

  // Get subscription with usage info
  async getSubscriptionWithUsage(tenantId: string) {
    const subscription = await this.findByTenant(tenantId);
    const currentPeriod = new Date().toISOString().slice(0, 7); // "2026-01"

    const usageCounters = await this.prisma.usageCounter.findMany({
      where: {
        tenantId,
        period: currentPeriod,
      },
    });

    const usage: Record<string, number> = {
      SEATS: 0,
      LEADS: 0,
      SEARCHES: 0,
      MESSAGES: 0,
    };

    usageCounters.forEach((counter) => {
      usage[counter.metric] = counter.value;
    });

    // Get actual seat count
    const seatCount = await this.prisma.membership.count({
      where: { tenantId },
    });
    usage.SEATS = seatCount;

    // Get actual lead count
    const leadCount = await this.prisma.lead.count({
      where: { tenantId },
    });
    usage.LEADS = leadCount;

    return {
      subscription,
      usage,
      limits: {
        SEATS: subscription.plan.seatsLimit,
        LEADS: subscription.plan.leadsLimit,
        SEARCHES: subscription.plan.searchesLimit,
        MESSAGES: subscription.plan.messagesLimit,
      },
    };
  }
}
