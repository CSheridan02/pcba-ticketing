import { IsOptional, IsString } from 'class-validator';

export class UpdateBoardAlertDto {
  @IsString()
  @IsOptional()
  content?: string;
}


