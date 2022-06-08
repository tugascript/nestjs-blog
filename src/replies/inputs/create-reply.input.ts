import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, Length, Min } from 'class-validator';
import { CommentDto } from '../../comments/dtos/comment.dto';
import { IReplyInput } from '../interfaces/reply-input.interface';

@InputType('CreateReplyInput')
export class CreateReplyInput extends CommentDto implements IReplyInput {
  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  @IsOptional()
  public replyId?: number;

  @Field(() => String)
  @Length(1, 350)
  public content: string;
}
