import { IPost } from '../interfaces/post.interface';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TagType } from '../../tags/gql-types/tag.type';
import { UserType } from '../../users/gql-types/user.type';
import { ExtendedBaseType } from '../../common/gql-types/extended-base.type';
import { PaginatedUsersType } from '../../users/gql-types/paginated-users.type';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { IComment } from 'src/comments/interfaces/comments.interface';
import { IUser } from '../../users/interfaces/user.interface';
import { PaginatedCommentsType } from '../../comments/gql-types/paginated-comments.type';

@ObjectType('Post')
export class PostType extends ExtendedBaseType implements IPost {
  @Field(() => String)
  public content: string;

  @Field(() => Boolean)
  public published: boolean;

  @Field(() => [TagType])
  public tags: TagType[];

  @Field(() => UserType)
  public author: UserType;

  @Field(() => PaginatedUsersType)
  public likes: IPaginated<IUser>;

  @Field(() => Int)
  public likesCount: number;

  @Field(() => PaginatedCommentsType)
  public comments: IPaginated<IComment>;
}
