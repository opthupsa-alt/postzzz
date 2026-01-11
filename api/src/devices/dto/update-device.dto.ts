import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  capabilities?: Record<string, any>;
}

export class HeartbeatDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  capabilities?: Record<string, any>;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  version?: string;
}
