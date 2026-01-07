import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ description: 'Plan name (unique identifier)' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Plan name in Arabic' })
  @IsString()
  nameAr: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Plan description in Arabic' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiProperty({ description: 'Monthly price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Yearly price' })
  @IsNumber()
  @Min(0)
  yearlyPrice: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Max team members (-1 = unlimited)', default: 1 })
  @IsNumber()
  seatsLimit: number;

  @ApiProperty({ description: 'Max leads (-1 = unlimited)', default: 100 })
  @IsNumber()
  leadsLimit: number;

  @ApiProperty({ description: 'Max searches per month (-1 = unlimited)', default: 10 })
  @IsNumber()
  searchesLimit: number;

  @ApiProperty({ description: 'Max WhatsApp messages per month (-1 = unlimited)', default: 50 })
  @IsNumber()
  messagesLimit: number;

  @ApiPropertyOptional({ description: 'Feature keys enabled for this plan' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Is plan active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort order for display', default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
