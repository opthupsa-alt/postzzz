import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsString()
  tenantId: string;

  @ApiProperty({ description: 'Plan ID' })
  @IsString()
  planId: string;

  @ApiPropertyOptional({ description: 'Billing cycle', enum: BillingCycle, default: 'MONTHLY' })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({ description: 'Trial end date' })
  @IsOptional()
  @IsDateString()
  trialEndsAt?: string;
}
