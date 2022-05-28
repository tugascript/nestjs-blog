import { Field, ObjectType } from '@nestjs/graphql';
import { LocalBaseType } from '../../common/gql-types/base.type';
import { ITag } from '../interfaces/tag.interface';

@ObjectType('Tag')
export class TagType extends LocalBaseType implements ITag {
  @Field(() => String)
  public name!: string;
}
