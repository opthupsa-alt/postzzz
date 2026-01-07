import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true, isActive: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Super Admin access required');
    }

    return true;
  }
}
