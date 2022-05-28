import { Field, InputType } from '@nestjs/graphql';
import { Length, Matches } from 'class-validator';
import { NAME_REGEX } from '../../common/constants/regex';
import { TagDto } from './tag.dto';

@InputType()
export abstract class UpdateTagDto extends TagDto {
  @Field(() => String)
  @Length(3, 107)
  @Matches(NAME_REGEX)
  public name: string;
}
