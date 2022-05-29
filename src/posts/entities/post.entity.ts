/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { ExtendedBaseEntity } from '../../common/entities/extended-base.entity';
import { IPost } from '../interfaces/post.interface';
import { IsNotEmpty, Length } from 'class-validator';
import { TagEntity } from '../../tags/entities/tag.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { CommentEntity } from '../../comments/entities/comment.entity';

@Entity({ tableName: 'posts' })
export class PostEntity extends ExtendedBaseEntity implements IPost {
  @Property({ columnType: 'text' })
  @Length(10, 5000)
  public content: string;

  @Property({ default: false })
  public published: boolean = false;

  // RELATIONS

  @ManyToMany({ entity: () => TagEntity, owner: true })
  public tags: Collection<TagEntity, PostEntity> = new Collection<
    TagEntity,
    PostEntity
  >(this);

  @ManyToMany({ entity: () => UserEntity, owner: true })
  public likes: Collection<UserEntity, PostEntity> = new Collection<
    UserEntity,
    PostEntity
  >(this);

  @OneToMany(() => CommentEntity, (c) => c.post)
  public comments: Collection<CommentEntity, PostEntity> = new Collection<
    CommentEntity,
    PostEntity
  >(this);

  @ManyToOne({
    entity: () => UserEntity,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public author!: UserEntity;
}
