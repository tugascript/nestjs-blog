import { FilterRelationDto } from '../../common/dtos/filter-relation.dto';
import { ArgsType, Field } from '@nestjs/graphql';
import { QueryCursorEnum } from '../../common/enums/query-cursor.enum';
import { IsEnum } from 'class-validator';

@ArgsType()
export abstract class FilterPostsRelationDto extends FilterRelationDto {
  @Field(() => QueryCursorEnum)
  @IsEnum(QueryCursorEnum)
  public cursor: QueryCursorEnum = QueryCursorEnum.DATE;
}
