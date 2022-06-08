import { Field, ObjectType } from '@nestjs/graphql';
import { UserType } from '../../users/gql-types/user.type';
import { IAuthored } from '../interfaces/authored.interface';
import { LocalBaseType } from './base.type';

@ObjectType({ isAbstract: true })
export abstract class AuthoredType extends LocalBaseType implements IAuthored {
  @Field(() => UserType)
  public author: UserType;

  @Field(() => Boolean, { nullable: true })
  public mute: boolean;
}
