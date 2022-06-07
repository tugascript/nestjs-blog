import { Entity, ManyToOne, Unique } from '@mikro-orm/core';
import { IsNotEmpty } from 'class-validator';
import { SeriesEntity } from './series.entity';
import { CreationEntity } from '../../common/entities/creation.entity';
import { TagEntity } from '../../tags/entities/tag.entity';
import { ISeriesTag } from '../interfaces/series-tag.interface';

@Entity({ tableName: 'series_tags' })
@Unique({ properties: ['tag', 'series'] })
export class SeriesTagEntity extends CreationEntity implements ISeriesTag {
  @ManyToOne({
    entity: () => TagEntity,
    onDelete: 'cascade',
    primary: true,
  })
  @IsNotEmpty()
  public tag: TagEntity;

  @ManyToOne({
    entity: () => SeriesEntity,
    onDelete: 'cascade',
    primary: true,
  })
  @IsNotEmpty()
  public series: SeriesEntity;
}
