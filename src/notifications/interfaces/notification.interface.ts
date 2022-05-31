import { IBase } from '../../common/interfaces/base.interface';
import { NotificationTypeEnum } from '../enums/notification-type.enum';
import { IPost } from '../../posts/interfaces/post.interface';
import { IComment } from '../../comments/interfaces/comments.interface';
import { IUser } from '../../users/interfaces/user.interface';

export interface INotification extends IBase {
  notificationType: NotificationTypeEnum;
  read: boolean;
  post: IPost;
  issuer: IUser;
  recipient?: IUser;
  comment?: IComment;
  reply?: IComment;
}
