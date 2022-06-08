import { ArgsType, Field } from '@nestjs/graphql';
import { IsEnum } from 'class-validator';
import { FilterRelationDto } from '../../common/dtos/filter-relation.dto';
import { QueryCursorEnum } from '../../common/enums/query-cursor.enum';

@ArgsType()
export abstract class FilterPostsRelationDto extends FilterRelationDto {
  @Field(() => QueryCursorEnum)
  @IsEnum(QueryCursorEnum)
  public cursor: QueryCursorEnum = QueryCursorEnum.DATE;
}
