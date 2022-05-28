import { Field, ObjectType } from '@nestjs/graphql';
import { LocalBaseType } from './base.type';
import { IExtendedBase } from '../interfaces/extended-base.interface';

@ObjectType({ isAbstract: true })
export abstract class ExtendedBaseType
  extends LocalBaseType
  implements IExtendedBase
{
  @Field(() => String)
  public title: string;

  @Field(() => String)
  public slug: string;

  @Field(() => String)
  public picture: string;
}
