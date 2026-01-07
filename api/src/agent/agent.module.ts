import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentGateway } from './agent.gateway';
import { JobsModule } from '../jobs/jobs.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [JobsModule, AuditModule],
  controllers: [AgentController],
  providers: [AgentService, AgentGateway],
  exports: [AgentService],
})
export class AgentModule {}
