import { Entity, Property } from '@mikro-orm/core';
import { IsUrl, Length, Matches } from 'class-validator';
import { NAME_REGEX, SLUG_REGEX } from '../constants/regex';
import { IExtendedBase } from '../interfaces/extended-base.interface';
import { LocalBaseEntity } from './base.entity';

@Entity({ abstract: true })
export abstract class ExtendedBaseEntity
  extends LocalBaseEntity
  implements Partial<IExtendedBase>
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

  @Property({ default: false })
  public mute = false;
}
