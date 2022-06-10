import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ExtendedBaseType } from '../../common/gql-types/extended-base.type';
import { IPost } from '../interfaces/post.interface';

@ObjectType('Post')
export class PostType extends ExtendedBaseType implements IPost {
  @Field(() => String)
  public content: string;

  @Field(() => Boolean)
  public published: boolean;

  @Field(() => Int)
  public likesCount: number;

  @Field(() => Int)
  public commentsCount: number;
}
