import { Collection } from '@mikro-orm/core';
import { IExtendedBase } from '../../common/interfaces/extended-base.interface';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { IPost } from '../../posts/interfaces/post.interface';
import { ITag } from '../../tags/interfaces/tag.interface';
import { IUser } from '../../users/interfaces/user.interface';

export interface ISeries extends IExtendedBase {
  description: string;
  tags: Collection<any, any> | ITag[];
  followers: Collection<any, any> | IPaginated<IUser>;
  followersCount?: number;
  posts?: IPaginated<IPost>;
  followed?: boolean;
}
