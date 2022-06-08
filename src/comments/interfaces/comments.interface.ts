import { Collection } from '@mikro-orm/core';
import { IAuthored } from '../../common/interfaces/authored.interface';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { IPost } from '../../posts/interfaces/post.interface';
import { IReply } from '../../replies/interfaces/reply.interface';
import { IUser } from '../../users/interfaces/user.interface';

export interface IComment extends IAuthored {
  content: string;
  likes: Collection<any, any> | IPaginated<IUser>;
  replies: Collection<any, any> | IPaginated<IReply>;
  post: IPost;
}
