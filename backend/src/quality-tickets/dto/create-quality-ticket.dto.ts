import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateQualityTicketDto {
  @IsUUID()
  @IsNotEmpty()
  work_order_id: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  serial_numbers: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}


