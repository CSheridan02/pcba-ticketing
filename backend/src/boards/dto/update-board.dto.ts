import { IsOptional, IsString } from 'class-validator';

export class UpdateBoardDto {
  @IsString()
  @IsOptional()
  asm_number?: string;

  @IsString()
  @IsOptional()
  internal_g_number?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  reference_image_url?: string;
}




