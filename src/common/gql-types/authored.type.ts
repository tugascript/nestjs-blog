import { Field, ObjectType } from '@nestjs/graphql';
import { LocalBaseType } from './base.type';
import { IAuthored } from '../interfaces/authored.interface';
import { UserType } from '../../users/gql-types/user.type';

@ObjectType({ isAbstract: true })
export abstract class AuthoredType extends LocalBaseType implements IAuthored {
  @Field(() => UserType)
  public author: UserType;

  @Field(() => Boolean, { nullable: true })
  public mute: boolean;
}
