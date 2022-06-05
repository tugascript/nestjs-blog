import { Field, InputType } from '@nestjs/graphql';
import { Length, Matches } from 'class-validator';
import { NAME_REGEX } from '../../common/constants/regex';
import { TagDto } from '../dtos/tag.dto';

@InputType('UpdateTagInput')
export abstract class UpdateTagInput extends TagDto {
  @Field(() => String)
  @Length(3, 107)
  @Matches(NAME_REGEX)
  public name: string;
}
