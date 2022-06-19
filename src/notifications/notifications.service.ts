import { FilterQuery, RequiredEntityData } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub } from 'mercurius';
import { v5 as uuidV5 } from 'uuid';
import { CommentEntity } from '../comments/entities/comment.entity';
import { CommonService } from '../common/common.service';
import { ChangeTypeEnum } from '../common/enums/change-type.enum';
import { QueryOrderEnum } from '../common/enums/query-order.enum';
import { LocalMessageType } from '../common/gql-types/message.type';
import { IAuthored } from '../common/interfaces/authored.interface';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { PostEntity } from '../posts/entities/post.entity';
import { ReplyEntity } from '../replies/entities/reply.entity';
import { SeriesEntity } from '../series/entities/series.entity';
import { FilterNotificationsDto } from './dtos/filter-notifications.dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationEntityEnum } from './enums/notification-entity.enum';
import { NotificationTypeEnum } from './enums/notification-type.enum';
import { INotificationChange } from './interfaces/notification-change.interface';

@Injectable()
export class NotificationsService {
  private readonly notificationAlias = 'an';
  private readonly notificationNamespace =
    this.configService.get('NOTIFICATION_UUID');

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepository: EntityRepository<NotificationEntity>,
    private readonly configService: ConfigService,
    private readonly commonService: CommonService,
  ) {}

  private static fillNotification<T extends IAuthored>(
    entity: T,
    body: Record<string, any>,
  ): void {
    if (entity instanceof ReplyEntity) {
      body.notificationEntity = NotificationEntityEnum.REPLY;
      body.reply = entity.id;
      body.comment = entity.comment.id;
      body.post = entity.post.id;
    } else if (entity instanceof CommentEntity) {
      body.notificationEntity = NotificationEntityEnum.COMMENT;
      body.comment = entity.id;
      body.post = entity.post.id;
    } else if (entity instanceof PostEntity) {
      body.notificationEntity = NotificationEntityEnum.POST;
      body.post = entity.id;
    } else if (entity instanceof SeriesEntity) {
      body.notificationEntity = NotificationEntityEnum.SERIES;
      body.series = entity.id;
    } else {
      throw new BadRequestException('Invalid entity type');
    }
  }

  /**
   * Creates App Notification
   *
   * Creates a new generic app notification.
   */
  public async createNotification<T extends IAuthored>(
    pubsub: PubSub,
    notificationType: NotificationTypeEnum,
    userId: number,
    recipientId: number,
    entity: T,
  ): Promise<void> {
    if (
      userId === recipientId ||
      (entity.mute && notificationType !== NotificationTypeEnum.MENTION)
    ) {
      return;
    }

    const entityData: RequiredEntityData<NotificationEntity> = {
      notificationType,
      issuer: userId,
      recipient: recipientId,
    };
    NotificationsService.fillNotification(entity, entityData);
    const notification = this.notificationsRepository.create(entityData);
    await this.commonService.saveEntity(
      this.notificationsRepository,
      notification,
      true,
    );
    pubsub.publish<INotificationChange>({
      topic: uuidV5(
        notification.recipient.id.toString(),
        this.notificationNamespace,
      ),
      payload: {
        notificationChange: this.commonService.generateChange(
          notification,
          ChangeTypeEnum.NEW,
          'id',
        ),
      },
    });
  }

  /**
   * Read Notification
   *
   * Changes the read status of a notification to true.
   */
  public async readNotification(
    userId: number,
    notificationId: number,
  ): Promise<NotificationEntity> {
    const notification = await this.notificationById(userId, notificationId);

    if (notification.read) {
      throw new BadRequestException('Notification already read');
    }

    notification.read = true;
    await this.commonService.saveEntity(
      this.notificationsRepository,
      notification,
    );
    return notification;
  }

  /**
   * Delete Notification
   *
   * Removes recipient's notification from db.
   */
  public async deleteNotification(
    userId: number,
    notificationId: number,
  ): Promise<LocalMessageType> {
    const notification = await this.notificationById(userId, notificationId);
    await this.commonService.removeEntity(
      this.notificationsRepository,
      notification,
    );
    return new LocalMessageType('Notification deleted successfully');
  }

  /**
   * Remove Notification
   *
   * Removes notification automatically after like and comment changes.
   */
  public async removeNotification<T extends IAuthored>(
    pubsub: PubSub,
    notificationType: NotificationTypeEnum,
    userId: number,
    recipientId: number,
    entity: T,
  ): Promise<void> {
    if (userId === recipientId) return;

    const where: FilterQuery<NotificationEntity> = {
      notificationType,
      issuer: userId,
      recipient: recipientId,
    };
    NotificationsService.fillNotification(entity, where);
    const notification = await this.notificationsRepository.findOne(where);

    if (notification) {
      await this.commonService.removeEntity(
        this.notificationsRepository,
        notification,
      );
      pubsub.publish<INotificationChange>({
        topic: uuidV5(userId.toString(), this.notificationNamespace),
        payload: {
          notificationChange: this.commonService.generateChange(
            notification,
            ChangeTypeEnum.DELETE,
            'id',
          ),
        },
      });
    }
  }

  /**
   * Filter Notifications
   *
   * Gets a recipient's newer paginated notifications.
   */
  public async filterNotifications(
    userId: number,
    { unreadOnly, after, first }: FilterNotificationsDto,
  ): Promise<IPaginated<NotificationEntity>> {
    const qb = this.notificationsRepository
      .createQueryBuilder(this.notificationAlias)
      .where({ recipient: userId })
      .leftJoinAndSelect(`${this.notificationAlias}.issuer`, 'u')
      .leftJoinAndSelect(`${this.notificationAlias}.series`, 's')
      .leftJoinAndSelect(`${this.notificationAlias}.post`, 'p')
      .leftJoinAndSelect(`${this.notificationAlias}.comment`, 'c')
      .leftJoinAndSelect(`${this.notificationAlias}.reply`, 'r');

    if (unreadOnly) qb.andWhere({ read: false });

    return this.commonService.queryBuilderPagination(
      this.notificationAlias,
      'id',
      first,
      QueryOrderEnum.DESC,
      qb,
      after,
      true,
    );
  }

  /**
   * Notification By ID
   *
   * Returns a recipient's notification by id.
   */
  private async notificationById(
    userId: number,
    notificationId: number,
  ): Promise<NotificationEntity> {
    const notification = await this.notificationsRepository.findOne({
      id: notificationId,
      recipient: userId,
    });
    this.commonService.checkExistence('App Notification', notification);
    return notification;
  }
}
