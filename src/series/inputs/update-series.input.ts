import { Field, InputType } from '@nestjs/graphql';
import { ISeriesInput } from '../interfaces/series-input.interface';
import { IsOptional, Length, Matches } from 'class-validator';
import { NAME_REGEX } from '../../common/constants/regex';
import { SeriesDto } from '../dtos/series.dto';

@InputType('UpdateSeriesInput')
export abstract class UpdateSeriesInput
  extends SeriesDto
  implements Partial<ISeriesInput>
{
  @Field(() => String, { nullable: true })
  @Length(3, 100)
  @Matches(NAME_REGEX)
  @IsOptional()
  public title?: string;

  @Field(() => String, { nullable: true })
  @Length(5, 500)
  @IsOptional()
  public description?: string;
}
