import { Entity, ManyToOne, PrimaryKeyType, Unique } from '@mikro-orm/core';
import { IsNotEmpty } from 'class-validator';
import { CreationEntity } from '../../common/entities/creation.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { IPostLike } from '../interfaces/post-like.interface';
import { PostEntity } from './post.entity';

@Entity({ tableName: 'post_likes' })
@Unique({ properties: ['user', 'post'] })
export class PostLikeEntity extends CreationEntity implements IPostLike {
  @ManyToOne({
    entity: () => UserEntity,
    onDelete: 'cascade',
    primary: true,
  })
  @IsNotEmpty()
  public user: UserEntity;

  @ManyToOne({
    entity: () => PostEntity,
    onDelete: 'cascade',
    primary: true,
  })
  @IsNotEmpty()
  public post: PostEntity;

  [PrimaryKeyType]: [number, number];
}
