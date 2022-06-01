import { LocalBaseEntity } from '../../common/entities/base.entity';
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
import { IReply } from '../interfaces/reply.interface';
import { CommentEntity } from './comment.entity';
import { ReplyLikeEntity } from './reply-like.entity';

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
    entity: () => UserEntity,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public author!: UserEntity;

  @ManyToOne({
    entity: () => PostEntity,
    inversedBy: (p) => p.comments,
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
}
