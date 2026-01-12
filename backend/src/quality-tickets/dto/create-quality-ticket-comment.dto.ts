import { IsNotEmpty, IsString } from 'class-validator';

export class CreateQualityTicketCommentDto {
  @IsString()
  @IsNotEmpty()
  comment: string;
}


