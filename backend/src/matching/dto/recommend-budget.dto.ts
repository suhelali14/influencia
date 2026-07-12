import { IsNumber, IsString, IsOptional, IsArray } from 'class-validator';

export class RecommendBudgetDto {
  @IsNumber()
  @IsOptional()
  total_budget?: number;

  @IsString()
  @IsOptional()
  target_metric?: string; // 'reach' | 'engagement' | 'conversions'

  @IsArray()
  @IsOptional()
  locked_creator_ids?: string[];
}
