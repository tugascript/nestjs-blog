import { LocalBaseEntity } from './base.entity';
import { IExtendedBase } from '../interfaces/extended-base.interface';
import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/core';
import { IsNotEmpty, IsUrl, Length, Matches } from 'class-validator';
import { NAME_REGEX, SLUG_REGEX } from '../constants/regex';
import { UserEntity } from '../../users/entities/user.entity';
import { TagEntity } from '../../tags/entities/tag.entity';

@Entity({ abstract: true })
export abstract class ExtendedBaseEntity
  extends LocalBaseEntity
  implements IExtendedBase
{
  @Property({ columnType: 'varchar(100)' })
  @Length(3, 100)
  @Matches(NAME_REGEX)
  public title: string;

  @Property({ columnType: 'varchar(107)' })
  @Length(9, 107)
  @Matches(SLUG_REGEX)
  public slug: string;

  @Property({ columnType: 'varchar(250)' })
  @IsUrl()
  public picture: string;

  @ManyToOne({
    entity: () => UserEntity,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public author!: UserEntity;

  @ManyToMany({ entity: () => TagEntity, owner: true })
  public tags: Collection<TagEntity, this> = new Collection<TagEntity, this>(
    this,
  );
}
