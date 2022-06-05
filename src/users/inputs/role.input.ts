import { UserDto } from '../dtos/user.dto';
import { Field, InputType } from '@nestjs/graphql';
import { RoleEnum } from '../enums/role.enum';
import { IsEnum } from 'class-validator';

@InputType('RoleInput')
export abstract class RoleInput extends UserDto {
  @Field(() => RoleEnum)
  @IsEnum(RoleEnum)
  public role: RoleEnum;
}
