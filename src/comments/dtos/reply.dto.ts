import { ArgsType, Field, Int } from '@nestjs/graphql';
import { CommentDto } from './comment.dto';
import { IsInt, Min } from 'class-validator';

@ArgsType()
export abstract class ReplyDto extends CommentDto {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  public replyId: number;
}
