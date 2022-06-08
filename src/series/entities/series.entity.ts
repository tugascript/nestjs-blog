import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { IsNotEmpty, Length } from 'class-validator';
import { ExtendedBaseEntity } from '../../common/entities/extended-base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ISeries } from '../interfaces/series.interface';
import { SeriesFollowerEntity } from './series-follower.entity';
import { SeriesTagEntity } from './series-tag.entity';

@Entity({ tableName: 'series' })
export class SeriesEntity extends ExtendedBaseEntity implements ISeries {
  @Property({ columnType: 'varchar(500)' })
  @Length(5, 500)
  public description: string;

  @OneToMany(() => SeriesFollowerEntity, (f) => f.series)
  public followers: Collection<SeriesFollowerEntity, SeriesEntity> =
    new Collection<SeriesFollowerEntity, SeriesEntity>(this);

  @OneToMany(() => SeriesTagEntity, (t) => t.series)
  public tags: Collection<SeriesTagEntity, SeriesEntity> = new Collection<
    SeriesTagEntity,
    SeriesEntity
  >(this);

  @ManyToOne({
    entity: () => UserEntity,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public author!: UserEntity;
}
