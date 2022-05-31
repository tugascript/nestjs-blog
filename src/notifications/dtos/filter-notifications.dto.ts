/* eslint-disable @typescript-eslint/no-inferrable-types */
import { ArgsType, Field } from '@nestjs/graphql';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { IsBoolean } from 'class-validator';

@ArgsType()
export abstract class FilterNotificationsDto extends PaginationDto {
  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  public unreadOnly: boolean = false;
}
