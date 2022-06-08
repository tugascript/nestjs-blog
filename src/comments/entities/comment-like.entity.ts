import { Entity, ManyToOne, PrimaryKeyType, Unique } from '@mikro-orm/core';
import { IsNotEmpty } from 'class-validator';
import { CreationEntity } from '../../common/entities/creation.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ICommentLike } from '../interfaces/comment-like.interface';
import { CommentEntity } from './comment.entity';

@Entity({ tableName: 'comment_likes' })
@Unique({ properties: ['user', 'comment'] })
export class CommentLikeEntity extends CreationEntity implements ICommentLike {
  @ManyToOne({
    entity: () => UserEntity,
    onDelete: 'cascade',
    primary: true,
  })
  @IsNotEmpty()
  public user: UserEntity;

  @ManyToOne({
    entity: () => CommentEntity,
    onDelete: 'cascade',
    primary: true,
  })
  @IsNotEmpty()
  public comment: CommentEntity;

  [PrimaryKeyType]: [number, number];
}
