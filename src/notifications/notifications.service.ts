import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { AppNotificationEntity } from './entities/app-notification.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
import { CommonService } from '../common/common.service';
import { PubSub } from 'mercurius';
import { ConfigService } from '@nestjs/config';
import { v5 as uuidV5 } from 'uuid';
import { AppNotificationTypeEnum } from './enums/app-notification-type.enum';
import { INotificationSubscription } from './interfaces/notification-subscription.interface';
import { LocalMessageType } from '../common/gql-types/message.type';

@Injectable()
export class NotificationsService {
  private readonly notificationNamespace =
    this.configService.get('NOTIFICATION_UUID');

  constructor(
    @InjectRepository(AppNotificationEntity)
    private readonly notificationsRepository: EntityRepository<AppNotificationEntity>,
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
    notificationType: AppNotificationTypeEnum,
    userId: number,
    recipientId: number,
    postId: number,
    commentId?: number,
    replyId?: number,
  ): Promise<AppNotificationEntity> {
    switch (notificationType) {
      case AppNotificationTypeEnum.COMMENT:
      case AppNotificationTypeEnum.COMMENT_LIKE:
        if (!commentId) {
          throw new InternalServerErrorException('Comment id is required');
        }
        break;
      case AppNotificationTypeEnum.REPLY:
      case AppNotificationTypeEnum.REPLY_LIKE:
      case AppNotificationTypeEnum.MENTION:
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
    pubsub.publish<INotificationSubscription>({
      topic: uuidV5(recipientId.toString(), this.notificationNamespace),
      payload: {
        notification,
      },
    });
    return notification;
  }

  /**
   * Read Notification
   *
   * Changes the read status of a notification to true.
   */
  public async readNotification(
    userId: number,
    notificationId: number,
  ): Promise<AppNotificationEntity> {
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
   * Notification By ID
   *
   * Returns a recipient's notification by id.
   */
  private async notificationById(
    userId: number,
    notificationId: number,
  ): Promise<AppNotificationEntity> {
    const notification = await this.notificationsRepository.findOne({
      id: notificationId,
      recipient: userId,
    });
    this.commonService.checkExistence('App Notification', notification);
    return notification;
  }
}
