import { Collection, Entity, OneToMany } from '@mikro-orm/core';
import { ISeries } from '../interfaces/series.interface';
import { ExtendedBaseEntity } from '../../common/entities/extended-base.entity';
import { SeriesFollowerEntity } from './series-follower.entity';

@Entity({ tableName: 'series' })
export class SeriesEntity extends ExtendedBaseEntity implements ISeries {
  @OneToMany(() => SeriesFollowerEntity, (f) => f.series)
  public followers: Collection<SeriesFollowerEntity, SeriesEntity> =
    new Collection<SeriesFollowerEntity, SeriesEntity>(this);
}
