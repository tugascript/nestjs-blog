import { ArgsType, Field, Int } from '@nestjs/graphql';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { IsEnum, IsInt, Min } from 'class-validator';
import { QueryOrderEnum } from '../../common/enums/query-order.enum';

@ArgsType()
export abstract class FilterCommentsDto extends PaginationDto {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  readonly postId: number;

  @Field(() => QueryOrderEnum, { defaultValue: QueryOrderEnum.DESC })
  @IsEnum(QueryOrderEnum)
  readonly order: QueryOrderEnum = QueryOrderEnum.DESC;
}
