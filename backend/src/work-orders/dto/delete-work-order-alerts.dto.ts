import { IsArray, IsOptional, IsString } from 'class-validator';

export class DeleteWorkOrderAlertsDto {
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  ids?: string[];
}


