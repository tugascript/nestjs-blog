import { IUser } from '../../users/interfaces/user.interface';
import { Collection } from '@mikro-orm/core';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { IPost } from '../../posts/interfaces/post.interface';
import { IReply } from './reply.interface';
import { IAuthored } from '../../common/interfaces/authored.interface';

export interface IComment extends IAuthored {
  content: string;
  likes: Collection<any, any> | IPaginated<IUser>;
  replies: Collection<any, any> | IPaginated<IReply>;
  post: IPost;
}
