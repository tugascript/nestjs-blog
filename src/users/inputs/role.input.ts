import { Field, InputType } from '@nestjs/graphql';
import { IsEnum } from 'class-validator';
import { UserDto } from '../dtos/user.dto';
import { RoleEnum } from '../enums/role.enum';

@InputType('RoleInput')
export abstract class RoleInput extends UserDto {
  @Field(() => RoleEnum)
  @IsEnum(RoleEnum)
  public role: RoleEnum;
}
