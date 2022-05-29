import { Field, InputType } from '@nestjs/graphql';
import { ICommentInput } from '../interfaces/comment-input.interface';
import { Length } from 'class-validator';
import { PostDto } from '../../posts/dtos/post.dto';

@InputType()
export abstract class CreateCommentInput
  extends PostDto
  implements ICommentInput
{
  @Field(() => String)
  @Length(1, 350)
  public content: string;
}
