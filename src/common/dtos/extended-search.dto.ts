import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';
import { SearchDto } from './search.dto';

@ArgsType()
export abstract class ExtendedSearchDto extends SearchDto {
  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  public authorId?: number;
}
