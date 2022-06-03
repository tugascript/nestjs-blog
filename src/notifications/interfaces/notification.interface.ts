import { IBase } from '../../common/interfaces/base.interface';
import { NotificationTypeEnum } from '../enums/notification-type.enum';
import { IPost } from '../../posts/interfaces/post.interface';
import { IComment } from '../../comments/interfaces/comments.interface';
import { IUser } from '../../users/interfaces/user.interface';
import { IReply } from '../../comments/interfaces/reply.interface';
import { ISeries } from '../../series/interfaces/series.interface';
import { NotificationEntityEnum } from '../enums/notification-entity.enum';

export interface INotification extends IBase {
  notificationType: NotificationTypeEnum;
  notificationEntity: NotificationEntityEnum;
  read: boolean;
  issuer: IUser;
  recipient: IUser;
  series?: ISeries;
  post?: IPost;
  comment?: IComment;
  reply?: IReply;
}
