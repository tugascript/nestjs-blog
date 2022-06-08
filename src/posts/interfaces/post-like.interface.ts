import { IUser } from '../../users/interfaces/user.interface';
import { IPost } from './post.interface';

export interface IPostLike {
  post: IPost;
  user: IUser;
  createdAt: Date;
}
