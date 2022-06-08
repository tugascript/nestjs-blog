import { IComment } from '../../comments/interfaces/comments.interface';
import { IBase } from '../../common/interfaces/base.interface';
import { IPost } from '../../posts/interfaces/post.interface';
import { IReply } from '../../replies/interfaces/reply.interface';
import { ISeries } from '../../series/interfaces/series.interface';
import { IUser } from '../../users/interfaces/user.interface';
import { NotificationEntityEnum } from '../enums/notification-entity.enum';
import { NotificationTypeEnum } from '../enums/notification-type.enum';

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
