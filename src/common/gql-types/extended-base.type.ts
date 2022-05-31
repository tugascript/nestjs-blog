import { Field, ObjectType } from '@nestjs/graphql';
import { LocalBaseType } from './base.type';
import { IExtendedBase } from '../interfaces/extended-base.interface';
import { UserType } from '../../users/gql-types/user.type';
import { TagType } from '../../tags/gql-types/tag.type';
import { ITag } from '../../tags/interfaces/tag.interface';

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

  @Field(() => UserType)
  public author: UserType;

  @Field(() => TagType)
  public tags: ITag[];
}
