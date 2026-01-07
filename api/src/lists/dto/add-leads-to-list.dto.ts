import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddLeadsToListDto {
  @ApiProperty({ description: 'Array of lead IDs to add to the list' })
  @IsArray()
  @IsString({ each: true })
  leadIds: string[];
}
