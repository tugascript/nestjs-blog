import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';
import { CommentDto } from '../../comments/dtos/comment.dto';

@ArgsType()
@InputType({ isAbstract: true })
export abstract class ReplyDto extends CommentDto {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  public replyId: number;
}
