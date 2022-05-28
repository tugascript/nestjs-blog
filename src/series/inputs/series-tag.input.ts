import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';
import { SeriesDto } from '../dtos/series.dto';

@InputType('SeriesTagInput')
export abstract class SeriesTagInput extends SeriesDto {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  public tagId!: number;
}
