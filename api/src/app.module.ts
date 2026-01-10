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
import { ListsModule } from './lists/lists.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { GatewayModule } from './gateway/gateway.module';
import { AgentModule } from './agent/agent.module';
import { AuditModule } from './audit/audit.module';
import { ExtensionSettingsModule } from './extension-settings/extension-settings.module';
import { AIProviderModule } from './ai-provider/ai-provider.module';
import { SurveyModule } from './survey/survey.module';
import { SearchHistoryModule } from './search-history/search-history.module';

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
    ListsModule,
    ReportsModule,
    AdminModule,
    PlansModule,
    SubscriptionsModule,
    GatewayModule,
    AgentModule,
    ExtensionSettingsModule,
    AIProviderModule,
    SurveyModule,
    SearchHistoryModule,
  ],
})
export class AppModule {}
