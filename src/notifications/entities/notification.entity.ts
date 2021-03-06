/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { CommentEntity } from '../../comments/entities/comment.entity';
import { LocalBaseEntity } from '../../common/entities/base.entity';
import { PostEntity } from '../../posts/entities/post.entity';
import { ReplyEntity } from '../../replies/entities/reply.entity';
import { SeriesEntity } from '../../series/entities/series.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { NotificationEntityEnum } from '../enums/notification-entity.enum';
import { NotificationTypeEnum } from '../enums/notification-type.enum';
import { INotification } from '../interfaces/notification.interface';

@Entity({ tableName: 'notifications' })
export class NotificationEntity
  extends LocalBaseEntity
  implements INotification
{
  @Enum({
    items: () => NotificationTypeEnum,
    columnType: 'varchar(7)',
  })
  @IsEnum(NotificationTypeEnum)
  public notificationType: NotificationTypeEnum;

  @Enum({
    items: () => NotificationEntityEnum,
    columnType: 'varchar(7)',
  })
  @IsEnum(NotificationEntityEnum)
  public notificationEntity: NotificationEntityEnum;

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
    eager: true,
  })
  @IsNotEmpty()
  public issuer: UserEntity;

  @ManyToOne({
    entity: () => SeriesEntity,
    onDelete: 'cascade',
    nullable: true,
    eager: true,
  })
  public series?: SeriesEntity;

  @ManyToOne({
    entity: () => PostEntity,
    onDelete: 'cascade',
    nullable: true,
    eager: true,
  })
  public post?: PostEntity;

  @ManyToOne({
    entity: () => CommentEntity,
    onDelete: 'no action',
    nullable: true,
    eager: true,
  })
  public comment?: CommentEntity;

  @ManyToOne({
    entity: () => ReplyEntity,
    onDelete: 'no action',
    nullable: true,
    eager: true,
  })
  public reply?: ReplyEntity;
}
