import { ISeries } from '../interfaces/series.interface';
import { ExtendedBaseType } from '../../common/gql-types/extended-base.type';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Series')
export class SeriesType extends ExtendedBaseType implements ISeries {
  @Field(() => Int)
  public followersCount: number;
}
