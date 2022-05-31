import { Entity, ManyToOne, Unique } from '@mikro-orm/core';
import { ISeriesFollower } from '../interfaces/series-follower.interface';
import { UserEntity } from '../../users/entities/user.entity';
import { IsNotEmpty } from 'class-validator';
import { SeriesEntity } from './series.entity';
import { CreationEntity } from '../../common/entities/creation.entity';

@Entity({ tableName: 'series_followers' })
@Unique({ properties: ['user', 'series'] })
export class SeriesFollowerEntity
  extends CreationEntity
  implements ISeriesFollower
{
  @ManyToOne({ entity: () => UserEntity, onDelete: 'cascade', primary: true })
  @IsNotEmpty()
  public user: UserEntity;

  @ManyToOne({ entity: () => SeriesEntity, onDelete: 'cascade', primary: true })
  @IsNotEmpty()
  public series: SeriesEntity;
}
