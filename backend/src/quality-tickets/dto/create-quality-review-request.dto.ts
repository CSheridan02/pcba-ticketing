import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateQualityReviewRequestDto {
  @IsString()
  @IsNotEmpty()
  serial_number: string;

  @IsString()
  @IsOptional()
  rework_notes?: string;
}


