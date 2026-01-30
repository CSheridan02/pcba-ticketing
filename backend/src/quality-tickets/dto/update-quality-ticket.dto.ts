import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateQualityTicketDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serial_numbers?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  @IsIn(['Rework Needed', 'Closed'])
  status?: string;
}




