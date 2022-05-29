import { IBase } from '../../common/interfaces/base.interface';
import { AppNotificationTypeEnum } from '../enums/app-notification-type.enum';
import { IPost } from '../../posts/interfaces/post.interface';
import { IComment } from '../../comments/interfaces/comments.interface';
import { IUser } from '../../users/interfaces/user.interface';

export interface IAppNotification extends IBase {
  notificationType: AppNotificationTypeEnum;
  read: boolean;
  post: IPost;
  issuer: IUser;
  recipient?: IUser;
  comment?: IComment;
  reply?: IComment;
}
