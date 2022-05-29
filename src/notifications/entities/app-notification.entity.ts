/* eslint-disable @typescript-eslint/no-inferrable-types */
import { LocalBaseEntity } from '../../common/entities/base.entity';
import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { IAppNotification } from '../interfaces/app-notification.interface';
import { AppNotificationTypeEnum } from '../enums/app-notification-type.enum';
import { CommentEntity } from '../../comments/entities/comment.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { PostEntity } from '../../posts/entities/post.entity';
import { IsNotEmpty } from 'class-validator';

@Entity({ tableName: 'app_notifications' })
export class AppNotificationEntity
  extends LocalBaseEntity
  implements IAppNotification
{
  @Enum({
    items: () => AppNotificationTypeEnum,
    columnType: 'varchar(12)',
  })
  public notificationType: AppNotificationTypeEnum;

  @Property({ default: false })
  public read: boolean = false;

  @ManyToOne({
    entity: () => UserEntity,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public recipient: UserEntity;

  @ManyToOne({
    entity: () => UserEntity,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public issuer: UserEntity;

  @ManyToOne({
    entity: () => PostEntity,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public post: PostEntity;

  @ManyToOne({
    entity: () => CommentEntity,
    onDelete: 'cascade',
    nullable: true,
  })
  public comment?: CommentEntity;

  @ManyToOne({
    entity: () => CommentEntity,
    onDelete: 'cascade',
    nullable: true,
  })
  public reply?: CommentEntity;
}
