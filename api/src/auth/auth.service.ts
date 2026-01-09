import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async signup(dto: SignupDto, ipAddress?: string, userAgent?: string) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create tenant + user + membership in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName || `${dto.name}'s Organization`,
          slug: this.generateSlug(dto.tenantName || dto.name),
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          defaultTenantId: tenant.id,
        },
      });

      // Create owner membership
      await tx.membership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'OWNER',
        },
      });

      return { user, tenant };
    });

    // Audit log
    await this.auditService.log({
      tenantId: result.tenant.id,
      userId: result.user.id,
      action: 'AUTH_SIGNUP',
      entityType: 'USER',
      entityId: result.user.id,
      metadata: { email: result.user.email },
      ipAddress,
      userAgent,
    });

    // Generate token
    const token = this.generateToken(result.user, result.tenant.id, 'OWNER');

    return {
      user: this.sanitizeUser(result.user),
      tenant: result.tenant,
      token,
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      this.logger.warn(`Login failed: user not found for email ${dto.email.toLowerCase()}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      this.logger.warn(`Login failed: invalid password for user ${user.id}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Super Admin login - no tenant required
    if (user.isSuperAdmin) {
      const token = this.generateToken(user, 'PLATFORM', 'SUPER_ADMIN');
      
      this.logger.log(`Super Admin login: ${user.email}`);
      
      return {
        user: this.sanitizeUser(user),
        tenant: null,
        tenantId: null,
        role: 'SUPER_ADMIN',
        token,
      };
    }

    // Regular user login - requires tenant membership
    const membership =
      user.memberships.find((m) => m.tenantId === user.defaultTenantId) ||
      user.memberships[0];

    if (!membership) {
      throw new BadRequestException('User has no tenant membership');
    }

    // Audit log
    await this.auditService.log({
      tenantId: membership.tenantId,
      userId: user.id,
      action: 'AUTH_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    const token = this.generateToken(user, membership.tenantId, membership.role);

    return {
      user: this.sanitizeUser(user),
      tenant: membership.tenant,
      tenantId: membership.tenantId,
      role: membership.role,
      token,
    };
  }

  async validateUser(userId: string, tenantId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      include: {
        user: true,
        tenant: true,
      },
    });

    if (!membership) {
      return null;
    }

    return {
      ...membership.user,
      tenantId: membership.tenantId,
      role: membership.role,
    };
  }

  async getMe(userId: string, tenantId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      include: {
        user: true,
        tenant: true,
      },
    });

    if (!membership) {
      throw new UnauthorizedException('Invalid session');
    }

    return {
      user: this.sanitizeUser(membership.user),
      tenant: membership.tenant,
      role: membership.role,
    };
  }

  private generateToken(
    user: { id: string; email: string },
    tenantId: string,
    role: string,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId,
      role,
    };

    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: { id: string; email: string; name: string; avatarUrl?: string | null; isSuperAdmin?: boolean }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isSuperAdmin: user.isSuperAdmin || false,
    };
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const random = Math.random().toString(36).substring(2, 8);
    return `${base}-${random}`;
  }
}
