import { Field, Int, ObjectType } from '@nestjs/graphql';
import { IComment } from '../interfaces/comments.interface';
import { UserType } from '../../users/gql-types/user.type';
import { PaginatedUsersType } from '../../users/gql-types/paginated-users.type';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { IUser } from '../../users/interfaces/user.interface';
import { PaginatedCommentsType } from './paginated-comments.type';
import { IReply } from '../interfaces/reply.interface';
import { PostType } from '../../posts/gql-types/post.type';
import { AuthoredType } from '../../common/gql-types/authored.type';

@ObjectType('Comment')
export class CommentType extends AuthoredType implements IComment {
  @Field(() => String)
  public content: string;

  @Field(() => PostType)
  public post: PostType;

  @Field(() => Boolean)
  public hasLiked: boolean;

  @Field(() => PaginatedUsersType)
  public likes: IPaginated<IUser>;

  @Field(() => Int)
  public likesCount: number;

  @Field(() => PaginatedCommentsType)
  public replies: IPaginated<IReply>;

  @Field(() => Int)
  public repliesCount: number;

  @Field(() => UserType, { nullable: true })
  public mention?: UserType;
}
