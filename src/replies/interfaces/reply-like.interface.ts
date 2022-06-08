import { IUser } from '../../users/interfaces/user.interface';
import { IReply } from './reply.interface';

export interface IReplyLike {
  reply: IReply;
  user: IUser;
  createdAt: Date;
}
