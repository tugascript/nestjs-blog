import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AuthoredType } from '../../common/gql-types/authored.type';
import { PostType } from '../../posts/gql-types/post.type';
import { UserType } from '../../users/gql-types/user.type';
import { IComment } from '../interfaces/comments.interface';

@ObjectType('Comment')
export class CommentType extends AuthoredType implements IComment {
  @Field(() => String)
  public content: string;

  @Field(() => PostType)
  public post: PostType;

  @Field(() => Boolean)
  public hasLiked: boolean;

  @Field(() => Int)
  public likesCount: number;

  @Field(() => Int)
  public repliesCount: number;

  @Field(() => UserType, { nullable: true })
  public mention?: UserType;

  @Field(() => Boolean, { nullable: true })
  public liked?: boolean;
}
