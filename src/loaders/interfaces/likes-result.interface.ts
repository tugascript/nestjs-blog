import { EntityDictionary } from '@mikro-orm/core';
import { UserEntity } from '../../users/entities/user.entity';

export interface ILikesResult {
  id: number;
  users: EntityDictionary<UserEntity>[];
  likes_count: number;
}
