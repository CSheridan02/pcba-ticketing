import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBoardAlertDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}


