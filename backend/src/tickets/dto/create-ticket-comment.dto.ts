import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTicketCommentDto {
  @IsString()
  @IsNotEmpty()
  comment: string;
}


