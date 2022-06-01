import { IBase } from '../../common/interfaces/base.interface';
import { IUser } from '../../users/interfaces/user.interface';
import { Collection } from '@mikro-orm/core';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { IPost } from '../../posts/interfaces/post.interface';
import { IReply } from './reply.interface';

export interface IComment extends IBase {
  content: string;
  author: IUser;
  likes: Collection<any, any> | IPaginated<IUser>;
  replies: Collection<any, any> | IPaginated<IReply>;
  post: IPost;
}
