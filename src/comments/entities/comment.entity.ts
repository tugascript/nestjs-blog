import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { IComment } from '../interfaces/comments.interface';
import { IsNotEmpty, Length } from 'class-validator';
import { PostEntity } from '../../posts/entities/post.entity';
import { ReplyEntity } from './reply.entity';
import { CommentLikeEntity } from './comment-like.entity';
import { AuthoredEntity } from '../../common/entities/authored.entity';

@Entity({ tableName: 'comments' })
export class CommentEntity extends AuthoredEntity implements IComment {
  @Property({ columnType: 'varchar(350)' })
  @Length(1, 350)
  public content: string;

  @OneToMany(() => CommentLikeEntity, (l) => l.comment)
  public likes: Collection<CommentLikeEntity, CommentEntity> = new Collection<
    CommentLikeEntity,
    CommentEntity
  >(this);

  @ManyToOne({
    entity: () => PostEntity,
    inversedBy: (p) => p.comments,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public post!: PostEntity;

  @OneToMany(() => ReplyEntity, (r) => r.comment)
  public replies: Collection<ReplyEntity, CommentEntity> = new Collection<
    ReplyEntity,
    CommentEntity
  >(this);
}
