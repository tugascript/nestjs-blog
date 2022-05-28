import { LocalBaseEntity } from '../../common/entities/base.entity';
import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { ITag } from '../interfaces/tag.interface';
import { IsNotEmpty, Length, Matches } from 'class-validator';
import { NAME_REGEX } from '../../common/constants/regex';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ tableName: 'tags' })
@Unique({ properties: ['name', 'author'] })
export class TagEntity extends LocalBaseEntity implements ITag {
  @Property({ columnType: 'varchar(100)' })
  @Length(3, 100)
  @Matches(NAME_REGEX)
  public name: string;

  @ManyToOne({
    entity: () => UserEntity,
    eager: true,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public author!: UserEntity;
}
