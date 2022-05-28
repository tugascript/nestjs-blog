import { ArgsType, Field } from '@nestjs/graphql';
import { Length, Matches } from 'class-validator';
import { NAME_REGEX } from '../../common/constants/regex';

@ArgsType()
export abstract class CreateTagDto {
  @Field(() => String)
  @Length(3, 107)
  @Matches(NAME_REGEX)
  public name!: string;
}
