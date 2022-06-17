import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ExtendedBaseType } from '../../common/gql-types/extended-base.type';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { PaginatedUsersType } from '../../users/gql-types/paginated-users.type';
import { IUser } from '../../users/interfaces/user.interface';
import { ISeries } from '../interfaces/series.interface';

@ObjectType('Series')
export class SeriesType extends ExtendedBaseType implements ISeries {
  @Field(() => String)
  public description: string;

  @Field(() => Int)
  public postsCount: number;

  @Field(() => PaginatedUsersType)
  public followers: IPaginated<IUser>;

  @Field(() => Int)
  public followersCount: number;

  @Field(() => Boolean, { nullable: true })
  public followed?: boolean;
}
