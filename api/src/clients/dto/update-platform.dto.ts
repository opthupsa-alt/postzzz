import { IsString, IsOptional, IsEnum, MaxLength, IsBoolean } from 'class-validator';
import { SocialPlatform } from '@prisma/client';

export class UpdatePlatformDto {
  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  handle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
