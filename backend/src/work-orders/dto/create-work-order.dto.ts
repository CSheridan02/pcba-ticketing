import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsArray, ValidateNested, IsUUID, IsBoolean, ValidateIf } from 'class-validator';
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

  @IsUUID()
  board_id: string;

  @IsNumber()
  quantity: number;

  @IsEnum(['Not Started', 'Active', 'Production Done', 'Quality Received', 'Quality Done', 'Completed'])
  @IsOptional()
  status?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SerialRange)
  serial_ranges?: SerialRange[];

  /**
   * Optional printed-label extras range (e.g. last 4 labels).
   * When has_extra_labels is true, extra_label_range is required.
   */
  @IsBoolean()
  @IsOptional()
  has_extra_labels?: boolean;

  @ValidateIf((o) => o.has_extra_labels === true)
  @ValidateNested()
  @Type(() => SerialRange)
  extra_label_range?: SerialRange;
}

