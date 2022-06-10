import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, Min } from 'class-validator';
import { SearchDto } from './search.dto';

@ArgsType()
export abstract class ExtendedSearchDto extends SearchDto {
  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  @IsOptional()
  public authorId?: number;
}
