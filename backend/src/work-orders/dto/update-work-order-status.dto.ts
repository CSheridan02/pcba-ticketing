import { IsEnum } from 'class-validator';

export class UpdateWorkOrderStatusDto {
  @IsEnum(['Not Started', 'Active', 'Production Done', 'Quality Received', 'Quality Done', 'Completed'])
  status: string;
}




