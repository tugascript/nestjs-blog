import { ArgsType, Field } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';
import { SLUG_REGEX } from '../constants/regex';

@ArgsType()
export abstract class SlugDto {
  @Field(() => String)
  @IsString()
  @Length(9, 107, {
    message: 'Slug needs to be between 9 and 107 characters',
  })
  @Matches(SLUG_REGEX, {
    message: 'Slug needs to be valid',
  })
  public slug!: string;
}
