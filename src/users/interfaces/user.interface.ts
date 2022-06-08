import { IBase } from '../../common/interfaces/base.interface';
import { OnlineStatusEnum } from '../enums/online-status.enum';
import { RoleEnum } from '../enums/role.enum';
import { Collection } from '@mikro-orm/core';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { IPost } from '../../posts/interfaces/post.interface';
import { ISeries } from '../../series/interfaces/series.interface';

export interface IUser extends IBase {
  name: string;
  username: string;
  email: string;
  role?: RoleEnum;
  picture?: string;
  onlineStatus: OnlineStatusEnum;
  lastOnline: Date;
  likedPosts?: Collection<any, any> | IPaginated<IPost>;
  followedSeries?: Collection<any, any> | IPaginated<ISeries>;
  likedPostsCount?: number;
  likedSeriesCount?: number;
}
