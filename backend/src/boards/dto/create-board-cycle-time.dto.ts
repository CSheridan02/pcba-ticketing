import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateBoardCycleTimeDto {
  @IsString()
  @IsNotEmpty()
  machine_name: string;

  @IsNumber()
  @Min(0)
  cycle_time_seconds: number;
}




