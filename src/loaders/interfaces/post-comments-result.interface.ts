import { EntityDictionary } from '@mikro-orm/core';
import { CommentEntity } from '../../comments/entities/comment.entity';

export interface IPostCommentsResult {
  id: number;
  comments_count: number;
  comments: EntityDictionary<CommentEntity>[];
}
