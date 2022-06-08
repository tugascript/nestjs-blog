import { IChange } from '../../common/interfaces/change.interface';
import { IReply } from './reply.interface';

export interface IReplyChange {
  replyChange: IChange<IReply>;
}
