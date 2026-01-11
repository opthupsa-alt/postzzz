import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PlatformRulesService } from './platform-rules.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PostsController],
  providers: [PostsService, PlatformRulesService],
  exports: [PostsService, PlatformRulesService],
})
export class PostsModule {}
