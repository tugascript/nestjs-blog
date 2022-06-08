import { Entity, ManyToOne, Unique } from '@mikro-orm/core';
import { IsNotEmpty } from 'class-validator';
import { CreationEntity } from '../../common/entities/creation.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ISeriesFollower } from '../interfaces/series-follower.interface';
import { SeriesEntity } from './series.entity';

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
