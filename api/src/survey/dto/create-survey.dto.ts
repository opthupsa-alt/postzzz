import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum SurveyPriority {
  NORMAL = 'normal',
  HIGH = 'high',
}

export class CreateSurveyDto {
  @IsString()
  leadId: string;

  @IsOptional()
  @IsEnum(SurveyPriority)
  priority?: SurveyPriority = SurveyPriority.NORMAL;

  @IsOptional()
  @IsString()
  goalHint?: string;

  @IsOptional()
  @IsString()
  extraConstraints?: string;
}
