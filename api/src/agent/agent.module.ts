import { Module, forwardRef } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentGateway } from './agent.gateway';
import { JobsModule } from '../jobs/jobs.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [forwardRef(() => JobsModule), AuditModule],
  controllers: [AgentController],
  providers: [AgentService, AgentGateway],
  exports: [AgentService, AgentGateway],
})
export class AgentModule {}
