import { Entity, ManyToOne, PrimaryKeyType, Unique } from '@mikro-orm/core';
import { IsNotEmpty } from 'class-validator';
import { CreationEntity } from '../../common/entities/creation.entity';
import { TagEntity } from '../../tags/entities/tag.entity';
import { IPostTag } from '../interfaces/post-tag.interface';
import { PostEntity } from './post.entity';

@Entity({ tableName: 'post_tags' })
@Unique({ properties: ['tag', 'post'] })
export class PostTagEntity extends CreationEntity implements IPostTag {
  @ManyToOne({
    entity: () => TagEntity,
    onDelete: 'cascade',
    primary: true,
  })
  @IsNotEmpty()
  public tag: TagEntity;

  @ManyToOne({
    entity: () => PostEntity,
    onDelete: 'cascade',
    primary: true,
  })
  @IsNotEmpty()
  public post: PostEntity;

  [PrimaryKeyType]: [number, number];
}
