import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBoardCycleTimeDto {
  @IsString()
  @IsOptional()
  machine_name?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  cycle_time_seconds?: number;
}




