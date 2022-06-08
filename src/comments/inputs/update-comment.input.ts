import { Field, InputType } from '@nestjs/graphql';
import { Length } from 'class-validator';
import { CommentDto } from '../dtos/comment.dto';
import { ICommentInput } from '../interfaces/comment-input.interface';

@InputType('UpdateCommentInput')
export abstract class UpdateCommentInput
  extends CommentDto
  implements Partial<ICommentInput>
{
  @Field(() => String)
  @Length(1, 350)
  public content: string;
}
