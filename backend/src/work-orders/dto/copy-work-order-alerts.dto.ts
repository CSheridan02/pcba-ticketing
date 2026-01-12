import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CopyWorkOrderAlertsDto {
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  board_alert_ids: string[];
}


