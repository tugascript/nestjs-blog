import { ArgsType, Field } from '@nestjs/graphql';
import { IsEnum } from 'class-validator';
import { QueryCursorEnum } from '../enums/query-cursor.enum';
import { OrderDto } from './order.dto';

@ArgsType()
export abstract class FilterDto extends OrderDto {
  @Field(() => QueryCursorEnum, { defaultValue: QueryCursorEnum.DATE })
  @IsEnum(QueryCursorEnum)
  public cursor: QueryCursorEnum = QueryCursorEnum.DATE;
}
