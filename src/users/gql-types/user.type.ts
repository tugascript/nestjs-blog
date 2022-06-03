import { Field, Int, ObjectType } from '@nestjs/graphql';
import { LocalBaseType } from '../../common/gql-types/base.type';
import { OnlineStatusEnum } from '../enums/online-status.enum';
import { IUser } from '../interfaces/user.interface';
import { PaginatedPostsType } from '../../posts/gql-types/paginated-posts.type';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { IPost } from '../../posts/interfaces/post.interface';
import { PaginatedSeriesType } from '../../series/gql-types/paginated-series.type';
import { ISeries } from '../../series/interfaces/series.interface';

@ObjectType('User')
export class UserType extends LocalBaseType implements IUser {
  @Field(() => String)
  public name!: string;

  @Field(() => String)
  public username!: string;

  @Field(() => String, { nullable: true })
  public email!: string;

  @Field(() => String, { nullable: true })
  public picture?: string;

  @Field(() => OnlineStatusEnum)
  public onlineStatus: OnlineStatusEnum;

  @Field(() => String)
  public lastOnline: Date;

  @Field(() => PaginatedPostsType)
  public likedPosts: IPaginated<IPost>;

  @Field(() => Int)
  public likedPostsCount: number;

  @Field(() => PaginatedSeriesType)
  public followedSeries: IPaginated<ISeries>;

  @Field(() => Int)
  public followedSeriesCount: number;
}
