import { Entity, ManyToOne, PrimaryKeyType, Unique } from '@mikro-orm/core';
import { UserEntity } from '../../users/entities/user.entity';
import { IsNotEmpty } from 'class-validator';
import { CreationEntity } from '../../common/entities/creation.entity';
import { ReplyEntity } from './reply.entity';
import { IReplyLike } from '../interfaces/reply-like.interface';

@Entity({ tableName: 'reply_likes' })
@Unique({ properties: ['user', 'reply'] })
export class ReplyLikeEntity extends CreationEntity implements IReplyLike {
  @ManyToOne({
    entity: () => UserEntity,
    onDelete: 'cascade',
    primary: true,
  })
  @IsNotEmpty()
  public user: UserEntity;

  @ManyToOne({
    entity: () => ReplyEntity,
    onDelete: 'cascade',
    primary: true,
  })
  @IsNotEmpty()
  public reply: ReplyEntity;

  [PrimaryKeyType]: [number, number];
}
