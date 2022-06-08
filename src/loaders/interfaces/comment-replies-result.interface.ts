import { EntityDictionary } from '@mikro-orm/core';
import { IReply } from '../../replies/interfaces/reply.interface';

export interface ICommentRepliesResult {
  id: number;
  replies_count: number;
  replies: EntityDictionary<IReply>;
}
