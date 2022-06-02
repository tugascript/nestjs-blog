import { EntityDictionary } from '@mikro-orm/core';
import { IReply } from '../../comments/interfaces/reply.interface';

export interface ICommentRepliesResult {
  id: number;
  replies_count: number;
  replies: EntityDictionary<IReply>;
}
