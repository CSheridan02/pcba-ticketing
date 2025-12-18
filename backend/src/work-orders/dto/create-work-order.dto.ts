import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SerialRange {
  @IsString()
  start: string;

  @IsString()
  end: string;
}

export class CreateWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  work_order_number: string;

  @IsString()
  @IsNotEmpty()
  asm_number: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  quantity: number;

  @IsEnum(['Not Started', 'Active', 'Completed'])
  @IsOptional()
  status?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SerialRange)
  serial_ranges?: SerialRange[];
}

