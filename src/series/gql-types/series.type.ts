import { ISeries } from '../interfaces/series.interface';
import { ExtendedBaseType } from '../../common/gql-types/extended-base.type';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PaginatedUsersType } from '../../users/gql-types/paginated-users.type';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { IUser } from '../../users/interfaces/user.interface';

@ObjectType('Series')
export class SeriesType extends ExtendedBaseType implements ISeries {
  @Field(() => String)
  public description: string;

  @Field(() => PaginatedUsersType)
  public followers: IPaginated<IUser>;

  @Field(() => Int)
  public followersCount: number;
}
