import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export class UpdateTenantStatusDto {
  @ApiProperty({ description: 'Tenant status', enum: TenantStatus })
  @IsEnum(TenantStatus)
  status: TenantStatus;
}
