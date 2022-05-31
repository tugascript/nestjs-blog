import { ObjectType } from '@nestjs/graphql';
import { Change } from '../../common/gql-types/change.type';
import { NotificationType } from './notification.type';

@ObjectType('NotificationChange')
export class NotificationChangeType extends Change<NotificationType>(
  NotificationType,
) {}
