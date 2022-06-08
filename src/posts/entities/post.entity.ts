/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { IsNotEmpty, Length } from 'class-validator';
import { CommentEntity } from '../../comments/entities/comment.entity';
import { ExtendedBaseEntity } from '../../common/entities/extended-base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { IPost } from '../interfaces/post.interface';
import { PostLikeEntity } from './post-like.entity';
import { PostTagEntity } from './post-tag.entity';

@Entity({ tableName: 'posts' })
export class PostEntity extends ExtendedBaseEntity implements IPost {
  @Property({ columnType: 'text' })
  @Length(10, 5000)
  public content: string;

  @Property({ default: false })
  public published: boolean = false;

  // RELATIONS

  @OneToMany(() => PostTagEntity, (t) => t.post)
  public tags: Collection<PostTagEntity, PostEntity> = new Collection<
    PostTagEntity,
    PostEntity
  >(this);

  @OneToMany(() => PostLikeEntity, (l) => l.post)
  public likes: Collection<PostLikeEntity, PostEntity> = new Collection<
    PostLikeEntity,
    PostEntity
  >(this);

  @OneToMany(() => CommentEntity, (c) => c.post)
  public comments: Collection<CommentEntity, PostEntity> = new Collection<
    CommentEntity,
    PostEntity
  >(this);

  @ManyToOne({
    entity: () => UserEntity,
    inversedBy: (u) => u.writtenPosts,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public author!: UserEntity;
}
