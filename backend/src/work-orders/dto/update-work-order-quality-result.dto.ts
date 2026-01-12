import { IsEnum } from 'class-validator';

export class UpdateWorkOrderQualityResultDto {
  @IsEnum(['Hold', 'Pass', 'Fail'])
  quality_result: string;
}


