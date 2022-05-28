import { Collection, Entity, ManyToMany, ManyToOne } from '@mikro-orm/core';
import { IsNotEmpty } from 'class-validator';
import { ISeries } from '../interfaces/series.interface';
import { UserEntity } from '../../users/entities/user.entity';
import { TagEntity } from '../../tags/entities/tag.entity';
import { ExtendedBaseEntity } from '../../common/entities/extended-base.entity';

@Entity({ tableName: 'series' })
export class SeriesEntity extends ExtendedBaseEntity implements ISeries {
  @ManyToMany({ entity: () => TagEntity, owner: true })
  public tags: Collection<TagEntity, SeriesEntity> = new Collection<
    TagEntity,
    SeriesEntity
  >(this);

  @ManyToOne({
    entity: () => UserEntity,
    eager: true,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public author!: UserEntity;
}
