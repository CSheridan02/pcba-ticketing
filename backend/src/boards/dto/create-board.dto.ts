import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @IsNotEmpty()
  asm_number: string;

  @IsString()
  @IsOptional()
  internal_g_number?: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}




