import { Collection, Entity, ManyToOne, OneToMany } from '@mikro-orm/core';
import { ExtendedBaseEntity } from '../../common/entities/extended-base.entity';
import { SeriesFollowerEntity } from './series-follower.entity';
import { SeriesTagEntity } from './series-tag.entity';
import { ISeries } from '../interfaces/series.interface';
import { UserEntity } from '../../users/entities/user.entity';
import { IsNotEmpty } from 'class-validator';

@Entity({ tableName: 'series' })
export class SeriesEntity extends ExtendedBaseEntity implements ISeries {
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
