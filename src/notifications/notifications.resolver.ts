import { ConfigService } from '@nestjs/config';
import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { PubSub } from 'mercurius';
import { v5 as uuidV5 } from 'uuid';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IAccessPayload } from '../auth/interfaces/access-payload.interface';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { FilterNotificationsDto } from './dtos/filter-notifications.dto';
import { NotificationDto } from './dtos/notification.dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationBodyType } from './gql-types/notification-body.type';
import { NotificationChangeType } from './gql-types/notification-change.type';
import { NotificationType } from './gql-types/notification.type';
import { PaginatedNotificationsType } from './gql-types/paginated-notifications.type';
import { INotificationChange } from './interfaces/notification-change.interface';
import { NotificationsService } from './notifications.service';

@Resolver(() => NotificationType)
export class NotificationsResolver {
  private readonly notificationNamespace =
    this.configService.get('NOTIFICATION_UUID');

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  @Mutation(() => NotificationType)
  public async readNotification(
    @CurrentUser() user: IAccessPayload,
    @Args() dto: NotificationDto,
  ) {
    return this.notificationsService.readNotification(
      user.id,
      dto.notificationId,
    );
  }

  @Mutation(() => NotificationType)
  public async deleteNotification(
    @CurrentUser() user: IAccessPayload,
    @Args() dto: NotificationDto,
  ) {
    return this.notificationsService.deleteNotification(
      user.id,
      dto.notificationId,
    );
  }

  @Query(() => PaginatedNotificationsType)
  public async filterNotifications(
    @CurrentUser() user: IAccessPayload,
    @Args() dto: FilterNotificationsDto,
  ): Promise<IPaginated<NotificationEntity>> {
    return this.notificationsService.filterNotifications(user.id, dto);
  }

  @Subscription(() => NotificationChangeType)
  public async notificationChanges(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
  ) {
    return pubsub.subscribe<INotificationChange>(
      uuidV5(user.id.toString(), this.notificationNamespace),
    );
  }

  @ResolveField(() => NotificationBodyType)
  public body(@Parent() notification: NotificationEntity) {
    return (
      notification.reply ??
      notification.comment ??
      notification.post ??
      notification.series
    );
  }
}
