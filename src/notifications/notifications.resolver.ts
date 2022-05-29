import { Resolver } from '@nestjs/graphql';
import { NotificationsService } from './notifications.service';
import { AppNotificationType } from './gql-types/app-notification.type';

@Resolver(() => AppNotificationType)
export class NotificationsResolver {
  constructor(private readonly notificationsService: NotificationsService) {}
}
