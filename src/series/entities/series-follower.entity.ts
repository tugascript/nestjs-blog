import {
  Entity,
  ManyToOne,
  PrimaryKeyType,
  Property,
  Unique,
} from '@mikro-orm/core';
import { ISeriesFollower } from '../interfaces/series-follower.interface';
import { UserEntity } from '../../users/entities/user.entity';
import { IsNotEmpty } from 'class-validator';
import { SeriesEntity } from './series.entity';

@Entity({ tableName: 'series_follower' })
@Unique({ properties: ['user', 'series'] })
export class SeriesFollowerEntity implements ISeriesFollower {
  @ManyToOne({ entity: () => UserEntity, onDelete: 'cascade', primary: true })
  @IsNotEmpty()
  public user: UserEntity;

  @ManyToOne({ entity: () => SeriesEntity, onDelete: 'cascade', primary: true })
  @IsNotEmpty()
  public series: SeriesEntity;

  @Property({ onCreate: () => new Date() })
  public createdAt: Date = new Date();

  [PrimaryKeyType]: [number, number];
}
