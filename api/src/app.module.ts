import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { InvitesModule } from './invites/invites.module';
import { JobsModule } from './jobs/jobs.module';
import { LeadsModule } from './leads/leads.module';
import { AgentModule } from './agent/agent.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Core modules
    PrismaModule,
    HealthModule,
    AuditModule,

    // Feature modules
    AuthModule,
    TenantsModule,
    UsersModule,
    InvitesModule,
    JobsModule,
    LeadsModule,
    AgentModule,
  ],
})
export class AppModule {}
