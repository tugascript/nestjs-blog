import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/gql-types/paginated.type';
import { AppNotificationType } from './app-notification.type';

@ObjectType('PaginatedAppNotifications')
export abstract class PaginatedAppNotificationsType extends Paginated<AppNotificationType>(
  AppNotificationType,
) {}
