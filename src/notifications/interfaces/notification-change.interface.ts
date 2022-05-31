import { INotification } from './notification.interface';
import { IChange } from '../../common/interfaces/change.interface';

export interface INotificationChange {
  notificationChange: IChange<INotification>;
}
