import { ArgsType, Field, Int } from '@nestjs/graphql';
import { QueryOrderEnum } from '../enums/query-order.enum';
import { IsEnum, IsInt, Max, Min } from 'class-validator';

@ArgsType()
export abstract class FilterRelationDto {
  @Field(() => QueryOrderEnum, { defaultValue: QueryOrderEnum.ASC })
  @IsEnum(QueryOrderEnum)
  public order: QueryOrderEnum = QueryOrderEnum.ASC;

  @Field(() => Int, { defaultValue: 10 })
  @IsInt()
  @Min(1)
  @Max(50)
  public first = 10;
}
