import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class UpdateVariantDto {
  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  hashtags?: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsArray()
  mediaAssetIds?: string[];

  @IsOptional()
  extra?: Record<string, any>;
}
