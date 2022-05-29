import { LocalBaseEntity } from '../../common/entities/base.entity';
import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { IComment } from '../interfaces/comments.interface';
import { IsNotEmpty, Length } from 'class-validator';
import { UserEntity } from '../../users/entities/user.entity';
import { PostEntity } from '../../posts/entities/post.entity';

@Entity({ tableName: 'comments' })
export class CommentEntity extends LocalBaseEntity implements IComment {
  @Property({ columnType: 'varchar(350)' })
  @Length(1, 350)
  public content: string;

  @ManyToMany({ entity: () => UserEntity, owner: true })
  public likes: Collection<UserEntity, CommentEntity> = new Collection<
    UserEntity,
    CommentEntity
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
    nullable: true,
  })
  public replying?: CommentEntity;

  @ManyToOne({
    entity: () => UserEntity,
    onDelete: 'cascade',
    nullable: true,
  })
  public mention?: UserEntity;

  @OneToMany(() => CommentEntity, (c) => c.replying)
  public replies: Collection<CommentEntity, CommentEntity> = new Collection<
    CommentEntity,
    CommentEntity
  >(this);
}
