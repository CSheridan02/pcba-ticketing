import { IsString, IsNumber, IsEnum, IsOptional, Matches } from 'class-validator';

export class UpdateWorkOrderDto {
  @IsString()
  @IsOptional()
  asm_number?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsEnum(['Not Started', 'Active', 'Completed'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{7}W$/, { message: 'Serial number must be in format: #######W (7 digits followed by W)' })
  serial_number_start?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{7}W$/, { message: 'Serial number must be in format: #######W (7 digits followed by W)' })
  serial_number_end?: string;
}

