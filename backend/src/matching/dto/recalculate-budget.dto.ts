import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatorAllocationDto {
  creator_id: string;
  allocated_amount: number;
  is_locked: boolean;
}

export class RecalculateBudgetDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatorAllocationDto)
  allocations: CreatorAllocationDto[];
}
