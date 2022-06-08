import { IChange } from '../../common/interfaces/change.interface';
import { INotification } from './notification.interface';

export interface INotificationChange {
  notificationChange: IChange<INotification>;
}
