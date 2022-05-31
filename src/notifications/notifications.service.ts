import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { NotificationEntity } from './entities/notification.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
import { CommonService } from '../common/common.service';
import { PubSub } from 'mercurius';
import { ConfigService } from '@nestjs/config';
import { v5 as uuidV5 } from 'uuid';
import { NotificationTypeEnum } from './enums/notification-type.enum';
import { INotificationChange } from './interfaces/notification-change.interface';
import { LocalMessageType } from '../common/gql-types/message.type';
import { FilterNotificationsDto } from './dtos/filter-notifications.dto';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { QueryOrderEnum } from '../common/enums/query-order.enum';
import { ChangeTypeEnum } from '../common/enums/change-type.enum';

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

  /**
   * Creates App Notification
   *
   * Creates a new generic app notification.
   */
  public async createAppNotification(
    pubsub: PubSub,
    notificationType: NotificationTypeEnum,
    userId: number,
    recipientId: number,
    postId: number,
    commentId?: number,
    replyId?: number,
  ): Promise<void> {
    switch (notificationType) {
      case NotificationTypeEnum.COMMENT:
      case NotificationTypeEnum.COMMENT_LIKE:
        if (!commentId) {
          throw new InternalServerErrorException('Comment id is required');
        }
        break;
      case NotificationTypeEnum.REPLY:
      case NotificationTypeEnum.REPLY_LIKE:
      case NotificationTypeEnum.MENTION:
        if (!commentId || !replyId) {
          throw new InternalServerErrorException(
            'Comment and reply ids are required',
          );
        }
        break;
    }

    const notification = await this.notificationsRepository.create({
      notificationType,
      issuer: userId,
      recipient: recipientId,
      post: postId,
      comment: commentId,
      reply: replyId,
    });
    await this.commonService.saveEntity(
      this.notificationsRepository,
      notification,
    );
    pubsub.publish<INotificationChange>({
      topic: uuidV5(recipientId.toString(), this.notificationNamespace),
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
  public async removeNotification(
    pubsub: PubSub,
    notificationType: NotificationTypeEnum,
    userId: number,
    postId: number,
    commentId?: number,
    replyId?: number,
  ): Promise<void> {
    const notification = await this.notificationsRepository.findOne({
      notificationType,
      issuer: userId,
      post: postId,
      comment: commentId,
      reply: replyId,
    });

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
      .where({ recipient: userId });

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
