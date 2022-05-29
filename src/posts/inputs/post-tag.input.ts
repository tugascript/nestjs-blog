import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';
import { PostDto } from '../dtos/post.dto';

@InputType('PostTagInput')
export abstract class PostTagInput extends PostDto {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  public tagId!: number;
}
