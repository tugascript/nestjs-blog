import { Collection } from '@mikro-orm/core';
import { ITag } from '../../tags/interfaces/tag.interface';
import { IUser } from '../../users/interfaces/user.interface';
import { IExtendedBase } from '../../common/interfaces/extended-base.interface';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { IComment } from '../../comments/interfaces/comments.interface';

export interface IPost extends IExtendedBase {
  content: string;
  published: boolean;
  tags: Collection<any, any> | ITag[];
  author: IUser;
  likes: Collection<any, any> | IPaginated<IUser>;
  comments: Collection<any, any> | IPaginated<IComment>;
}
