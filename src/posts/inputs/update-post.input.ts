import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, Length, Matches } from 'class-validator';
import { NAME_REGEX } from '../../common/constants/regex';
import { PostDto } from '../dtos/post.dto';
import { IPostInput } from '../interfaces/post-input.interface';

@InputType()
export class UpdatePostInput extends PostDto implements Partial<IPostInput> {
  @Field(() => String, { nullable: true })
  @Length(3, 100)
  @Matches(NAME_REGEX)
  @IsOptional()
  public title?: string;

  @Field(() => String, { nullable: true })
  @Length(10, 5000)
  @IsOptional()
  public content?: string;
}
