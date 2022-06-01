import { IReplyInput } from '../interfaces/reply-input.interface';
import { CommentDto } from '../dtos/comment.dto';
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Length, Min } from 'class-validator';

@InputType('UpdateReplyInput')
export abstract class UpdateReplyInput
  extends CommentDto
  implements Partial<IReplyInput>
{
  @Field(() => Int)
  @IsInt()
  @Min(1)
  public replyId: number;

  @Field(() => String)
  @Length(1, 350)
  public content: string;
}
