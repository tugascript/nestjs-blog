import { Field, InputType } from '@nestjs/graphql';
import { CommentDto } from '../dtos/comment.dto';
import { Length } from 'class-validator';

@InputType()
export class ReplyInput extends CommentDto {
  @Field(() => String)
  @Length(1, 350)
  public content: string;
}
