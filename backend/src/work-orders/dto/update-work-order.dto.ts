import { IsString, IsNumber, IsEnum, IsOptional, IsArray, ValidateNested, IsBoolean, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

class SerialRange {
  @IsString()
  start: string;

  @IsString()
  end: string;
}

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

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SerialRange)
  serial_ranges?: SerialRange[];

  @IsBoolean()
  @IsOptional()
  has_extra_labels?: boolean;

  @ValidateIf((o) => o.has_extra_labels === true)
  @ValidateNested()
  @Type(() => SerialRange)
  extra_label_range?: SerialRange;
}

