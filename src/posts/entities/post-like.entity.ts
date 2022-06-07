import { Entity, ManyToOne, PrimaryKeyType, Unique } from '@mikro-orm/core';
import { UserEntity } from '../../users/entities/user.entity';
import { IsNotEmpty } from 'class-validator';
import { PostEntity } from './post.entity';
import { CreationEntity } from '../../common/entities/creation.entity';
import { IPostLike } from '../interfaces/post-like.interface';

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
