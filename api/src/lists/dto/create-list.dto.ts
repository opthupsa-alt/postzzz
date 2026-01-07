import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateListDto {
  @ApiProperty({ description: 'List name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'List description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'List color (hex)' })
  @IsOptional()
  @IsString()
  color?: string;
}
