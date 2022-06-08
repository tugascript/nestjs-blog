import { Field, ObjectType } from '@nestjs/graphql';
import { TagType } from '../../tags/gql-types/tag.type';
import { ITag } from '../../tags/interfaces/tag.interface';
import { IExtendedBase } from '../interfaces/extended-base.interface';
import { AuthoredType } from './authored.type';

@ObjectType({ isAbstract: true })
export abstract class ExtendedBaseType
  extends AuthoredType
  implements IExtendedBase
{
  @Field(() => String)
  public title: string;

  @Field(() => String)
  public slug: string;

  @Field(() => String)
  public picture: string;

  @Field(() => TagType)
  public tags: ITag[];
}
