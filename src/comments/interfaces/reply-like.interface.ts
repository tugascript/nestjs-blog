import { IReply } from './reply.interface';
import { IUser } from '../../users/interfaces/user.interface';

export interface IReplyLike {
  reply: IReply;
  user: IUser;
  createdAt: Date;
}
