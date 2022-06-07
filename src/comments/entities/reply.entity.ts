/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { IsNotEmpty, Length } from 'class-validator';
import { UserEntity } from '../../users/entities/user.entity';
import { PostEntity } from '../../posts/entities/post.entity';
import { CommentEntity } from './comment.entity';
import { ReplyLikeEntity } from './reply-like.entity';
import { LocalBaseEntity } from '../../common/entities/base.entity';
import { IReply } from '../interfaces/reply.interface';

@Entity({ tableName: 'replies' })
export class ReplyEntity extends LocalBaseEntity implements IReply {
  @Property({ columnType: 'varchar(350)' })
  @Length(1, 350)
  public content: string;

  @OneToMany(() => ReplyLikeEntity, (l) => l.reply)
  public likes: Collection<ReplyLikeEntity, ReplyEntity> = new Collection<
    ReplyLikeEntity,
    ReplyEntity
  >(this);

  @ManyToOne({
    entity: () => PostEntity,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public post!: PostEntity;

  @ManyToOne({
    entity: () => CommentEntity,
    inversedBy: (p) => p.replies,
    onDelete: 'cascade',
  })
  public comment!: CommentEntity;

  @ManyToOne({
    entity: () => UserEntity,
    onDelete: 'cascade',
    nullable: true,
  })
  public mention?: UserEntity;

  @ManyToOne({
    entity: () => UserEntity,
    inversedBy: (u) => u.writtenReplies,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public author!: UserEntity;

  @Property({ default: false })
  public mute: boolean = false;
}
