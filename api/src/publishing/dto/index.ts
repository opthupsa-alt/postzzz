import { IsString, IsOptional, IsUUID, IsInt, IsEnum, IsArray } from 'class-validator';

export class ClaimJobsDto {
  @IsUUID()
  deviceId: string;

  @IsOptional()
  @IsInt()
  limit?: number;
}

export class StartJobDto {
  @IsUUID()
  deviceId: string;
}

export class CompleteJobDto {
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsEnum(['SUCCEEDED', 'FAILED', 'NEEDS_LOGIN'])
  status: 'SUCCEEDED' | 'FAILED' | 'NEEDS_LOGIN';

  @IsOptional()
  logs?: any;

  @IsOptional()
  @IsUUID()
  proofScreenshotAssetId?: string;

  @IsOptional()
  @IsString()
  publishedUrl?: string;

  @IsOptional()
  @IsString()
  errorCode?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}
