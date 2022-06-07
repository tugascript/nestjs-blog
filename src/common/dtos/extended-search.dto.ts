import { SearchDto } from './search.dto';
import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';

@ArgsType()
export abstract class ExtendedSearchDto extends SearchDto {
  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  public authorId?: number;
}
