import { IUser } from '../../users/interfaces/user.interface';
import { Collection } from '@mikro-orm/core';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { IComment } from './comments.interface';
import { IPost } from '../../posts/interfaces/post.interface';
import { IAuthored } from '../../common/interfaces/authored.interface';

export interface IReply extends IAuthored {
  content: string;
  post: IPost;
  comment: IComment;
  mention?: IUser;
  likesCount?: number;
  likes: Collection<any, any> | IPaginated<IUser>;
}
