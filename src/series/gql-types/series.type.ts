import { ISeries } from '../interfaces/series.interface';
import { ExtendedBaseType } from '../../common/gql-types/extended-base.type';
import { TagType } from '../../tags/gql-types/tag.type';
import { Field, ObjectType } from '@nestjs/graphql';
import { ITag } from '../../tags/interfaces/tag.interface';

@ObjectType('Series')
export class SeriesType extends ExtendedBaseType implements ISeries {
  @Field(() => [TagType])
  public tags: ITag[];
}
