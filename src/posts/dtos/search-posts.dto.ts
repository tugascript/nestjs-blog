import { ArgsType, Field, Int } from '@nestjs/graphql';
import { SearchDto } from '../../common/dtos/search.dto';
import { IsInt, Min } from 'class-validator';

@ArgsType()
export abstract class SearchPostsDto extends SearchDto {
  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  public authorId?: number;
}
