import { IsIn, IsOptional, IsString } from 'class-validator';

export class MarkQualityReviewRequestReviewedDto {
  @IsString()
  @IsIn(['Pass', 'Fail'])
  outcome: 'Pass' | 'Fail';

  @IsString()
  @IsOptional()
  review_notes?: string;
}


