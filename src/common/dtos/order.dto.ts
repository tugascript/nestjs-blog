import { ArgsType, Field } from '@nestjs/graphql';
import { IsEnum } from 'class-validator';
import { QueryOrderEnum } from '../enums/query-order.enum';
import { PaginationDto } from './pagination.dto';

@ArgsType()
export abstract class OrderDto extends PaginationDto {
  @Field(() => QueryOrderEnum, { defaultValue: QueryOrderEnum.DESC })
  @IsEnum(QueryOrderEnum)
  public order: QueryOrderEnum = QueryOrderEnum.DESC;
}
