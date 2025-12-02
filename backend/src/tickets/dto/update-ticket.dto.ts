import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';

export class UpdateTicketDto {
  @IsUUID()
  @IsOptional()
  area_id?: string;

  @IsEnum(['Low', 'Medium', 'High'])
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

