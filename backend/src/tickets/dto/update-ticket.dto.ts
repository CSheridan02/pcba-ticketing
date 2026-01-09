import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';

export class UpdateTicketDto {
  @IsUUID()
  @IsOptional()
  area_id?: string;

  @IsEnum(['Low', 'Medium', 'High'])
  @IsOptional()
  impact?: string;

  @IsEnum(['Unresolved', 'Under Investigation', 'In Progress', 'Blocked', 'Resolved'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

