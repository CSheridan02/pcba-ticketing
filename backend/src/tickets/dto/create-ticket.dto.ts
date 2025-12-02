import { IsString, IsNotEmpty, IsUUID, IsEnum, IsOptional } from 'class-validator';

export class CreateTicketDto {
  @IsUUID()
  @IsNotEmpty()
  work_order_id: string;

  @IsUUID()
  @IsNotEmpty()
  area_id: string;

  @IsEnum(['Low', 'Medium', 'High'])
  @IsOptional()
  priority?: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

