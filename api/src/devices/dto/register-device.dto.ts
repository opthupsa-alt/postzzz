import { IsString, IsOptional, IsUUID } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  name: string;

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
