/* eslint-disable @typescript-eslint/no-inferrable-types */
import { ArgsType, Field } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@ArgsType()
export abstract class FilterNotificationsDto extends PaginationDto {
  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  public unreadOnly: boolean = false;
}
