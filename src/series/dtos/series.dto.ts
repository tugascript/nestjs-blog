import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';

@ArgsType()
@InputType({ isAbstract: true })
export abstract class SeriesDto {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  public seriesId: number;
}
