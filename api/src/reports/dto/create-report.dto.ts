import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportType {
  LEAD_ANALYSIS = 'LEAD_ANALYSIS',
  COMPANY_PROFILE = 'COMPANY_PROFILE',
  MARKET_RESEARCH = 'MARKET_RESEARCH',
  COMPETITOR_ANALYSIS = 'COMPETITOR_ANALYSIS',
}

export class CreateReportDto {
  @ApiProperty({ description: 'Report title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Report type', enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional({ description: 'Lead ID to generate report for' })
  @IsOptional()
  @IsString()
  leadId?: string;
}
