import { CreateCommentInput } from './create-comment.input';
import { Field, InputType, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class ReplyInput extends PartialType(CreateCommentInput) {
  @Field(() => Int)
  id: number;
}
