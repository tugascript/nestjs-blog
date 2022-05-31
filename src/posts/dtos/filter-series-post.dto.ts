import { ArgsType, Field, Int } from '@nestjs/graphql';
import { FilterDto } from '../../common/dtos/filter.dto';
import { IsInt, Min } from 'class-validator';

@ArgsType()
export abstract class FilterSeriesPostDto extends FilterDto {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  public seriesId: number;
}
