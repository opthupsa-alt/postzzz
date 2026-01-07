import { Module } from '@nestjs/common';
import { ExtensionGateway } from './extension.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [ExtensionGateway],
  exports: [ExtensionGateway],
})
export class GatewayModule {}
