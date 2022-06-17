import { Collection } from '@mikro-orm/core';
import { IComment } from '../../comments/interfaces/comments.interface';
import { IAuthored } from '../../common/interfaces/authored.interface';
import { IPaginated } from '../../common/interfaces/paginated.interface';
import { IPost } from '../../posts/interfaces/post.interface';
import { IUser } from '../../users/interfaces/user.interface';

export interface IReply extends IAuthored {
  content: string;
  post: IPost;
  comment: IComment;
  mention?: IUser;
  likesCount?: number;
  likes: Collection<any, any> | IPaginated<IUser>;
  liked?: boolean;
}
