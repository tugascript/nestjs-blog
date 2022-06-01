import { Field, InputType } from '@nestjs/graphql';
import { ICommentInput } from '../interfaces/comment-input.interface';
import { CommentDto } from '../dtos/comment.dto';
import { Length } from 'class-validator';

@InputType('UpdateCommentInput')
export abstract class UpdateCommentInput
  extends CommentDto
  implements Partial<ICommentInput>
{
  @Field(() => String)
  @Length(1, 350)
  public content: string;
}
