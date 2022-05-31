import { EntityDictionary } from '@mikro-orm/core';
import { PostEntity } from '../../posts/entities/post.entity';

export interface ISeriesPostsResult {
  id: number;
  posts: EntityDictionary<PostEntity>[];
  posts_count: number;
}
