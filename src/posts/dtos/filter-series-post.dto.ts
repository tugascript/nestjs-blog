import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';
import { FilterDto } from '../../common/dtos/filter.dto';

@ArgsType()
export abstract class FilterSeriesPostDto extends FilterDto {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  public seriesId: number;
}
