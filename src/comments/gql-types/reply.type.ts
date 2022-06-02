import { LocalBaseType } from '../../common/gql-types/base.type';
import { IReply } from '../interfaces/reply.interface';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { UserType } from '../../users/gql-types/user.type';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PostType } from '../../posts/gql-types/post.type';
import { CommentType } from './comment.type';
import { IUser } from '../../users/interfaces/user.interface';
import { PaginatedUsersType } from '../../users/gql-types/paginated-users.type';

@ObjectType('Reply')
export class ReplyType extends LocalBaseType implements IReply {
  @Field(() => UserType)
  public author: IUser;

  @Field(() => CommentType)
  public comment: CommentType;

  @Field(() => String)
  public content: string;

  @Field(() => PaginatedUsersType)
  public likes: IPaginated<IUser>;

  @Field(() => Int)
  public likesCount: number;

  @Field(() => UserType, { nullable: true })
  public mention?: IUser;

  @Field(() => PostType)
  public post: PostType;
}
