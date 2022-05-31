import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/gql-types/paginated.type';
import { NotificationType } from './notification.type';

@ObjectType('PaginatedNotifications')
export abstract class PaginatedNotificationsType extends Paginated<NotificationType>(
  NotificationType,
) {}
