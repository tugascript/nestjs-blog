import { IUser } from '../../users/interfaces/user.interface';
import { IComment } from './comments.interface';

export interface ICommentLike {
  comment: IComment;
  user: IUser;
  createdAt: Date;
}
