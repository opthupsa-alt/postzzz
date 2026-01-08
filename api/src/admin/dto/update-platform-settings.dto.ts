import { IsString, IsBoolean, IsInt, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SearchMethodDto {
  GOOGLE_MAPS_REAL = 'GOOGLE_MAPS_REAL',
  GOOGLE_MAPS_API = 'GOOGLE_MAPS_API',
}

export class UpdatePlatformSettingsDto {
  @ApiPropertyOptional({ description: 'Web app URL' })
  @IsOptional()
  @IsString()
  platformUrl?: string;

  @ApiPropertyOptional({ description: 'API URL' })
  @IsOptional()
  @IsString()
  apiUrl?: string;

  @ApiPropertyOptional({ enum: SearchMethodDto, description: 'Search method for Google Maps' })
  @IsOptional()
  @IsEnum(SearchMethodDto)
  searchMethod?: SearchMethodDto;

  @ApiPropertyOptional({ description: 'Google API Key (only for GOOGLE_MAPS_API method)' })
  @IsOptional()
  @IsString()
  googleApiKey?: string;

  @ApiPropertyOptional({ description: 'Enable auto-login from platform to extension' })
  @IsOptional()
  @IsBoolean()
  extensionAutoLogin?: boolean;

  @ApiPropertyOptional({ description: 'Enable debug mode in extension' })
  @IsOptional()
  @IsBoolean()
  extensionDebugMode?: boolean;

  @ApiPropertyOptional({ description: 'Require subscription to use platform' })
  @IsOptional()
  @IsBoolean()
  requireSubscription?: boolean;

  @ApiPropertyOptional({ description: 'Trial days for new tenants' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  trialDays?: number;

  @ApiPropertyOptional({ description: 'Search rate limit per minute' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  searchRateLimit?: number;

  @ApiPropertyOptional({ description: 'Crawl rate limit per minute' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  crawlRateLimit?: number;

  @ApiPropertyOptional({ description: 'Max results for bulk search' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(100)
  maxSearchResults?: number;

  @ApiPropertyOptional({ description: 'Default country code (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  defaultCountry?: string;
}
