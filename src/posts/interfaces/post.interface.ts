import { Collection } from '@mikro-orm/core';
import { IComment } from '../../comments/interfaces/comments.interface';
import { IExtendedBase } from '../../common/interfaces/extended-base.interface';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { ITag } from '../../tags/interfaces/tag.interface';
import { IUser } from '../../users/interfaces/user.interface';

export interface IPost extends IExtendedBase {
  content: string;
  published: boolean;
  tags: Collection<any, any> | ITag[];
  likes: Collection<any, any> | IPaginated<IUser>;
  comments: Collection<any, any> | IPaginated<IComment>;
}
