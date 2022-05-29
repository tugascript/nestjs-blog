import { Field, Int, ObjectType } from '@nestjs/graphql';
import { LocalBaseType } from '../../common/gql-types/base.type';
import { IComment } from '../interfaces/comments.interface';
import { UserType } from '../../users/gql-types/user.type';
import { PaginatedUsersType } from '../../users/gql-types/paginated-users.type';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { IUser } from '../../users/interfaces/user.interface';
import { PaginatedCommentsType } from './paginated-comments.type';

@ObjectType('Comment')
export class CommentType extends LocalBaseType implements IComment {
  @Field(() => String)
  public content: string;

  @Field(() => UserType)
  public author: UserType;

  @Field(() => PaginatedUsersType)
  public likes: IPaginated<IUser>;

  @Field(() => Int)
  public likesCount: number;

  @Field(() => PaginatedCommentsType)
  public replies: IPaginated<IComment>;

  @Field(() => UserType, { nullable: true })
  public mention?: UserType;
}
