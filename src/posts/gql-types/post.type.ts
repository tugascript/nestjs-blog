import { Field, Int, ObjectType } from '@nestjs/graphql';
import { IComment } from 'src/comments/interfaces/comments.interface';
import { PaginatedCommentsType } from '../../comments/gql-types/paginated-comments.type';
import { ExtendedBaseType } from '../../common/gql-types/extended-base.type';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { PaginatedUsersType } from '../../users/gql-types/paginated-users.type';
import { IUser } from '../../users/interfaces/user.interface';
import { IPost } from '../interfaces/post.interface';

@ObjectType('Post')
export class PostType extends ExtendedBaseType implements IPost {
  @Field(() => String)
  public content: string;

  @Field(() => Boolean)
  public published: boolean;

  @Field(() => PaginatedUsersType)
  public likes: IPaginated<IUser>;

  @Field(() => Int)
  public likesCount: number;

  @Field(() => PaginatedCommentsType)
  public comments: IPaginated<IComment>;

  @Field(() => Int)
  public commentsCount: number;
}
